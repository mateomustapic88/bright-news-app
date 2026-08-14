import { createClient } from "npm:@supabase/supabase-js@2";

const packageName = "com.mateomustapic.brightnews";
const expectedProductId = "brightnews_premium_monthly";
const googleTokenUrl = "https://oauth2.googleapis.com/token";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const textEncoder = new TextEncoder();

const base64UrlEncode = (input: ArrayBuffer | string) => {
  const bytes = typeof input === "string" ? textEncoder.encode(input) : new Uint8Array(input);
  let binary = "";
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

const importPrivateKey = async (privateKey: string) => {
  const pem = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const binary = atob(pem);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return crypto.subtle.importKey(
    "pkcs8",
    bytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
};

const getGoogleAccessToken = async () => {
  const rawServiceAccount = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!rawServiceAccount) {
    throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not configured.");
  }

  const serviceAccount = JSON.parse(rawServiceAccount);
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: googleTokenUrl,
    exp: now + 3600,
    iat: now,
  };

  const unsignedJwt = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const key = await importPrivateKey(serviceAccount.private_key);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    textEncoder.encode(unsignedJwt),
  );
  const assertion = `${unsignedJwt}.${base64UrlEncode(signature)}`;

  const response = await fetch(googleTokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error_description || data?.error || "Unable to get Google access token.");
  }

  return data.access_token;
};

const getSubscription = async (accessToken: string, purchaseToken: string) => {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptionsv2/tokens/${purchaseToken}`;
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Unable to verify Google Play subscription.");
  }

  return data;
};

const acknowledgeSubscription = async (
  accessToken: string,
  productId: string,
  purchaseToken: string,
) => {
  const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}:acknowledge`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok && response.status !== 409) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error?.message || "Unable to acknowledge Google Play subscription.");
  }
};

const resolveEntitlement = (subscription: Record<string, any>, productId: string) => {
  const lineItem = (subscription.lineItems || []).find((item: Record<string, any>) => (
    item.productId === productId
  ));
  const expiryTime = lineItem?.expiryTime || null;
  const expiryMs = expiryTime ? new Date(expiryTime).getTime() : 0;
  const state = subscription.subscriptionState || "";
  const activeStates = new Set([
    "SUBSCRIPTION_STATE_ACTIVE",
    "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
    "SUBSCRIPTION_STATE_CANCELED",
  ]);

  return {
    active: Boolean(expiryMs && expiryMs > Date.now() && activeStates.has(state)),
    expiryTime,
    state,
  };
};

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      throw new Error("Supabase function environment is not configured.");
    }

    const authHeader = req.headers.get("authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = await userClient.auth.getUser();

    if (userError || !userData?.user) {
      return Response.json({ ok: false, error: "Not authenticated." }, {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { productId, purchaseToken } = await req.json();
    if (productId !== expectedProductId || !purchaseToken) {
      return Response.json({ ok: false, error: "Invalid Premium purchase payload." }, {
        status: 400,
        headers: corsHeaders,
      });
    }

    const accessToken = await getGoogleAccessToken();
    const subscription = await getSubscription(accessToken, purchaseToken);
    const entitlement = resolveEntitlement(subscription, productId);

    if (!entitlement.active) {
      return Response.json({
        ok: false,
        error: "Google Play subscription is not active.",
        subscriptionState: entitlement.state,
      }, {
        status: 402,
        headers: corsHeaders,
      });
    }

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: userData.user.id,
        plan: "premium",
        premium_until: entitlement.expiryTime,
        google_play_purchase_token: purchaseToken,
        google_play_product_id: productId,
      }, { onConflict: "id" })
      .select("*")
      .single();

    if (profileError) {
      throw new Error(profileError.message);
    }

    let acknowledgeError = null;
    try {
      await acknowledgeSubscription(accessToken, productId, purchaseToken);
    } catch (error) {
      acknowledgeError = error instanceof Error ? error.message : "Unable to acknowledge Google Play subscription.";
      console.error("Google Play subscription acknowledgement failed after entitlement sync.", {
        userId: userData.user.id,
        productId,
        acknowledgeError,
      });
    }

    return Response.json({ ok: true, profile, acknowledgeError }, { headers: corsHeaders });
  } catch (error) {
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to verify Premium purchase.",
    }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
