import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, PanResponder, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { CapybaraMoment } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { Memory, Trip } from '@/src/store';
import { formatJournalDate, parseTravelDate } from '@/src/dates';

const coverPalette = [
  { cover: '#29476D', shade: '#203B5D', ink: '#F9F0DB' },
  { cover: '#75638E', shade: '#5E4C77', ink: '#FFF9EC' },
  { cover: '#C85D5B', shade: '#A94A50', ink: '#FFF6E8' },
  { cover: '#426C59', shade: '#315646', ink: '#FFF7E7' },
  { cover: '#B88135', shade: '#966A28', ink: '#FFF8E8' },
  { cover: '#317D7B', shade: '#286563', ink: '#F5FFFB' },
];

type CoverArt = keyof typeof Ionicons.glyphMap;
type Spread = { id: string; day: string; place: string; memories: Memory[] };

export function journalPalette(index: number) { return coverPalette[index % coverPalette.length]; }

export function JournalBook({ trip, index, onPress }: { trip: Trip; index: number; onPress: () => void }) {
  const palette = journalPalette(index);
  const destination = [trip.city, trip.country].filter(Boolean).join(', ');
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${trip.title}, ${destination}`} onPress={onPress} style={({ pressed }) => [bookStyles.pressable, pressed && bookStyles.pressed]}>
    <View style={[bookStyles.cover, { backgroundColor: palette.cover }]}>
      <View style={[bookStyles.spine, { backgroundColor: palette.shade }]}/>
      <View style={bookStyles.spineHighlight}/>
      <View style={bookStyles.coverArt}><Ionicons name={coverArtFor(destination)} size={46} color={palette.ink}/></View>
      <View style={[bookStyles.coverLine, { backgroundColor: `${palette.ink}66` }]}/>
      <Text numberOfLines={2} style={[bookStyles.coverDestination, { color: palette.ink }]}>{destination || 'A new place'}</Text>
      <View style={bookStyles.pageBlock}/>
      <View style={bookStyles.bookmark}/>
    </View>
    <Text numberOfLines={1} style={bookStyles.title}>{trip.title}</Text>
    <Text numberOfLines={1} style={bookStyles.destination}>{destination}</Text>
  </Pressable>;
}

export function MemoryJournal({ trip, onAddMemory }: { trip: Trip; onAddMemory: () => void }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const spreadWidth = Math.min(width - 32, 520);
  const nativeDriver = Platform.OS !== 'web';
  const [reduceMotion, setReduceMotion] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const openProgress = useRef(new Animated.Value(0)).current;
  const pageProgress = useRef(new Animated.Value(1)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const pages = useMemo(() => makeSpreads(trip), [trip]);
  const current = pages[pageIndex];

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription?.remove(); };
  }, []);

  useEffect(() => {
    const animation = reduceMotion
      ? Animated.timing(openProgress, { toValue: 1, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: nativeDriver })
      : Animated.spring(openProgress, { toValue: 1, friction: 9, tension: 68, useNativeDriver: nativeDriver });
    animation.start(() => setOpen(true));
  }, [nativeDriver, openProgress, reduceMotion]);

  const close = () => {
    setOpen(false);
    const animation = reduceMotion
      ? Animated.timing(openProgress, { toValue: 0, duration: 150, useNativeDriver: nativeDriver })
      : Animated.spring(openProgress, { toValue: 0, friction: 10, tension: 70, useNativeDriver: nativeDriver });
    animation.start(() => router.back());
  };

  const turn = (direction: 1 | -1) => {
    const next = pageIndex + direction;
    if (next < 0 || next >= pages.length) {
      Animated.spring(dragX, { toValue: 0, friction: 8, useNativeDriver: nativeDriver }).start();
      return;
    }
    if (reduceMotion) {
      pageProgress.setValue(0);
      setPageIndex(next);
      Animated.timing(pageProgress, { toValue: 1, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: nativeDriver }).start();
      return;
    }
    Animated.spring(dragX, { toValue: direction * -spreadWidth, friction: 10, tension: 80, useNativeDriver: nativeDriver }).start(() => {
      setPageIndex(next);
      dragX.setValue(0);
    });
  };

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => open && Math.abs(gesture.dx) > 5 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => {
      const direction = gesture.dx < 0 ? 1 : -1;
      const possible = pageIndex + direction >= 0 && pageIndex + direction < pages.length;
      dragX.setValue(possible ? Math.max(-spreadWidth, Math.min(spreadWidth, gesture.dx)) : gesture.dx * .18);
    },
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) > spreadWidth * .19) turn(gesture.dx < 0 ? 1 : -1);
      else Animated.spring(dragX, { toValue: 0, friction: 8, tension: 90, useNativeDriver: nativeDriver }).start();
    },
    onPanResponderTerminate: () => Animated.spring(dragX, { toValue: 0, friction: 8, useNativeDriver: nativeDriver }).start(),
  }), [dragX, nativeDriver, open, pageIndex, pages.length, spreadWidth]);

  const bookScale = openProgress.interpolate({ inputRange: [0, 1], outputRange: [.76, 1] });
  const coverRotation = openProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-169deg'] });
  const coverOpacity = openProgress.interpolate({ inputRange: [0, .82, 1], outputRange: [1, 1, 0] });
  const pageRotation = dragX.interpolate({ inputRange: [-spreadWidth, 0, spreadWidth], outputRange: ['-76deg', '0deg', '76deg'], extrapolate: 'clamp' });
  const pageTranslate = dragX.interpolate({ inputRange: [-spreadWidth, 0, spreadWidth], outputRange: [-spreadWidth * .12, 0, spreadWidth * .12], extrapolate: 'clamp' });
  const currentLabel = current ? `${current.day}, ${current.place}, ${current.memories.length} ${current.memories.length === 1 ? 'photo' : 'photos'}${current.memories[0]?.text ? `, ${current.memories[0].text}` : ''}` : 'Journal with no memories yet';

  return <View style={journalStyles.page}>
    <View style={journalStyles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close journal" onPress={close} style={journalStyles.headerButton}><Ionicons name="chevron-back" size={22} color="#FFF8EB"/></Pressable>
      <View style={journalStyles.headerText}><Text numberOfLines={1} style={journalStyles.headerTitle}>{trip.title}</Text><Text numberOfLines={1} style={journalStyles.headerPlace}>{[trip.city, trip.country].filter(Boolean).join(', ')}</Text></View>
      <View style={journalStyles.headerSpacer}/>
    </View>

    <View style={journalStyles.stage}>
      <Animated.View style={[journalStyles.openBook, { width: spreadWidth, opacity: openProgress, transform: [{ scale: bookScale }] }]} accessibilityLabel={currentLabel} accessibilityRole="summary" {...responder.panHandlers}>
        <PageEdges side="left" count={pageIndex}/><PageEdges side="right" count={Math.max(pages.length - pageIndex - 1, 0)}/>
        <Animated.View style={[journalStyles.spread, { opacity: pageProgress }]}>
          <ScrapPage side="left" spread={current} trip={trip} onAddMemory={onAddMemory}/>
          <View style={journalStyles.crease}/>
          <ScrapPage side="right" spread={current} trip={trip} onAddMemory={onAddMemory}/>
        </Animated.View>
        {!reduceMotion && <Animated.View pointerEvents="none" style={[journalStyles.turningPage, { transform: [{ perspective: 900 }, { translateX: pageTranslate }, { rotateY: pageRotation }] }]}><View style={journalStyles.turningPageFace}/></Animated.View>}
        {!reduceMotion && <Animated.View pointerEvents="none" style={[journalStyles.frontCover, { opacity: coverOpacity, transform: [{ perspective: 900 }, { rotateY: coverRotation }] }]}><JournalCoverFace trip={trip}/></Animated.View>}
      </Animated.View>
    </View>

    <View style={journalStyles.pageHint}><Text style={journalStyles.pageHintText}>{pages.length ? `${pageIndex + 1} / ${pages.length}` : 'First page'}</Text><Text style={journalStyles.swipeHint}>{reduceMotion ? 'Swipe to browse' : 'Swipe to turn a page'}</Text></View>
    <View style={journalStyles.toolbar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Add a memory" onPress={onAddMemory} style={journalStyles.toolButton}><Ionicons name="add" size={26} color={colors.blue}/></Pressable>
    </View>
  </View>;
}

function ScrapPage({ side, spread, trip, onAddMemory }: { side: 'left' | 'right'; spread?: Spread; trip: Trip; onAddMemory: () => void }) {
  if (!spread) return <View style={[journalStyles.paper, side === 'left' ? journalStyles.leftPaper : journalStyles.rightPaper]}><CapybaraMoment size={86} waving/><Text style={journalStyles.emptyTitle}>A page for your first moment</Text><Text style={journalStyles.emptyCopy}>Add a photo after the trip and it will find a home here.</Text><Pressable accessibilityRole="button" onPress={onAddMemory} style={journalStyles.paperButton}><Text style={journalStyles.paperButtonText}>Add a memory</Text></Pressable></View>;
  const photos = side === 'left' ? spread.memories.slice(0, 2) : spread.memories.slice(2, 4);
  const showDetails = side === 'left';
  return <View style={[journalStyles.paper, side === 'left' ? journalStyles.leftPaper : journalStyles.rightPaper]}>
    {showDetails && <><View style={journalStyles.tape}><Text numberOfLines={1} style={journalStyles.tapeText}>{spread.place.toUpperCase()}</Text></View><Text style={journalStyles.dayTitle}>{spread.day}</Text></>}
    {photos.length ? <View style={journalStyles.collage}>{photos.map((memory, index) => <MemoryPhoto key={memory.id} memory={memory} index={index} compact={!showDetails}/>)}</View> : <View style={journalStyles.blankPage}><CapybaraMoment size={48}/><Text style={journalStyles.blankCopy}>The rest of this page is yours.</Text></View>}
    {showDetails && <Text numberOfLines={2} style={journalStyles.handwriting}>{spread.memories.find((memory) => memory.text)?.text || `A small piece of ${trip.city || trip.country} worth keeping.`}</Text>}
    {side === 'right' && <View style={journalStyles.capySticker}><CapybaraMoment size={42}/></View>}
  </View>;
}

function MemoryPhoto({ memory, index, compact }: { memory: Memory; index: number; compact: boolean }) {
  const rotations = compact ? [3, -3] : [-3, 3];
  return <View style={[journalStyles.photo, compact && journalStyles.compactPhoto, { transform: [{ rotate: `${rotations[index % rotations.length]}deg` }] }]}>
    <Image source={{ uri: memory.image }} style={journalStyles.photoImage}/>
    <Text numberOfLines={1} style={journalStyles.photoCaption}>{memory.location || formatJournalDate(memory.date)}</Text>
  </View>;
}

function PageEdges({ side, count }: { side: 'left' | 'right'; count: number }) {
  const visible = Math.min(count, 5);
  return <View pointerEvents="none" style={[journalStyles.edges, side === 'left' ? journalStyles.leftEdges : journalStyles.rightEdges]}>{Array.from({ length: visible }).map((_, index) => <View key={index} style={[journalStyles.edge, side === 'left' ? { left: -5 - index * 4 } : { right: -5 - index * 4 }, { opacity: 1 - index * .13 }]}/>)}</View>;
}

function JournalCoverFace({ trip }: { trip: Trip }) {
  const palette = journalPalette(0);
  return <View style={[journalStyles.coverFace, { backgroundColor: palette.cover }]}><View style={[journalStyles.coverFaceSpine, { backgroundColor: palette.shade }]}/><Ionicons name={coverArtFor(`${trip.city} ${trip.country}`)} size={58} color={palette.ink}/><Text numberOfLines={2} style={[journalStyles.coverFaceTitle, { color: palette.ink }]}>{trip.title}</Text><Text style={[journalStyles.coverFacePlace, { color: palette.ink }]}>{[trip.city, trip.country].filter(Boolean).join(', ')}</Text><View style={journalStyles.coverFacePages}/><View style={journalStyles.coverFaceRibbon}/></View>;
}

function coverArtFor(destination: string): CoverArt {
  const value = destination.toLowerCase();
  if (/beach|coast|island|mallorca|crete|madeira|bali|phuket|hawaii|ibiza|cancun/.test(value)) return 'sunny-outline';
  if (/alps|mountain|swiss|norway|dolomite|troms|hike/.test(value)) return 'triangle-outline';
  if (/paris|rome|london|tokyo|new york|city|berlin|barcelona/.test(value)) return 'business-outline';
  if (/flight|airport|trip|journey/.test(value)) return 'airplane-outline';
  return 'earth-outline';
}

function makeSpreads(trip: Trip): Spread[] {
  const sorted = [...trip.memories].sort((a, b) => (parseTravelDate(a.date)?.getTime() ?? 0) - (parseTravelDate(b.date)?.getTime() ?? 0));
  const grouped = sorted.reduce<Record<string, Spread>>((all, memory) => {
    const key = `${memory.date}|${memory.location || trip.city || trip.country}`;
    const current = all[key] || { id: key, day: formatJournalDate(memory.date), place: memory.location || trip.city || trip.country || 'A favourite place', memories: [] };
    current.memories.push(memory);
    all[key] = current;
    return all;
  }, {});
  return Object.values(grouped);
}

const bookStyles = StyleSheet.create({
  pressable: { width: '48%', marginBottom: 26 }, pressed: { opacity: .82, transform: [{ scale: .975 }] },
  cover: { height: 190, borderRadius: 13, overflow: 'visible', padding: 20, justifyContent: 'space-between', shadowColor: '#4A392B', shadowOpacity: .18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 16, borderTopLeftRadius: 13, borderBottomLeftRadius: 13 }, spineHighlight: { position: 'absolute', left: 17, top: 8, bottom: 11, width: 2, backgroundColor: 'rgba(255,255,255,.3)', borderRadius: 2 },
  coverArt: { alignSelf: 'center', marginTop: 10 }, coverLine: { height: 1, width: '100%', marginTop: 8 }, coverDestination: { fontFamily: fonts.heading, fontSize: 15, lineHeight: 18, textAlign: 'center', marginTop: 9 },
  pageBlock: { position: 'absolute', left: 5, right: 4, bottom: -6, height: 13, borderRadius: 3, backgroundColor: '#FFFDF6', borderTopWidth: 1, borderColor: '#E5DCCF', zIndex: -1 }, bookmark: { position: 'absolute', left: '50%', marginLeft: -9, bottom: -21, width: 18, height: 27, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, backgroundColor: '#E78B43', zIndex: -2 },
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 14, lineHeight: 18, marginTop: 18 }, destination: { color: '#89847B', fontSize: 12, marginTop: 3 },
});

const journalStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#3A2A25', paddingTop: 54, paddingBottom: 22 },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 }, headerButton: { height: 44, width: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,248,235,.28)', alignItems: 'center', justifyContent: 'center' }, headerText: { flex: 1, alignItems: 'center', paddingHorizontal: 8 }, headerTitle: { color: '#FFF8EB', fontFamily: fonts.heading, fontSize: 17, maxWidth: 210 }, headerPlace: { color: '#E2CDB7', fontSize: 11, marginTop: 1 }, headerSpacer: { width: 44 },
  stage: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 10 }, openBook: { aspectRatio: 1.37, maxHeight: 430, position: 'relative' },
  edges: { position: 'absolute', top: 13, bottom: 8, width: 22, zIndex: -1 }, leftEdges: { left: 0 }, rightEdges: { right: 0 }, edge: { position: 'absolute', top: 0, bottom: 0, width: 16, borderRadius: 4, backgroundColor: '#EAE0D3', shadowColor: '#000', shadowOpacity: .12, shadowRadius: 4, shadowOffset: { width: 1, height: 2 } },
  spread: { flex: 1, flexDirection: 'row', overflow: 'hidden', borderRadius: 11, backgroundColor: '#F9F0DF', shadowColor: '#0B0604', shadowOpacity: .34, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  paper: { flex: 1, overflow: 'hidden', padding: 15, backgroundColor: '#FBF2E2' }, leftPaper: { borderTopLeftRadius: 11, borderBottomLeftRadius: 11 }, rightPaper: { borderTopRightRadius: 11, borderBottomRightRadius: 11 }, crease: { width: 5, backgroundColor: 'rgba(109,76,54,.17)', shadowColor: '#63442E', shadowOpacity: .35, shadowRadius: 5, shadowOffset: { width: 1, height: 0 }, zIndex: 3 },
  tape: { alignSelf: 'flex-start', maxWidth: '94%', backgroundColor: '#E7BC78', paddingHorizontal: 8, paddingVertical: 4, transform: [{ rotate: '-2deg' }], marginTop: 1 }, tapeText: { color: '#5C4738', fontSize: 7, fontWeight: '800', letterSpacing: .7 }, dayTitle: { color: '#44362C', fontFamily: fonts.heading, fontSize: 17, lineHeight: 20, marginTop: 9 },
  collage: { flex: 1, justifyContent: 'center', gap: 8, paddingTop: 8 }, photo: { backgroundColor: '#FFFDF9', padding: 4, paddingBottom: 8, borderRadius: 2, shadowColor: '#76533A', shadowOpacity: .2, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, compactPhoto: { paddingBottom: 6 }, photoImage: { width: '100%', aspectRatio: 1.15, borderRadius: 1, backgroundColor: '#E1D3C1' }, photoCaption: { color: '#786B5E', fontSize: 8, fontStyle: 'italic', marginTop: 4, paddingHorizontal: 2 }, handwriting: { color: '#755E4D', fontSize: 10, lineHeight: 14, fontStyle: 'italic', marginTop: 4 }, capySticker: { position: 'absolute', right: 6, bottom: 3, transform: [{ rotate: '-7deg' }] },
  blankPage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 7 }, blankCopy: { color: '#887563', fontSize: 10, textAlign: 'center', lineHeight: 14 }, emptyTitle: { color: '#44362C', fontFamily: fonts.heading, textAlign: 'center', fontSize: 16, marginTop: 6 }, emptyCopy: { color: '#887563', textAlign: 'center', fontSize: 11, lineHeight: 16, marginTop: 4 }, paperButton: { marginTop: 12, borderRadius: 15, backgroundColor: '#E8C695', paddingHorizontal: 10, paddingVertical: 7 }, paperButtonText: { color: '#5A4335', fontSize: 10, fontWeight: '800' },
  turningPage: { ...StyleSheet.absoluteFill, left: '50%', transformOrigin: 'left center', zIndex: 5 }, turningPageFace: { flex: 1, backgroundColor: '#FBF2E2', borderTopRightRadius: 11, borderBottomRightRadius: 11, shadowColor: '#4B3020', shadowOpacity: .22, shadowRadius: 10, shadowOffset: { width: -4, height: 0 } },
  frontCover: { ...StyleSheet.absoluteFill, zIndex: 10, transformOrigin: 'left center' }, coverFace: { flex: 1, borderRadius: 11, padding: 26, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, coverFaceSpine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 23 }, coverFaceTitle: { fontFamily: fonts.heading, textAlign: 'center', fontSize: 27, lineHeight: 32, marginTop: 14 }, coverFacePlace: { fontSize: 12, opacity: .86, marginTop: 5 }, coverFacePages: { position: 'absolute', left: 6, right: 6, bottom: 0, height: 13, backgroundColor: '#FFF9EE', borderTopWidth: 1, borderColor: '#E7DCCB' }, coverFaceRibbon: { position: 'absolute', bottom: -18, width: 22, height: 27, backgroundColor: '#E78B43' },
  pageHint: { alignItems: 'center', gap: 2, minHeight: 34 }, pageHintText: { color: '#FFF8EB', fontFamily: fonts.heading, fontSize: 13 }, swipeHint: { color: '#D8C1AA', fontSize: 11 }, toolbar: { minHeight: 56, alignItems: 'center', justifyContent: 'flex-end' }, toolButton: { height: 50, width: 50, borderRadius: 25, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#120B08', shadowOpacity: .2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
});
