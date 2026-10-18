# Travino

An iOS-first shared travel journal built with Expo, React Native, TypeScript, and Expo Router. It starts with the editable **Spain 2026** demo journey so the end-to-end flow is immediately visible.

## Run locally

```bash
npm install
npx expo start
```

Open the QR code in Expo Go, or launch an iOS simulator with `npm run ios`. Trips, plans, packing items, wishes, profile details, and selected memories are cached locally, so the active trip and Today view remain available offline.

## Environment

Copy `.env.example` to `.env` and add the public Supabase URL and anon key to enable authentication and shared, cross-device syncing. Never put a Supabase service-role key in an Expo app. Enable anonymous sign-ins in Supabase to support lightweight guest invitations; guests can later upgrade to a permanent account.

Run the SQL files in `supabase/migrations` in timestamp order in the Supabase SQL editor or with the Supabase CLI. The profiles/friends migration adds short friend codes, friend requests, friends-only profile visibility, and a private `memory-book` storage bucket; no memory book is shared until its owner switches sharing on in Profile. Friends can see the selected memory photos only after accepting a request. Trip plans, packing lists and wishes are never exposed by memory-book sharing. Each user's friend code is visible in Profile → Friends and can be shared with people they know.

## Trip push notifications

Remote push notifications require an EAS development/App Store build; Expo Go cannot receive them. Create/link an Expo project (`npx eas-cli init`), set its project UUID as `EXPO_PUBLIC_EAS_PROJECT_ID` in `.env` and in the EAS build environment, then build with `eas build --profile development --platform ios`. Apply the migrations in order, including `20261014140000_trip_push_notifications.sql`, and deploy the authenticated Edge Function with `supabase functions deploy trip-notifications` from a logged-in Supabase CLI connected to this project. The function checks accepted friendship and trip membership before sending through Expo's push service. Friends must have completed onboarding and allowed notifications on their phone to receive them. A friend added by an invite link without an accepted friend-code relationship is not eligible for push assignment yet.

The first version stores each trip in its creator's private travel state; these push notifications do not yet make the trip's full packing list live/shared on another account. The notification tells the invited friend what trip or item was assigned, while full cross-account trip syncing remains separate work.

## RevenueCat

Premium purchasing is intentionally not simulated. All current app features remain available until a real App Store product and RevenueCat integration are configured.

Before App Store distribution:

1. Create the one-time `Premium for alltid` product in App Store Connect and RevenueCat.
2. Add `react-native-purchases` to an EAS development build (it is not available in Expo Go).
3. Configure the public iOS SDK key as `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.
4. Replace the documented adapter in `src/lib/purchases.ts` with `Purchases.getCustomerInfo()` and `Purchases.restorePurchases()`.

Widgets and reusable packing templates are deliberately labelled as future work, matching the first-version scope.
