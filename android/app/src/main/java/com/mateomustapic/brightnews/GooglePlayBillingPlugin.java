package com.mateomustapic.brightnews;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryProductDetailsResult;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.Logger;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "GooglePlayBilling")
public class GooglePlayBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private BillingClient billingClient;
    private PluginCall purchaseCall;
    private String pendingProductId;

    @Override
    public void load() {
        try {
            Logger.debug("GooglePlayBilling", "Initializing GooglePlayBilling plugin");
            PendingPurchasesParams pendingPurchasesParams = PendingPurchasesParams.newBuilder()
                .enableOneTimeProducts()
                .build();

            billingClient = BillingClient.newBuilder(getContext())
                .setListener(this)
                .enablePendingPurchases(pendingPurchasesParams)
                .enableAutoServiceReconnection()
                .build();
        } catch (Exception ex) {
            Logger.error("GooglePlayBilling", "Failed to initialize BillingClient", ex);
            throw ex;
        }
    }

    @PluginMethod
    public void purchaseSubscription(PluginCall call) {
        String productId = call.getString("productId");
        if (productId == null || productId.trim().isEmpty()) {
            call.reject("Missing productId.");
            return;
        }

        purchaseCall = call;
        pendingProductId = productId;

        ensureConnected(() -> queryAndLaunchSubscription(productId));
    }

    @PluginMethod
    public void queryActiveSubscriptions(PluginCall call) {
        ensureConnected(() -> {
            QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.SUBS)
                .build();

            billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.reject(billingResult.getDebugMessage());
                    return;
                }

                JSArray result = new JSArray();
                for (Purchase purchase : purchases) {
                    result.put(purchaseToJson(purchase));
                }

                JSObject response = new JSObject();
                response.put("purchases", result);
                call.resolve(response);
            });
        }, call::reject);
    }

    private void ensureConnected(Runnable onReady) {
        ensureConnected(onReady, this::rejectPurchaseCall);
    }

    private void ensureConnected(Runnable onReady, ErrorHandler onError) {
        if (billingClient.isReady()) {
            onReady.run();
            return;
        }

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    onReady.run();
                    return;
                }

                onError.onError(billingResult.getDebugMessage());
            }

            @Override
            public void onBillingServiceDisconnected() {
                onError.onError("Google Play Billing service disconnected.");
            }
        });
    }

    private interface ErrorHandler {
        void onError(String message);
    }

    private void queryAndLaunchSubscription(String productId) {
        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
            .setProductId(productId)
            .setProductType(BillingClient.ProductType.SUBS)
            .build();

        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(Collections.singletonList(product))
            .build();

        billingClient.queryProductDetailsAsync(params, this::onProductDetailsResult);
    }

    private void onProductDetailsResult(BillingResult billingResult, QueryProductDetailsResult productDetailsResult) {
        if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            rejectPurchaseCall(billingResult.getDebugMessage());
            return;
        }

        List<ProductDetails> productDetailsList = productDetailsResult.getProductDetailsList();
        if (productDetailsList.isEmpty()) {
            rejectPurchaseCall("Premium subscription is not available yet.");
            return;
        }

        ProductDetails productDetails = productDetailsList.get(0);
        List<ProductDetails.SubscriptionOfferDetails> offers = productDetails.getSubscriptionOfferDetails();
        if (offers == null || offers.isEmpty()) {
            rejectPurchaseCall("Premium subscription has no active offer.");
            return;
        }

        BillingFlowParams.ProductDetailsParams productDetailsParams =
            BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(productDetails)
                .setOfferToken(offers.get(0).getOfferToken())
                .build();

        BillingFlowParams billingFlowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(Collections.singletonList(productDetailsParams))
            .build();

        BillingResult launchResult = billingClient.launchBillingFlow(getActivity(), billingFlowParams);
        if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            rejectPurchaseCall(launchResult.getDebugMessage());
        }
    }

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        if (purchaseCall == null) return;

        if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            rejectPurchaseCall("Purchase cancelled.");
            return;
        }

        if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null) {
            rejectPurchaseCall(billingResult.getDebugMessage());
            return;
        }

        for (Purchase purchase : purchases) {
            if (!purchase.getProducts().contains(pendingProductId)) continue;

            if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) {
                JSObject response = purchaseToJson(purchase);
                response.put("pending", true);
                resolvePurchaseCall(response);
                return;
            }

            if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                acknowledgeAndResolve(purchase);
                return;
            }
        }

        rejectPurchaseCall("No matching Premium purchase returned.");
    }

    private void acknowledgeAndResolve(Purchase purchase) {
        if (purchase.isAcknowledged()) {
            resolvePurchaseCall(purchaseToJson(purchase));
            return;
        }

        AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.getPurchaseToken())
            .build();

        billingClient.acknowledgePurchase(params, billingResult -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                rejectPurchaseCall(billingResult.getDebugMessage());
                return;
            }

            resolvePurchaseCall(purchaseToJson(purchase));
        });
    }

    private JSObject purchaseToJson(Purchase purchase) {
        JSObject result = new JSObject();
        JSArray products = new JSArray();
        for (String product : purchase.getProducts()) {
            products.put(product);
        }

        result.put("products", products);
        result.put("orderId", purchase.getOrderId());
        result.put("purchaseToken", purchase.getPurchaseToken());
        result.put("purchaseTime", purchase.getPurchaseTime());
        result.put("purchaseState", purchase.getPurchaseState());
        result.put("acknowledged", purchase.isAcknowledged());
        result.put("pending", purchase.getPurchaseState() == Purchase.PurchaseState.PENDING);
        return result;
    }

    private void resolvePurchaseCall(JSObject response) {
        if (purchaseCall != null) {
            purchaseCall.resolve(response);
        }
        clearPurchaseCall();
    }

    private void rejectPurchaseCall(String message) {
        if (purchaseCall != null) {
            purchaseCall.reject(message == null || message.isEmpty() ? "Google Play Billing failed." : message);
        }
        clearPurchaseCall();
    }

    private void clearPurchaseCall() {
        purchaseCall = null;
        pendingProductId = null;
    }

    @Override
    protected void handleOnDestroy() {
        if (billingClient != null) {
            billingClient.endConnection();
        }
    }
}
