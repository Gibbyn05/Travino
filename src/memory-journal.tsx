import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Image, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { CapybaraMoment } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { Memory, MemoryLayout, Trip } from '@/src/store';
import { formatJournalDate, parseTravelDate } from '@/src/dates';
import { cacheMemoryImage } from '@/src/memory-image-cache';

const coverPalette = [
  { cover: '#29476D', shade: '#203B5D', ink: '#F9F0DB' },
  { cover: '#75638E', shade: '#5E4C77', ink: '#FFF9EC' },
  { cover: '#C85D5B', shade: '#A94A50', ink: '#FFF6E8' },
  { cover: '#426C59', shade: '#315646', ink: '#FFF7E7' },
  { cover: '#B88135', shade: '#966A28', ink: '#FFF8E8' },
  { cover: '#317D7B', shade: '#286563', ink: '#F5FFFB' },
];

type CoverArt = keyof typeof Ionicons.glyphMap;
type BookPage = { id: string; pageIndex: number; day: string; place: string; memory?: Memory };
type Spread = { id: string; left: BookPage; right: BookPage };

export function journalPalette(index: number) { return coverPalette[index % coverPalette.length]; }

export function JournalBook({ trip, index, isPublic, onPress, onChangeVisibility, readOnly = false }: { trip: Trip; index: number; isPublic: boolean; onPress: () => void; onChangeVisibility?: () => void; readOnly?: boolean }) {
  const palette = journalPalette(index);
  const destination = [trip.city, trip.country].filter(Boolean).join(', ');
  return <View style={bookStyles.pressable}><Pressable accessibilityRole="button" accessibilityLabel={`Open ${trip.title}, ${destination}`} onPress={onPress} style={({ pressed }) => [pressed && bookStyles.pressed]}>
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
  </Pressable>
    {readOnly || !onChangeVisibility
      ? <View accessibilityLabel={isPublic ? 'Public memory book' : 'Private memory book'} style={bookStyles.visibilityBadge}><Ionicons name={isPublic ? 'globe-outline' : 'lock-closed'} size={13} color={palette.cover}/></View>
      : <Pressable accessibilityRole="button" accessibilityLabel={`${isPublic ? 'Public' : 'Private'} memory book. Change sharing.`} onPress={onChangeVisibility} hitSlop={8} style={bookStyles.visibilityBadge}><Ionicons name={isPublic ? 'globe-outline' : 'lock-closed'} size={13} color={palette.cover}/></Pressable>}
  </View>;
}

