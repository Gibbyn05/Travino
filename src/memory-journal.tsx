import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { CapybaraMoment } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { Memory, MemoryLayout, Trip } from '@/src/store';
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
type BookPage = { id: string; pageIndex: number; day: string; place: string; memories: Memory[] };
type Spread = { id: string; left: BookPage; right: BookPage };

export function journalPalette(index: number) { return coverPalette[index % coverPalette.length]; }

export function JournalBook({ trip, index, isPublic, onPress, onChangeVisibility }: { trip: Trip; index: number; isPublic: boolean; onPress: () => void; onChangeVisibility: () => void }) {
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
      <Pressable accessibilityRole="button" accessibilityLabel={`${isPublic ? 'Public' : 'Private'} memory book. Change sharing.`} onPress={(event) => { event.stopPropagation(); onChangeVisibility(); }} hitSlop={8} style={bookStyles.visibilityBadge}><Ionicons name={isPublic ? 'globe-outline' : 'lock-closed'} size={13} color={palette.cover}/></Pressable>
    </View>
    <Text numberOfLines={1} style={bookStyles.title}>{trip.title}</Text>
    <Text numberOfLines={1} style={bookStyles.destination}>{destination}</Text>
  </Pressable>;
}

export function MemoryJournal({ trip, coverIndex, isPublic, onAddMemory, onSaveCaption, onSaveLayout, onRemoveMemory, onChangeVisibility }: { trip: Trip; coverIndex: number; isPublic: boolean; onAddMemory: (page?: number) => void; onSaveCaption: (memoryId: string, caption: string) => void; onSaveLayout: (memoryId: string, layout: MemoryLayout) => void; onRemoveMemory: (memoryId: string) => void; onChangeVisibility: () => void }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const spreadWidth = Math.min(width - 32, 520);
  const nativeDriver = Platform.OS !== 'web';
  const [reduceMotion, setReduceMotion] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  // A spread is frozen once a drag starts. It remains the only mounted spread
  // during the turn, so React cannot paint the destination underneath it.
  const [frozenSpread, setFrozenSpread] = useState<Spread | undefined>(undefined);
  const [captionEditorOpen, setCaptionEditorOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const openProgress = useRef(new Animated.Value(0)).current;
  const pageProgress = useRef(new Animated.Value(1)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const stageScroll = useRef<ScrollView>(null);
  const activeTurn = useRef<Animated.CompositeAnimation | null>(null);
  const dragStartOffset = useRef(0);
  const pages = useMemo(() => makeSpreads(trip), [trip]);
  const safePageIndex = Math.min(pageIndex, Math.max(pages.length - 1, 0));
  const current = pages[safePageIndex];
  const palette = journalPalette(coverIndex);
  const readerBackground = palette.cover;
  const revealCaption = useCallback(() => requestAnimationFrame(() => stageScroll.current?.scrollTo({ y: 128, animated: !reduceMotion })), [reduceMotion]);

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

  useEffect(() => {
    if (pageIndex !== safePageIndex) setPageIndex(safePageIndex);
  }, [pageIndex, safePageIndex]);

  const stopActiveTurn = useCallback(() => {
    activeTurn.current?.stop();
    activeTurn.current = null;
  }, []);

  const freezeCurrentSpread = useCallback((spread: Spread | undefined = current, replace = false) => {
    setFrozenSpread((frozen) => replace ? spread : frozen ?? spread);
  }, [current]);

  const releaseFrozenSpread = useCallback(() => setFrozenSpread(undefined), []);

  const springDrag = useCallback((toValue: number, velocity: number, onFinished?: () => void) => {
    stopActiveTurn();
    const animation = Animated.spring(dragX, {
      toValue,
      velocity,
      friction: 10,
      tension: 88,
      useNativeDriver: nativeDriver,
    });
    activeTurn.current = animation;
    animation.start(({ finished }) => {
      if (activeTurn.current !== animation) return;
      activeTurn.current = null;
      if (finished) onFinished?.();
    });
  }, [dragX, nativeDriver, stopActiveTurn]);

  const springBack = useCallback(() => {
    springDrag(0, 0, releaseFrozenSpread);
  }, [releaseFrozenSpread, springDrag]);

  const close = () => {
    setOpen(false);
    const animation = reduceMotion
      ? Animated.timing(openProgress, { toValue: 0, duration: 150, useNativeDriver: nativeDriver })
      : Animated.spring(openProgress, { toValue: 0, friction: 10, tension: 70, useNativeDriver: nativeDriver });
    animation.start(() => router.back());
  };

  const turn = useCallback((direction: 1 | -1, velocity = 0) => {
    const destination = safePageIndex + direction;
    if (destination < 0 || destination >= pages.length) {
      springBack();
      return;
    }
    if (reduceMotion) {
      stopActiveTurn();
      releaseFrozenSpread();
      dragX.setValue(0);
      pageProgress.setValue(0);
      setPageIndex(destination);
      Animated.timing(pageProgress, { toValue: 1, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: nativeDriver }).start();
      return;
    }
    freezeCurrentSpread();
    springDrag(direction * -spreadWidth, velocity, () => {
      // Commit the index while the old spread is still frozen. On the next frame
      // swap to one fresh settled spread and remove every transient page layer.
      setPageIndex(destination);
      dragX.setValue(0);
      requestAnimationFrame(releaseFrozenSpread);
    });
  }, [dragX, freezeCurrentSpread, nativeDriver, pageProgress, pages.length, reduceMotion, releaseFrozenSpread, safePageIndex, springBack, springDrag, spreadWidth, stopActiveTurn]);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    // Capture only a deliberate horizontal drag. This lets notes remain tappable
    // while ensuring a photo, note or input cannot swallow a page turn.
    onStartShouldSetPanResponderCapture: () => false,
    onMoveShouldSetPanResponderCapture: (_, gesture) => open && Math.abs(gesture.dx) > 5 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onMoveShouldSetPanResponder: (_, gesture) => open && Math.abs(gesture.dx) > 5 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: () => {
      stopActiveTurn();
      dragX.stopAnimation((value) => { dragStartOffset.current = value; });
      freezeCurrentSpread(current, true);
    },
    onPanResponderMove: (_, gesture) => {
      if (reduceMotion) return;
      const distance = dragStartOffset.current + gesture.dx;
      const direction = distance < 0 ? 1 : -1;
      const possible = safePageIndex + direction >= 0 && safePageIndex + direction < pages.length;
      dragX.setValue(possible ? Math.max(-spreadWidth, Math.min(spreadWidth, distance)) : distance * .18);
    },
    onPanResponderRelease: (_, gesture) => {
      const distance = dragStartOffset.current + gesture.dx;
      const direction: 1 | -1 = distance < 0 ? 1 : -1;
      const canTurn = safePageIndex + direction >= 0 && safePageIndex + direction < pages.length;
      const hasDistance = Math.abs(distance) >= spreadWidth * .4;
      const hasVelocity = Math.abs(gesture.vx) >= .55 && Math.abs(distance) >= 20;
      if (canTurn && (hasDistance || hasVelocity)) turn(direction, gesture.vx);
      else springBack();
    },
    onPanResponderTerminate: springBack,
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  }), [dragX, freezeCurrentSpread, open, pages.length, reduceMotion, safePageIndex, springBack, spreadWidth, stopActiveTurn, turn]);

  const bookScale = openProgress.interpolate({ inputRange: [0, 1], outputRange: [.76, 1] });
  const coverRotation = openProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-169deg'] });
  const coverOpacity = openProgress.interpolate({ inputRange: [0, .82, 1], outputRange: [1, 1, 0] });
  const rightPageRotation = dragX.interpolate({ inputRange: [-spreadWidth, 0], outputRange: ['-68deg', '0deg'], extrapolate: 'clamp' });
  const leftPageRotation = dragX.interpolate({ inputRange: [0, spreadWidth], outputRange: ['0deg', '68deg'], extrapolate: 'clamp' });
  const forwardLift = dragX.interpolate({ inputRange: [-spreadWidth, -4, 0], outputRange: [.94, 0, 0], extrapolate: 'clamp' });
  const backLift = dragX.interpolate({ inputRange: [0, 4, spreadWidth], outputRange: [0, 0, .94], extrapolate: 'clamp' });
  const currentLabel = current ? `${current.left.day || current.right.day || 'A scrapbook page'}, ${current.left.memories.length + current.right.memories.length} photos` : 'Journal with no memories yet';
  const visibleSpread = frozenSpread ?? current;

  return <KeyboardAvoidingView style={journalStyles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Animated.View pointerEvents="none" style={[journalStyles.readerBackground, { backgroundColor: readerBackground, opacity: openProgress }]}/>
    <View style={journalStyles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close journal" onPress={close} style={journalStyles.headerButton}><Ionicons name="chevron-back" size={22} color="#FFF8EB"/></Pressable>
      <View style={journalStyles.headerText}><Text numberOfLines={1} style={journalStyles.headerTitle}>{trip.title}</Text><Text numberOfLines={1} style={journalStyles.headerPlace}>{[trip.city, trip.country].filter(Boolean).join(', ')}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={`This book is ${isPublic ? 'public to friends' : 'private'}. Change sharing.`} onPress={onChangeVisibility} style={journalStyles.headerButton}><Ionicons name={isPublic ? 'globe-outline' : 'lock-closed'} size={18} color="#FFF8EB"/></Pressable>
    </View>

    <ScrollView ref={stageScroll} style={journalStyles.stageScroll} contentContainerStyle={journalStyles.stageScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} directionalLockEnabled scrollEnabled={captionEditorOpen}>
    <View style={journalStyles.stage}>
      <Animated.View style={[journalStyles.openBook, { width: spreadWidth, opacity: openProgress, transform: [{ scale: bookScale }] }]} accessibilityLabel={currentLabel} accessibilityRole="summary" {...responder.panHandlers}>
        <PageEdges side="left" count={safePageIndex}/><PageEdges side="right" count={Math.max(pages.length - safePageIndex - 1, 0)}/>
        <View style={journalStyles.viewport}>
          <Animated.View style={[journalStyles.spreadLayer, { opacity: pageProgress }]}><FrozenJournalSpread spread={visibleSpread} onAddMemory={onAddMemory} onSaveCaption={onSaveCaption} onSaveLayout={onSaveLayout} onRemoveMemory={onRemoveMemory} onCaptionFocus={revealCaption} onCaptionEditingChange={setCaptionEditorOpen}/></Animated.View>
          {!reduceMotion && <Animated.View pointerEvents="none" style={[journalStyles.turningPage, { opacity: forwardLift, transform: [{ perspective: 900 }, { rotateY: rightPageRotation }] }]}><View style={journalStyles.turningPageFace}/></Animated.View>}
          {!reduceMotion && <Animated.View pointerEvents="none" style={[journalStyles.turningBackPage, { opacity: backLift, transform: [{ perspective: 900 }, { rotateY: leftPageRotation }] }]}><View style={journalStyles.turningPageFace}/></Animated.View>}
        </View>
        {safePageIndex > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Previous page" onPress={() => turn(-1)} style={[journalStyles.edgeTap, journalStyles.leftEdgeTap]}/>}
        {safePageIndex < pages.length - 1 && <Pressable accessibilityRole="button" accessibilityLabel="Next page" onPress={() => turn(1)} style={[journalStyles.edgeTap, journalStyles.rightEdgeTap]}/>}
        {!reduceMotion && <Animated.View pointerEvents="none" style={[journalStyles.frontCover, { opacity: coverOpacity, transform: [{ perspective: 900 }, { rotateY: coverRotation }] }]}><JournalCoverFace trip={trip} palette={palette}/></Animated.View>}
      </Animated.View>
    </View>
    </ScrollView>

    <View style={journalStyles.pageHint}><Text style={journalStyles.pageHintText}>{pages.length ? `${safePageIndex + 1} / ${pages.length}` : 'First page'}</Text><Text style={journalStyles.swipeHint}>{reduceMotion ? 'Swipe to browse' : 'Swipe to turn a page'}</Text></View>
    <View style={journalStyles.toolbar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Add a memory" onPress={() => onAddMemory(current?.left.pageIndex ?? 0)} style={journalStyles.toolButton}><Ionicons name="add" size={26} color={colors.blue}/></Pressable>
    </View>
  </KeyboardAvoidingView>;
}

function JournalSpread({ spread, onAddMemory, onSaveCaption, onSaveLayout, onRemoveMemory, onCaptionFocus, onCaptionEditingChange }: { spread?: Spread; onAddMemory: (page?: number) => void; onSaveCaption: (memoryId: string, caption: string) => void; onSaveLayout: (memoryId: string, layout: MemoryLayout) => void; onRemoveMemory: (memoryId: string) => void; onCaptionFocus: () => void; onCaptionEditingChange: (open: boolean) => void }) {
  return <View style={journalStyles.spread}><ScrapPage side="left" page={spread?.left} onAddMemory={onAddMemory} onSaveCaption={onSaveCaption} onSaveLayout={onSaveLayout} onRemoveMemory={onRemoveMemory} onCaptionFocus={onCaptionFocus} onCaptionEditingChange={onCaptionEditingChange}/><View style={journalStyles.crease}/><ScrapPage side="right" page={spread?.right} onAddMemory={onAddMemory} onSaveCaption={onSaveCaption} onSaveLayout={onSaveLayout} onRemoveMemory={onRemoveMemory} onCaptionFocus={onCaptionFocus} onCaptionEditingChange={onCaptionEditingChange}/></View>;
}

const FrozenJournalSpread = memo(JournalSpread);

function ScrapPage({ side, page, onAddMemory, onSaveCaption, onSaveLayout, onRemoveMemory, onCaptionFocus, onCaptionEditingChange }: { side: 'left' | 'right'; page?: BookPage; onAddMemory: (page?: number) => void; onSaveCaption: (memoryId: string, caption: string) => void; onSaveLayout: (memoryId: string, layout: MemoryLayout) => void; onRemoveMemory: (memoryId: string) => void; onCaptionFocus: () => void; onCaptionEditingChange: (open: boolean) => void }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const photos = page?.memories ?? [];
  return <View style={[journalStyles.paper, side === 'left' ? journalStyles.leftPaper : journalStyles.rightPaper]}>
    <View style={journalStyles.pageHeading}><View style={journalStyles.tape}><Text numberOfLines={1} style={journalStyles.tapeText}>{(page?.place || 'A favourite place').toUpperCase()}</Text></View>{page?.day ? <Text style={journalStyles.dayTitle}>{page.day}</Text> : null}</View>
    <View onLayout={(event) => setSize(event.nativeEvent.layout)} style={journalStyles.collageCanvas}>
      {photos.map((memory, index) => <MemoryPhoto key={memory.id} memory={memory} index={index} total={photos.length} canvas={size} onSaveCaption={onSaveCaption} onSaveLayout={onSaveLayout} onRemoveMemory={onRemoveMemory} onCaptionFocus={onCaptionFocus} onCaptionEditingChange={onCaptionEditingChange}/>)}
      {!photos.length && <View style={journalStyles.blankPage}><CapybaraMoment size={48}/><Text style={journalStyles.blankCopy}>This page is ready for the next good bit.</Text></View>}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Add photos to this page" onPress={() => onAddMemory(page?.pageIndex ?? 0)} style={journalStyles.pageAddButton}><Ionicons name="add" size={13} color="#604936"/><Text style={journalStyles.pageAddText}>Add photo</Text></Pressable>
  </View>;
}

function MemoryPhoto({ memory, index, total, canvas, onSaveCaption, onSaveLayout, onRemoveMemory, onCaptionFocus, onCaptionEditingChange }: { memory: Memory; index: number; total: number; canvas: { width: number; height: number }; onSaveCaption: (memoryId: string, caption: string) => void; onSaveLayout: (memoryId: string, layout: MemoryLayout) => void; onRemoveMemory: (memoryId: string) => void; onCaptionFocus: () => void; onCaptionEditingChange: (open: boolean) => void }) {
  const [caption, setCaption] = useState(memory.caption ?? '');
  const [editing, setEditing] = useState(false);
  const start = useRef<MemoryLayout | null>(null);
  const latestLayout = useRef<MemoryLayout>(memory.layout ?? starterLayout(index, total));
  const startPinchDistance = useRef(0);
  const defaultLayout = useMemo(() => memory.layout ?? starterLayout(index, total), [index, memory.layout, total]);
  const [layout, setLayout] = useState(defaultLayout);
  useEffect(() => { setCaption(memory.caption ?? ''); }, [memory.caption, memory.id]);
  useEffect(() => { const next = memory.layout ?? starterLayout(index, total); latestLayout.current = next; setLayout(next); }, [index, memory.id, memory.layout, total]);
  const beginEditing = () => { setEditing(true); onCaptionEditingChange(true); onCaptionFocus(); };
  const finishEditing = () => { onSaveCaption(memory.id, caption); setEditing(false); onCaptionEditingChange(false); };
  const photoWidth = Math.min(Math.max(canvas.width * (total > 2 ? .48 : .7), 62), 142);
  const photoHeight = Math.min(Math.max(canvas.height * (total > 2 ? .35 : .42), 72), 158);
  const effective = clampLayout(layout, canvas, photoWidth, photoHeight);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (event) => { start.current = effective; startPinchDistance.current = touchDistance(event.nativeEvent.touches); },
    onPanResponderMove: (event, gesture) => {
      if (!start.current) return;
      const pinch = touchDistance(event.nativeEvent.touches);
      const next = clampLayout({ ...start.current, x: start.current.x + gesture.dx / Math.max(canvas.width, 1), y: start.current.y + gesture.dy / Math.max(canvas.height, 1), scale: pinch && startPinchDistance.current ? start.current.scale * pinch / startPinchDistance.current : start.current.scale }, canvas, photoWidth, photoHeight);
      latestLayout.current = next;
      setLayout(next);
    },
    onPanResponderRelease: () => { if (start.current) onSaveLayout(memory.id, clampLayout(latestLayout.current, canvas, photoWidth, photoHeight)); start.current = null; },
    onPanResponderTerminate: () => { start.current = null; },
    onPanResponderTerminationRequest: () => false,
  }), [canvas, effective, memory.id, onSaveLayout, photoHeight, photoWidth]);
  if (!canvas.width || !canvas.height) return null;
  return <View style={[journalStyles.photoSlot, { width: photoWidth, height: photoHeight, left: effective.x * canvas.width - photoWidth / 2, top: effective.y * canvas.height - photoHeight / 2, transform: [{ scale: effective.scale }, { rotate: `${effective.rotation}deg` }] }] }>
    <View style={journalStyles.photo}>
      <View style={journalStyles.imageFrame}><Image source={{ uri: memory.image }} resizeMode="contain" style={journalStyles.photoImage}/></View>
      {editing
        ? <View style={journalStyles.captionNote}><TextInput autoFocus value={caption} onChangeText={setCaption} onFocus={onCaptionFocus} onBlur={finishEditing} onSubmitEditing={finishEditing} placeholder="Write a caption" placeholderTextColor="#A99A89" maxLength={180} multiline={false} returnKeyType="done" style={journalStyles.captionInput} accessibilityLabel="Photo caption"/></View>
        : <Pressable accessibilityRole="button" accessibilityLabel="Edit photo caption" onPress={beginEditing} style={journalStyles.captionNote}><Text numberOfLines={1} style={[journalStyles.captionText, !caption.trim() && journalStyles.captionPlaceholder]}>{caption.trim() || 'Write a caption'}</Text></Pressable>}
    </View>
    <View {...responder.panHandlers} accessibilityLabel="Drag or pinch to arrange this photo" style={journalStyles.dragHandle}><Ionicons name="move" size={13} color="#604936"/></View>
    <Pressable accessibilityRole="button" accessibilityLabel="Remove photo" onPress={() => onRemoveMemory(memory.id)} hitSlop={7} style={journalStyles.removePhoto}><Ionicons name="close" size={12} color="#FFFDF9"/></Pressable>
  </View>;
}

