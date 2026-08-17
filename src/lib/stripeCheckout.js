import { supabase } from "./supabase";

export const startStripePremiumCheckout = async () => {
  if (!supabase) {
    throw new Error("Supabase configuration is missing.");
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://brightnews.app";
  const { data, error } = await supabase.functions.invoke("create-stripe-checkout-session", {
    body: {
      successUrl: `${origin}/?premium=success`,
      cancelUrl: `${origin}/?premium=cancel`,
    },
  });

  if (error) {
    throw new Error(error.message || "Unable to open Premium checkout.");
  }

  if (!data?.ok || !data?.url) {
    throw new Error(data?.error || "Unable to open Premium checkout.");
  }

  window.location.assign(data.url);
};
