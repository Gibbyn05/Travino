/**
 * RevenueCat hand-off point. This keeps Expo Go usable during development and
 * intentionally never treats a local entitlement as a real App Store purchase.
 */
export const revenueCatConfigured = Boolean(process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY);

export async function restorePurchases() {
  if (!revenueCatConfigured) return { premium: true, source: 'local-development' as const };
  // Add react-native-purchases in an EAS development build, configure it with
  // EXPO_PUBLIC_REVENUECAT_IOS_KEY, then replace this adapter with Purchases.restorePurchases().
  return { premium: false, source: 'revenuecat-not-linked' as const };
}
