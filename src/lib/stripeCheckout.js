import { supabase } from "./supabase";

const getFunctionUrl = functionName => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Supabase configuration is missing.");
  return `${supabaseUrl}/functions/v1/${functionName}`;
};

export const startStripePremiumCheckout = async () => {
  if (!supabase) {
    throw new Error("Supabase configuration is missing.");
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData?.session?.access_token) {
    throw new Error("Sign in first to upgrade to Premium.");
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://brightnews.app";
  const response = await fetch(getFunctionUrl("create-stripe-checkout-session"), {
    method: "POST",
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${sessionData.session.access_token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      successUrl: `${origin}/?premium=success`,
      cancelUrl: `${origin}/?premium=cancel`,
    }),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || "Unable to open Premium checkout.");
  }

  if (!data?.ok || !data?.url) {
    throw new Error(data?.error || "Unable to open Premium checkout.");
  }

  window.location.assign(data.url);
};
