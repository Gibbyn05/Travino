import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActionSheetIOS, Alert, Animated, Image, Linking, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, useColorScheme, useWindowDimensions, View } from 'react-native';
import { Field, Sheet } from '@/src/forms';
import { Card, PrimaryButton } from '@/src/ui';
import { colors, fonts } from '@/src/theme';
import { useTravel } from '@/src/store';
import { ensureGuestIdentity, supabase } from '@/src/lib/supabase';
import { completedTripCount, frameForProfile, LEVEL_PERKS, levelForCompletedTrips, PROFILE_FRAMES, TRAVELLER_ACCESSORIES, TRAVEL_LEVELS } from '@/src/travel-levels';

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
        <View style={s.avatar}>{photoUri ? <Image accessibilityLabel={`${name || 'Your'} profile photo`} source={{ uri: photoUri }} style={s.avatarPhoto}/> : <Text style={s.initial}>{(name || '?').slice(0, 1).toUpperCase()}</Text>}{accessoryIcon && <View style={s.accessoryBadge}><Ionicons name={accessoryIcon} size={13} color="#8A611B"/></View>}</View>
      </View>
      <View style={[s.levelMarker, { backgroundColor: frame.colors[0] }]}><Text style={s.levelMarkerText}>{level}</Text></View>
      {legendary && <View style={s.legendCrown}><Ionicons name="ribbon" size={15} color="#8A611B"/></View>}
    </Animated.View>
  </Pressable>;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function ProfilePhotoCropper({ asset, onCancel, onDone }: { asset: ImagePicker.ImagePickerAsset | null; onCancel: () => void; onDone: (uri: string) => void }) {
  const scheme = useColorScheme();
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
      onDone(result.uri);
    } catch {
      Alert.alert('Could not prepare photo', 'Please choose the photo again.');
      setSaving(false);
    }
  };
  const dark = scheme === 'dark';
  return <Modal visible={Boolean(asset)} animationType="slide" presentationStyle="fullScreen" onRequestClose={onCancel}>
    <View style={[s.cropScreen, { backgroundColor: dark ? '#17212B' : '#FFFDF9' }]}>
      <View style={s.cropHeader}><Pressable accessibilityRole="button" accessibilityLabel="Cancel photo crop" onPress={onCancel} disabled={saving} hitSlop={10} style={s.cropHeaderButton}><Text style={[s.cropCancel, { color: dark ? '#E6EEF8' : colors.text }]}>Cancel</Text></Pressable><Text style={[s.cropTitle, { color: dark ? '#FFFFFF' : colors.text }]}>Position photo</Text><Pressable accessibilityRole="button" accessibilityLabel="Save profile photo" onPress={finish} disabled={saving} hitSlop={10} style={[s.cropDone, saving && s.cropDoneDisabled]}><Text style={s.cropDoneText}>{saving ? 'Saving…' : 'Done'}</Text></Pressable></View>
      <Text style={[s.cropCopy, { color: dark ? '#B9C5D4' : colors.muted }]}>Drag to position your photo. Use the controls to zoom.</Text>
      <View {...pan.panHandlers} accessibilityLabel="Profile photo crop area" style={s.cropViewport}>
        <Image source={{ uri: asset?.uri }} style={{ width: imageWidth, height: imageHeight, transform: [{ translateX: offset.x }, { translateY: offset.y }] }}/>
        <View pointerEvents="none" style={s.cropRing}/>
      </View>
      <View style={s.zoomControls}><Pressable accessibilityRole="button" accessibilityLabel="Zoom out" onPress={() => setZoomSafely(zoom - .2)} disabled={zoom <= 1} style={[s.zoomButton, dark && s.zoomButtonDark]}><Ionicons name="remove" size={22} color={dark ? '#FFFFFF' : colors.text}/></Pressable><Text style={[s.zoomValue, { color: dark ? '#E6EEF8' : colors.text }]}>{Math.round(zoom * 100)}%</Text><Pressable accessibilityRole="button" accessibilityLabel="Zoom in" onPress={() => setZoomSafely(zoom + .2)} disabled={zoom >= 3} style={[s.zoomButton, dark && s.zoomButtonDark]}><Ionicons name="add" size={22} color={dark ? '#FFFFFF' : colors.text}/></Pressable></View>
    </View>
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
    <View style={[s.rowIcon, { backgroundColor: tint }]}><Ionicons name={icon} size={19} color={iconColor}/></View>
    <View style={s.rowBody}><Text style={s.rowTitle}>{title}</Text>{copy && <Text style={s.rowCopy}>{copy}</Text>}{children}</View>
    {onPress && <Ionicons name="chevron-forward" size={18} color={colors.muted}/>}
  </>;
  if (!onPress) return <View style={s.listRow}>{body}</View>;
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [s.listRow, pressed && s.pressed]}>{body}</Pressable>;
}

