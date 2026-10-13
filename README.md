# Reisefølge

An iOS-first shared travel journal built with Expo, React Native, TypeScript, and Expo Router. The included demo journey is **Spania 2026**.

## Run locally

```bash
npm install
npx expo start
```

Open the QR code in Expo Go, or launch an iOS simulator with `npm run ios`. The app works with realistic local demo data before any backend keys are configured.

## Environment

Copy `.env.example` to `.env` and add the public Supabase URL and anon key. The client intentionally remains in demo mode when either value is absent. Never put a Supabase service-role key in an Expo app.

Run `supabase/migrations/20261013170000_reisefolge.sql` in the Supabase SQL editor or with the Supabase CLI. It creates the travel model, enables RLS on every application table, and limits trips, activities, checklists, wishes, votes, and memories to trip members. Create a **private** Storage bucket named `trip-media`; media object paths must begin with the trip UUID, for example `trip-id/memory.jpg`.

## RevenueCat

The Premium screen uses a local development entitlement unless `EXPO_PUBLIC_REVENUECAT_IOS_KEY` is present. This makes the map feature gate and “Gjenopprett kjøp” flow testable without simulating a charge.

Before App Store distribution:

1. Create the one-time `Premium for alltid` product in App Store Connect and RevenueCat.
2. Add `react-native-purchases` to an EAS development build (it is not available in Expo Go).
3. Configure the public iOS SDK key as `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.
4. Replace the documented adapter in `src/lib/purchases.ts` with `Purchases.getCustomerInfo()` and `Purchases.restorePurchases()`.

Widgets and reusable packing templates are deliberately labelled as future work, matching the first-version scope.
