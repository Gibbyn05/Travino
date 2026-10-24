import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActionSheetIOS, Alert, Animated, Image, Linking, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, useColorScheme, useWindowDimensions, View } from 'react-native';
import { Field, Sheet } from '@/src/forms';
import { CapybaraMoment, Card, PrimaryButton } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { useTravel } from '@/src/store';
import { ensureGuestIdentity, supabase } from '@/src/lib/supabase';
import { completedTripCount, frameForProfile, LEVEL_PERKS, levelForCompletedTrips, PROFILE_FRAMES, TRAVELLER_ACCESSORIES, TRAVEL_LEVELS } from '@/src/travel-levels';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function parseTripDate(value: string): Date | null {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

const dayStamp = (date: Date) => Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

function LevelAvatar({ name, photoUri, level, frame, accessoryIcon, reduceMotion, onPress }: {
  name: string;
  photoUri?: string;
  level: number;
  frame: ReturnType<typeof frameForProfile>;
  accessoryIcon?: keyof typeof Ionicons.glyphMap;
  reduceMotion: boolean;
  onPress: () => void;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const animated = 'animated' in frame && frame.animated;
  const legendary = 'legend' in frame && frame.legend;

  useEffect(() => {
    pulse.stopAnimation();
    if (!animated || reduceMotion) { pulse.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.045, duration: 1300, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 1300, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [animated, pulse, reduceMotion]);

  return <Pressable accessibilityRole="button" accessibilityLabel="Open travel levels" onPress={onPress} style={({ pressed }) => [s.avatarPress, pressed && s.pressed]}>
    <Animated.View style={[s.levelFrame, { borderColor: frame.colors[0], shadowColor: frame.colors[0], transform: [{ scale: pulse }] }]}>
      <View style={[s.levelFrameInner, { borderColor: frame.colors[1] }]}>
        <View style={s.avatar}>{photoUri ? <Image key={photoUri} accessibilityLabel={`${name || 'Your'} profile photo`} source={{ uri: photoUri }} style={s.avatarPhoto}/> : <View style={s.initialContainer}><Text style={s.initial}>{(name || '?').slice(0, 1).toUpperCase()}</Text></View>}{accessoryIcon && <View style={s.accessoryBadge}><Ionicons name={accessoryIcon} size={13} color="#8A611B"/></View>}</View>
      </View>
      <View style={[s.levelMarker, { backgroundColor: frame.colors[0] }]}><Text style={s.levelMarkerText}>{level}</Text></View>
      {legendary && <View style={s.legendCrown}><Ionicons name="ribbon" size={15} color="#8A611B"/></View>}
    </Animated.View>
  </Pressable>;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function ProfilePhotoCropper({ asset, onCancel, onDone }: { asset: ImagePicker.ImagePickerAsset | null; onCancel: () => void; onDone: (uri: string) => Promise<void> | void }) {
  const scheme = useColorScheme();
  const cropInsets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const lastOffset = useRef(offset);
  const cropSize = Math.min(width - 48, 360);
  const sourceWidth = asset?.width || 1;
  const sourceHeight = asset?.height || 1;
  const baseScale = cropSize / Math.min(sourceWidth, sourceHeight);
  const imageWidth = sourceWidth * baseScale * zoom;
  const imageHeight = sourceHeight * baseScale * zoom;
  const boundsForZoom = (nextZoom: number) => ({
    x: Math.max(0, (sourceWidth * baseScale * nextZoom - cropSize) / 2),
    y: Math.max(0, (sourceHeight * baseScale * nextZoom - cropSize) / 2),
  });
  const clampOffset = (next: { x: number; y: number }, nextZoom = zoom) => {
    const bounds = boundsForZoom(nextZoom);
    return { x: clamp(next.x, -bounds.x, bounds.x), y: clamp(next.y, -bounds.y, bounds.y) };
  };

  useEffect(() => { setZoom(1); setOffset({ x: 0, y: 0 }); lastOffset.current = { x: 0, y: 0 }; setSaving(false); }, [asset?.uri]);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
    onPanResponderGrant: () => { lastOffset.current = offset; },
    onPanResponderMove: (_, gesture) => setOffset(clampOffset({ x: lastOffset.current.x + gesture.dx, y: lastOffset.current.y + gesture.dy })),
    onPanResponderRelease: () => { lastOffset.current = offset; },
  }), [offset, zoom, cropSize, sourceWidth, sourceHeight]);
  const setZoomSafely = (nextZoom: number) => {
    const next = clamp(nextZoom, 1, 3);
    setZoom(next);
    setOffset((current) => clampOffset(current, next));
  };
  const finish = async () => {
    if (!asset || saving) return;
    setSaving(true);
    try {
      const visibleSourceSize = cropSize / (baseScale * zoom);
      const left = clamp((sourceWidth - visibleSourceSize) / 2 - offset.x / (baseScale * zoom), 0, Math.max(0, sourceWidth - visibleSourceSize));
      const top = clamp((sourceHeight - visibleSourceSize) / 2 - offset.y / (baseScale * zoom), 0, Math.max(0, sourceHeight - visibleSourceSize));
      const result = await ImageManipulator.manipulateAsync(asset.uri, [
        { crop: { originX: left, originY: top, width: visibleSourceSize, height: visibleSourceSize } },
        { resize: { width: 800, height: 800 } },
      ], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG });
      await onDone(result.uri);
    } catch {
      Alert.alert('Could not prepare photo', 'Please choose the photo again.');
      setSaving(false);
    }
  };
  const dark = scheme === 'dark';
  return <Modal visible={Boolean(asset)} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCancel}>
    <ScrollView style={{ backgroundColor: dark ? '#17212B' : '#FFFDF9' }} contentContainerStyle={[s.cropScreen, { paddingTop: cropInsets.top + 16, paddingBottom: cropInsets.bottom + 24 }]}><Text style={[s.cropTitle, { color: dark ? '#FFFFFF' : colors.text }]}>Position photo</Text>
      <View style={s.cropHeader}><Pressable accessibilityRole="button" accessibilityLabel="Cancel photo crop" onPress={onCancel} disabled={saving} hitSlop={10} style={s.cropHeaderButton}><Text style={[s.cropCancel, { color: dark ? '#E6EEF8' : colors.text }]}>Cancel</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Save profile photo" onPress={finish} disabled={saving} hitSlop={10} style={[s.cropDone, saving && s.cropDoneDisabled]}><Text style={s.cropDoneText}>{saving ? 'Saving…' : 'Done'}</Text></Pressable></View>
      <Text style={[s.cropCopy, { color: dark ? '#B9C5D4' : colors.muted }]}>Drag your photo. Use + or − to zoom.</Text>
      <View {...pan.panHandlers} accessibilityLabel="Profile photo crop area" style={s.cropViewport}>
        <Image source={{ uri: asset?.uri }} style={{ width: imageWidth, height: imageHeight, transform: [{ translateX: offset.x }, { translateY: offset.y }] }}/>
        <View pointerEvents="none" style={s.cropRing}/>
      </View>
      <View style={s.zoomControls}><Pressable accessibilityRole="button" accessibilityLabel="Zoom out" onPress={() => setZoomSafely(zoom - .2)} disabled={zoom <= 1} style={[s.zoomButton, dark && s.zoomButtonDark]}><Ionicons name="remove" size={22} color={dark ? '#FFFFFF' : colors.text}/></Pressable><Text style={[s.zoomValue, { color: dark ? '#E6EEF8' : colors.text }]}>{Math.round(zoom * 100)}%</Text><Pressable accessibilityRole="button" accessibilityLabel="Zoom in" onPress={() => setZoomSafely(zoom + .2)} disabled={zoom >= 3} style={[s.zoomButton, dark && s.zoomButtonDark]}><Ionicons name="add" size={22} color={dark ? '#FFFFFF' : colors.text}/></Pressable></View>
    </ScrollView>
  </Modal>;
}