export default function ProfileScreen() {
  const { profileName, profileBio = '', profilePhoto, profilePhotoState, profileFrameId, profileAccessoryId, setProfilePhoto, retryProfilePhoto, setProfileFrame, setProfileAccessory, saveProfile, trips, selectedTrip, deleteTrip, setTripCompletionState, memoryBooksPublicByDefault, setMemoryBooksPublicByDefault } = useTravel();
  const [open, setOpen] = useState(false);
  const [levelsOpen, setLevelsOpen] = useState(false);
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
  const hasGoldAccents = travelLevel.level >= 9;
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
    const removePhoto = () => setProfilePhoto(undefined);
    if (Platform.OS === 'ios') {
      const options = ['Take photo', 'Choose from library', ...(profilePhoto ? ['Remove photo'] : []), 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: profilePhoto ? 2 : undefined, title: 'Profile picture', message: 'Choose a photo that helps your friends recognise you.' }, (index) => {
        if (index === 0) takePhoto();
        if (index === 1) chooseLibrary();
        if (profilePhoto && index === 2) removePhoto();
      });
      return;
    }
    Alert.alert('Profile picture', 'Choose a photo that helps your friends recognise you.', [
      { text: 'Take photo', onPress: takePhoto }, { text: 'Choose from library', onPress: chooseLibrary }, ...(profilePhoto ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: removePhoto }] : []), { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const levelCopy = travelLevel.nextTitle && travelLevel.tripsLeft !== null
    ? `${travelLevel.tripsLeft} more ${travelLevel.tripsLeft === 1 ? 'trip' : 'trips'} to ${travelLevel.nextTitle}`
    : 'Max level reached';

  return <ScrollView style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <View pointerEvents="none" style={s.headerArt}>
      <View style={s.blueBlob}/><View style={s.warmBlob}/>
      <Text style={s.headerEyebrow}>Your travel profile</Text><Text style={s.headerTitle}>Profile</Text>
    </View>

    <View style={s.profileHero}>
      <LevelAvatar name={profileName} photoUri={profilePhoto} level={travelLevel.level} frame={selectedFrame} accessoryIcon={selectedAccessory?.icon as keyof typeof Ionicons.glyphMap | undefined} reduceMotion={reduceMotion} onPress={() => setLevelsOpen(true)}/>
      <Pressable accessibilityRole="button" accessibilityLabel="Open travel levels" onPress={() => setLevelsOpen(true)} style={({ pressed }) => [s.levelPill, hasGoldAccents && s.levelPillGold, pressed && s.pressed]}>
        <Text style={s.levelPillEyebrow}>TRAVEL LEVEL</Text><View style={s.levelPillDot}/><Text style={s.levelPillText}>{travelLevel.title}</Text><Ionicons name="chevron-up" size={14} color="#FFFFFF"/>
      </Pressable>
      <View style={s.nameRow}><Text style={s.name}>{profileName || 'Your name'}</Text>{travelLevel.level >= 10 && <View style={s.legendBadge}><Ionicons name="ribbon" size={12} color="#8A611B"/><Text style={s.legendBadgeText}>Legend</Text></View>}</View>
      <Text style={s.profileCopy}>{profileBio || 'Collecting little moments along the way.'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={() => { setName(profileName); setBio(profileBio); setOpen(true); }} style={({ pressed }) => [s.editProfile, pressed && s.pressed]}><Ionicons name="pencil" size={15} color={colors.blue}/><Text style={s.editProfileText}>Edit profile</Text></Pressable>
      {levelUp && <Animated.View accessibilityLiveRegion="polite" style={[s.levelUp, { opacity: celebrationOpacity, transform: [{ scale: reduceMotion ? 1 : celebrationOpacity.interpolate({ inputRange: [0, 1], outputRange: [.98, 1] }) }] }]}><Ionicons name="sparkles-outline" size={18} color={colors.purple}/><Text style={s.levelUpText}>{levelUp}</Text><Pressable accessibilityRole="button" accessibilityLabel="Dismiss level up" onPress={() => setLevelUp(null)} hitSlop={10}><Ionicons name="close" size={16} color={colors.muted}/></Pressable></Animated.View>}
      <Pressable accessibilityRole="button" accessibilityLabel="Open travel levels" onPress={() => setLevelsOpen(true)} style={({ pressed }) => [s.levelProgress, pressed && s.pressed]}>
        <View style={s.levelProgressHead}><Text style={s.levelProgressCopy}>{levelCopy}</Text><Text style={s.levelProgressValue}>{completedTrips} qualifying</Text></View>
        <View style={[s.levelTrack, hasGoldAccents && s.levelTrackGold]}><View style={[s.levelFill, hasGoldAccents && s.levelFillGold, { width: `${levelProgressWidth(completedTrips, travelLevel.level)}%` as `${number}%` }]}/></View>
      </Pressable>
      <View style={s.stats}>
        <View style={s.stat}><Text style={s.statNumber}>{countriesVisited}</Text><Text style={s.statLabel}>{countriesVisited === 1 ? 'country visited' : 'countries visited'}</Text></View>
        <View style={s.statDivider}/>
        <View style={s.stat}><Text style={s.statNumber}>{daysAway}</Text><Text style={s.statLabel}>{daysAway === 1 ? 'day away' : 'days away'}</Text></View>
      </View>
    </View>

    <View style={s.cardStack}>
      <Card style={s.groupCard}>
        <Text style={s.sectionTitle}>Your space</Text>
        <ListRow icon="book-outline" tint={colors.purpleSoft} iconColor={colors.purple} title="Memory book" copy={memoryCount ? `${memoryCount} ${memoryCount === 1 ? 'photo' : 'photos'} from your trips` : 'A place for your favourite travel moments'} onPress={() => router.push('/memory-book' as any)}/>
        <View style={s.rowDivider}/>
        <ListRow icon="people-outline" title="Friends" copy="Share your travel memories with friends" onPress={() => router.push('/friends' as any)}/>
      </Card>

      <Card style={s.journeyCard}>
        <View style={s.sectionHeading}><Text style={s.sectionTitle}>Your journeys</Text><View style={s.journeyCount}><Text style={s.journeyCountText}>{trips.filter((trip) => trip.id !== 'spain-2026').length}</Text></View></View>
        <View style={s.journeySummary}><View style={s.rowIcon}><Ionicons name="airplane-outline" size={19} color={colors.blue}/></View><View style={s.rowBody}><Text style={s.rowTitle}>{trips.filter((trip) => trip.id !== 'spain-2026').length} saved {trips.filter((trip) => trip.id !== 'spain-2026').length === 1 ? 'trip' : 'trips'}</Text><Text style={s.rowCopy}>Your plans stay yours unless you invite someone along.</Text></View></View>
        {selectedTrip && selectedTrip.id !== 'spain-2026' && selectedTrip.completionState !== 'completed' && <Pressable accessibilityRole="button" onPress={() => setTripCompletionState(selectedTrip.id, 'completed')} style={({ pressed }) => [s.completeTripRow, pressed && s.pressed]}><Ionicons name="checkmark-circle-outline" size={19} color={colors.blue}/><Text style={s.completeTripText}>Mark “{selectedTrip.title}” as completed</Text></Pressable>}
        {selectedTrip && selectedTrip.id !== 'spain-2026' && <Pressable onPress={() => deleteTrip(selectedTrip.id)} style={({ pressed }) => [s.deleteRow, pressed && s.pressed]}><Ionicons name="trash-outline" size={19} color={colors.pink}/><Text style={s.deleteText}>Delete “{selectedTrip.title}”</Text></Pressable>}
      </Card>

      <Card style={s.settingsCard}>
        <Text style={s.sectionTitle}>Settings</Text>
        <ListRow icon={memoryBooksPublicByDefault ? 'globe-outline' : 'lock-closed-outline'} title="Memory books" copy={memoryBooksPublicByDefault ? 'All public to accepted friends by default' : 'All private by default'}>
          <Text style={s.privacyHint}>A book can use its own setting from the shelf.</Text>
          <View style={s.visibilityChoices}>
            <Pressable accessibilityRole="button" onPress={() => setMemoryBooksPublicByDefault(false)} style={[s.visibilityChoice, !memoryBooksPublicByDefault && s.visibilityChoiceActive]}><Ionicons name="lock-closed-outline" size={14} color={!memoryBooksPublicByDefault ? '#FFFFFF' : colors.muted}/><Text style={[s.visibilityChoiceText, !memoryBooksPublicByDefault && s.visibilityChoiceTextActive]}>All private</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setMemoryBooksPublicByDefault(true)} style={[s.visibilityChoice, memoryBooksPublicByDefault && s.visibilityChoiceActive]}><Ionicons name="globe-outline" size={14} color={memoryBooksPublicByDefault ? '#FFFFFF' : colors.muted}/><Text style={[s.visibilityChoiceText, memoryBooksPublicByDefault && s.visibilityChoiceTextActive]}>All public</Text></Pressable>
          </View>
        </ListRow>
        <View style={s.rowDivider}/>
        <Text style={s.settingsGroupLabel}>App</Text>
        <ListRow icon="eye-outline" title="Preview onboarding" copy="Review the welcome flow without changing your profile or trips." onPress={() => router.push({ pathname: '/onboarding', params: { preview: '1', source: 'settings' } } as any)}/>
        <View style={s.rowDivider}/>
        <Text style={s.settingsGroupLabel}>Travino</Text>
        <ListRow icon="sparkles-outline" tint={colors.purpleSoft} iconColor={colors.purple} title="Travino is growing gently" copy="Everything here is open while we keep shaping the first version for travellers."/>
      </Card>
    </View>

    <Sheet visible={open} title="Edit profile" onClose={() => setOpen(false)}>
      <View style={s.editAvatarSection}>
        <View style={[s.editAvatarFrame, { borderColor: selectedFrame.colors[0] }]}><View style={[s.editAvatarFrameInner, { borderColor: selectedFrame.colors[1] }]}>{profilePhoto ? <Image accessibilityLabel={`${profileName || 'Your'} profile photo`} source={{ uri: profilePhoto }} style={s.editAvatarPhoto}/> : <Text style={s.editAvatarInitial}>{(profileName || '?').slice(0, 1).toUpperCase()}</Text>}</View></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Change profile photo" onPress={openPhotoActions} style={({ pressed }) => [s.changePhoto, pressed && s.pressed]}><Ionicons name="camera" size={15} color="#FFFFFF"/><Text style={s.changePhotoText}>Change photo</Text></Pressable>
        {profilePhotoState === 'saving' && <Text accessibilityLiveRegion="polite" style={s.photoStatus}><Ionicons name="cloud-upload-outline" size={13} color={colors.muted}/> Saving photo in the background</Text>}
        {profilePhotoState === 'retry' && <Pressable accessibilityRole="button" accessibilityLabel="Retry profile photo upload" onPress={retryProfilePhoto} style={s.retryPhoto}><Ionicons name="refresh" size={14} color={colors.pink}/><Text style={s.retryPhotoText}>Could not save photo. Retry</Text></Pressable>}
      </View>
      <Field value={name} onChangeText={setName} placeholder="Your name"/><Field value={bio} onChangeText={setBio} placeholder="A little about you" multiline/><Text style={s.profileHint}>Your name and introduction help accepted friends recognize you when you share a memory book.</Text><PrimaryButton title="Save profile" icon="checkmark" onPress={save} disabled={!name.trim()}/>
    </Sheet>
    <ProfilePhotoCropper asset={cropAsset} onCancel={() => setCropAsset(null)} onDone={(uri) => { setCropAsset(null); setProfilePhoto(uri); }}/>
    <Sheet visible={levelsOpen} title="Travel levels" onClose={() => setLevelsOpen(false)}>
      <Text style={s.levelSheetIntro}>Trips count when they have a plan and at least one memory.</Text>
      <Text style={s.levelSheetRule}>They also need a destination, at least two days, and cannot overlap an older qualifying trip.</Text>
      <View style={s.levelList}>{TRAVEL_LEVELS.map((entry) => { const current = entry.level === travelLevel.level; const locked = entry.threshold > completedTrips; return <View key={entry.level} style={[s.levelRow, current && s.levelRowCurrent, locked && s.levelRowLocked]}><View style={[s.levelRowNumber, current && s.levelRowNumberCurrent]}><Text style={[s.levelRowNumberText, current && s.levelRowNumberTextCurrent]}>{entry.level}</Text></View><View style={{ flex: 1 }}><Text style={[s.levelRowTitle, locked && s.levelRowTextLocked]}>{entry.title}</Text><Text style={[s.levelRowCopy, locked && s.levelRowTextLocked]}>{entry.threshold} completed trips</Text></View>{current ? <Ionicons name="checkmark-circle" size={21} color={colors.blue}/> : locked ? <Ionicons name="lock-closed-outline" size={17} color={colors.muted}/> : <Ionicons name="checkmark" size={20} color={colors.blue}/>}</View>; })}</View>
      <Text style={s.framePickerTitle}>Profile frame</Text>
      <View style={s.framePicker}>{PROFILE_FRAMES.map((frame) => { const locked = frame.unlockLevel > travelLevel.level; const selected = selectedFrame.id === frame.id; return <Pressable key={frame.id} accessibilityRole="button" accessibilityState={{ disabled: locked, selected }} disabled={locked} onPress={() => setProfileFrame(frame.id)} style={({ pressed }) => [s.frameChoice, selected && s.frameChoiceSelected, locked && s.frameChoiceLocked, pressed && !locked && s.pressed]}><View style={[s.framePreview, { borderColor: frame.colors[0] }]}><View style={[s.framePreviewInner, { borderColor: frame.colors[1] }]}/></View><View style={{ flex: 1 }}><Text style={s.frameChoiceTitle}>{frame.title}</Text><Text style={s.frameChoiceCopy}>{locked ? `Unlocks at Level ${frame.unlockLevel}` : selected ? 'Selected' : `Unlocked at Level ${frame.unlockLevel}`}</Text></View>{locked ? <Ionicons name="lock-closed-outline" size={16} color={colors.muted}/> : selected ? <Ionicons name="checkmark-circle" size={19} color={colors.blue}/> : null}</Pressable>; })}</View>
      <Text style={s.framePickerTitle}>Level perks</Text>
      <View style={s.framePicker}>{LEVEL_PERKS.map((perk) => { const locked = perk.unlockLevel > travelLevel.level; return <View key={perk.id} style={[s.perkRow, locked && s.frameChoiceLocked]}><View style={s.perkIcon}><Ionicons name={perk.icon as keyof typeof Ionicons.glyphMap} size={18} color={locked ? colors.muted : colors.purple}/></View><View style={{ flex: 1 }}><Text style={s.frameChoiceTitle}>{perk.title}</Text><Text style={s.frameChoiceCopy}>{locked ? `Unlocks at Level ${perk.unlockLevel}` : perk.detail}</Text></View>{locked ? <Ionicons name="lock-closed-outline" size={16} color={colors.muted}/> : <Ionicons name="checkmark-circle" size={19} color={colors.blue}/>}</View>; })}</View>
      {travelLevel.level >= 5 && <><Text style={s.framePickerTitle}>Traveller accessory</Text><View style={s.accessoryChoices}>{TRAVELLER_ACCESSORIES.map((accessory) => { const selected = selectedAccessory?.id === accessory.id; return <Pressable key={accessory.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setProfileAccessory(accessory.id)} style={({ pressed }) => [s.accessoryChoice, selected && s.accessoryChoiceSelected, pressed && s.pressed]}><Ionicons name={accessory.icon as keyof typeof Ionicons.glyphMap} size={19} color={selected ? colors.blue : colors.muted}/><Text style={[s.accessoryChoiceText, selected && s.accessoryChoiceTextSelected]}>{accessory.title}</Text></Pressable>; })}</View></>}
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
  page: { flex: 1, backgroundColor: colors.background }, content: { paddingBottom: 50 },
  headerArt: { height: 205, overflow: 'hidden', position: 'relative', justifyContent: 'flex-end', paddingHorizontal: 24, paddingBottom: 52 },
  blueBlob: { position: 'absolute', width: 330, height: 245, borderRadius: 150, backgroundColor: colors.blue, left: -84, top: -102, transform: [{ rotate: '-12deg' }] },
  warmBlob: { position: 'absolute', width: 285, height: 210, borderRadius: 150, backgroundColor: '#F3C27B', right: -96, top: -73, transform: [{ rotate: '19deg' }] },
  headerEyebrow: { color: '#EAF4FF', fontSize: 14, fontWeight: '700', letterSpacing: .2 }, headerTitle: { color: '#FFFFFF', fontFamily: fonts.heading, fontSize: 38, lineHeight: 45, fontWeight: '800', letterSpacing: -.7 },
  profileHero: { alignItems: 'center', marginTop: -62, paddingHorizontal: 24 }, avatarPress: { zIndex: 2 },
  levelFrame: { width: 126, height: 126, borderRadius: 63, borderWidth: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFDF9', shadowOpacity: .25, shadowRadius: 13, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  levelFrameInner: { width: 108, height: 108, borderRadius: 54, borderWidth: 3, padding: 4, backgroundColor: '#FFFFFF' }, avatar: { flex: 1, overflow: 'hidden', borderRadius: 49, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueBright }, avatarPhoto: { width: '100%', height: '100%', resizeMode: 'cover' }, initial: { color: '#FFFFFF', fontFamily: fonts.heading, fontSize: 43, fontWeight: '800' }, accessoryBadge: { position: 'absolute', width: 27, height: 27, borderRadius: 14, right: 4, top: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFE6A8', borderWidth: 2, borderColor: '#FFFFFF' },
  levelMarker: { position: 'absolute', width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#FFFDF9', right: 0, bottom: 3, alignItems: 'center', justifyContent: 'center' }, levelMarkerText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' }, legendCrown: { position: 'absolute', top: -8, right: 12, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFE7A2', borderWidth: 2, borderColor: '#FFFDF9' },
  levelPill: { minHeight: 31, marginTop: -12, zIndex: 3, paddingHorizontal: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.navy, shadowColor: colors.ink, shadowOpacity: .13, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 }, levelPillGold: { backgroundColor: '#8A611B', shadowColor: '#B8832E' }, levelPillEyebrow: { color: '#C7D9F4', fontSize: 8, fontWeight: '800', letterSpacing: .7 }, levelPillDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#8EA7C9' }, levelPillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14, maxWidth: '100%' }, name: { color: colors.text, fontFamily: fonts.heading, fontSize: 25, lineHeight: 31, fontWeight: '800', letterSpacing: -.4, textAlign: 'center', flexShrink: 1 }, legendBadge: { minHeight: 23, paddingHorizontal: 7, borderRadius: 12, backgroundColor: '#FFF0C4', flexDirection: 'row', gap: 3, alignItems: 'center' }, legendBadgeText: { color: '#8A611B', fontSize: 10, fontWeight: '800' }, profileCopy: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 3, maxWidth: 310 },
  editProfile: { minHeight: 32, marginTop: 8, paddingHorizontal: 10, borderRadius: 13, alignItems: 'center', flexDirection: 'row', gap: 5, backgroundColor: '#FFFFFFA8' }, editProfileText: { color: colors.blue, fontSize: 12, fontWeight: '700' },
  levelUp: { minHeight: 42, marginTop: 12, paddingHorizontal: 11, borderRadius: 15, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF6DD', borderWidth: 1, borderColor: '#F3DEAA' }, levelUpText: { color: colors.text, fontFamily: fonts.heading, fontSize: 14, fontWeight: '700', flex: 1 },
  levelProgress: { alignSelf: 'stretch', marginTop: 17, paddingHorizontal: 2 }, levelProgressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }, levelProgressCopy: { color: colors.text, fontSize: 12, lineHeight: 18, fontWeight: '700', flex: 1 }, levelProgressValue: { color: colors.muted, fontSize: 11 }, levelTrack: { height: 6, marginTop: 8, overflow: 'hidden', borderRadius: 4, backgroundColor: '#DCE7F6' }, levelTrackGold: { backgroundColor: '#F7E5B0' }, levelFill: { height: '100%', borderRadius: 4, backgroundColor: colors.blue }, levelFillGold: { backgroundColor: '#B8832E' },
  stats: { width: '100%', minHeight: 69, marginTop: 18, flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingVertical: 11, backgroundColor: '#F7F0E5', borderWidth: 1, borderColor: '#EDE0D0' }, stat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 9 }, statDivider: { height: 34, width: StyleSheet.hairlineWidth, backgroundColor: '#DACBB9' }, statNumber: { color: colors.text, fontFamily: fonts.heading, fontSize: 23, lineHeight: 27, fontWeight: '800' }, statLabel: { color: colors.muted, fontSize: 11, marginTop: 1, textAlign: 'center' },
  cardStack: { gap: 16, paddingHorizontal: 16, marginTop: 25 }, groupCard: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#FFFDF8' }, journeyCard: { padding: 16, backgroundColor: '#FFFDF8' }, settingsCard: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#FFFDF8' }, sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }, sectionTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 19, lineHeight: 25, fontWeight: '800', letterSpacing: -.2, marginTop: 4, marginBottom: 6 }, journeyCount: { minWidth: 26, height: 26, borderRadius: 13, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft }, journeyCountText: { color: colors.blue, fontSize: 12, fontWeight: '800' },
  listRow: { minHeight: 68, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }, rowIcon: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSoft }, rowBody: { flex: 1, minWidth: 0 }, rowTitle: { color: colors.text, fontSize: 14, lineHeight: 19, fontWeight: '700' }, rowCopy: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 }, rowDivider: { height: StyleSheet.hairlineWidth, marginLeft: 51, backgroundColor: colors.border }, journeySummary: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  privacyHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 }, visibilityChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 9 }, visibilityChoice: { minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, borderRadius: 12, backgroundColor: '#EEF0F3' }, visibilityChoiceActive: { backgroundColor: colors.blue }, visibilityChoiceText: { color: colors.muted, fontSize: 10, fontWeight: '800' }, visibilityChoiceTextActive: { color: '#FFFFFF' }, settingsGroupLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', letterSpacing: .7, textTransform: 'uppercase', marginTop: 13, marginBottom: -2 },
  completeTripRow: { minHeight: 40, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, marginTop: 9 }, completeTripText: { color: colors.blue, fontSize: 13, fontWeight: '700', flexShrink: 1 }, deleteRow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, marginTop: 1 }, deleteText: { color: colors.pink, fontSize: 13, fontWeight: '700', flexShrink: 1 }, pressed: { opacity: .72 },
  editAvatarSection: { alignItems: 'center', marginBottom: 20 }, editAvatarFrame: { width: 110, height: 110, borderRadius: 55, borderWidth: 5, padding: 4, backgroundColor: '#FFFDF9', shadowColor: colors.ink, shadowOpacity: .12, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 2 }, editAvatarFrameInner: { flex: 1, overflow: 'hidden', borderRadius: 46, borderWidth: 2, padding: 3, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, editAvatarPhoto: { width: '100%', height: '100%', borderRadius: 42, resizeMode: 'cover' }, editAvatarInitial: { color: '#FFFFFF', fontFamily: fonts.heading, fontSize: 38, fontWeight: '800', width: '100%', height: '100%', textAlign: 'center', textAlignVertical: 'center', backgroundColor: colors.blueBright, borderRadius: 42 }, changePhoto: { minHeight: 35, marginTop: -3, paddingHorizontal: 12, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: colors.blue, borderWidth: 2, borderColor: '#FFFFFF' }, changePhotoText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' }, photoStatus: { marginTop: 9, color: colors.muted, fontSize: 12, lineHeight: 18 }, retryPhoto: { marginTop: 9, minHeight: 30, paddingHorizontal: 10, borderRadius: 12, alignItems: 'center', flexDirection: 'row', gap: 5, backgroundColor: '#FFF0F1' }, retryPhotoText: { color: colors.pink, fontSize: 12, fontWeight: '700' }, profileHint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: -1, marginBottom: 18 }, levelSheetIntro: { color: colors.text, fontSize: 14, lineHeight: 20, fontWeight: '700', marginBottom: 4 }, levelSheetRule: { color: colors.muted, fontSize: 12, lineHeight: 18, marginBottom: 16 }, levelList: { gap: 8 }, levelRow: { minHeight: 62, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 17, backgroundColor: '#F7F3ED' }, levelRowCurrent: { backgroundColor: colors.blueSoft, borderWidth: 1, borderColor: '#D8E9FF' }, levelRowLocked: { opacity: .48 }, levelRowNumber: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECE6DD' }, levelRowNumberCurrent: { backgroundColor: colors.blue }, levelRowNumberText: { color: colors.muted, fontSize: 13, fontWeight: '800' }, levelRowNumberTextCurrent: { color: '#FFFFFF' }, levelRowTitle: { color: colors.text, fontSize: 14, fontWeight: '700' }, levelRowCopy: { color: colors.muted, fontSize: 12, marginTop: 2 }, levelRowTextLocked: { color: colors.muted },
  framePickerTitle: { color: colors.text, fontFamily: fonts.heading, fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 9 }, framePicker: { gap: 8, paddingBottom: 8 }, frameChoice: { minHeight: 59, paddingHorizontal: 10, paddingVertical: 8, gap: 10, flexDirection: 'row', alignItems: 'center', borderRadius: 16, backgroundColor: '#F7F3ED' }, frameChoiceSelected: { backgroundColor: colors.blueSoft, borderWidth: 1, borderColor: '#D8E9FF' }, frameChoiceLocked: { opacity: .46 }, framePreview: { width: 34, height: 34, borderRadius: 17, borderWidth: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }, framePreviewInner: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, backgroundColor: colors.blueBright }, frameChoiceTitle: { color: colors.text, fontSize: 13, fontWeight: '700' }, frameChoiceCopy: { color: colors.muted, fontSize: 11, marginTop: 2 }, perkRow: { minHeight: 59, paddingHorizontal: 10, paddingVertical: 8, gap: 10, flexDirection: 'row', alignItems: 'center', borderRadius: 16, backgroundColor: '#F7F3ED' }, perkIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.purpleSoft }, accessoryChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 }, accessoryChoice: { minHeight: 42, paddingHorizontal: 11, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F7F3ED' }, accessoryChoiceSelected: { backgroundColor: colors.blueSoft, borderWidth: 1, borderColor: '#D8E9FF' }, accessoryChoiceText: { color: colors.muted, fontSize: 12, fontWeight: '700' }, accessoryChoiceTextSelected: { color: colors.blue },
  cropScreen: { flex: 1, paddingTop: 18, paddingHorizontal: 24, alignItems: 'center' }, cropHeader: { width: '100%', minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, cropHeaderButton: { minWidth: 68, minHeight: 44, justifyContent: 'center' }, cropCancel: { fontSize: 16, fontWeight: '600' }, cropTitle: { fontFamily: fonts.heading, fontSize: 18, fontWeight: '800' }, cropDone: { minWidth: 68, minHeight: 36, paddingHorizontal: 12, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blue }, cropDoneDisabled: { opacity: .58 }, cropDoneText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' }, cropCopy: { alignSelf: 'stretch', textAlign: 'center', fontSize: 13, lineHeight: 19, marginTop: 26, marginBottom: 24 }, cropViewport: { width: '100%', aspectRatio: 1, maxWidth: 360, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: '#D9E1EB', borderRadius: 28 }, cropRing: { position: 'absolute', inset: 0, borderWidth: 3, borderColor: '#FFFFFF', borderRadius: 28, shadowColor: '#000000', shadowOpacity: .26, shadowRadius: 5, shadowOffset: { width: 0, height: 1 } }, zoomControls: { marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 20 }, zoomButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F4F7', borderWidth: 1, borderColor: '#DEE4EA' }, zoomButtonDark: { backgroundColor: '#283746', borderColor: '#435568' }, zoomValue: { minWidth: 48, textAlign: 'center', fontSize: 14, fontWeight: '800' },
});
