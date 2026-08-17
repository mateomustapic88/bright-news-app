import { createClient } from "npm:@supabase/supabase-js@2";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

const activeSubscriptionStatuses = new Set(["active", "trialing"]);
const textEncoder = new TextEncoder();

const toIsoDate = (timestamp: number | null | undefined) => {
  if (!timestamp) return null;
  return new Date(timestamp * 1000).toISOString();
};

const timingSafeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
};

const hmacHex = async (secret: string, payload: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
};

const verifyStripeSignature = async (body: string, signatureHeader: string) => {
  if (!webhookSecret) {
    throw new Error("Stripe webhook is not configured.");
  }

  const parts = Object.fromEntries(
    signatureHeader
      .split(",")
      .map(part => part.split("="))
      .filter(([key, value]) => key && value),
  );
  const timestamp = parts.t;
  const expectedSignature = parts.v1;

  if (!timestamp || !expectedSignature) {
    throw new Error("Invalid Stripe signature.");
  }

  const timestampMs = Number(timestamp) * 1000;
  if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000) {
    throw new Error("Expired Stripe signature.");
  }

  const actualSignature = await hmacHex(webhookSecret, `${timestamp}.${body}`);
  if (!timingSafeEqual(actualSignature, expectedSignature)) {
    throw new Error("Invalid Stripe signature.");
  }
};

const getStripeSubscription = async (subscriptionId: string) => {
  if (!stripeSecretKey) {
    throw new Error("Stripe is not configured.");
  }

  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    headers: {
      authorization: `Bearer ${stripeSecretKey}`,
    },
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Unable to load Stripe subscription.");
  }

  return data;
};

const syncSubscriptionProfile = async (
  subscription: Record<string, any>,
  adminClient: any,
) => {
  const userId = subscription.metadata?.user_id;
  if (!userId) {
    console.warn("Stripe subscription webhook missing user_id metadata.", {
      subscriptionId: subscription.id,
      status: subscription.status,
    });
    return;
  }

  const premiumUntil = toIsoDate(subscription.current_period_end);
  const isPremium = activeSubscriptionStatuses.has(subscription.status) &&
    Boolean(subscription.current_period_end && subscription.current_period_end * 1000 > Date.now());

  const { error } = await adminClient
    .from("profiles")
    .upsert({
      id: userId,
      plan: isPremium ? "premium" : "free",
      premium_until: isPremium ? premiumUntil : null,
    }, { onConflict: "id" });

  if (error) {
    throw new Error(error.message);
  }
};

Deno.serve(async req => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    if (!stripeSecretKey || !webhookSecret) {
      throw new Error("Stripe webhook is not configured.");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase function environment is not configured.");
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing Stripe signature.", { status: 400 });
    }

    const body = await req.text();
    await verifyStripeSignature(body, signature);
    const event = JSON.parse(body);
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      if (typeof session.subscription === "string") {
        const subscription = await getStripeSubscription(session.subscription);
        await syncSubscriptionProfile(subscription, adminClient);
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await syncSubscriptionProfile(event.data.object, adminClient);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook failed.", error);
    return new Response(error instanceof Error ? error.message : "Stripe webhook failed.", {
      status: 400,
    });
  }
});