function ListRow({ icon, tint = colors.blueSoft, iconColor = colors.blue, title, copy, onPress, children }: {
  icon: keyof typeof Ionicons.glyphMap;
  tint?: string;
  iconColor?: string;
  title: string;
  copy?: string;
  onPress?: () => void;
  children?: React.ReactNode;
}) {
  const body = <>
    <View style={[s.rowIcon, { backgroundColor: tint }]}><Ionicons name={icon} size={23} color={iconColor}/></View>
    <View style={s.rowBody}><Text style={s.rowTitle}>{title}</Text>{copy && <Text style={s.rowCopy}>{copy}</Text>}{children}</View>
    {onPress && <Ionicons name="chevron-forward" size={18} color={colors.muted}/>}
  </>;
  if (!onPress) return <View style={s.listRow}>{body}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [s.listRow, pressed && s.pressed]}>{body}</Pressable>;
}

function ProfileDisclosure({ title, copy, expanded, onPress, children }: {
  title: string; copy?: string; expanded: boolean; onPress: () => void; children: React.ReactNode;
}) {
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ expanded }} aria-expanded={expanded} onPress={onPress} style={({ pressed }) => [s.disclosure, pressed && s.pressed]}>
      <View style={s.rowBody}><Text style={s.rowTitle}>{title}</Text>{copy && <Text style={s.rowCopy}>{copy}</Text>}</View>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color={colors.blue}/>
    </Pressable>
    {expanded && <View style={s.disclosureContent}>{children}</View>}
  </View>;
}

