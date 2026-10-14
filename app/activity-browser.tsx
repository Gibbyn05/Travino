import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '@/src/theme';

export default function ActivityBrowserScreen() {
  const router = useRouter();
  const webView = useRef<WebView>(null);
  const params = useLocalSearchParams<{ activity?: string; city?: string; country?: string }>();
  const activity = String(params.activity || 'Things to do');
  const city = String(params.city || '');
  const country = String(params.country || '');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const url = useMemo(() => {
    const query = [activity, city, country].filter(Boolean).join(' ');
    return `https://www.getyourguide.com/s/?q=${encodeURIComponent(query)}`;
  }, [activity, city, country]);

  return <View style={s.page}>
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={s.back}>
        <Ionicons name="chevron-back" size={23} color={colors.text}/>
      </Pressable>
      <View style={s.heading}>
        <Text style={s.title} numberOfLines={1}>{activity}</Text>
        <Text style={s.subtitle} numberOfLines={1}>{[city, country].filter(Boolean).join(', ')} · GetYourGuide</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Reload activities" onPress={() => { setFailed(false); setLoading(true); webView.current?.reload(); }} style={s.reload}>
        <Ionicons name="refresh-outline" size={20} color={colors.blue}/>
      </Pressable>
    </View>
    <View style={s.webContainer}>
      <WebView
        ref={webView}
        source={{ uri: url }}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        originWhitelist={['https://*']}
        onLoadStart={() => { setLoading(true); setFailed(false); }}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setLoading(false); setFailed(true); }}
        onHttpError={(event) => { if (event.nativeEvent.statusCode >= 400) { setLoading(false); setFailed(true); } }}
        onShouldStartLoadWithRequest={(request) => {
          try {
            const host = new URL(request.url).hostname.toLowerCase();
            return host === 'getyourguide.com' || host.endsWith('.getyourguide.com');
          } catch { return false; }
        }}
        style={s.webView}
      />
      {loading && <View pointerEvents="none" style={s.loading}><ActivityIndicator size="large" color={colors.blue}/><Text style={s.loadingText}>Loading experiences…</Text></View>}
      {failed && <View style={s.error}>
        <View style={s.errorIcon}><Ionicons name="compass-outline" size={28} color={colors.blue}/></View>
        <Text style={s.errorTitle}>Couldn’t load activities</Text>
        <Text style={s.errorCopy}>Check your connection and try again.</Text>
        <Pressable onPress={() => { setFailed(false); setLoading(true); webView.current?.reload(); }} style={s.retry}><Text style={s.retryText}>Try again</Text></Pressable>
      </View>}
    </View>
  </View>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 92, paddingHorizontal: 14, paddingTop: 48, paddingBottom: 10, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { width: 42, height: 42, borderRadius: 16, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1 },
  title: { color: colors.text, fontSize: 17, fontWeight: '700', letterSpacing: -.3 },
  subtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  reload: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  webContainer: { flex: 1, backgroundColor: colors.surface },
  webView: { flex: 1, backgroundColor: colors.surface },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, gap: 12 },
  loadingText: { color: colors.muted, fontSize: 14 },
  error: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: colors.background },
  errorIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  errorTitle: { color: colors.text, fontSize: 19, fontWeight: '700' },
  errorCopy: { color: colors.muted, fontSize: 14, marginTop: 6 },
  retry: { marginTop: 20, borderRadius: 999, backgroundColor: colors.blue, paddingHorizontal: 25, paddingVertical: 12 },
  retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