export function MemoryJournal({ trip, coverIndex, isPublic, onAddMemory, onSaveCaption, onSaveLayout, onRemoveMemory, onChangeVisibility, readOnly = false }: { trip: Trip; coverIndex: number; isPublic: boolean; onAddMemory?: (page?: number) => void; onSaveCaption?: (memoryId: string, caption: string) => void; onSaveLayout?: (memoryId: string, layout: MemoryLayout) => void; onRemoveMemory?: (memoryId: string) => void; onChangeVisibility?: () => void; readOnly?: boolean }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const spreadWidth = Math.min(width - 32, 520);
  const nativeDriver = Platform.OS !== 'web';
  const [reduceMotion, setReduceMotion] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  // The outgoing spread is the only layer that ever moves. It is frozen at
  // gesture start, placed above a fully opaque current spread, then unmounted.
  const [turnSnapshot, setTurnSnapshot] = useState<Spread | undefined>(undefined);
  const [captionEditorOpen, setCaptionEditorOpen] = useState(false);
  const [layoutEditing, setLayoutEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const openProgress = useRef(new Animated.Value(0)).current;
  const snapshotOpacity = useRef(new Animated.Value(1)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const stageScroll = useRef<ScrollView>(null);
  const activeTurn = useRef<Animated.CompositeAnimation | null>(null);
  const dragStartOffset = useRef(0);
  const pages = useMemo(() => makeSpreads(trip), [trip]);
  const safePageIndex = Math.min(pageIndex, Math.max(pages.length - 1, 0));
  const current = pages[safePageIndex];
  const palette = journalPalette(coverIndex);
  const readerBackground = palette.cover;
  const saveCaption = onSaveCaption ?? (() => undefined);
  const saveLayout = onSaveLayout ?? (() => undefined);
  const removeMemory = onRemoveMemory ?? (() => undefined);
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

  const releaseTurnSnapshot = useCallback(() => {
    dragX.setValue(0);
    snapshotOpacity.setValue(1);
    setTurnSnapshot(undefined);
  }, [dragX, snapshotOpacity]);

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
    springDrag(0, 0, releaseTurnSnapshot);
  }, [releaseTurnSnapshot, springDrag]);

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
    // Keep the outgoing page as the single moving layer and render the target
    // spread beneath it before the snapshot can reveal it. This is what makes
    // both directions use the same, interruption-safe paging container.
    setTurnSnapshot((snapshot) => snapshot ?? current);
    if (reduceMotion) {
      stopActiveTurn();
      setPageIndex(destination);
      snapshotOpacity.setValue(1);
      const animation = Animated.timing(snapshotOpacity, { toValue: 0, duration: 180, easing: Easing.out(Easing.ease), useNativeDriver: nativeDriver });
      activeTurn.current = animation;
      animation.start(() => { if (activeTurn.current === animation) { activeTurn.current = null; releaseTurnSnapshot(); } });
      return;
    }
    setPageIndex(destination);
    requestAnimationFrame(() => springDrag(direction * -spreadWidth, velocity, releaseTurnSnapshot));
  }, [activeTurn, current, nativeDriver, pages.length, reduceMotion, releaseTurnSnapshot, safePageIndex, snapshotOpacity, springBack, springDrag, spreadWidth, stopActiveTurn]);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    // Capture only a deliberate horizontal drag. This lets notes remain tappable
    // while ensuring a photo, note or input cannot swallow a page turn.
    onStartShouldSetPanResponderCapture: () => false,
    onMoveShouldSetPanResponderCapture: (_, gesture) => open && !captionEditorOpen && Math.abs(gesture.dx) > 5 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onMoveShouldSetPanResponder: (_, gesture) => open && !captionEditorOpen && Math.abs(gesture.dx) > 5 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderGrant: () => {
      stopActiveTurn();
      dragX.stopAnimation();
      dragX.setValue(0);
      dragStartOffset.current = 0;
      snapshotOpacity.setValue(1);
      setTurnSnapshot(current);
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
  }), [captionEditorOpen, current, dragX, open, pages.length, reduceMotion, safePageIndex, snapshotOpacity, springBack, spreadWidth, stopActiveTurn, turn]);

  const bookScale = openProgress.interpolate({ inputRange: [0, 1], outputRange: [.76, 1] });
  const coverRotation = openProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-169deg'] });
  const coverOpacity = openProgress.interpolate({ inputRange: [0, .82, 1], outputRange: [1, 1, 0] });
  const currentLabel = current ? `${current.left.day || current.right.day || 'A scrapbook page'}, ${Number(Boolean(current.left.memory)) + Number(Boolean(current.right.memory))} photos` : 'Journal with no memories yet';
  const addAfterCurrent = current?.right.memory ? current.right.pageIndex : current?.left.pageIndex;

  return <KeyboardAvoidingView style={journalStyles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Animated.View pointerEvents="none" style={[journalStyles.readerBackground, { backgroundColor: readerBackground, opacity: openProgress }]}/>
    <View style={journalStyles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Close journal" onPress={close} style={journalStyles.headerButton}><Ionicons name="chevron-back" size={22} color="#FFF8EB"/></Pressable>
      <View style={journalStyles.headerText}><Text numberOfLines={1} style={journalStyles.headerTitle}>{trip.title}</Text><Text numberOfLines={1} style={journalStyles.headerPlace}>{[trip.city, trip.country].filter(Boolean).join(', ')}</Text></View>
      {readOnly ? <View accessibilityLabel="Read-only public memory book" style={journalStyles.headerSpacer}><Ionicons name="globe-outline" size={18} color="#FFF8EB"/></View> : <Pressable accessibilityRole="button" accessibilityLabel={`This book is ${isPublic ? 'public to friends' : 'private'}. Change sharing.`} onPress={() => onChangeVisibility?.()} style={journalStyles.headerButton}><Ionicons name={isPublic ? 'globe-outline' : 'lock-closed'} size={18} color="#FFF8EB"/></Pressable>}
    </View>

    <ScrollView ref={stageScroll} style={journalStyles.stageScroll} contentContainerStyle={journalStyles.stageScrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} directionalLockEnabled scrollEnabled={captionEditorOpen}>
    <View style={journalStyles.stage}>
      <Animated.View style={[journalStyles.openBook, { width: spreadWidth, opacity: openProgress, transform: [{ scale: bookScale }] }]} accessibilityLabel={currentLabel} accessibilityRole="summary" {...responder.panHandlers}>
        <PageEdges side="left" count={safePageIndex}/><PageEdges side="right" count={Math.max(pages.length - safePageIndex - 1, 0)}/>
        <View style={journalStyles.viewport}>
          <View style={journalStyles.spreadLayer}><JournalSpread spread={current} onSaveCaption={saveCaption} onSaveLayout={saveLayout} onRemoveMemory={removeMemory} onCaptionFocus={revealCaption} onCaptionEditingChange={setCaptionEditorOpen} layoutEditing={!readOnly && layoutEditing} readOnly={readOnly}/></View>
          {turnSnapshot && <Animated.View pointerEvents="none" style={[journalStyles.turnSnapshotLayer, { opacity: snapshotOpacity, transform: [{ translateX: dragX }] }]}><FrozenJournalSpread spread={turnSnapshot} onSaveCaption={saveCaption} onSaveLayout={saveLayout} onRemoveMemory={removeMemory} onCaptionFocus={revealCaption} onCaptionEditingChange={setCaptionEditorOpen} layoutEditing={false} readOnly={readOnly}/></Animated.View>}
        </View>
        {safePageIndex > 0 && <Pressable accessibilityRole="button" accessibilityLabel="Previous page" onPress={() => turn(-1)} hitSlop={8} style={[journalStyles.pageArrow, journalStyles.leftPageArrow]}><Ionicons name="chevron-back" size={18} color="#624B3A"/></Pressable>}
        {safePageIndex < pages.length - 1 && <Pressable accessibilityRole="button" accessibilityLabel="Next page" onPress={() => turn(1)} hitSlop={8} style={[journalStyles.pageArrow, journalStyles.rightPageArrow]}><Ionicons name="chevron-forward" size={18} color="#624B3A"/></Pressable>}
        {!reduceMotion && <Animated.View pointerEvents="none" style={[journalStyles.frontCover, { opacity: coverOpacity, transform: [{ perspective: 900 }, { rotateY: coverRotation }] }]}><JournalCoverFace trip={trip} palette={palette}/></Animated.View>}
      </Animated.View>
    </View>
    </ScrollView>

    <View style={journalStyles.pageHint}><Text style={journalStyles.pageHintText}>{pages.length ? `${safePageIndex + 1} / ${pages.length}` : 'First page'}</Text><Text style={journalStyles.swipeHint}>{reduceMotion ? 'Swipe to browse' : 'Swipe to turn a page'}</Text></View>
    {!readOnly && <View style={journalStyles.toolbar}>
      <Pressable accessibilityRole="button" accessibilityLabel={layoutEditing ? 'Finish editing page' : 'Edit page layout'} onPress={() => setLayoutEditing((value) => !value)} style={[journalStyles.toolButton, layoutEditing && journalStyles.toolButtonActive]}><Ionicons name={layoutEditing ? 'checkmark' : 'pencil'} size={21} color={layoutEditing ? '#FFFFFF' : colors.blue}/></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Add a photo after this spread" onPress={() => onAddMemory?.(addAfterCurrent)} style={journalStyles.toolButton}><Ionicons name="add" size={26} color={colors.blue}/></Pressable>
    </View>}
  </KeyboardAvoidingView>;
}

function JournalSpread({ spread, onSaveCaption, onSaveLayout, onRemoveMemory, onCaptionFocus, onCaptionEditingChange, layoutEditing, readOnly }: { spread?: Spread; onSaveCaption: (memoryId: string, caption: string) => void; onSaveLayout: (memoryId: string, layout: MemoryLayout) => void; onRemoveMemory: (memoryId: string) => void; onCaptionFocus: () => void; onCaptionEditingChange: (open: boolean) => void; layoutEditing: boolean; readOnly: boolean }) {
  return <View style={journalStyles.spread}><ScrapPage side="left" page={spread?.left} onSaveCaption={onSaveCaption} onSaveLayout={onSaveLayout} onRemoveMemory={onRemoveMemory} onCaptionFocus={onCaptionFocus} onCaptionEditingChange={onCaptionEditingChange} layoutEditing={layoutEditing} readOnly={readOnly}/><View style={journalStyles.crease}/><ScrapPage side="right" page={spread?.right} onSaveCaption={onSaveCaption} onSaveLayout={onSaveLayout} onRemoveMemory={onRemoveMemory} onCaptionFocus={onCaptionFocus} onCaptionEditingChange={onCaptionEditingChange} layoutEditing={layoutEditing} readOnly={readOnly}/></View>;
}

const FrozenJournalSpread = memo(JournalSpread);

function ScrapPage({ side, page, onSaveCaption, onSaveLayout, onRemoveMemory, onCaptionFocus, onCaptionEditingChange, layoutEditing, readOnly }: { side: 'left' | 'right'; page?: BookPage; onSaveCaption: (memoryId: string, caption: string) => void; onSaveLayout: (memoryId: string, layout: MemoryLayout) => void; onRemoveMemory: (memoryId: string) => void; onCaptionFocus: () => void; onCaptionEditingChange: (open: boolean) => void; layoutEditing: boolean; readOnly: boolean }) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  return <View style={[journalStyles.paper, side === 'left' ? journalStyles.leftPaper : journalStyles.rightPaper]}>
    <View onLayout={(event) => setSize(event.nativeEvent.layout)} style={journalStyles.collageCanvas}>
      {page?.memory ? <MemoryPhoto memory={page.memory} canvas={size} onSaveCaption={onSaveCaption} onSaveLayout={onSaveLayout} onRemoveMemory={onRemoveMemory} onCaptionFocus={onCaptionFocus} onCaptionEditingChange={onCaptionEditingChange} layoutEditing={layoutEditing} readOnly={readOnly}/> : <View style={journalStyles.blankPage}><CapybaraMoment size={48}/><Text style={journalStyles.blankCopy}>The next memory will start a fresh page.</Text></View>}
    </View>
  </View>;
}

