import { useCallback, useEffect, useRef, useState } from 'react';

// This data is intentionally separate from the platform loop so a trip can
// later provide its own packing list without changing the physics.
export const PACKING_ITEMS = [
  { id: 'passport', label: 'Passport', sprite: 'passport', x: 950, y: 235 },
  { id: 'sunglasses', label: 'Sunglasses', sprite: 'sunglasses', x: 175, y: 570 },
  { id: 'camera', label: 'Camera', sprite: 'camera', x: 450, y: 570 },
  { id: 'charger', label: 'Charger', sprite: 'charger', x: 467, y: 385 },
  { id: 'swimwear', label: 'Swimwear', sprite: 'swimwear', x: 682, y: 315 },
  { id: 'hoodie', label: 'Hoodie', sprite: 'hoodie', x: 262, y: 390 },
  { id: 'snack-box', label: 'Snack box', sprite: 'snack-box', x: 825, y: 570 },
  { id: 'guidebook', label: 'Guidebook', sprite: 'guidebook', x: 855, y: 136 },
] as const;

type ItemId = (typeof PACKING_ITEMS)[number]['id'];
type ItemSprite = (typeof PACKING_ITEMS)[number]['sprite'];
type Sprite = 'room-background' | 'dog' | 'robot-vacuum' | 'suitcase' | ItemSprite;
type Mode = 'standard' | 'chill'; type Phase = 'start' | 'play' | 'paused' | 'end';
type Platform = { x: number; y: number; w: number; name: string };
type Particle = { x: number; y: number; vx: number; vy: number; at: number; life: number; color: string; confetti?: boolean };
type Rect = { x: number; y: number; w: number; h: number };
type Game = {
  mode: Mode | null; phase: Phase; start: number; last: number; seconds: number; penalty: number; score: number; packed: ItemId[];
  items: Record<ItemId, { state: 'loose' | 'carried' | 'packed'; x: number; y: number; homeX: number; homeY: number }>;
  player: { x: number; y: number; vx: number; vy: number; facing: 1 | -1; onGround: boolean; carrying: ItemId[]; slowUntil: number; invulnerableUntil: number; knockbackUntil: number; knockbackDirection: 1 | -1; walk: number; crouchUntil: number; landingUntil: number };
  dog: { x: number; awake: boolean; wakeAt: number }; robot: { x: number; vx: number; turnAt: number };
  particles: Particle[]; popup: { text: string; at: number } | null; bounceUntil: number; suitcaseTaken: boolean; message: string;
};

const W = 1200; const H = 675; const FLOOR = 608; const GRAVITY = 1850; const JUMP = 1340; const SPEED = 285; const AIR_SPEED = 360; const PLAYER_W = 76;
const SUITCASE = { x: 930, y: 563, r: 96 }; const DOOR = { x: 1130, y: 486, r: 74 };
const BEST = 'travino-suitcase-sprint-best'; const MUTED = 'travino-suitcase-sprint-muted';
// Coordinates are measured directly from room-background.webp (1200 × 675).
// Every platform is a thin one-way line at the visible furniture top edge.
const PLATFORMS: Platform[] = [
  { x: 0, y: FLOOR, w: W, name: 'floor' },
  { x: 176, y: 424, w: 205, name: 'armchair seat' },
  { x: 406, y: 415, w: 119, name: 'side table' },
  { x: 613, y: 344, w: 254, name: 'dresser top' },
  { x: 844, y: 165, w: 190, name: 'upper shelf' },
  { x: 869, y: 264, w: 164, name: 'lower shelf' },
];
const ASSETS: Record<Sprite, string> = {
  'room-background': '/game/room-background.webp', dog: '/game/dog.webp', 'robot-vacuum': '/game/robot-vacuum.webp', suitcase: '/game/suitcase.webp',
  passport: '/game/passport.webp', sunglasses: '/game/sunglasses.webp', camera: '/game/camera.webp', charger: '/game/charger.webp', swimwear: '/game/swimwear.webp', hoodie: '/game/hoodie.webp', 'snack-box': '/game/snack-box.webp', guidebook: '/game/guidebook.webp',
};
const Div = 'div' as any; const Canvas = 'canvas' as any; const Button = 'button' as any;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const itemFor = (id: ItemId) => PACKING_ITEMS.find((item) => item.id === id)!;

function fresh(mode: Mode | null): Game {
  return {
    mode, phase: mode ? 'play' : 'start', start: 0, last: 0, seconds: 60, penalty: 0, score: 0, packed: [],
    items: Object.fromEntries(PACKING_ITEMS.map((item) => [item.id, { state: 'loose', x: item.x, y: item.y, homeX: item.x, homeY: item.y }])) as Game['items'],
    player: { x: 78, y: FLOOR, vx: 0, vy: 0, facing: 1, onGround: true, carrying: [], slowUntil: 0, invulnerableUntil: 0, knockbackUntil: 0, knockbackDirection: 1, walk: 0, crouchUntil: 0, landingUntil: 0 },
    dog: { x: 350, awake: false, wakeAt: 0 }, robot: { x: 734, vx: -62, turnAt: 0 }, particles: [], popup: null, bounceUntil: 0, suitcaseTaken: false, message: '',
  };
}

