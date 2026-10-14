import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, PageTitle, Section } from '@/src/ui';
import { colors } from '@/src/theme';
import { useTravel } from '@/src/store';

export default function TodayScreen() {
  const { selectedTrip } = useTravel();
  if (!selectedTrip) return <View style={s.empty}><View style={s.emptyIcon}><Ionicons name="sunny-outline" size={30} color={colors.blue}/></View><Text style={s.emptyText}>Create a trip to see your day here.</Text></View>;
  const today = new Date().toISOString().slice(0, 10);
  const activities = selectedTrip.activities.filter((item) => item.date === today);
  const next = activities[0];
  const remaining = selectedTrip.packing.filter((item) => !item.done);
  return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <PageTitle eyebrow={selectedTrip.city}>Today</PageTitle>
    <LinearGradient colors={['#EFF8FF', '#F5F0FF', '#FFF1F7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.top}>
      <View style={s.sunIcon}><Ionicons name="sunny" size={25} color={colors.blue}/></View>
      <Text style={s.date}>{today}</Text><Text style={s.topCopy}>What matters most right now.</Text>
    </LinearGradient>
    <Section title="Today's plan">{next ? <Card style={s.nextCard}><View style={s.nextLabel}><View style={s.nextDot}/><Text style={s.nextLabelText}>Up next</Text></View><Text style={s.activityTitle}>{next.title}</Text><Text style={s.activityMeta}>{next.startTime}{next.endTime ? `–${next.endTime}` : ''}{next.location ? ` · ${next.location}` : ''}</Text>{next.note && <Text style={s.note}>{next.note}</Text>}</Card> : <Card style={s.quietCard}><Ionicons name="calendar-clear-outline" size={25} color={colors.purple}/><Text style={s.copy}>No activities have been added for today.</Text></Card>}{activities.slice(1).map((item) => <Card key={item.id} style={s.activityCard}><View style={s.timelineDot}/><View style={{ flex: 1 }}><Text style={s.activityTitleSmall}>{item.title}</Text><Text style={s.activityMeta}>{item.startTime}{item.endTime ? `–${item.endTime}` : ''}{item.location ? ` · ${item.location}` : ''}</Text>{item.note && <Text style={s.note}>{item.note}</Text>}</View></Card>)}</Section>
    <Section title="Open tasks"><Card style={s.tasksCard}><View style={s.tasksIcon}><Ionicons name="bag-handle-outline" size={21} color={colors.purple}/></View><Text style={s.copy}>{remaining.length ? remaining.map((item) => item.title).join(' · ') : 'Everything on the packing list is ready.'}</Text></Card></Section>
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background }, content: { padding: 16, paddingTop: 72, paddingBottom: 42 },
  top: { borderRadius: 24, borderWidth: 1, borderColor: '#E8E9FB', minHeight: 166, padding: 22, justifyContent: 'flex-end' },
  sunIcon: { position: 'absolute', right: 20, top: 20, width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFFFFFBB', alignItems: 'center', justifyContent: 'center' },
  date: { color: colors.text, fontSize: 24, fontWeight: '700', letterSpacing: -.8 }, topCopy: { color: colors.muted, fontSize: 14, marginTop: 6 },
  nextCard: { backgroundColor: colors.blueSoft, borderColor: '#D9EAFF', padding: 21 },
  nextLabel: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 }, nextDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.blue },
  nextLabelText: { color: colors.blue, fontSize: 12, fontWeight: '600' }, activityTitle: { color: colors.text, fontSize: 20, fontWeight: '700', letterSpacing: -.5 },
  activityTitleSmall: { color: colors.text, fontSize: 16, fontWeight: '600' }, activityMeta: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6 },
  note: { color: colors.text, fontSize: 13, lineHeight: 20, marginTop: 12 },
  quietCard: { alignItems: 'center', gap: 12, paddingVertical: 28, backgroundColor: colors.purpleSoft, borderColor: colors.purpleSoft },
  activityCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.pink, marginTop: 5 },
  tasksCard: { flexDirection: 'row', alignItems: 'center', gap: 12 }, tasksIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' },
  copy: { color: colors.muted, fontSize: 14, lineHeight: 21, flexShrink: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 34 }, emptyIcon: { width: 62, height: 62, borderRadius: 23, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 17 }, emptyText: { color: colors.text, textAlign: 'center', fontSize: 17, fontWeight: '600', lineHeight: 25, maxWidth: 260 },
});