function starterLayout(index: number, total: number): MemoryLayout {
  const columns = total > 3 ? 3 : 2;
  const column = index % columns;
  const row = Math.floor(index / columns);
  return { x: .25 + column * (.5 / (columns - 1)), y: .28 + row * .34, scale: total > 4 ? .7 : total > 2 ? .8 : .94, rotation: [-4, 3, -2, 4, 1, -3][index % 6] };
}

function clampLayout(layout: MemoryLayout, canvas: { width: number; height: number }, photoWidth: number, photoHeight: number): MemoryLayout {
  if (!canvas.width || !canvas.height) return layout;
  const scale = Math.max(.58, Math.min(1.15, layout.scale));
  const margin = 13;
  const halfWidth = (photoWidth * scale) / 2 + margin;
  const halfHeight = (photoHeight * scale) / 2 + margin;
  return { ...layout, scale, x: Math.max(halfWidth / canvas.width, Math.min(1 - halfWidth / canvas.width, layout.x)), y: Math.max(halfHeight / canvas.height, Math.min(1 - halfHeight / canvas.height, layout.y)), rotation: Math.max(-7, Math.min(7, layout.rotation)) };
}

function touchDistance(touches: readonly { pageX: number; pageY: number }[]) {
  if (touches.length < 2) return 0;
  return Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
}