function MemoryPhoto({ memory, canvas, onSaveCaption, onSaveLayout, onRemoveMemory, onCaptionFocus, onCaptionEditingChange, layoutEditing, readOnly }: { memory: Memory; canvas: { width: number; height: number }; onSaveCaption: (memoryId: string, caption: string) => void; onSaveLayout: (memoryId: string, layout: MemoryLayout) => void; onRemoveMemory: (memoryId: string) => void; onCaptionFocus: () => void; onCaptionEditingChange: (open: boolean) => void; layoutEditing: boolean; readOnly: boolean }) {
  const [caption, setCaption] = useState(memory.caption ?? '');
  const [editing, setEditing] = useState(false);
  const [displayUri, setDisplayUri] = useState(memory.thumbnail || memory.image);
  const start = useRef<MemoryLayout | null>(null);
  const defaultLayout = useMemo(() => memory.layout?.pageStyle === 'single' ? memory.layout : singlePhotoLayout(), [memory.layout]);
  const latestLayout = useRef<MemoryLayout>(defaultLayout);
  const [layout, setLayout] = useState(defaultLayout);
  useEffect(() => { setCaption(memory.caption ?? ''); }, [memory.caption, memory.id]);
  useEffect(() => {
    let active = true;
    const preview = memory.thumbnail || memory.image;
    setDisplayUri(preview);
    // Picked images are already local. Signed, public-book images are cached
    // on disk on native so returning to a spread does not fetch them again.
    void cacheMemoryImage(preview).then((uri) => { if (active) setDisplayUri(uri); });
    return () => { active = false; };
  }, [memory.id, memory.image, memory.thumbnail]);
  useEffect(() => { const next = memory.layout?.pageStyle === 'single' ? memory.layout : singlePhotoLayout(); latestLayout.current = next; setLayout(next); }, [memory.id, memory.layout]);
  const beginEditing = () => { setEditing(true); onCaptionEditingChange(true); onCaptionFocus(); };
  const finishEditing = () => { onSaveCaption(memory.id, caption); setEditing(false); onCaptionEditingChange(false); };
  const photoWidth = Math.max(70, canvas.width - 24);
  const photoHeight = Math.min(Math.max(102, canvas.height * .68), 202);
  const effective = clampLayout(layout, canvas, photoWidth, photoHeight);
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => layoutEditing,
    onMoveShouldSetPanResponder: () => layoutEditing,
    onPanResponderGrant: () => { start.current = effective; },
    onPanResponderMove: (_, gesture) => {
      if (!start.current) return;
      const next = clampLayout({ ...start.current, x: start.current.x + gesture.dx / Math.max(canvas.width, 1), y: start.current.y + gesture.dy / Math.max(canvas.height, 1), pageStyle: 'single' }, canvas, photoWidth, photoHeight);
      latestLayout.current = next;
      setLayout(next);
    },
    onPanResponderRelease: () => { if (start.current) onSaveLayout(memory.id, clampLayout(latestLayout.current, canvas, photoWidth, photoHeight)); start.current = null; },
    onPanResponderTerminate: () => { start.current = null; },
    onPanResponderTerminationRequest: () => false,
  }), [canvas, effective, layoutEditing, memory.id, onSaveLayout, photoHeight, photoWidth]);
  if (!canvas.width || !canvas.height) return null;
  return <View style={[journalStyles.photoSlot, { width: photoWidth, height: photoHeight, left: effective.x * canvas.width - photoWidth / 2, top: effective.y * canvas.height - photoHeight / 2 }]}>
    <View style={journalStyles.photo}>
      <View style={journalStyles.imageFrame}><Image source={{ uri: displayUri }} resizeMode="contain" style={journalStyles.photoImage}/></View>
      {readOnly
        ? <View style={journalStyles.captionNote}><Text numberOfLines={1} style={[journalStyles.captionText, !caption.trim() && journalStyles.captionPlaceholder]}>{caption.trim() || 'A memory worth keeping'}</Text></View>
        : editing
        ? <View style={journalStyles.captionNote}><TextInput autoFocus value={caption} onChangeText={setCaption} onFocus={onCaptionFocus} onBlur={finishEditing} onSubmitEditing={finishEditing} placeholder="Write a caption" placeholderTextColor="#A99A89" maxLength={180} multiline={false} returnKeyType="done" style={journalStyles.captionInput} accessibilityLabel="Photo caption"/></View>
        : <Pressable accessibilityRole="button" accessibilityLabel="Edit photo caption" onPress={beginEditing} style={journalStyles.captionNote}><Text numberOfLines={1} style={[journalStyles.captionText, !caption.trim() && journalStyles.captionPlaceholder]}>{caption.trim() || 'Write a caption'}</Text></Pressable>}
      {!readOnly && memory.saveState && <View accessibilityLabel={memory.saveState === 'saving' ? 'Saving photo' : memory.saveState === 'saved' ? 'Photo saved' : 'Photo needs retry'} style={[journalStyles.saveStatus, memory.saveState === 'retry' && journalStyles.saveStatusRetry]}>
        {memory.saveState === 'saving' ? <ActivityIndicator size="small" color={colors.blue}/> : <Ionicons name={memory.saveState === 'saved' ? 'checkmark' : 'alert-circle'} size={11} color={memory.saveState === 'retry' ? '#A85737' : '#43745F'}/>}<Text style={[journalStyles.saveStatusText, memory.saveState === 'retry' && journalStyles.saveStatusRetryText]}>{memory.saveState === 'saving' ? 'Saving' : memory.saveState === 'saved' ? 'Saved' : 'Retry'}</Text>
      </View>}
    </View>
    {layoutEditing && <><View {...responder.panHandlers} accessibilityLabel="Drag to arrange this photo" style={journalStyles.dragHandle}><Ionicons name="move" size={13} color="#604936"/></View><Pressable accessibilityRole="button" accessibilityLabel="Remove photo" onPress={() => onRemoveMemory(memory.id)} hitSlop={7} style={journalStyles.removePhoto}><Ionicons name="close" size={12} color="#FFFDF9"/></Pressable></>}
  </View>;
}

