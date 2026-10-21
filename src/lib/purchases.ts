export type PremiumPlanId = 'monthly' | 'annual';

export type PremiumPlan = {
  id: PremiumPlanId;
  storeProductId: string;
  label: string;
  monthlyPrice: string;
  totalPrice: string;
  crossedOutPrice?: string;
  billingCopy: string;
  popular?: boolean;
};

// Change the placeholder prices and App Store product IDs in this one place
// when the real products are configured in App Store Connect and RevenueCat.
export const PREMIUM_PLANS: Record<PremiumPlanId, PremiumPlan> = {
  monthly: {
    id: 'monthly',
    storeProductId: 'travino_premium_monthly',
    label: '1 Month',
    monthlyPrice: '$9.99 / month',
    totalPrice: '$9.99',
    billingCopy: 'Billed monthly after your 7-day trial',
  },
  annual: {
    id: 'annual',
    storeProductId: 'travino_premium_annual',
    label: '12 Months',
    monthlyPrice: '$5.99 / month',
    totalPrice: '$71.88 billed annually',
    crossedOutPrice: '$119.88',
    billingCopy: 'Billed annually after your 7-day trial',
    popular: true,
  },
};

export type PurchaseResult =
  | { status: 'purchased' }
  | { status: 'unavailable'; reason: string };

/**
 * TODO: Replace with RevenueCat or StoreKit purchase logic before release.
 * The current app deliberately keeps premium purchasing disabled.
 */
export async function purchasePremium(_plan: PremiumPlan): Promise<PurchaseResult> {
  return {
    status: 'unavailable',
    reason: 'Purchases are not connected yet. Configure RevenueCat before release.',
  };
}

/**
 * TODO: Replace with Purchases.restorePurchases() or StoreKit restore logic.
 */
export async function restorePremiumPurchases(): Promise<PurchaseResult> {
  return {
    status: 'unavailable',
    reason: 'Restore purchases is not connected yet. Configure RevenueCat before release.',
  };
}
