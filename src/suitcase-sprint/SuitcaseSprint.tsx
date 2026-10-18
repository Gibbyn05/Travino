import { View } from 'react-native';

// Metro resolves SuitcaseSprint.web.tsx for the waitlist page. This tiny
// platform fallback keeps TypeScript and native bundles independent of DOM APIs.
export const PACKING_ITEMS = [] as const;

export function SuitcaseSprint(_: { onJoinWaitlist: () => void }) {
  return <View />;
}
