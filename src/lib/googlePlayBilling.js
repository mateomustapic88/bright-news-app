import { registerPlugin } from "@capacitor/core";
import { supabase } from "./supabase";
import { PREMIUM_PRODUCT_ID } from "../brightnews/constants";
import { isNativeApp } from "./mobileAuth";

const GooglePlayBilling = registerPlugin("GooglePlayBilling");

export const purchasePremiumSubscription = async () => {
  if (!isNativeApp()) {
    throw new Error("Premium purchases are available in the Android app.");
  }

  const purchase = await GooglePlayBilling.purchaseSubscription({
    productId: PREMIUM_PRODUCT_ID,
  });

  if (purchase?.pending) {
    return { pending: true, purchase };
  }

  if (!purchase?.purchaseToken) {
    throw new Error("Google Play did not return a purchase token.");
  }

  if (!supabase) {
    throw new Error("Supabase configuration is missing.");
  }

  const { data, error } = await supabase.functions.invoke("verify-google-play-subscription", {
    body: {
      productId: PREMIUM_PRODUCT_ID,
      purchaseToken: purchase.purchaseToken,
    },
  });

  if (error) {
    throw new Error(error.message || "Unable to verify Premium purchase.");
  }

  if (!data?.ok) {
    throw new Error(data?.error || "Unable to verify Premium purchase.");
  }

  return { purchase, profile: data.profile || null };
};

export const queryActivePremiumSubscriptions = async () => {
  if (!isNativeApp()) return [];

  const result = await GooglePlayBilling.queryActiveSubscriptions();
  return Array.isArray(result?.purchases) ? result.purchases : [];
};
