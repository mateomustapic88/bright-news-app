import { createClient } from "npm:@supabase/supabase-js@2";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const premiumPriceId = Deno.env.get("STRIPE_PREMIUM_PRICE_ID") || "price_1U5P5aRQ6X11PAISE97NVzQx";
const siteUrl = Deno.env.get("SITE_URL") || "https://brightnews.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sanitizeReturnUrl = (value: unknown, fallbackPath: string) => {
  if (typeof value !== "string") return `${siteUrl}${fallbackPath}`;

  try {
    const parsedUrl = new URL(value);
    if (parsedUrl.origin !== siteUrl) return `${siteUrl}${fallbackPath}`;
    return parsedUrl.toString();
  } catch {
    return `${siteUrl}${fallbackPath}`;
  }
};

const createStripeCheckoutSession = async ({
  userId,
  userEmail,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  userEmail?: string;
  successUrl: string;
  cancelUrl: string;
}) => {
  if (!stripeSecretKey) {
    throw new Error("Stripe is not configured.");
  }

  const body = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": premiumPriceId,
    "line_items[0][quantity]": "1",
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    "metadata[user_id]": userId,
    "subscription_data[metadata][user_id]": userId,
    allow_promotion_codes: "true",
  });

  if (userEmail) {
    body.set("customer_email", userEmail);
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${stripeSecretKey}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Unable to create Stripe checkout session.");
  }

  return data;
};

Deno.serve(async req => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase function environment is not configured.");
    }

    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: userData, error: userError } = accessToken
      ? await adminClient.auth.getUser(accessToken)
      : { data: null, error: new Error("Missing authorization token.") };

    if (userError || !userData?.user) {
      console.warn("Stripe checkout authentication failed.", {
        hasAuthorizationHeader: Boolean(authHeader),
        hasAccessToken: Boolean(accessToken),
        error: userError?.message || "No user returned.",
      });
      return Response.json({ ok: false, error: "Not authenticated." }, {
        status: 401,
        headers: corsHeaders,
      });
    }

    const successUrl = sanitizeReturnUrl(body.successUrl, "/?premium=success");
    const cancelUrl = sanitizeReturnUrl(body.cancelUrl, "/?premium=cancel");
    const userId = userData.user.id;

    const session = await createStripeCheckoutSession({
      userId,
      userEmail: userData.user.email,
      successUrl,
      cancelUrl,
    });

    return Response.json({ ok: true, url: session.url }, { headers: corsHeaders });
  } catch (error) {
    console.error("Stripe checkout session creation failed.", error);
    return Response.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unable to create Stripe checkout session.",
    }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