const singlePhotoLayout = (): MemoryLayout => ({ x: .5, y: .47, scale: 1, rotation: 0, pageStyle: 'single' });

function clampLayout(layout: MemoryLayout, canvas: { width: number; height: number }, photoWidth: number, photoHeight: number): MemoryLayout {
  if (!canvas.width || !canvas.height) return layout;
  const scale = 1;
  const margin = 12;
  const halfWidth = (photoWidth * scale) / 2 + margin;
  const halfHeight = (photoHeight * scale) / 2 + margin;
  return { ...layout, pageStyle: 'single', scale, x: Math.max(halfWidth / canvas.width, Math.min(1 - halfWidth / canvas.width, layout.x)), y: Math.max(halfHeight / canvas.height, Math.min(1 - halfHeight / canvas.height, layout.y)), rotation: 0 };
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
  // Older builds allowed several records to point at the same page. Reading
  // always expands those records into consecutive single-photo pages.
  const sorted = [...trip.memories].map((memory, sourceIndex) => ({ memory, sourceIndex })).sort((a, b) => {
    const pageDifference = (a.memory.bookPage ?? a.sourceIndex) - (b.memory.bookPage ?? b.sourceIndex);
    return pageDifference || ((parseTravelDate(a.memory.date)?.getTime() ?? 0) - (parseTravelDate(b.memory.date)?.getTime() ?? 0)) || a.sourceIndex - b.sourceIndex;
  });
  const pages: BookPage[] = sorted.map(({ memory }, pageIndex) => ({ id: memory.id, pageIndex, day: formatJournalDate(memory.date), place: memory.location || trip.city || trip.country || 'A favourite place', memory }));
  return Array.from({ length: Math.max(1, Math.ceil(pages.length / 2)) }, (_, index) => ({
    id: `${pages[index * 2]?.id ?? 'blank'}-${pages[index * 2 + 1]?.id ?? 'blank'}`,
    left: pages[index * 2] ?? { id: `blank-${index * 2}`, pageIndex: index * 2, day: '', place: trip.city || trip.country || 'A favourite place' },
    right: pages[index * 2 + 1] ?? { id: `blank-${index * 2 + 1}`, pageIndex: index * 2 + 1, day: '', place: trip.city || trip.country || 'A favourite place' },
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
  stageScroll: { flex: 1 }, stageScrollContent: { flexGrow: 1 }, stage: { flex: 1, minHeight: 360, justifyContent: 'center', alignItems: 'center', paddingVertical: 10 }, openBook: { aspectRatio: 1.37, maxHeight: 430, position: 'relative' }, viewport: { ...StyleSheet.absoluteFill, overflow: 'hidden', borderRadius: 11, backgroundColor: '#FBF2E2' }, spreadLayer: { ...StyleSheet.absoluteFill }, turnSnapshotLayer: { ...StyleSheet.absoluteFill, zIndex: 6, backgroundColor: '#FBF2E2' },
  edges: { position: 'absolute', top: 13, bottom: 8, width: 22, zIndex: -1 }, leftEdges: { left: 0 }, rightEdges: { right: 0 }, edge: { position: 'absolute', top: 0, bottom: 0, width: 16, borderRadius: 4, backgroundColor: '#EAE0D3', shadowColor: '#000', shadowOpacity: .12, shadowRadius: 4, shadowOffset: { width: 1, height: 2 } },
  spread: { flex: 1, flexDirection: 'row', overflow: 'hidden', borderRadius: 11, backgroundColor: '#F9F0DF', shadowColor: '#0B0604', shadowOpacity: .34, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  paper: { flex: 1, overflow: 'hidden', padding: 12, backgroundColor: '#FBF2E2' }, leftPaper: { borderTopLeftRadius: 11, borderBottomLeftRadius: 11 }, rightPaper: { borderTopRightRadius: 11, borderBottomRightRadius: 11 }, crease: { width: 5, backgroundColor: 'rgba(109,76,54,.17)', shadowColor: '#63442E', shadowOpacity: .35, shadowRadius: 5, shadowOffset: { width: 1, height: 0 }, zIndex: 3 },
  collageCanvas: { flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', borderRadius: 8, backgroundColor: '#FBF2E2' }, photoSlot: { position: 'absolute', zIndex: 2 }, photo: { flex: 1, minHeight: 0, maxWidth: '100%', backgroundColor: '#FFFDF9', padding: 4, borderRadius: 2, shadowColor: '#76533A', shadowOpacity: .2, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, imageFrame: { flex: 1, minHeight: 0, overflow: 'hidden', borderRadius: 1, backgroundColor: '#E1D3C1', alignItems: 'center', justifyContent: 'center' }, photoImage: { width: '100%', height: '100%' }, captionNote: { height: 20, marginTop: 3, paddingHorizontal: 5, justifyContent: 'center', borderRadius: 4, borderWidth: 1, borderColor: '#E4D7C6', backgroundColor: '#FFF8EA' }, captionText: { color: '#624B3A', fontSize: 8.5, lineHeight: 10, fontStyle: 'italic' }, captionPlaceholder: { color: '#A99A89' }, captionInput: { height: 18, color: '#624B3A', fontSize: 8.5, lineHeight: 10, fontStyle: 'italic', padding: 0, textAlignVertical: 'center' }, saveStatus: { position: 'absolute', right: 7, bottom: 25, minWidth: 52, height: 18, paddingHorizontal: 5, borderRadius: 9, gap: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,253,249,.94)', borderWidth: 1, borderColor: '#D6E6DC' }, saveStatusRetry: { borderColor: '#E4B99E', backgroundColor: '#FFF5EB' }, saveStatusText: { color: '#43745F', fontSize: 8, fontWeight: '800' }, saveStatusRetryText: { color: '#A85737' }, dragHandle: { position: 'absolute', left: -7, top: -7, width: 25, height: 25, borderRadius: 13, backgroundColor: '#F4D49E', borderWidth: 1, borderColor: '#D5AC69', alignItems: 'center', justifyContent: 'center', zIndex: 5 }, removePhoto: { position: 'absolute', right: -6, top: -6, width: 22, height: 22, borderRadius: 11, backgroundColor: '#8D574B', alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  blankPage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 7 }, blankCopy: { color: '#887563', fontSize: 10, textAlign: 'center', lineHeight: 14 }, emptyTitle: { color: '#44362C', fontFamily: fonts.heading, textAlign: 'center', fontSize: 16, marginTop: 6 }, emptyCopy: { color: '#887563', textAlign: 'center', fontSize: 11, lineHeight: 16, marginTop: 4 }, paperButton: { marginTop: 12, borderRadius: 15, backgroundColor: '#E8C695', paddingHorizontal: 10, paddingVertical: 7 }, paperButtonText: { color: '#5A4335', fontSize: 10, fontWeight: '800' },
  pageArrow: { position: 'absolute', top: '50%', marginTop: -17, height: 34, width: 30, borderRadius: 17, backgroundColor: 'rgba(255,253,249,.9)', alignItems: 'center', justifyContent: 'center', shadowColor: '#61412C', shadowOpacity: .16, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3, zIndex: 12 }, leftPageArrow: { left: 7 }, rightPageArrow: { right: 7 },
  frontCover: { ...StyleSheet.absoluteFill, zIndex: 10, transformOrigin: 'left center' }, coverFace: { flex: 1, borderRadius: 11, padding: 26, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, coverFaceSpine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 23 }, coverFaceTitle: { fontFamily: fonts.heading, textAlign: 'center', fontSize: 27, lineHeight: 32, marginTop: 14 }, coverFacePlace: { fontSize: 12, opacity: .86, marginTop: 5 }, coverFacePages: { position: 'absolute', left: 6, right: 6, bottom: 0, height: 13, backgroundColor: '#FFF9EE', borderTopWidth: 1, borderColor: '#E7DCCB' }, coverFaceRibbon: { position: 'absolute', bottom: -18, width: 22, height: 27, backgroundColor: '#E78B43' },
  pageHint: { alignItems: 'center', gap: 2, minHeight: 34 }, pageHintText: { color: '#FFF8EB', fontFamily: fonts.heading, fontSize: 13 }, swipeHint: { color: '#D8C1AA', fontSize: 11 }, toolbar: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }, toolButton: { height: 50, width: 50, borderRadius: 25, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#120B08', shadowOpacity: .2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 }, toolButtonActive: { backgroundColor: colors.blue },
});