function PageEdges({ side, count }: { side: 'left' | 'right'; count: number }) {
  const visible = Math.min(count, 5);
  return <View pointerEvents="none" style={[journalStyles.edges, side === 'left' ? journalStyles.leftEdges : journalStyles.rightEdges]}>{Array.from({ length: visible }).map((_, index) => <View key={index} style={[journalStyles.edge, side === 'left' ? { left: -5 - index * 4 } : { right: -5 - index * 4 }, { opacity: 1 - index * .13 }]}/>)}</View>;
}

function JournalCoverFace({ trip, palette }: { trip: Trip; palette: ReturnType<typeof journalPalette> }) {
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
  const grouped = new Map<number, Memory[]>();
  sorted.forEach((memory, index) => {
    const page = memory.bookPage ?? Math.floor(index / 2);
    grouped.set(page, [...(grouped.get(page) ?? []), memory]);
  });
  const lastPage = Math.max(0, ...grouped.keys());
  const pages: BookPage[] = Array.from({ length: lastPage + 1 }, (_, pageIndex) => {
    const memories = grouped.get(pageIndex) ?? [];
    const first = memories[0];
    return { id: memories.map((memory) => memory.id).join('-') || `blank-${pageIndex}`, pageIndex, day: first ? formatJournalDate(first.date) : '', place: first?.location || trip.city || trip.country || 'A favourite place', memories };
  });
  return Array.from({ length: Math.max(1, Math.ceil(pages.length / 2)) }, (_, index) => ({
    id: `${pages[index * 2]?.id ?? 'blank'}-${pages[index * 2 + 1]?.id ?? 'blank'}`,
    left: pages[index * 2] ?? { id: `blank-${index * 2}`, pageIndex: index * 2, day: '', place: trip.city || trip.country || 'A favourite place', memories: [] },
    right: pages[index * 2 + 1] ?? { id: `blank-${index * 2 + 1}`, pageIndex: index * 2 + 1, day: '', place: trip.city || trip.country || 'A favourite place', memories: [] },
  }));
}