type LoadedSprite = HTMLImageElement | HTMLCanvasElement;
const MATTED_SPRITES = new Set<Sprite>(['dog', 'robot-vacuum', 'suitcase', ...PACKING_ITEMS.map((item) => item.sprite)]);

// The supplied art was exported against an opaque white matte. Remove only the
// near-white pixels connected to the image edge, preserving white highlights
// inside the illustration while giving canvas a crisp transparent outline.
function removeWhiteMatte(image: HTMLImageElement) {
  const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return image;
  context.drawImage(image, 0, 0); const data = context.getImageData(0, 0, canvas.width, canvas.height); const { width, height } = canvas; const visited = new Uint8Array(width * height); const queue: number[] = [];
  const isMatte = (pixel: number) => { const r = data.data[pixel * 4]; const g = data.data[pixel * 4 + 1]; const b = data.data[pixel * 4 + 2]; return r > 232 && g > 232 && b > 232 && Math.max(r, g, b) - Math.min(r, g, b) < 18; };
  const push = (x: number, y: number) => { if (x < 0 || x >= width || y < 0 || y >= height) return; const point = y * width + x; if (!visited[point] && isMatte(point)) { visited[point] = 1; queue.push(point); } };
  for (let x = 0; x < width; x += 1) { push(x, 0); push(x, height - 1); }
  for (let y = 1; y < height - 1; y += 1) { push(0, y); push(width - 1, y); }
  while (queue.length) { const point = queue.pop()!; const x = point % width; const y = Math.floor(point / width); data.data[point * 4 + 3] = 0; push(x - 1, y); push(x + 1, y); push(x, y - 1); push(x, y + 1); }
  context.putImageData(data, 0, 0); return canvas;
}

