import { supabase } from "./supabase";

export const startStripePremiumCheckout = async () => {
  if (!supabase) {
    throw new Error("Supabase configuration is missing.");
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error("Sign in first to upgrade to Premium.");
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://brightnews.app";
  const { data, error } = await supabase.functions.invoke("create-stripe-checkout-session", {
    headers: {
      authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: {
      successUrl: `${origin}/?premium=success`,
      cancelUrl: `${origin}/?premium=cancel`,
    },
  });

  if (error) {
    const errorPayload = typeof error.context?.json === "function"
      ? await error.context.json().catch(() => null)
      : null;
    throw new Error(errorPayload?.error || error.message || "Unable to open Premium checkout.");
  }

  if (!data?.ok || !data?.url) {
    throw new Error(data?.error || "Unable to open Premium checkout.");
  }

  window.location.assign(data.url);
};
