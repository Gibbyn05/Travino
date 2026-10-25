import { useLocalSearchParams } from 'expo-router';
import { InviteLanding } from '@/src/invite-landing';

export default function BrowserInviteRoute() {
  const { token } = useLocalSearchParams<{ token?: string | string[] }>();
  return <InviteLanding token={token} browserOnly/>;
}
