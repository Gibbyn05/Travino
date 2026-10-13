# Reisefølge

An iOS-first shared travel journal built with Expo, React Native, TypeScript, and Expo Router. Start by creating your own trip in onboarding; no trip data is preloaded.

## Run locally

```bash
npm install
npx expo start
```

Open the QR code in Expo Go, or launch an iOS simulator with `npm run ios`. Trips, plans, packing items, wishes, profile details, and selected memories are stored locally on the device until Supabase is connected.

## Environment

Copy `.env.example` to `.env` and add the public Supabase URL and anon key when you are ready to add authentication and shared, cross-device syncing. Never put a Supabase service-role key in an Expo app.

Run `supabase/migrations/20261013170000_reisefolge.sql` in the Supabase SQL editor or with the Supabase CLI. It creates the travel model, enables RLS on every application table, and limits trips, activities, checklists, wishes, votes, and memories to trip members. Create a **private** Storage bucket named `trip-media`; media object paths must begin with the trip UUID, for example `trip-id/memory.jpg`.

## RevenueCat

Premium purchasing is intentionally not simulated. All current app features remain available until a real App Store product and RevenueCat integration are configured.

Before App Store distribution:

1. Create the one-time `Premium for alltid` product in App Store Connect and RevenueCat.
2. Add `react-native-purchases` to an EAS development build (it is not available in Expo Go).
3. Configure the public iOS SDK key as `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.
4. Replace the documented adapter in `src/lib/purchases.ts` with `Purchases.getCustomerInfo()` and `Purchases.restorePurchases()`.

Widgets and reusable packing templates are deliberately labelled as future work, matching the first-version scope.