export default function ProfileScreen() {
  const { profileName, profileBio = '', profilePhoto, pendingProfilePhoto, profilePhotoState, profilePhotoError, profileFrameId, profileAccessoryId, setProfilePhoto, retryProfilePhoto, setProfileFrame, setProfileAccessory, saveProfile, trips, selectedTrip, deleteTrip, setTripCompletionState, memoryBooksPublicByDefault, setMemoryBooksPublicByDefault } = useTravel();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [levelsOpen, setLevelsOpen] = useState(false);
  const [levelTab, setLevelTab] = useState<'Levels' | 'Style'>('Levels');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [perksOpen, setPerksOpen] = useState(false);
  const [manageTripOpen, setManageTripOpen] = useState(false);
  const [levelUp, setLevelUp] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [name, setName] = useState(profileName);
  const [bio, setBio] = useState(profileBio);
  const [cropAsset, setCropAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const previousLevel = useRef<number | null>(null);
  const celebrationOpacity = useRef(new Animated.Value(0)).current;
  const memoryCount = trips.reduce((total, trip) => total + trip.memories.length, 0);
  const completedTrips = useMemo(() => completedTripCount(trips), [trips]);
  const travelLevel = useMemo(() => levelForCompletedTrips(completedTrips), [completedTrips]);
  const selectedFrame = useMemo(() => frameForProfile(travelLevel.level, profileFrameId), [profileFrameId, travelLevel.level]);
  const selectedAccessory = useMemo(() => TRAVELLER_ACCESSORIES.find((item) => item.id === profileAccessoryId), [profileAccessoryId]);
  const displayedProfilePhoto = pendingProfilePhoto ?? profilePhoto;
  const hasGoldAccents = travelLevel.level >= 9;
  const savedTrips = trips.filter(trip => trip.id !== 'spain-2026');
  const manageableTrip = selectedTrip?.id !== 'spain-2026' ? selectedTrip : undefined;
  const openLevels = () => { setLevelTab('Levels'); setLevelsOpen(true); };
  const { countriesVisited, daysAway } = useMemo(() => {
    const localToday = new Date();
    const today = Date.UTC(localToday.getFullYear(), localToday.getMonth(), localToday.getDate());
    const tripDays = new Set<number>();
    const visited = new Set<string>();
    for (const trip of trips) {
      if (trip.id === 'spain-2026') continue;
      const start = parseTripDate(trip.startDate);
      const end = parseTripDate(trip.endDate);
      if (!start || !end || dayStamp(start) > today) continue;
      const last = Math.min(dayStamp(end), today);
      if (last < dayStamp(start)) continue;
      if (dayStamp(end) < today && trip.country.trim()) visited.add(trip.country.trim().toLocaleLowerCase());
      for (let date = dayStamp(start); date <= last; date += 86_400_000) tripDays.add(date);
    }
    return { countriesVisited: visited.size, daysAway: tripDays.size };
  }, [trips]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => subscription?.remove?.();
  }, []);

  useEffect(() => {
    if (previousLevel.current === null) { previousLevel.current = travelLevel.level; return; }
    if (travelLevel.level <= previousLevel.current) { previousLevel.current = travelLevel.level; return; }
    previousLevel.current = travelLevel.level;
    setLevelUp(travelLevel.title);
    if (!reduceMotion) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      celebrationOpacity.setValue(0);
      Animated.sequence([
        Animated.timing(celebrationOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.delay(2_200),
        Animated.timing(celebrationOpacity, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start(({ finished }) => { if (finished) setLevelUp(null); });
    } else {
      celebrationOpacity.setValue(1);
      const timer = setTimeout(() => setLevelUp(null), 2_600);
      return () => clearTimeout(timer);
    }
  }, [celebrationOpacity, reduceMotion, travelLevel.level, travelLevel.title]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    void ensureGuestIdentity().then((user) => user ? client.from('profiles').update({ legend_badge: travelLevel.level >= 10 }).eq('id', user.id) : undefined).catch(() => undefined);
  }, [travelLevel.level]);

  const save = async () => {
    const cleanName = name.trim();
    const cleanBio = bio.trim();
    if (!cleanName) { Alert.alert('Add your name', 'Your friends need a name to recognize you.'); return; }
    saveProfile(cleanName, cleanBio);
    if (supabase) {
      try {
        const user = await ensureGuestIdentity();
        if (user) {
          const { error: ensureError } = await supabase.rpc('ensure_my_profile', { p_display_name: cleanName });
          if (ensureError) throw ensureError;
          const { error } = await supabase.from('profiles').update({ display_name: cleanName, bio: cleanBio }).eq('id', user.id).select('id').single();
          if (error) throw error;
        }
      } catch {
        Alert.alert('Saved on this device', 'Your profile is safe here and will sync when the connection is ready.');
      }
    }
    setOpen(false);
  };

  const showPermissionHelp = (kind: 'camera' | 'photos') => {
    Alert.alert(`Allow ${kind === 'camera' ? 'camera' : 'photo library'}`, `Travino needs ${kind === 'camera' ? 'the camera' : 'your photo library'} only to set the profile picture you choose.`, [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => void Linking.openSettings() },
    ]);
  };
  const chooseProfilePhoto = async (source: 'camera' | 'library') => {
    const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { showPermissionHelp(source === 'camera' ? 'camera' : 'photos'); return; }
    try {
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1, cameraType: ImagePicker.CameraType.front })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsMultipleSelection: false });
      if (!result.canceled && result.assets[0]) setCropAsset(result.assets[0]);
    } catch {
      Alert.alert('Could not open camera', 'Please try again, or choose a photo from your library.');
    }
  };
  const openPhotoActions = () => {
    const takePhoto = () => { void chooseProfilePhoto('camera'); };
    const chooseLibrary = () => { void chooseProfilePhoto('library'); };
    const removePhoto = () => { void setProfilePhoto(undefined); };
    if (Platform.OS === 'ios') {
      const options = ['Take photo', 'Choose from library', ...(displayedProfilePhoto ? ['Remove photo'] : []), 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: displayedProfilePhoto ? 2 : undefined, title: 'Profile picture', message: 'Choose a photo that helps your friends recognise you.' }, (index) => {
        if (index === 0) takePhoto();
        if (index === 1) chooseLibrary();
        if (displayedProfilePhoto && index === 2) removePhoto();
      });
      return;
    }
    Alert.alert('Profile picture', 'Choose a photo that helps your friends recognise you.', [
      { text: 'Take photo', onPress: takePhoto }, { text: 'Choose from library', onPress: chooseLibrary }, ...(displayedProfilePhoto ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: removePhoto }] : []), { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const levelCopy = travelLevel.nextTitle && travelLevel.tripsLeft !== null
    ? `${travelLevel.tripsLeft} more ${travelLevel.tripsLeft === 1 ? 'trip' : 'trips'} to ${travelLevel.nextTitle}`
    : 'Max level reached';

  return <ScrollView style={s.page} contentContainerStyle={[s.content, { paddingTop: Math.max(insets.top, 48) + 16 }]} showsVerticalScrollIndicator={false}>
    <View style={s.pageHeading}>
      <Text accessibilityRole="header" style={s.headerTitle}>Profile</Text>
      <CapybaraMoment size={96} variant="profile"/>
    </View>
    <View style={s.profileHero}>
      <View style={s.identity}>
        <LevelAvatar name={profileName} photoUri={displayedProfilePhoto} level={travelLevel.level} frame={selectedFrame} accessoryIcon={selectedAccessory?.icon as keyof typeof Ionicons.glyphMap | undefined} reduceMotion={reduceMotion} onPress={openLevels}/>
        <View style={s.rowBody}>
          <Text style={s.name}>{profileName || 'Your name'}</Text>
          {travelLevel.level >= 10 && <View style={s.legendBadge}><Ionicons name="ribbon" size={18} color="#8A611B"/><Text style={s.legendBadgeText}>Legend</Text></View>}
          {Boolean(profileBio) && <Text style={s.profileCopy}>{profileBio}</Text>}
        </View>
      </View>
      <PrimaryButton title="Edit profile" icon="pencil" onPress={() => { setName(profileName); setBio(profileBio); setOpen(true); }}/>
      {levelUp && <Animated.View accessibilityLiveRegion="polite" style={[s.levelUp, { opacity: celebrationOpacity, transform: [{ scale: reduceMotion ? 1 : celebrationOpacity.interpolate({ inputRange: [0, 1], outputRange: [.98, 1] }) }] }]}><Ionicons name="sparkles-outline" size={22} color={colors.purple}/><Text style={s.levelUpText}>{levelUp}</Text><Pressable accessibilityRole="button" accessibilityLabel="Dismiss level up" onPress={() => setLevelUp(null)} style={s.dismissLevel}><Ionicons name="close" size={20} color={colors.muted}/></Pressable></Animated.View>}

    </View>



    <View style={s.profileSection}>
      <Text accessibilityRole="header" style={s.sectionTitle}>Memories & friends</Text>
      <Card style={s.groupCard}>
        <ListRow icon="book-outline" tint={colors.purpleSoft} iconColor={colors.purple} title="Memory book" copy={memoryCount ? `${memoryCount} ${memoryCount === 1 ? 'photo' : 'photos'}` : undefined} onPress={() => router.push('/memory-book' as any)}/>
        <View style={s.rowDivider}/>
        <ListRow icon="people-outline" title="Friends" onPress={() => router.push('/friends' as any)}/>
      </Card>
    </View>

    <View style={s.profileSection}>
      <Text accessibilityRole="header" style={s.sectionTitle}>Travel profile</Text>
      <View style={s.stats}>
        <View style={s.stat}><Text style={s.statNumber}>{countriesVisited}</Text><Text style={s.statLabel}>{countriesVisited === 1 ? 'Country visited' : 'Countries visited'}</Text></View>
        <View style={s.statDivider}/>
        <View style={s.stat}><Text style={s.statNumber}>{daysAway}</Text><Text style={s.statLabel}>{daysAway === 1 ? 'Day away' : 'Days away'}</Text></View>
      </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Open travel levels" onPress={openLevels} style={({ pressed }) => [s.levelCard, hasGoldAccents && s.levelCardGold, pressed && s.pressed]}>
      <View style={s.levelCardHeading}><View style={s.rowBody}><Text style={s.detailLabel}>Travel level {travelLevel.level}</Text><Text style={s.levelCardTitle}>{travelLevel.title}</Text></View><Ionicons name="chevron-forward" size={22} color={colors.blue}/></View>
      <Text style={s.rowCopy}>{levelCopy}</Text>
      <View accessibilityRole="progressbar" accessibilityLabel="Travel level progress" accessibilityValue={{ min: 0, max: 100, now: levelProgressWidth(completedTrips, travelLevel.level) }} style={[s.levelTrack, hasGoldAccents && s.levelTrackGold]}><View style={[s.levelFill, hasGoldAccents && s.levelFillGold, { width: `${levelProgressWidth(completedTrips, travelLevel.level)}%` as `${number}%` }]}/></View>
    </Pressable>
    </View>

    <View style={s.profileSection}>
      <Text accessibilityRole="header" style={s.sectionTitle}>Your trips</Text>
      <Card style={s.groupCard}>
        <ListRow icon="airplane-outline" title={savedTrips.length ? `${savedTrips.length} saved ${savedTrips.length === 1 ? 'trip' : 'trips'}` : 'Plan a trip'} onPress={() => router.push(savedTrips.length ? '/' : '/new-trip' as any)}/>
        {manageableTrip && <><View style={s.rowDivider}/><ProfileDisclosure title="Manage trip" copy={manageableTrip.title} expanded={manageTripOpen} onPress={() => setManageTripOpen(value => !value)}>
          {manageableTrip.completionState !== 'completed' ? <Pressable accessibilityRole="button" accessibilityLabel="Mark trip completed" onPress={() => setTripCompletionState(manageableTrip.id, 'completed')} style={({ pressed }) => [s.manageAction, pressed && s.pressed]}><Ionicons name="checkmark-circle-outline" size={24} color={colors.blue}/><Text style={s.manageActionText}>Mark completed</Text></Pressable> : <Text accessibilityLiveRegion="polite" style={s.rowCopy}>Completed</Text>}
          <Pressable accessibilityRole="button" accessibilityLabel="Delete trip" onPress={() => deleteTrip(manageableTrip.id)} style={({ pressed }) => [s.manageAction, pressed && s.pressed]}><Ionicons name="trash-outline" size={24} color="#BA294B"/><Text style={[s.manageActionText, s.deleteText]}>Delete trip</Text></Pressable>
        </ProfileDisclosure></>}
      </Card>
    </View>

    <View style={s.profileSection}>
      <Text accessibilityRole="header" style={s.sectionTitle}>Settings</Text>
      <Card style={s.settingsCard}>
        <Text accessibilityRole="header" style={s.rowTitle}>Memory book privacy</Text>
        <Text style={s.rowCopy}>Default visibility</Text>
        <View style={s.visibilityChoices}>
          <Pressable accessibilityRole="button" accessibilityLabel="Private memory books" accessibilityState={{ selected: !memoryBooksPublicByDefault }} onPress={() => setMemoryBooksPublicByDefault(false)} style={[s.visibilityChoice, !memoryBooksPublicByDefault && s.visibilityChoiceActive]}><Ionicons name="lock-closed-outline" size={24} color={!memoryBooksPublicByDefault ? '#FFFFFF' : colors.text}/><View style={s.rowBody}><Text style={[s.visibilityChoiceText, !memoryBooksPublicByDefault && s.visibilityChoiceTextActive]}>Private</Text><Text style={[s.visibilityChoiceCopy, !memoryBooksPublicByDefault && s.visibilityChoiceTextActive]}>Only you</Text></View>{!memoryBooksPublicByDefault && <Ionicons name="checkmark-circle" size={22} color="#FFFFFF"/>}</Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Memory books shared with friends" accessibilityState={{ selected: memoryBooksPublicByDefault }} onPress={() => setMemoryBooksPublicByDefault(true)} style={[s.visibilityChoice, memoryBooksPublicByDefault && s.visibilityChoiceActive]}><Ionicons name="people-outline" size={24} color={memoryBooksPublicByDefault ? '#FFFFFF' : colors.text}/><View style={s.rowBody}><Text style={[s.visibilityChoiceText, memoryBooksPublicByDefault && s.visibilityChoiceTextActive]}>Friends</Text><Text style={[s.visibilityChoiceCopy, memoryBooksPublicByDefault && s.visibilityChoiceTextActive]}>Accepted friends</Text></View>{memoryBooksPublicByDefault && <Ionicons name="checkmark-circle" size={22} color="#FFFFFF"/>}</Pressable>
        </View>
        <Text style={s.privacyHint}>You can change this for each book.</Text>
        <View style={s.settingsDivider}/>
        <ListRow icon="eye-outline" title="Welcome tour" onPress={() => router.push({ pathname: '/onboarding', params: { preview: '1', source: 'settings' } } as any)}/>
      </Card>
    </View>

    <Sheet visible={open} title="Edit profile" onClose={() => setOpen(false)}>
      <View style={s.editAvatarSection}>
        <View style={[s.editAvatarFrame, { borderColor: selectedFrame.colors[0] }]}><View style={[s.editAvatarFrameInner, { borderColor: selectedFrame.colors[1] }]}>{displayedProfilePhoto ? <Image key={displayedProfilePhoto} accessibilityLabel={`${profileName || 'Your'} profile photo`} source={{ uri: displayedProfilePhoto }} style={s.editAvatarPhoto}/> : <View style={s.editAvatarInitialSurface}><Text style={s.editAvatarInitial}>{(profileName || '?').slice(0, 1).toUpperCase()}</Text></View>}</View></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" onPress={openPhotoActions} style={({ pressed }) => [s.changePhoto, pressed && s.pressed]}><Ionicons name="camera" size={22} color="#FFFFFF"/><Text style={s.changePhotoText}>Change photo</Text></Pressable>
        {profilePhotoState === 'saving' && <Text accessibilityLiveRegion="polite" style={s.photoStatus}><Ionicons name="cloud-upload-outline" size={13} color={colors.muted}/> Saving photo…</Text>}
        {profilePhotoState === 'saved' && displayedProfilePhoto && <Text accessibilityLiveRegion="polite" style={s.photoSaved}><Ionicons name="checkmark-circle" size={13} color="#36855E"/> Saved</Text>}
        {profilePhotoState === 'retry' && <Pressable accessibilityRole="button" accessibilityLabel={profilePhotoError ? 'Retry profile photo upload after a save error' : 'Retry profile photo upload'} onPress={retryProfilePhoto} style={s.retryPhoto}><Ionicons name="refresh" size={14} color={colors.pink}/><Text style={s.retryPhotoText}>Retry photo upload</Text></Pressable>}
      </View>
      <Field value={name} onChangeText={setName} placeholder="Your name"/><Field value={bio} onChangeText={setBio} placeholder="A little about you" multiline/><Text style={s.profileHint}>Shown to accepted friends when you share a book.</Text><PrimaryButton title="Save profile" icon="checkmark" onPress={save} disabled={!name.trim()}/>
    </Sheet>
    <ProfilePhotoCropper asset={cropAsset} onCancel={() => setCropAsset(null)} onDone={async (uri) => { await setProfilePhoto(uri); setCropAsset(null); }}/>
    <Sheet visible={levelsOpen} title="Travel levels" onClose={() => setLevelsOpen(false)}>
      <Text style={s.levelSheetTitle}>Level {travelLevel.level} · {travelLevel.title}</Text>
      <Text style={s.levelSheetIntro}>{levelCopy}</Text>
      <Text style={s.rowCopy}>{completedTrips} qualifying {completedTrips === 1 ? 'trip' : 'trips'}</Text>
      <View accessibilityRole="tablist" accessibilityLabel="Travel level sections" style={s.levelTabs}>{(['Levels', 'Style'] as const).map(item => <Pressable key={item} accessibilityRole="tab" accessibilityLabel={item} accessibilityState={{ selected: levelTab === item }} aria-selected={levelTab === item} onPress={() => setLevelTab(item)} style={[s.levelTab, levelTab === item && s.levelTabActive]}><Text style={[s.levelTabText, levelTab === item && s.levelTabTextActive]}>{item}</Text></Pressable>)}</View>
      {levelTab === 'Levels' ? <>
        <ProfileDisclosure title="How levels work" expanded={rulesOpen} onPress={() => setRulesOpen(value => !value)}>
          <Text style={s.levelSheetRule}>A trip needs a destination and at least two days, three planned activities or activities across three days, and a memory from the trip.</Text>
          <Text style={s.levelSheetRule}>It must have ended, or be marked completed after starting. Overlapping trips count once. Trips added after they ended need three photos.</Text>
        </ProfileDisclosure>
      <View style={s.levelList}>{TRAVEL_LEVELS.map((entry) => { const current = entry.level === travelLevel.level; const locked = entry.threshold > completedTrips; return <View key={entry.level} style={[s.levelRow, current && s.levelRowCurrent, locked && s.levelRowLocked]}><View style={[s.levelRowNumber, current && s.levelRowNumberCurrent]}><Text style={[s.levelRowNumberText, current && s.levelRowNumberTextCurrent]}>{entry.level}</Text></View><View style={{ flex: 1 }}><Text style={[s.levelRowTitle, locked && s.levelRowTextLocked]}>{entry.title}</Text><Text style={[s.levelRowCopy, locked && s.levelRowTextLocked]}>{entry.threshold} completed trips</Text></View>{current ? <Ionicons name="checkmark-circle" size={21} color={colors.blue}/> : locked ? <Ionicons name="lock-closed-outline" size={17} color={colors.muted}/> : <Ionicons name="checkmark" size={20} color={colors.blue}/>}</View>; })}</View>
        <ProfileDisclosure title="Level perks" expanded={perksOpen} onPress={() => setPerksOpen(value => !value)}>
      <View style={s.framePicker}>{LEVEL_PERKS.map((perk) => { const locked = perk.unlockLevel > travelLevel.level; return <View key={perk.id} style={[s.perkRow, locked && s.frameChoiceLocked]}><View style={s.perkIcon}><Ionicons name={perk.icon as keyof typeof Ionicons.glyphMap} size={18} color={locked ? colors.muted : colors.purple}/></View><View style={{ flex: 1 }}><Text style={s.frameChoiceTitle}>{perk.title}</Text><Text style={s.frameChoiceCopy}>{locked ? `Unlocks at Level ${perk.unlockLevel}` : perk.detail}</Text></View>{locked ? <Ionicons name="lock-closed-outline" size={16} color={colors.muted}/> : <Ionicons name="checkmark-circle" size={19} color={colors.blue}/>}</View>; })}</View>
        </ProfileDisclosure>
      </> : <>
      <Text style={s.framePickerTitle}>Profile frame</Text>
      <View style={s.framePicker}>{PROFILE_FRAMES.map((frame) => { const locked = frame.unlockLevel > travelLevel.level; const selected = selectedFrame.id === frame.id; return <Pressable key={frame.id} accessibilityRole="button" accessibilityState={{ disabled: locked, selected }} disabled={locked} onPress={() => setProfileFrame(frame.id)} style={({ pressed }) => [s.frameChoice, selected && s.frameChoiceSelected, locked && s.frameChoiceLocked, pressed && !locked && s.pressed]}><View style={[s.framePreview, { borderColor: frame.colors[0] }]}><View style={[s.framePreviewInner, { borderColor: frame.colors[1] }]}/></View><View style={{ flex: 1 }}><Text style={s.frameChoiceTitle}>{frame.title}</Text><Text style={s.frameChoiceCopy}>{locked ? `Unlocks at Level ${frame.unlockLevel}` : selected ? 'Selected' : `Unlocked at Level ${frame.unlockLevel}`}</Text></View>{locked ? <Ionicons name="lock-closed-outline" size={16} color={colors.muted}/> : selected ? <Ionicons name="checkmark-circle" size={19} color={colors.blue}/> : null}</Pressable>; })}</View>
      {travelLevel.level >= 5 && <><Text style={s.framePickerTitle}>Traveller accessory</Text><View style={s.accessoryChoices}>{TRAVELLER_ACCESSORIES.map((accessory) => { const selected = selectedAccessory?.id === accessory.id; return <Pressable key={accessory.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setProfileAccessory(accessory.id)} style={({ pressed }) => [s.accessoryChoice, selected && s.accessoryChoiceSelected, pressed && s.pressed]}><Ionicons name={accessory.icon as keyof typeof Ionicons.glyphMap} size={19} color={selected ? colors.blue : colors.muted}/><Text style={[s.accessoryChoiceText, selected && s.accessoryChoiceTextSelected]}>{accessory.title}</Text></Pressable>; })}</View></>}
      </>}
    </Sheet>
  </ScrollView>;
}