const bookStyles = StyleSheet.create({
  pressable: { width: '48%', marginBottom: 26 }, pressed: { opacity: .82, transform: [{ scale: .975 }] },
  cover: { height: 190, borderRadius: 13, overflow: 'visible', padding: 20, justifyContent: 'space-between', shadowColor: '#4A392B', shadowOpacity: .18, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 16, borderTopLeftRadius: 13, borderBottomLeftRadius: 13 }, spineHighlight: { position: 'absolute', left: 17, top: 8, bottom: 11, width: 2, backgroundColor: 'rgba(255,255,255,.3)', borderRadius: 2 },
  coverArt: { alignSelf: 'center', marginTop: 10 }, coverLine: { height: 1, width: '100%', marginTop: 8 }, coverDestination: { fontFamily: fonts.heading, fontSize: 15, lineHeight: 18, textAlign: 'center', marginTop: 9 },
  pageBlock: { position: 'absolute', left: 5, right: 4, bottom: -6, height: 13, borderRadius: 3, backgroundColor: '#FFFDF6', borderTopWidth: 1, borderColor: '#E5DCCF', zIndex: -1 }, bookmark: { position: 'absolute', left: '50%', marginLeft: -9, bottom: -21, width: 18, height: 27, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, backgroundColor: '#E78B43', zIndex: -2 },
  visibilityBadge: { position: 'absolute', right: 10, top: 10, height: 27, width: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFDF9', shadowColor: '#342318', shadowOpacity: .18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  title: { color: colors.text, fontFamily: fonts.heading, fontSize: 14, lineHeight: 18, marginTop: 18 }, destination: { color: '#89847B', fontSize: 12, marginTop: 3 },
});

const journalStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#20150E', paddingTop: 54, paddingBottom: 22 }, readerBackground: { ...StyleSheet.absoluteFill },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18 }, headerButton: { height: 44, width: 44, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,248,235,.28)', alignItems: 'center', justifyContent: 'center', shadowColor: '#120B08', shadowOpacity: .24, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 3 }, headerText: { flex: 1, alignItems: 'center', paddingHorizontal: 8 }, headerTitle: { color: '#FFF8EB', fontFamily: fonts.heading, fontSize: 17, maxWidth: 210 }, headerPlace: { color: '#E2CDB7', fontSize: 11, marginTop: 1 }, headerSpacer: { width: 44 },
  stageScroll: { flex: 1 }, stageScrollContent: { flexGrow: 1 }, stage: { flex: 1, minHeight: 360, justifyContent: 'center', alignItems: 'center', paddingVertical: 10 }, openBook: { aspectRatio: 1.37, maxHeight: 430, position: 'relative' }, viewport: { ...StyleSheet.absoluteFill, overflow: 'hidden', borderRadius: 11 }, spreadLayer: { ...StyleSheet.absoluteFill },
  edges: { position: 'absolute', top: 13, bottom: 8, width: 22, zIndex: -1 }, leftEdges: { left: 0 }, rightEdges: { right: 0 }, edge: { position: 'absolute', top: 0, bottom: 0, width: 16, borderRadius: 4, backgroundColor: '#EAE0D3', shadowColor: '#000', shadowOpacity: .12, shadowRadius: 4, shadowOffset: { width: 1, height: 2 } },
  spread: { flex: 1, flexDirection: 'row', overflow: 'hidden', borderRadius: 11, backgroundColor: '#F9F0DF', shadowColor: '#0B0604', shadowOpacity: .34, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  paper: { flex: 1, overflow: 'hidden', padding: 12, backgroundColor: '#FBF2E2' }, leftPaper: { borderTopLeftRadius: 11, borderBottomLeftRadius: 11 }, rightPaper: { borderTopRightRadius: 11, borderBottomRightRadius: 11 }, crease: { width: 5, backgroundColor: 'rgba(109,76,54,.17)', shadowColor: '#63442E', shadowOpacity: .35, shadowRadius: 5, shadowOffset: { width: 1, height: 0 }, zIndex: 3 },
  pageHeading: { minHeight: 42, zIndex: 4 }, tape: { alignSelf: 'flex-start', maxWidth: '94%', backgroundColor: '#E7BC78', paddingHorizontal: 8, paddingVertical: 4, transform: [{ rotate: '-2deg' }], marginTop: 1 }, tapeText: { color: '#5C4738', fontSize: 7, fontWeight: '800', letterSpacing: .7 }, dayTitle: { color: '#44362C', fontFamily: fonts.heading, fontSize: 14, lineHeight: 17, marginTop: 5 },
  collageCanvas: { flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', marginHorizontal: -3, marginTop: 2, borderRadius: 8 }, photoSlot: { position: 'absolute', zIndex: 2 }, photo: { flex: 1, minHeight: 0, maxWidth: '100%', backgroundColor: '#FFFDF9', padding: 4, borderRadius: 2, shadowColor: '#76533A', shadowOpacity: .2, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, imageFrame: { flex: 1, minHeight: 0, overflow: 'hidden', borderRadius: 1, backgroundColor: '#E1D3C1', alignItems: 'center', justifyContent: 'center' }, photoImage: { width: '100%', height: '100%' }, captionNote: { height: 20, marginTop: 3, paddingHorizontal: 5, justifyContent: 'center', borderRadius: 4, borderWidth: 1, borderColor: '#E4D7C6', backgroundColor: '#FFF8EA' }, captionText: { color: '#624B3A', fontSize: 8.5, lineHeight: 10, fontStyle: 'italic' }, captionPlaceholder: { color: '#A99A89' }, captionInput: { height: 18, color: '#624B3A', fontSize: 8.5, lineHeight: 10, fontStyle: 'italic', padding: 0, textAlignVertical: 'center' }, dragHandle: { position: 'absolute', left: -7, top: -7, width: 25, height: 25, borderRadius: 13, backgroundColor: '#F4D49E', borderWidth: 1, borderColor: '#D5AC69', alignItems: 'center', justifyContent: 'center', zIndex: 5 }, removePhoto: { position: 'absolute', right: -6, top: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#8D574B', alignItems: 'center', justifyContent: 'center', zIndex: 5 }, pageAddButton: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#F2DCAE', marginTop: 3 }, pageAddText: { color: '#604936', fontSize: 8, fontWeight: '800' },
  blankPage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 7 }, blankCopy: { color: '#887563', fontSize: 10, textAlign: 'center', lineHeight: 14 }, emptyTitle: { color: '#44362C', fontFamily: fonts.heading, textAlign: 'center', fontSize: 16, marginTop: 6 }, emptyCopy: { color: '#887563', textAlign: 'center', fontSize: 11, lineHeight: 16, marginTop: 4 }, paperButton: { marginTop: 12, borderRadius: 15, backgroundColor: '#E8C695', paddingHorizontal: 10, paddingVertical: 7 }, paperButtonText: { color: '#5A4335', fontSize: 10, fontWeight: '800' },
  turningPage: { position: 'absolute', left: '50%', right: 0, top: 0, bottom: 0, transformOrigin: 'left center', zIndex: 5 }, turningBackPage: { position: 'absolute', left: 0, width: '50%', top: 0, bottom: 0, transformOrigin: 'right center', zIndex: 5 }, turningPageFace: { flex: 1, backgroundColor: '#FBF2E2', shadowColor: '#4B3020', shadowOpacity: .22, shadowRadius: 10, shadowOffset: { width: -4, height: 0 } }, edgeTap: { position: 'absolute', top: 0, bottom: 0, width: '12%', zIndex: 12 }, leftEdgeTap: { left: 0 }, rightEdgeTap: { right: 0 },
  frontCover: { ...StyleSheet.absoluteFill, zIndex: 10, transformOrigin: 'left center' }, coverFace: { flex: 1, borderRadius: 11, padding: 26, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, coverFaceSpine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 23 }, coverFaceTitle: { fontFamily: fonts.heading, textAlign: 'center', fontSize: 27, lineHeight: 32, marginTop: 14 }, coverFacePlace: { fontSize: 12, opacity: .86, marginTop: 5 }, coverFacePages: { position: 'absolute', left: 6, right: 6, bottom: 0, height: 13, backgroundColor: '#FFF9EE', borderTopWidth: 1, borderColor: '#E7DCCB' }, coverFaceRibbon: { position: 'absolute', bottom: -18, width: 22, height: 27, backgroundColor: '#E78B43' },
  pageHint: { alignItems: 'center', gap: 2, minHeight: 34 }, pageHintText: { color: '#FFF8EB', fontFamily: fonts.heading, fontSize: 13 }, swipeHint: { color: '#D8C1AA', fontSize: 11 }, toolbar: { minHeight: 56, alignItems: 'center', justifyContent: 'flex-end' }, toolButton: { height: 50, width: 50, borderRadius: 25, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#120B08', shadowOpacity: .2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
});