export function SuitcaseSprint({ onJoinWaitlist }: { onJoinWaitlist: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null); const shellRef = useRef<HTMLDivElement | null>(null); const gameRef = useRef<Game>(fresh(null)); const sprites = useRef<Partial<Record<Sprite, LoadedSprite>>>({});
  const keys = useRef(new Set<string>()); const touchMove = useRef(0); const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null); const sound = useRef<AudioContext | null>(null);
  const [phase, setPhase] = useState<Phase>('start'); const [best, setBest] = useState(0); const [muted, setMuted] = useState(false); const [assetsReady, setAssetsReady] = useState(false); const [loadAssets, setLoadAssets] = useState(false); const [touchFirst, setTouchFirst] = useState(false);
  const debug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';
  const [hud, setHud] = useState({ score: 0, packed: 0, seconds: 60, mode: null as Mode | null, nearSuitcase: false, ready: false });

  const sync = useCallback((game: Game) => setHud({ score: game.score, packed: game.packed.length, seconds: Math.max(0, Math.ceil(game.seconds)), mode: game.mode, nearSuitcase: distance(game.player, SUITCASE) < SUITCASE.r, ready: game.packed.length === PACKING_ITEMS.length }), []);
  const tone = useCallback((frequency: number, duration = .1) => { if (muted) return; const Audio = window.AudioContext || (window as any).webkitAudioContext; if (!Audio) return; sound.current ??= new Audio(); if (sound.current.state === 'suspended') void sound.current.resume(); const osc = sound.current.createOscillator(); const gain = sound.current.createGain(); osc.frequency.value = frequency; gain.gain.setValueAtTime(.035, sound.current.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, sound.current.currentTime + duration); osc.connect(gain); gain.connect(sound.current.destination); osc.start(); osc.stop(sound.current.currentTime + duration); }, [muted]);
  const vibrate = useCallback((value: number | number[]) => { if ('vibrate' in navigator) navigator.vibrate(value); }, []);

  useEffect(() => {
    try { setBest(Number.parseInt(localStorage.getItem(BEST) || '0', 10) || 0); setMuted(localStorage.getItem(MUTED) === 'true'); } catch {}
    const query = matchMedia('(max-width: 640px), (pointer: coarse)'); const update = () => setTouchFirst(query.matches); update(); query.addEventListener('change', update); return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => { try { localStorage.setItem(MUTED, String(muted)); } catch {} }, [muted]);
  useEffect(() => { const node = shellRef.current; if (!node || !('IntersectionObserver' in window)) { setLoadAssets(true); return; } const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setLoadAssets(true); observer.disconnect(); } }, { rootMargin: '420px 0px' }); observer.observe(node); return () => observer.disconnect(); }, []);
  useEffect(() => { if (!loadAssets) return; const names = Object.keys(ASSETS) as Sprite[]; let remaining = names.length; const done = () => { remaining -= 1; if (!remaining) setAssetsReady(true); }; names.forEach((name) => { const image = new Image(); image.onload = () => { sprites.current[name] = MATTED_SPRITES.has(name) ? removeWhiteMatte(image) : image; done(); }; image.onerror = done; image.src = ASSETS[name]; }); }, [loadAssets]);

  const begin = useCallback((mode: Mode) => { const game = fresh(mode); gameRef.current = game; sync(game); setPhase('play'); }, [sync]);
  const end = useCallback((game: Game, won: boolean, message: string) => { if (game.phase !== 'play') return; if (won && game.mode === 'standard') game.score += Math.max(0, Math.floor(game.seconds)) * 10; game.phase = 'end'; game.message = message; if (won) { const now = performance.now(); for (let i = 0; i < 48; i += 1) game.particles.push({ x: 600, y: 140, vx: (Math.random() - .5) * 290, vy: -60 - Math.random() * 200, at: now, life: 1800, color: ['#F19A50', '#78B88D', '#6E9BD8', '#E66F78', '#F5C65F'][i % 5], confetti: true }); setBest((old) => { const next = Math.max(old, game.score); try { localStorage.setItem(BEST, String(next)); } catch {} return next; }); } tone(won ? 523 : 180, .42); sync(game); setPhase('end'); }, [sync, tone]);
  const jump = useCallback(() => { const game = gameRef.current; const player = game.player; const now = performance.now(); if (game.phase !== 'play' || !player.onGround || player.crouchUntil > now) return; player.crouchUntil = now + 75; tone(660); vibrate(8); }, [tone, vibrate]);
  const pause = useCallback(() => { const game = gameRef.current; if (game.phase === 'play') { game.phase = 'paused'; setPhase('paused'); } else if (game.phase === 'paused') { game.phase = 'play'; game.last = performance.now(); setPhase('play'); } sync(game); }, [sync]);
  const pack = useCallback(() => { const game = gameRef.current; const now = performance.now(); if (game.phase !== 'play' || distance(game.player, SUITCASE) > SUITCASE.r) return; if (game.packed.length === PACKING_ITEMS.length) { game.suitcaseTaken = true; game.popup = { text: 'Take the suitcase to the door!', at: now }; tone(680); sync(game); return; } if (!game.player.carrying.length) return; const carried = [...game.player.carrying]; game.player.carrying = []; game.bounceUntil = now + 430; carried.forEach((id, index) => { game.items[id].state = 'packed'; game.packed.push(id); game.score += 125; for (let i = 0; i < 6; i += 1) game.particles.push({ x: SUITCASE.x - 18 + index * 22, y: SUITCASE.y - 46, vx: (Math.random() - .5) * 95, vy: -35 - Math.random() * 90, at: now, life: 620, color: '#F4A350' }); }); tone(740, .13); vibrate([8, 18, 12]); sync(game); }, [sync, tone, vibrate]);

  useEffect(() => {
    const canvas = canvasRef.current; const context = canvas?.getContext('2d'); if (!canvas || !context) return; let frame = 0; let cssWidth = 0; let cssHeight = 0; let lastHud = '';
    const resize = () => { const box = canvas.getBoundingClientRect(); if (box.width === cssWidth && box.height === cssHeight) return; cssWidth = box.width; cssHeight = box.height; const ratio = Math.min(devicePixelRatio || 1, 2); canvas.width = Math.round(box.width * ratio); canvas.height = Math.round(box.height * ratio); };
    const text = (value: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left', weight = 800) => { context.fillStyle = color; context.textAlign = align; context.textBaseline = 'middle'; context.font = `${weight} ${size}px Nunito, ui-rounded, system-ui, sans-serif`; context.fillText(value, x, y); };
    const box = (x: number, y: number, w: number, h: number, radius: number, fill: string, stroke = '#263445', line = 3) => { context.beginPath(); context.roundRect(x, y, w, h, radius); context.fillStyle = fill; context.fill(); if (stroke) { context.strokeStyle = stroke; context.lineWidth = line; context.stroke(); } };
    const sprite = (name: Sprite, x: number, y: number, w: number, h: number, flip = false) => { const image = sprites.current[name]; if (!image) return; context.save(); context.globalAlpha = 1; context.globalCompositeOperation = 'source-over'; context.translate(x, y); if (flip) context.scale(-1, 1); context.drawImage(image, -w / 2, -h / 2, w, h); context.restore(); };
    const room = () => sprite('room-background', W / 2, H / 2, W, H);
    const particles = (game: Game, now: number) => { game.particles = game.particles.filter((particle) => now - particle.at < particle.life); game.particles.forEach((particle) => { const age = (now - particle.at) / particle.life; context.save(); context.globalAlpha = 1 - age; context.fillStyle = particle.color; context.translate(particle.x + particle.vx * age, particle.y + particle.vy * age + 95 * age * age); if (particle.confetti) { context.rotate(age * 6); context.fillRect(-4, -4, 8, 8); } else text('✦', 0, 0, 18, particle.color, 'center'); context.restore(); }); };
    const playerBox = (player: Game['player']): Rect => ({ x: player.x - 28, y: player.y - 80, w: 56, h: 78 });
    const dogBox = (dog: Game['dog']): Rect => ({ x: dog.x - 43, y: FLOOR - 76, w: 86, h: 47 });
    const robotBox = (robot: Game['robot']): Rect => ({ x: robot.x - 27, y: FLOOR - 52, w: 54, h: 31 });
    const shadow = (x: number, y: number, radius: number, alpha = .16) => { context.save(); context.globalAlpha = alpha; context.fillStyle = '#372213'; context.beginPath(); context.ellipse(x, y, radius, Math.max(5, radius * .18), 0, 0, Math.PI * 2); context.fill(); context.restore(); };
    const drawShadows = (game: Game) => { const playerHeight = clamp((FLOOR - game.player.y) / 300, 0, .72); shadow(game.player.x, game.player.y + 4, 31 * (1 - playerHeight * .52), .2 * (1 - playerHeight * .4)); shadow(SUITCASE.x, SUITCASE.y + 33, 72); PACKING_ITEMS.filter((item) => game.items[item.id].state === 'loose').forEach((item) => shadow(game.items[item.id].x, game.items[item.id].y + 25, 27, .14)); shadow(game.dog.x, FLOOR + 4, 44); shadow(game.robot.x, FLOOR + 4, 29); };
    const drawSuitcase = (game: Game, now: number) => { if (game.suitcaseTaken) return; const bounce = game.bounceUntil > now ? Math.sin((1 - (game.bounceUntil - now) / 430) * Math.PI) * 13 : 0; sprite('suitcase', SUITCASE.x, SUITCASE.y - bounce, 150, 150); };
    const drawItems = (game: Game) => PACKING_ITEMS.filter((item) => game.items[item.id].state === 'loose').forEach((item) => { const place = game.items[item.id]; sprite(item.sprite, place.x, place.y, 58, 58); });
    const drawTraveller = (game: Game, x = game.player.x, y = game.player.y, waving = false) => { const player = game.player; const now = performance.now(); if (player.invulnerableUntil > now && Math.floor(now / 85) % 2 === 0) return; const phase = player.crouchUntil > now ? 'crouch' : !player.onGround ? (player.vy < -120 ? 'rise' : player.vy > 130 ? 'fall' : 'peak') : player.landingUntil > now ? 'land' : Math.abs(player.vx) > 12 ? 'walk' : 'idle'; const walkFrames = [0, .85, .35, -.35, -.85, -.35]; const stride = phase === 'walk' ? walkFrames[Math.floor(player.walk * 9) % walkFrames.length] : 0; const breathe = phase === 'idle' ? Math.sin(now / 420) * 1.5 : 0; const blink = phase === 'idle' && now % 2600 < 120; const squash = phase === 'crouch' ? .82 : phase === 'land' ? .86 : phase === 'rise' ? 1.12 : 1; const lift = phase === 'crouch' ? 0 : phase === 'land' ? 2 : breathe; context.save(); context.globalAlpha = 1; context.translate(x, y - lift); context.scale(player.facing, squash); context.lineCap = 'round'; context.lineJoin = 'round'; const limb = (fromX: number, fromY: number, toX: number, toY: number, color: string, width = 8) => { context.strokeStyle = '#263445'; context.lineWidth = width + 4; context.beginPath(); context.moveTo(fromX, fromY); context.lineTo(toX, toY); context.stroke(); context.strokeStyle = color; context.lineWidth = width; context.beginPath(); context.moveTo(fromX, fromY); context.lineTo(toX, toY); context.stroke(); };
      box(-36, -61, 18, 35, 8, '#D8894E', '#263445', 3); limb(-18, -28, -27, -10, '#334E71', 7); limb(15, -28, 21, -8, '#334E71', 7); limb(-10, -28, -12 + stride * 9, -3, '#536F99', 8); limb(10, -28, 12 - stride * 9, -3, '#536F99', 8); box(-20 + stride * 9, -7, 19, 8, 5, '#F4F4EE', '#263445', 2); box(1 - stride * 9, -7, 19, 8, 5, '#F4F4EE', '#263445', 2); box(-21, -62, 42, 36, 14, '#F3A75D', '#263445', 4); box(-17, -85, 34, 30, 16, '#F2C39B', '#263445', 4); context.fillStyle = '#4B332A'; context.beginPath(); context.arc(-2, -84, 15, Math.PI, Math.PI * 2); context.lineTo(15, -75); context.lineTo(-17, -75); context.closePath(); context.fill(); context.strokeStyle = '#263445'; context.lineWidth = 3; context.stroke(); context.fillStyle = '#263445'; if (!blink) { context.beginPath(); context.arc(6, -72, 2.3, 0, Math.PI * 2); context.fill(); } else { context.lineWidth = 2; context.beginPath(); context.moveTo(4, -72); context.lineTo(8, -72); context.stroke(); } if (waving || phase === 'fall') limb(18, -53, 35, phase === 'fall' ? -82 : -72, '#F2C39B', 7); context.restore();
      player.carrying.forEach((id, index) => { context.save(); context.globalAlpha = 1; context.shadowColor = '#F2A14D'; context.shadowBlur = 15; sprite(itemFor(id).sprite, x - 18 + index * 20, y - 108 - index * 16, 36, 36); context.restore(); }); if (game.suitcaseTaken) sprite('suitcase', x + player.facing * 66, y - 25, 70, 70);
    };
    const drawDog = (game: Game, now: number) => { const dog = game.dog; sprite('dog', dog.x, FLOOR - 39 - (dog.awake ? Math.sin(now / 105) * 2 : 0), 112, 88, game.player.x < dog.x); };
    const drawRobot = (game: Game) => sprite('robot-vacuum', game.robot.x, FLOOR - 28, 68, 68);
    const drawLabels = (game: Game, now: number) => { const loose = PACKING_ITEMS.filter((item) => game.items[item.id].state === 'loose'); loose.forEach((item, index) => { const place = game.items[item.id]; const nearPlayer = distance(game.player, place) < 135; const crowded = loose.some((other, otherIndex) => otherIndex !== index && Math.abs(game.items[other.id].x - place.x) < 110 && Math.abs(game.items[other.id].y - place.y) < 44); if (!nearPlayer && !crowded) { box(place.x - 43, place.y - 48, 86, 19, 9, '#FFF9F1', '#4A3324', 1.5); text(item.label, place.x, place.y - 38, 10, '#3A2B22', 'center', 900); } }); if (!game.suitcaseTaken) { const bounce = game.bounceUntil > now ? Math.sin((1 - (game.bounceUntil - now) / 430) * Math.PI) * 13 : 0; box(SUITCASE.x - 37, SUITCASE.y + 27 - bounce, 74, 23, 11, game.packed.length === 8 ? '#75AD83' : '#FFF8E9', '#263445', 2); text(game.packed.length === 8 ? 'TAKE ME' : `${game.packed.length}/8`, SUITCASE.x, SUITCASE.y + 39 - bounce, 12, game.packed.length === 8 ? '#FFFFFF' : '#356C4D', 'center', 900); } const dog = game.dog; if (dog.awake) text('!', dog.x, FLOOR - 91, 19, '#D77654', 'center', 900); else { text('z', dog.x + 39, FLOOR - 69, 17, '#89739E', 'center'); text('z', dog.x + 54, FLOOR - 83, 12, '#89739E', 'center'); } };
    const drawDebug = (game: Game, now: number) => { context.save(); context.globalAlpha = .82; context.lineWidth = 2; PLATFORMS.forEach((platform) => { context.strokeStyle = '#DBFF4C'; context.strokeRect(platform.x, platform.y - 3, platform.w, 6); text(platform.name, platform.x + platform.w / 2, platform.y - 13, 9, '#DBFF4C', 'center', 900); }); const outlines: Array<[Rect, string]> = [[playerBox(game.player), '#FF5C77'], [dogBox(game.dog), '#FFB347'], [robotBox(game.robot), '#5EEBFF']]; outlines.forEach(([rect, color]) => { context.strokeStyle = color; context.strokeRect(rect.x, rect.y, rect.w, rect.h); }); if (game.player.slowUntil > now) text(`slow ${Math.max(0, (game.player.slowUntil - now) / 1000).toFixed(1)}s`, game.player.x, game.player.y - 101, 10, '#FFD166', 'center', 900); if (game.player.invulnerableUntil > now) text(`safe ${Math.max(0, (game.player.invulnerableUntil - now) / 1000).toFixed(1)}s`, game.player.x, game.player.y - 116, 10, '#A7F3D0', 'center', 900); context.strokeStyle = '#FFFFFF'; context.strokeRect(0, 0, W, H); context.restore(); };
    const card = (title: string, first: string, second: string, score?: number) => { context.fillStyle = 'rgba(28,38,45,.32)'; context.fillRect(0, 0, W, H); box(265, 130, 670, 408, 38, '#FFF9ED', '#263445', 5); context.fillStyle = '#FFE5A8'; context.beginPath(); context.arc(828, 208, 66, 0, Math.PI * 2); context.fill(); const game = gameRef.current; game.player.facing = 1; drawTraveller(game, 386, 396, true); text(title, 622, 202, score === undefined ? 42 : 20, score === undefined ? '#263445' : '#D27B4F', 'center', 900); if (score !== undefined) text(`${score} points`, 622, 267, 51, '#263445', 'center', 900); text(first, 622, score === undefined ? 274 : 329, 19, '#566578', 'center', 800); text(second, 622, score === undefined ? 306 : 365, 15, '#728096', 'center', 700); };
    const startScreen = () => { room(); card('SUITCASE SPRINT', 'Jump across the furniture and collect eight essentials.', 'Carry three at once. Pack at the suitcase with E or ↓.'); text(`Best score: ${best}`, 622, 475, 15, '#568765', 'center', 900); };
    const endScreen = (now: number) => { const game = gameRef.current; room(); particles(game, now); card('SUITCASE SPRINT', game.message, `${game.packed.length} of 8 packed · Best score: ${Math.max(best, game.score)}`, game.score); };
    const paused = (now: number) => { const game = gameRef.current; drawPlay(game, now); context.fillStyle = 'rgba(28,38,45,.3)'; context.fillRect(0, 0, W, H); box(404, 254, 392, 166, 30, '#FFF9ED', '#263445', 4); text('PAUSED', 600, 310, 34, '#263445', 'center', 900); text('Press P or Resume to keep packing.', 600, 356, 16, '#657287', 'center', 700); };
    const drawPlay = (game: Game, now: number) => { room(); drawShadows(game); drawSuitcase(game, now); drawItems(game); drawDog(game, now); drawRobot(game); drawTraveller(game); drawLabels(game, now); particles(game, now); if (debug) drawDebug(game, now); if (game.popup && now - game.popup.at < 950) { const age = (now - game.popup.at) / 950; context.save(); context.globalAlpha = 1 - age; box(game.player.x - 75, game.player.y - 151 - age * 22, 150, 23, 11, '#FFF9EE', '#263445', 2); text(game.popup.text, game.player.x, game.player.y - 140 - age * 22, 11, '#B96545', 'center', 900); context.restore(); } if (game.packed.length === 8 && !game.suitcaseTaken) text('All packed. Press E or ↓ at the suitcase to take it to the door.', 600, 642, 14, '#356C4D', 'center', 900); };
    const update = (game: Game, now: number) => {
      if (!game.start) game.start = now;
      const dt = Math.min(.04, game.last ? (now - game.last) / 1000 : 0); game.last = now;
      game.seconds = game.mode === 'standard' ? Math.max(0, 60 - (now - game.start) / 1000 - game.penalty) : 60;
      if (game.mode === 'standard' && game.seconds <= 0) { end(game, false, 'Time up. The next suitcase sprint starts when you are ready.'); return; }

      const player = game.player;
      const left = keys.current.has('ArrowLeft') || keys.current.has('a') || keys.current.has('A');
      const right = keys.current.has('ArrowRight') || keys.current.has('d') || keys.current.has('D');
      const direction = touchMove.current || (right ? 1 : left ? -1 : 0);
      const movementSpeed = (player.onGround ? SPEED : AIR_SPEED) * (player.slowUntil > now ? .7 : 1);
      // Knockback is deliberately floor-only, so a hit cannot push the traveller off furniture.
      const knockback = player.knockbackUntil > now && player.y >= FLOOR - 1 ? player.knockbackDirection * 70 : 0;
      player.vx = direction * movementSpeed + knockback;
      if (direction) player.facing = direction > 0 ? 1 : -1;
      player.walk += Math.abs(player.vx) * dt / 110;

      const wasOnGround = player.onGround;
      if (player.crouchUntil && now >= player.crouchUntil) { player.crouchUntil = 0; player.vy = -JUMP; player.onGround = false; }
      if (!player.crouchUntil) {
        const oldY = player.y;
        player.x = clamp(player.x + player.vx * dt, PLAYER_W / 2, W - PLAYER_W / 2);
        player.vy += GRAVITY * dt; player.y += player.vy * dt; player.onGround = false;
        for (const platform of PLATFORMS) {
          const horizontallyOver = player.x + PLAYER_W / 2 > platform.x && player.x - PLAYER_W / 2 < platform.x + platform.w;
          if (horizontallyOver && player.vy >= 0 && oldY <= platform.y && player.y >= platform.y) { player.y = platform.y; player.vy = 0; player.onGround = true; break; }
        }
        if (player.y >= FLOOR) { player.y = FLOOR; player.vy = 0; player.onGround = true; }
      }
      if (!wasOnGround && player.onGround) player.landingUntil = now + 120;

      const dog = game.dog;
      if (!dog.wakeAt) dog.wakeAt = now + 3500 + Math.random() * 4200;
      const nearDog = Math.abs(player.x - dog.x) < 200;
      if (!dog.awake && (now > dog.wakeAt || nearDog)) { dog.awake = true; dog.wakeAt = now + 3500 + Math.random() * 4800; }
      if (dog.awake) { dog.x = clamp(dog.x + Math.sign((nearDog ? player.x : 420) - dog.x) * 70 * dt, 90, 510); if (!nearDog && now > dog.wakeAt - 1800) dog.awake = false; }

      const robot = game.robot;
      if (now > robot.turnAt) { robot.vx = (Math.random() > .5 ? 1 : -1) * (48 + Math.random() * 38); robot.turnAt = now + 1100 + Math.random() * 1700; }
      robot.x += robot.vx * dt; if (robot.x < 560 || robot.x > 920) robot.vx *= -1; robot.x = clamp(robot.x, 560, 920);

      PACKING_ITEMS.forEach((item) => {
        const place = game.items[item.id];
        if (place.state === 'loose' && player.carrying.length < 3 && distance(player, place) < 57) {
          place.state = 'carried'; player.carrying.push(item.id); game.popup = { text: item.label, at: now };
          for (let i = 0; i < 8; i += 1) game.particles.push({ x: place.x, y: place.y, vx: (Math.random() - .5) * 105, vy: -25 - Math.random() * 95, at: now, life: 620, color: '#F6A957' });
          tone(554); vibrate(10);
        }
      });

      const playerHitbox = playerBox(player);
      const stomping = (enemy: Rect) => player.vy > 0 && playerHitbox.y + playerHitbox.h <= enemy.y + enemy.h / 3;
      const dogHit = dog.awake && now >= player.invulnerableUntil && overlaps(playerHitbox, dogBox(dog)) && !stomping(dogBox(dog));
      const robotHit = now >= player.invulnerableUntil && overlaps(playerHitbox, robotBox(robot)) && !stomping(robotBox(robot));
      if (dogHit || robotHit) {
        player.invulnerableUntil = now + 2500; player.slowUntil = now + 800;
        player.knockbackUntil = now + 180; player.knockbackDirection = player.x < (dogHit ? dog.x : robot.x) ? -1 : 1;
        if (dogHit) {
          game.penalty += 3; const dropped = player.carrying.pop();
          if (dropped) { const item = game.items[dropped]; item.state = 'loose'; item.x = item.homeX; item.y = item.homeY; }
          game.popup = { text: 'Dog startled you: −3 sec', at: now };
        } else game.popup = { text: 'Vacuum wobble!', at: now };
        tone(dogHit ? 155 : 190, .19); vibrate(dogHit ? [18, 30, 18] : 15);
      }
      if (game.suitcaseTaken && distance(player, DOOR) < DOOR.r) end(game, true, 'The traveller is ready for the trip.');
      const state = `${Math.ceil(game.seconds)}-${game.score}-${game.packed.length}-${Math.round(player.x / 20)}-${game.phase}`;
      if (state !== lastHud) { lastHud = state; sync(game); }
    };
    const render = (now: number) => { resize(); const ratio = canvas.width / Math.max(1, cssWidth); context.setTransform(ratio * cssWidth / W, 0, 0, ratio * cssHeight / H, 0, 0); const game = gameRef.current; if (game.phase === 'start') startScreen(); else if (game.phase === 'end') endScreen(now); else if (game.phase === 'paused') paused(now); else { update(game, now); drawPlay(game, now); } frame = requestAnimationFrame(render); };
    const pointer = (event: PointerEvent) => { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) / rect.width * W, y: (event.clientY - rect.top) / rect.height * H }; };
    const down = (event: PointerEvent) => { const game = gameRef.current; if (game.phase !== 'play') return; const point = pointer(event); if (distance(point, game.player) < 78) { jump(); return; } if (touchTimer.current) clearTimeout(touchTimer.current); touchMove.current = point.x < W / 2 ? -1 : 1; if (event.pointerType === 'touch') touchTimer.current = setTimeout(() => { touchMove.current = 0; }, 430); canvas.setPointerCapture?.(event.pointerId); };
    const up = (event: PointerEvent) => { if (event.pointerType !== 'touch') touchMove.current = 0; canvas.releasePointerCapture?.(event.pointerId); };
    const keyDown = (event: KeyboardEvent) => { const game = gameRef.current; if (event.key.toLowerCase() === 'p') { event.preventDefault(); pause(); return; } if (game.phase !== 'play') return; if (event.key === ' ' || event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') { event.preventDefault(); jump(); return; } if (event.key.toLowerCase() === 'e' || event.key === 'ArrowDown') { event.preventDefault(); pack(); return; } if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(event.key)) { event.preventDefault(); keys.current.add(event.key); } };
    const keyUp = (event: KeyboardEvent) => keys.current.delete(event.key);
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp); frame = requestAnimationFrame(render); return () => { if (touchTimer.current) clearTimeout(touchTimer.current); cancelAnimationFrame(frame); canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointercancel', up); window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); };
  }, [best, end, jump, pack, pause, sync, tone, vibrate]);

  const standard = hud.mode === 'standard'; const ring = standard ? clamp(hud.seconds / 60 * 100, 0, 100) : 100; const showPack = phase === 'play' && hud.nearSuitcase && (hud.packed < 8 || hud.ready);
  return <Div ref={shellRef} style={styles.shell}>
    <Div style={styles.top}><Div><Div style={styles.eyebrow}>TRAVINO MINI GAME</Div><Div style={styles.title}>Suitcase Sprint</Div></Div><Div style={styles.note}>{phase === 'play' ? (standard ? '60 second sprint' : 'Chill mode') : 'A cozy platform packer'}</Div></Div>
    {phase === 'play' || phase === 'paused' ? <Div style={styles.hud}><Div style={styles.score}><span style={styles.label}>SCORE</span><strong>{hud.score}</strong></Div><Div style={styles.packed}>{hud.packed}/8 packed</Div><Div style={styles.timer}><Div style={{ ...styles.ring, background: `conic-gradient(#F19A50 ${ring}%, #F8E7D1 0)` }}><Div style={styles.ringInner}>{standard ? `${hud.seconds}s` : '∞'}</Div></Div><span style={styles.label}>{standard ? 'TIME' : 'CHILL'}</span></Div><Button type="button" onClick={pause} style={styles.utility}>{phase === 'paused' ? 'Resume' : 'Pause'}</Button><Button type="button" onClick={() => setMuted((value) => !value)} style={styles.utility}>{muted ? 'Sound off' : 'Sound on'}</Button></Div> : <Div style={styles.hud}><Button type="button" onClick={() => setMuted((value) => !value)} style={{ ...styles.utility, marginLeft: 'auto' }}>{muted ? 'Sound off' : 'Sound on'}</Button></Div>}
    <Div style={styles.canvasWrap}><Canvas ref={canvasRef} style={styles.canvas} aria-label="Suitcase Sprint platform game. Use arrow keys or A and D to walk, space to jump and E to pack." /></Div>
    {phase === 'start' && <Div style={styles.actions}>{assetsReady ? <><Button type="button" onClick={() => begin('standard')} style={{ ...styles.choice, ...styles.standard }}>Standard <span style={styles.meta}>60 sec</span></Button><Button type="button" onClick={() => begin('chill')} style={{ ...styles.choice, ...styles.chill }}>Chill <span style={styles.meta}>No timer</span></Button></> : <Div style={styles.loading}>Getting the room ready…</Div>}</Div>}
    {phase === 'paused' && <Div style={styles.actions}><Button type="button" onClick={pause} style={{ ...styles.choice, ...styles.chill }}>Resume packing</Button></Div>}
    {phase === 'end' && <Div style={styles.actions}><Button type="button" onClick={() => begin(hud.mode ?? 'standard')} style={{ ...styles.choice, ...styles.standard }}>Play again</Button><Button type="button" onClick={onJoinWaitlist} style={{ ...styles.choice, ...styles.chill }}>Join the waitlist</Button></Div>}
    {showPack && <Button type="button" onClick={pack} style={styles.packButton}>{hud.ready ? 'Take suitcase' : `Pack ${hud.packed}/8`}</Button>}
    <Div style={styles.instructions}>{touchFirst ? <><span>Tap left or right to walk</span><span>Tap the traveller to jump</span><span>Use Pack beside the suitcase</span></> : <><span>← → or A D to walk</span><span>Space or ↑ to jump</span><span>E or ↓ to pack · P to pause</span></>}</Div>
  </Div>;
}