function levelProgressWidth(completedTrips: number, level: number) {
  const current = TRAVEL_LEVELS.find((entry) => entry.level === level) ?? TRAVEL_LEVELS[0];
  const next = TRAVEL_LEVELS.find((entry) => entry.level === level + 1);
  if (!next) return 100;
  return Math.max(0, Math.min(100, Math.round((completedTrips - current.threshold) / (next.threshold - current.threshold) * 100)));
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingBottom: 44 },
  pageHeading: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  headerTitle: { flex: 1, minWidth: 0, color: colors.text, fontFamily: fonts.heading, fontSize: 42, lineHeight: 50 },
  profileHero: { gap: 18 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  rowBody: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontFamily: fonts.heading, fontSize: 30, lineHeight: 38 },
  profileCopy: { color: colors.muted, fontSize: 18, lineHeight: 26, marginTop: 5 },
  avatarPress: { padding: 3 },
  levelFrame: { width: 96, height: 96, borderRadius: 48, borderWidth: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, shadowOpacity: .12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  levelFrameInner: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, padding: 3, backgroundColor: '#FFFFFF' },
  avatar: { flex: 1, overflow: 'hidden', borderRadius: 33, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueBright },
  avatarPhoto: { width: '100%', height: '100%', resizeMode: 'cover' },
  initialContainer: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#FFFFFF', fontFamily: fonts.heading, fontSize: 38, lineHeight: 46, includeFontPadding: false, textAlign: 'center' },
  accessoryBadge: { position: 'absolute', width: 26, height: 26, borderRadius: 13, right: 2, top: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFE6A8', borderWidth: 2, borderColor: '#FFFFFF' },
  levelMarker: { position: 'absolute', width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.surface, right: -2, bottom: -2, alignItems: 'center', justifyContent: 'center' },
  levelMarkerText: { color: '#FFFFFF', fontSize: 16, lineHeight: 22, fontWeight: '800' },
  legendCrown: { position: 'absolute', top: -8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFE7A2', borderWidth: 2, borderColor: colors.surface },
  legendBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, marginTop: 6, backgroundColor: '#FFF0C4' },
  legendBadgeText: { color: '#8A611B', fontSize: 16, lineHeight: 23, fontWeight: '700' },
  stats: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingVertical: 16, backgroundColor: '#F7F0E5', borderWidth: 1, borderColor: '#EDE0D0' },
  stat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  statDivider: { height: 44, width: 1, backgroundColor: '#DACBB9' },
  statNumber: { color: colors.text, fontFamily: fonts.heading, fontSize: 30, lineHeight: 38 },
  statLabel: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: 2, textAlign: 'center' },
  levelCard: { gap: 8, padding: 18, borderRadius: 22, borderWidth: 1, borderColor: '#D4E6FF', backgroundColor: colors.blueSoft },
  levelCardGold: { backgroundColor: '#FFF7E5', borderColor: '#EED9A4' },
  levelCardHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailLabel: { color: colors.muted, fontSize: 17, lineHeight: 24, fontWeight: '600' },
  levelCardTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 24, lineHeight: 32, marginTop: 2 },
  levelTrack: { height: 8, marginTop: 4, overflow: 'hidden', borderRadius: 4, backgroundColor: '#DCE7F6' },
  levelTrackGold: { backgroundColor: '#F7E5B0' },
  levelFill: { height: '100%', borderRadius: 4, backgroundColor: colors.blue },
  levelFillGold: { backgroundColor: '#B8832E' },
  levelUp: { paddingLeft: 12, paddingVertical: 6, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF6DD', borderWidth: 1, borderColor: '#F3DEAA' },
  levelUpText: { flex: 1, minWidth: 0, color: colors.text, fontFamily: fonts.heading, fontSize: 20, lineHeight: 27 },
  dismissLevel: { minHeight: 44, width: 44, alignItems: 'center', justifyContent: 'center' },
  profileSection: { marginTop: 28, gap: 12 },
  sectionTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 28, lineHeight: 36 },
  groupCard: { paddingVertical: 4, paddingHorizontal: 16 },
  settingsCard: { padding: 18 },
  listRow: { minHeight: 80, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft },
  rowTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 22, lineHeight: 29 },
  rowCopy: { color: colors.muted, fontSize: 18, lineHeight: 26, marginTop: 4 },
  rowDivider: { height: 1, backgroundColor: colors.border },
  disclosure: { minHeight: 64, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  disclosureContent: { gap: 14, paddingBottom: 16 },
  manageAction: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  manageActionText: { flex: 1, minWidth: 0, color: colors.blue, fontSize: 20, lineHeight: 28, fontWeight: '600' },
  deleteText: { color: '#BA294B' },
  visibilityChoices: { gap: 10, marginTop: 16 },
  visibilityChoice: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  visibilityChoiceActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  visibilityChoiceText: { color: colors.text, fontSize: 20, lineHeight: 28, fontWeight: '700' },
  visibilityChoiceCopy: { color: colors.muted, fontSize: 17, lineHeight: 24, marginTop: 2 },
  visibilityChoiceTextActive: { color: '#FFFFFF' },
  privacyHint: { color: colors.muted, fontSize: 17, lineHeight: 25, marginTop: 12 },
  settingsDivider: { height: 1, backgroundColor: colors.border, marginTop: 20 },
  editAvatarSection: { alignItems: 'center', gap: 12, marginBottom: 20 },
  editAvatarFrame: { width: 110, height: 110, borderRadius: 55, borderWidth: 5, padding: 4, backgroundColor: colors.surface },
  editAvatarFrameInner: { flex: 1, overflow: 'hidden', borderRadius: 46, borderWidth: 2, padding: 3, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  editAvatarPhoto: { width: '100%', height: '100%', borderRadius: 42, resizeMode: 'cover' },
  editAvatarInitialSurface: { width: '100%', height: '100%', borderRadius: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueBright },
  editAvatarInitial: { color: '#FFFFFF', fontFamily: fonts.heading, fontSize: 38, lineHeight: 46, includeFontPadding: false, textAlign: 'center' },
  changePhoto: { minHeight: 48, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, backgroundColor: colors.blue },
  changePhotoText: { color: '#FFFFFF', fontSize: 18, lineHeight: 26, fontWeight: '700' },
  photoStatus: { color: colors.muted, fontSize: 17, lineHeight: 25, textAlign: 'center' },
  photoSaved: { color: '#286344', fontSize: 17, lineHeight: 25, fontWeight: '600' },
  retryPhoto: { minHeight: 48, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, alignItems: 'center', flexDirection: 'row', gap: 8, backgroundColor: '#FFF0F1' },
  retryPhotoText: { color: '#BA294B', fontSize: 18, lineHeight: 26, fontWeight: '600', flexShrink: 1 },
  profileHint: { color: colors.muted, fontSize: 17, lineHeight: 25, marginBottom: 18 },
  levelSheetTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 24, lineHeight: 32, marginBottom: 6 },
  levelSheetIntro: { color: colors.text, fontSize: 18, lineHeight: 26 },
  levelSheetRule: { color: colors.muted, fontSize: 17, lineHeight: 25 },
  levelTabs: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 12 },
  levelTab: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  levelTabActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  levelTabText: { color: colors.text, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  levelTabTextActive: { color: '#FFFFFF' },
  levelList: { gap: 10, marginTop: 8 },
  levelRow: { minHeight: 80, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 17, backgroundColor: '#F7F3ED' },
  levelRowCurrent: { backgroundColor: colors.blueSoft, borderWidth: 1, borderColor: '#D8E9FF' },
  levelRowLocked: { backgroundColor: '#F7F3ED' },
  levelRowNumber: { width: 36, height: 36, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECE6DD' },
  levelRowNumberCurrent: { backgroundColor: colors.blue },
  levelRowNumberText: { color: colors.text, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  levelRowNumberTextCurrent: { color: '#FFFFFF' },
  levelRowTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 20, lineHeight: 27 },
  levelRowCopy: { color: colors.muted, fontSize: 17, lineHeight: 24, marginTop: 3 },
  levelRowTextLocked: { color: colors.muted },
  framePickerTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 24, lineHeight: 32, marginTop: 16, marginBottom: 12 },
  framePicker: { gap: 10, paddingBottom: 8 },
  frameChoice: { minHeight: 80, padding: 14, gap: 12, flexDirection: 'row', alignItems: 'center', borderRadius: 16, backgroundColor: '#F7F3ED' },
  frameChoiceSelected: { backgroundColor: colors.blueSoft, borderWidth: 1, borderColor: '#D8E9FF' },
  frameChoiceLocked: { backgroundColor: '#F7F3ED' },
  framePreview: { width: 38, height: 38, borderRadius: 19, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  framePreviewInner: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, backgroundColor: colors.blueBright },
  frameChoiceTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 20, lineHeight: 27 },
  frameChoiceCopy: { color: colors.muted, fontSize: 17, lineHeight: 24, marginTop: 3 },
  perkRow: { minHeight: 80, padding: 14, gap: 12, flexDirection: 'row', alignItems: 'center', borderRadius: 16, backgroundColor: '#F7F3ED' },
  perkIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.purpleSoft },
  accessoryChoices: { gap: 10, paddingBottom: 8 },
  accessoryChoice: { minHeight: 52, padding: 14, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F7F3ED' },
  accessoryChoiceSelected: { backgroundColor: colors.blueSoft, borderWidth: 1, borderColor: '#D8E9FF' },
  accessoryChoiceText: { flexShrink: 1, color: colors.text, fontSize: 18, lineHeight: 26, fontWeight: '600' },
  accessoryChoiceTextSelected: { color: colors.blue },
  cropScreen: { flexGrow: 1, paddingHorizontal: 24, alignItems: 'center' },
  cropTitle: { alignSelf: 'stretch', fontFamily: fonts.heading, fontSize: 28, lineHeight: 36, marginBottom: 12 },
  cropHeader: { width: '100%', minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cropHeaderButton: { minWidth: 80, minHeight: 48, justifyContent: 'center' },
  cropCancel: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  cropDone: { minWidth: 80, minHeight: 48, paddingHorizontal: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue },
  cropDoneDisabled: { opacity: .58 },
  cropDoneText: { color: '#FFFFFF', fontSize: 18, lineHeight: 26, fontWeight: '700' },
  cropCopy: { alignSelf: 'stretch', textAlign: 'center', fontSize: 18, lineHeight: 26, marginTop: 20, marginBottom: 20 },
  cropViewport: { width: '100%', aspectRatio: 1, maxWidth: 360, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#D9E1EB', borderRadius: 28 },
  cropRing: { position: 'absolute', inset: 0, borderWidth: 3, borderColor: '#FFFFFF', borderRadius: 28 },
  zoomControls: { marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 20 },
  zoomButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F4F7', borderWidth: 1, borderColor: '#DEE4EA' },
  zoomButtonDark: { backgroundColor: '#283746', borderColor: '#435568' },
  zoomValue: { minWidth: 60, textAlign: 'center', fontSize: 18, lineHeight: 26, fontWeight: '700' },
  pressed: { opacity: .78 },
});