const styles: Record<string, any> = {
  shell: { width: '100%', maxWidth: 1120, margin: '0 auto', borderRadius: 30, padding: 18, background: '#FFFDF8', border: '1px solid #E5D7C5', boxShadow: '0 20px 50px rgba(86,57,28,.10)' }, top: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '2px 4px 10px' }, eyebrow: { color: '#D57B4F', fontWeight: 900, letterSpacing: '1.15px', fontSize: 10 }, title: { color: '#263445', fontFamily: 'Nunito_800ExtraBold, Nunito, sans-serif', fontWeight: 900, fontSize: 25, lineHeight: 1.1, marginTop: 3 }, note: { color: '#778195', fontWeight: 800, fontSize: 12, textAlign: 'right' },
  hud: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, minHeight: 48, marginBottom: 10 }, score: { display: 'flex', alignItems: 'baseline', gap: 7, border: '2px solid #263445', borderRadius: 14, padding: '7px 10px', background: '#FFF8EC', color: '#263445' }, packed: { border: '2px solid #263445', borderRadius: 14, padding: '8px 10px', background: '#E9F6EC', color: '#356C4D', fontSize: 12, fontWeight: 900 }, timer: { display: 'flex', alignItems: 'center', gap: 7, border: '2px solid #263445', borderRadius: 18, padding: '4px 8px 4px 4px', background: '#FFF8EC' }, label: { color: '#7B7780', fontWeight: 900, letterSpacing: '.8px', fontSize: 9 }, ring: { width: 34, height: 34, padding: 4, borderRadius: '50%' }, ringInner: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', borderRadius: '50%', background: '#FFFDF8', color: '#263445', fontWeight: 900, fontSize: 10 }, utility: { border: '2px solid #263445', borderRadius: 13, background: '#FFF8EC', color: '#536176', fontWeight: 900, fontSize: 11, padding: '9px 11px', cursor: 'pointer' },
  canvasWrap: { width: '100%', aspectRatio: '16 / 9', overflow: 'hidden', borderRadius: 23, background: '#FFF8EC', border: '3px solid #263445', touchAction: 'none', userSelect: 'none' }, canvas: { display: 'block', width: '100%', height: '100%', cursor: 'crosshair', outline: 'none' }, actions: { display: 'flex', justifyContent: 'center', gap: 10, width: '100%', marginTop: 13 }, choice: { flex: 1, maxWidth: 260, minHeight: 51, borderRadius: 16, border: '3px solid #263445', padding: '9px 12px', cursor: 'pointer', fontFamily: 'Nunito_800ExtraBold, Nunito, sans-serif', fontWeight: 900, fontSize: 15, boxShadow: '0 5px 0 #263445' }, standard: { background: '#F29A51', color: '#FFFDF8' }, chill: { background: '#B6D9B8', color: '#263445' }, meta: { display: 'block', fontFamily: 'system-ui, sans-serif', fontWeight: 700, fontSize: 10, opacity: .86, marginTop: 2 }, loading: { borderRadius: 999, background: 'rgba(255,249,238,.94)', border: '2px solid #263445', color: '#263445', padding: '10px 16px', fontSize: 12, fontWeight: 900 }, packButton: { display: 'block', width: 'min(100%,330px)', margin: '13px auto 0', border: '3px solid #263445', borderRadius: 16, background: '#F29A51', color: '#FFF', minHeight: 48, fontSize: 15, fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 0 #263445' }, instructions: { display: 'flex', flexWrap: 'wrap', gap: '6px 18px', justifyContent: 'center', color: '#778195', fontSize: 11, fontWeight: 700, padding: '13px 4px 2px', textAlign: 'center' },
};
