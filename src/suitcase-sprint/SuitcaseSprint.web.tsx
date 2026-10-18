import { useCallback, useEffect, useRef, useState } from 'react';

// This list is intentionally separate from the loop so a future trip can provide
// its actual packing list without changing the gameplay code.
export const PACKING_ITEMS = [
  { id: 'passport', label: 'Passport', sprite: 'passport', x: 125, y: 408 },
  { id: 'sunglasses', label: 'Sunglasses', sprite: 'sunglasses', x: 277, y: 458 },
  { id: 'camera', label: 'Camera', sprite: 'camera', x: 435, y: 398 },
  { id: 'charger', label: 'Charger', sprite: 'charger', x: 720, y: 450 },
  { id: 'swimwear', label: 'Swimwear', sprite: 'swimwear', x: 133, y: 496 },
  { id: 'hoodie', label: 'Hoodie', sprite: 'hoodie', x: 389, y: 496 },
  { id: 'snack-box', label: 'Snack box', sprite: 'snack-box', x: 715, y: 496 },
  { id: 'guidebook', label: 'Guidebook', sprite: 'guidebook', x: 591, y: 386 },
] as const;

type ItemId = (typeof PACKING_ITEMS)[number]['id'];
type SpriteName = 'capybara' | 'dog' | 'robot-vacuum' | 'suitcase' | (typeof PACKING_ITEMS)[number]['sprite'];
type Mode = 'standard' | 'chill';
type Screen = 'start' | 'play' | 'end';
type Particle = { x: number; y: number; vx: number; vy: number; born: number; life: number; color: string; confetti?: boolean };
type Game = {
  mode: Mode | null; phase: Screen; startedAt: number; last: number; penalty: number; seconds: number; score: number; packed: ItemId[];
  items: Record<ItemId, { state: 'loose' | 'carried' | 'packed'; x: number; y: number }>;
  capy: { x: number; y: number; targetX: number; targetY: number; carrying: ItemId[]; hopUntil: number; stumbleUntil: number; walk: number; facing: 1 | -1 };
  dog: { x: number; y: number; homeX: number; homeY: number; awake: boolean; settleAt: number; hitUntil: number };
  robot: { x: number; y: number; vx: number; vy: number; nextTurnAt: number; hitUntil: number };
  particles: Particle[]; popup: { label: string; born: number } | null; suitcaseBounceUntil: number; message: string;
};

const W = 900; const H = 560; const FLOOR = 342;
const SUITCASE = { x: 548, y: 486, r: 82 }; const DOOR = { x: 832, y: 353, r: 68 };
const BEST_KEY = 'travino-suitcase-sprint-best'; const MUTE_KEY = 'travino-suitcase-sprint-muted';
const ASSETS: Record<SpriteName, string> = {
  capybara: '/game/capybara.png', dog: '/game/dog.png', 'robot-vacuum': '/game/robot-vacuum.png', suitcase: '/game/suitcase.png',
  passport: '/game/passport.png', sunglasses: '/game/sunglasses.png', camera: '/game/camera.png', charger: '/game/charger.png', swimwear: '/game/swimwear.png', hoodie: '/game/hoodie.png', 'snack-box': '/game/snack-box.png', guidebook: '/game/guidebook.png',
};
const Div = 'div' as any; const Canvas = 'canvas' as any; const Button = 'button' as any;
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const itemFor = (id: ItemId) => PACKING_ITEMS.find((item) => item.id === id)!;
const storageNumber = (key: string) => { try { return Number.parseInt(window.localStorage.getItem(key) || '0', 10) || 0; } catch { return 0; } };

function makeGame(mode: Mode | null): Game {
  return {
    mode, phase: mode ? 'play' : 'start', startedAt: 0, last: 0, penalty: 0, seconds: 60, score: 0, packed: [],
    items: Object.fromEntries(PACKING_ITEMS.map((item) => [item.id, { state: 'loose' as const, x: item.x, y: item.y }])) as Game['items'],
    capy: { x: 95, y: 485, targetX: 95, targetY: 485, carrying: [], hopUntil: 0, stumbleUntil: 0, walk: 0, facing: 1 },
    dog: { x: 315, y: 490, homeX: 315, homeY: 490, awake: false, settleAt: 0, hitUntil: 0 },
    robot: { x: 690, y: 388, vx: -38, vy: 25, nextTurnAt: 0, hitUntil: 0 }, particles: [], popup: null, suitcaseBounceUntil: 0, message: '',
  };
}

export function SuitcaseSprint({ onJoinWaitlist }: { onJoinWaitlist: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null); const gameRef = useRef<Game>(makeGame(null));
  const sprites = useRef<Partial<Record<SpriteName, HTMLImageElement>>>({});
  const audio = useRef<{ context: AudioContext | null; loop: ReturnType<typeof setInterval> | null }>({ context: null, loop: null });
  const [screen, setScreen] = useState<Screen>('start'); const [best, setBest] = useState(0); const [muted, setMuted] = useState(false); const [touchFirst, setTouchFirst] = useState(false);
  const [hud, setHud] = useState({ score: 0, seconds: 60, packed: 0, mode: null as Mode | null });

  useEffect(() => {
    setBest(storageNumber(BEST_KEY)); try { setMuted(window.localStorage.getItem(MUTE_KEY) === 'true'); } catch {}
    const query = window.matchMedia('(max-width: 640px), (pointer: coarse)'); const update = () => setTouchFirst(query.matches); update(); query.addEventListener?.('change', update); return () => query.removeEventListener?.('change', update);
  }, []);
  useEffect(() => { (Object.keys(ASSETS) as SpriteName[]).forEach((name) => { const image = new Image(); image.src = ASSETS[name]; sprites.current[name] = image; }); }, []);
  useEffect(() => { try { window.localStorage.setItem(MUTE_KEY, String(muted)); } catch {} }, [muted]);

  const buzz = useCallback((pattern: number | number[]) => { if ('vibrate' in navigator) navigator.vibrate(pattern); }, []);
  const tone = useCallback((frequency: number, seconds = .1, volume = .03) => {
    if (muted) return; const AudioCtx = window.AudioContext || (window as any).webkitAudioContext; if (!AudioCtx) return;
    audio.current.context ??= new AudioCtx(); const context = audio.current.context; if (context.state === 'suspended') void context.resume();
    const oscillator = context.createOscillator(); const gain = context.createGain(); oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, context.currentTime); gain.gain.setValueAtTime(volume, context.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + seconds); oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + seconds);
  }, [muted]);
  const stopMusic = useCallback(() => { if (audio.current.loop) clearInterval(audio.current.loop); audio.current.loop = null; }, []);
  const startMusic = useCallback(() => { stopMusic(); if (muted) return; const notes = [261.63, 329.63, 392, 329.63, 293.66, 349.23]; let step = 0; const play = () => tone(notes[step++ % notes.length], .38, .016); play(); audio.current.loop = setInterval(play, 1250); }, [muted, stopMusic, tone]);
  useEffect(() => () => stopMusic(), [stopMusic]);
  const publish = useCallback((game: Game) => setHud({ score: game.score, seconds: Math.max(0, Math.ceil(game.seconds)), packed: game.packed.length, mode: game.mode }), []);
  const begin = useCallback((mode: Mode) => { const game = makeGame(mode); gameRef.current = game; setScreen('play'); publish(game); startMusic(); }, [publish, startMusic]);
  const finish = useCallback((game: Game, won: boolean) => {
    if (game.phase !== 'play') return; if (won && game.mode === 'standard') game.score += Math.max(0, Math.floor(game.seconds)) * 10;
    game.phase = 'end'; game.message = won ? 'The capybara is ready for the trip.' : 'The suitcase needs one more cozy sprint.';
    if (won) { const now = performance.now(); for (let i = 0; i < 48; i += 1) game.particles.push({ x: 450, y: 170, vx: (Math.random() - .5) * 250, vy: -55 - Math.random() * 170, born: now, life: 1800, color: ['#F19A50', '#78B88D', '#6E9BD8', '#E66F78', '#F5C65F'][i % 5], confetti: true }); setBest((old) => { const next = Math.max(old, game.score); try { window.localStorage.setItem(BEST_KEY, String(next)); } catch {} return next; }); }
    stopMusic(); tone(won ? 523.25 : 196, .42, .05); publish(game); setScreen('end');
  }, [publish, stopMusic, tone]);
  const hop = useCallback(() => { const game = gameRef.current; const now = performance.now(); if (game.phase !== 'play' || game.capy.stumbleUntil > now || game.capy.hopUntil > now) return; game.capy.hopUntil = now + 560; tone(660, .09, .03); buzz(8); }, [buzz, tone]);
  const toggleMute = useCallback(() => setMuted((wasMuted) => { const next = !wasMuted; if (next) stopMusic(); else if (gameRef.current.phase === 'play') startMusic(); return next; }), [startMusic, stopMusic]);

  useEffect(() => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext('2d'); if (!canvas || !ctx) return; let frame = 0; let cssWidth = 0; let cssHeight = 0; let lastHudSecond = -1;
    const resize = () => { const box = canvas.getBoundingClientRect(); const width = Math.max(1, box.width); const height = Math.max(1, box.height); if (width === cssWidth && height === cssHeight) return; cssWidth = width; cssHeight = height; const ratio = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); };
    const text = (value: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left', weight = 800) => { ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.font = `${weight} ${size}px Nunito, ui-rounded, system-ui, sans-serif`; ctx.fillText(value, x, y); };
    const rounded = (x: number, y: number, w: number, h: number, radius: number, fill: string, stroke = '#263445', line = 3) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = line; ctx.stroke(); } };
    // White pixels have no effect in multiply mode, so the supplied white image
    // backgrounds melt into the wooden floor without altering the source files.
    const sprite = (name: SpriteName, x: number, y: number, w: number, h: number, flip = false) => { const image = sprites.current[name]; if (!image?.complete) return; ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.translate(x, y); if (flip) ctx.scale(-1, 1); ctx.drawImage(image, -w / 2, -h / 2, w, h); ctx.restore(); };
    const sparkles = (x: number, y: number, now: number, color = '#F7AB57', count = 8) => { const game = gameRef.current; for (let i = 0; i < count; i += 1) game.particles.push({ x, y, vx: (Math.random() - .5) * 90, vy: -25 - Math.random() * 85, born: now, life: 620, color }); };
    const drawRoom = () => {
      ctx.fillStyle = '#FFF7E9'; ctx.fillRect(0, 0, W, H); rounded(0, FLOOR - 7, W, 10, 0, '#D99B55', '', 0); ctx.fillStyle = '#F1C783'; ctx.fillRect(0, FLOOR, W, H - FLOOR);
      for (let x = -90; x < W + 80; x += 92) { ctx.strokeStyle = 'rgba(113,70,35,.17)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + 82, FLOOR); ctx.stroke(); }
      rounded(55, 46, 215, 155, 19, '#F6D1A2', '#263445', 5); ctx.fillStyle = '#D87886'; ctx.fillRect(69, 61, 187, 125); ctx.fillStyle = '#FFD36B'; ctx.beginPath(); ctx.arc(205, 105, 31, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#263445'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(163, 61); ctx.lineTo(163, 186); ctx.moveTo(69, 124); ctx.lineTo(256, 124); ctx.stroke();
      rounded(327, 70, 300, 127, 26, '#9A8AC5', '#263445', 5); rounded(350, 112, 107, 81, 18, '#C8BDE8', '#263445', 3); rounded(468, 112, 132, 81, 18, '#C8BDE8', '#263445', 3); ctx.fillStyle = '#6B5B94'; ctx.fillRect(350, 191, 15, 39); ctx.fillRect(585, 191, 15, 39);
      rounded(676, 48, 105, 125, 13, '#F9F0DC', '#263445', 4); ctx.fillStyle = '#6CC5C7'; ctx.beginPath(); ctx.moveTo(691, 154); ctx.lineTo(729, 87); ctx.lineTo(769, 154); ctx.fill(); text('TRIP SOON', 729, 70, 10, '#263445', 'center');
      rounded(90, 235, 75, 70, 15, '#D8765C', '#263445', 4); ctx.strokeStyle = '#3E876C'; ctx.lineWidth = 11; ctx.lineCap = 'round'; [[128, 236, 106, 207], [128, 237, 151, 197], [130, 240, 130, 188]].forEach(([x1, y1, x2, y2]) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); });
      rounded(784, 174, 101, 165, 13, '#738CB2', '#263445', 5); ctx.fillStyle = '#FFE18C'; ctx.beginPath(); ctx.arc(863, 260, 6, 0, Math.PI * 2); ctx.fill(); text('FRONT DOOR', 835, 352, 10, '#657288', 'center');
    };
    const drawSuitcase = (game: Game, now: number) => { const closed = game.packed.length === PACKING_ITEMS.length; const bounce = game.suitcaseBounceUntil > now ? Math.sin((1 - (game.suitcaseBounceUntil - now) / 430) * Math.PI) * 15 : 0; ctx.save(); ctx.translate(SUITCASE.x, SUITCASE.y - bounce); ctx.fillStyle = 'rgba(48,43,37,.16)'; ctx.beginPath(); ctx.ellipse(0, 44 + bounce, 70, 11, 0, 0, Math.PI * 2); ctx.fill(); sprite('suitcase', 0, 0, 142, 142); rounded(-34, 34, 68, 22, 11, closed ? '#75AD83' : '#FFF8E9', '#263445', 2); text(closed ? 'READY' : `${game.packed.length}/8`, 0, 45, 12, closed ? '#FFF' : '#356C4D', 'center', 900); ctx.restore(); };
    const drawItem = (item: (typeof PACKING_ITEMS)[number], place: { x: number; y: number }) => { ctx.fillStyle = 'rgba(48,43,37,.15)'; ctx.beginPath(); ctx.ellipse(place.x, place.y + 25, 29, 7, 0, 0, Math.PI * 2); ctx.fill(); sprite(item.sprite, place.x, place.y, 68, 68); rounded(place.x - 42, place.y + 35, 84, 19, 9, 'rgba(255,250,240,.93)', '#263445', 1.5); text(item.label, place.x, place.y + 45, 10, '#263445', 'center', 900); };
    const drawCapy = (game: Game, x = game.capy.x, y = game.capy.y, waving = false) => { const capy = game.capy; const now = performance.now(); const progress = capy.hopUntil > now ? 1 - (capy.hopUntil - now) / 560 : 0; const hopHeight = progress ? Math.sin(progress * Math.PI) * 63 : 0; const moving = Math.hypot(capy.targetX - capy.x, capy.targetY - capy.y) > 3; const bob = moving ? Math.sin(capy.walk * 13) * 5 : 0; ctx.fillStyle = 'rgba(48,43,37,.18)'; ctx.beginPath(); ctx.ellipse(x, y + 37, 43 - hopHeight / 7, 10, 0, 0, Math.PI * 2); ctx.fill(); sprite('capybara', x, y - hopHeight + bob, 114, 114, capy.facing < 0); if (waving) { ctx.strokeStyle = '#263445'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x + 33, y - 10); ctx.lineTo(x + 51, y - 32 + Math.sin(now / 150) * 6); ctx.stroke(); } capy.carrying.forEach((id, index) => { ctx.save(); ctx.shadowColor = '#F2A14D'; ctx.shadowBlur = 17; sprite(itemFor(id).sprite, x - 17 + index * 19, y - 58 - index * 17 - hopHeight, 37, 37); ctx.restore(); }); };
    const drawDog = (game: Game, now: number) => { const dog = game.dog; ctx.fillStyle = 'rgba(48,43,37,.16)'; ctx.beginPath(); ctx.ellipse(dog.x, dog.y + 31, 47, 8, 0, 0, Math.PI * 2); ctx.fill(); sprite('dog', dog.x, dog.y - (dog.awake ? Math.sin(now / 115) * 2 : 0), 118, 94, dog.awake && game.capy.x < dog.x); if (dog.awake) text('!', dog.x, dog.y - 53, 15, '#D77654', 'center', 900); else { text('z', dog.x + 42, dog.y - 41, 16, '#89739E', 'center'); text('z', dog.x + 56, dog.y - 56, 11, '#89739E', 'center'); } };
    const drawRobot = (game: Game) => { const robot = game.robot; ctx.fillStyle = 'rgba(48,43,37,.16)'; ctx.beginPath(); ctx.ellipse(robot.x, robot.y + 23, 29, 7, 0, 0, Math.PI * 2); ctx.fill(); sprite('robot-vacuum', robot.x, robot.y, 70, 70); };
    const drawParticles = (game: Game, now: number) => { game.particles = game.particles.filter((p) => now - p.born < p.life); game.particles.forEach((p) => { const age = (now - p.born) / p.life; ctx.save(); ctx.globalAlpha = 1 - age; ctx.fillStyle = p.color; ctx.translate(p.x + p.vx * age, p.y + p.vy * age + 95 * age * age); if (p.confetti) { ctx.rotate(age * 6); ctx.fillRect(-4, -4, 8, 8); } else text('✦', 0, 0, 19 * (1 - age * .3), p.color, 'center'); ctx.restore(); }); };
    const drawStart = () => { const game = gameRef.current; drawRoom(); ctx.fillStyle = 'rgba(38,52,69,.23)'; ctx.fillRect(0, 0, W, H); rounded(158, 94, 584, 366, 38, '#FFF9EE', '#263445', 5); ctx.fillStyle = '#FFE9B5'; ctx.beginPath(); ctx.arc(652, 167, 62, 0, Math.PI * 2); ctx.fill(); game.capy.facing = 1; drawCapy(game, 278, 299, true); text('SUITCASE SPRINT', 476, 166, 38, '#263445', 'center', 900); text('Pack eight essentials before the group trip.', 476, 205, 17, '#667286', 'center', 700); text('Carry three things. Walk to the suitcase to pack them.', 476, 378, 15, '#667286', 'center', 800); text('Hop over the dog to keep your items and time.', 476, 404, 15, '#B96545', 'center', 900); text(`Best score: ${best}`, 476, 431, 13, '#6E9B78', 'center', 900); };
    const drawEnd = (now: number) => { const game = gameRef.current; drawRoom(); drawSuitcase(game, now); drawParticles(game, now); ctx.fillStyle = 'rgba(38,52,69,.22)'; ctx.fillRect(0, 0, W, H); rounded(158, 104, 584, 345, 38, '#FFF9EE', '#263445', 5); game.capy.facing = 1; drawCapy(game, 275, 308, true); text('SUITCASE SPRINT', 478, 170, 15, '#D57B4F', 'center', 900); text(`${game.score} points`, 478, 224, 48, '#263445', 'center', 900); text(game.message, 478, 269, 18, '#667286', 'center', 800); text(`${game.packed.length} of ${PACKING_ITEMS.length} essentials packed`, 478, 300, 14, '#667286', 'center', 700); text(`Best score: ${Math.max(best, game.score)}`, 478, 331, 14, '#6E9B78', 'center', 900); };
    const drawPlay = (game: Game, now: number) => { drawRoom(); drawSuitcase(game, now); PACKING_ITEMS.forEach((item) => { const place = game.items[item.id]; if (place.state === 'loose') drawItem(item, place); }); drawDog(game, now); drawRobot(game); drawCapy(game); drawParticles(game, now); if (game.popup && now - game.popup.born < 900) { const age = (now - game.popup.born) / 900; ctx.globalAlpha = 1 - age; rounded(game.capy.x - 47, game.capy.y - 112 - age * 22, 94, 23, 11, '#FFF9EE', '#263445', 2); text(game.popup.label, game.capy.x, game.capy.y - 100 - age * 22, 11, '#B96545', 'center', 900); ctx.globalAlpha = 1; } if (game.packed.length === PACKING_ITEMS.length) text('Suitcase packed. Bring it to the front door!', 450, 356, 15, '#356C4D', 'center', 900); else if (game.capy.carrying.length === 3) text('Three carried. Walk up to the suitcase to pack.', SUITCASE.x, SUITCASE.y + 95, 11, '#B96545', 'center', 900); };
    const pack = (game: Game, now: number) => { if (!game.capy.carrying.length || game.packed.length === PACKING_ITEMS.length) return; const carried = [...game.capy.carrying]; game.capy.carrying = []; game.suitcaseBounceUntil = now + 430; carried.forEach((id, index) => { game.items[id].state = 'packed'; game.packed.push(id); game.score += 125; sparkles(SUITCASE.x - 22 + index * 24, SUITCASE.y - 43, now, '#F4A350', 6); }); tone(740, .12, .045); buzz([8, 18, 12]); publish(game); };
    const update = (game: Game, now: number) => {
      if (!game.startedAt) game.startedAt = now; const dt = game.last ? (now - game.last) / 1000 : 0; game.last = now;
      game.seconds = game.mode === 'standard' ? Math.max(0, 60 - (now - game.startedAt) / 1000 - game.penalty) : 60; if (game.mode === 'standard' && game.seconds <= 0) { finish(game, false); return; }
      const capy = game.capy; if (capy.stumbleUntil <= now) { const dx = capy.targetX - capy.x; const dy = capy.targetY - capy.y; const left = Math.hypot(dx, dy); const step = Math.min(220 * dt, left); if (left > 1) { capy.x += dx / left * step; capy.y += dy / left * step; capy.walk += dt; if (Math.abs(dx) > 2) capy.facing = dx > 0 ? 1 : -1; } } capy.x = clamp(capy.x, 48, W - 48); capy.y = clamp(capy.y, FLOOR + 31, H - 35);
      const dog = game.dog; const nearDog = distance(capy, dog) < 210; if (nearDog) { dog.awake = true; dog.settleAt = now + 1350; } if (dog.awake) { const target = nearDog ? capy : { x: dog.homeX, y: dog.homeY }; const dx = target.x - dog.x; const dy = target.y - dog.y; const length = Math.hypot(dx, dy) || 1; const speed = nearDog ? 62 : 35; dog.x += dx / length * speed * dt; dog.y += dy / length * speed * dt; if (!nearDog && now > dog.settleAt && distance(dog, { x: dog.homeX, y: dog.homeY }) < 8) dog.awake = false; }
      const robot = game.robot; if (now > robot.nextTurnAt) { const angle = Math.random() * Math.PI * 2; robot.vx = Math.cos(angle) * 43; robot.vy = Math.sin(angle) * 32; robot.nextTurnAt = now + 1400 + Math.random() * 2400; } robot.x += robot.vx * dt; robot.y += robot.vy * dt; if (robot.x < 55 || robot.x > W - 55) robot.vx *= -1; if (robot.y < FLOOR + 32 || robot.y > H - 35) robot.vy *= -1; robot.x = clamp(robot.x, 55, W - 55); robot.y = clamp(robot.y, FLOOR + 32, H - 35);
      PACKING_ITEMS.forEach((item) => { const place = game.items[item.id]; if (place.state === 'loose' && capy.carrying.length < 3 && distance(capy, place) < 57) { place.state = 'carried'; capy.carrying.push(item.id); game.popup = { label: item.label, born: now }; sparkles(place.x, place.y, now); tone(554, .1, .038); buzz(10); } });
      if (capy.carrying.length && distance(capy, SUITCASE) < 92) pack(game, now);
      if (capy.hopUntil <= now && capy.stumbleUntil <= now) { const hitDog = distance(capy, dog) < 61 && dog.hitUntil < now; const hitRobot = distance(capy, robot) < 53 && robot.hitUntil < now; if (hitDog || hitRobot) { const obstacle = hitDog ? dog : robot; obstacle.hitUntil = now + 1250; capy.stumbleUntil = now + (hitDog ? 700 : 460); if (hitDog) { game.penalty += 3; const dropped = capy.carrying.pop(); if (dropped) game.items[dropped] = { state: 'loose', x: clamp(capy.x + 34, 55, W - 55), y: clamp(capy.y + 14, FLOOR + 35, H - 42) }; } tone(hitDog ? 150 : 180, .18, .05); buzz(hitDog ? [18, 30, 18] : 15); } }
      if (game.packed.length === PACKING_ITEMS.length && distance(capy, DOOR) < DOOR.r) finish(game, true); const roundedSecond = Math.ceil(game.seconds); if (roundedSecond !== lastHudSecond) { lastHudSecond = roundedSecond; publish(game); }
    };
    const render = (now: number) => { resize(); const ratio = canvas.width / Math.max(1, cssWidth); ctx.setTransform(ratio * cssWidth / W, 0, 0, ratio * cssHeight / H, 0, 0); const game = gameRef.current; if (game.phase === 'start') drawStart(); else if (game.phase === 'end') drawEnd(now); else { update(game, now); drawPlay(game, now); } frame = requestAnimationFrame(render); };
    const point = (event: PointerEvent) => { const box = canvas.getBoundingClientRect(); return { x: (event.clientX - box.left) / box.width * W, y: (event.clientY - box.top) / box.height * H }; };
    const pointerDown = (event: PointerEvent) => { const game = gameRef.current; if (game.phase !== 'play') return; const target = point(event); if (distance(target, game.capy) < 68) { hop(); return; } if (distance(target, SUITCASE) < SUITCASE.r + 22 && game.capy.carrying.length) { pack(game, performance.now()); return; } game.capy.targetX = clamp(target.x, 48, W - 48); game.capy.targetY = clamp(target.y, FLOOR + 30, H - 35); };
    const keyDown = (event: KeyboardEvent) => { const game = gameRef.current; if (game.phase !== 'play') return; const moves: Record<string, [number, number]> = { ArrowUp: [0, -88], ArrowDown: [0, 88], ArrowLeft: [-88, 0], ArrowRight: [88, 0] }; if (event.key === ' ' || event.key === 'Spacebar') { event.preventDefault(); hop(); return; } const move = moves[event.key]; if (!move) return; event.preventDefault(); game.capy.targetX = clamp(game.capy.targetX + move[0], 48, W - 48); game.capy.targetY = clamp(game.capy.targetY + move[1], FLOOR + 30, H - 35); };
    canvas.addEventListener('pointerdown', pointerDown); window.addEventListener('keydown', keyDown); frame = requestAnimationFrame(render); return () => { cancelAnimationFrame(frame); canvas.removeEventListener('pointerdown', pointerDown); window.removeEventListener('keydown', keyDown); };
  }, [best, buzz, finish, hop, publish, tone]);

  const standard = hud.mode === 'standard'; const ringFill = standard ? clamp(hud.seconds / 60 * 100, 0, 100) : 100;
  return <Div style={styles.shell}>
    <Div style={styles.gameTopline}><Div><Div style={styles.eyebrow}>TRAVINO MINI GAME</Div><Div style={styles.gameTitle}>Suitcase Sprint</Div></Div><Button type="button" onClick={toggleMute} aria-label={muted ? 'Turn sound on' : 'Mute sound'} style={styles.mute}>{muted ? 'Sound off' : 'Sound on'}</Button></Div>
    <Div style={styles.canvasWrap}><Canvas ref={canvasRef} style={styles.canvas} aria-label="Suitcase Sprint game. Tap or click to move the capybara." />
      {screen === 'start' && <Div style={styles.overlay}><Div style={styles.startButtons}><Button type="button" onClick={() => begin('standard')} style={{ ...styles.choice, ...styles.standard }}>Standard <span style={styles.choiceMeta}>60 sec</span></Button><Button type="button" onClick={() => begin('chill')} style={{ ...styles.choice, ...styles.chill }}>Chill <span style={styles.choiceMeta}>No timer</span></Button></Div></Div>}
      {screen === 'play' && <Div style={styles.hud}><Div style={styles.scorePill}><span style={styles.hudLabel}>SCORE</span><strong>{hud.score}</strong><span style={styles.packed}>{hud.packed}/8 packed</span></Div><Div style={styles.timerPill}><Div style={{ ...styles.ring, background: `conic-gradient(#F19A50 ${ringFill}%, #F8E7D1 0)` }}><Div style={styles.ringCenter}>{standard ? `${hud.seconds}s` : '∞'}</Div></Div><span style={styles.hudLabel}>{standard ? 'HURRY GENTLY' : 'CHILL MODE'}</span></Div></Div>}
      {screen === 'end' && <Div style={styles.overlay}><Div style={styles.endButtons}><Button type="button" onClick={() => begin(hud.mode ?? 'standard')} style={{ ...styles.choice, ...styles.standard }}>Play again</Button><Button type="button" onClick={onJoinWaitlist} style={{ ...styles.choice, ...styles.chill }}>Join the waitlist</Button></Div></Div>}
    </Div>
    <Div style={styles.instructions}>{touchFirst ? <><span>Tap the room to walk</span><span>Tap capybara to hop over the dog</span><span>Walk to the suitcase to pack</span></> : <><span>Click to walk</span><span>Click capybara or press space to hop</span><span>Arrow keys also work</span></>}</Div>
  </Div>;
}

const styles: Record<string, any> = {
  shell: { width: '100%', maxWidth: 1120, margin: '0 auto', borderRadius: 30, padding: 18, background: '#FFFDF8', border: '1px solid #E5D7C5', boxShadow: '0 20px 50px rgba(86, 57, 28, .10)' }, gameTopline: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '2px 4px 14px' }, eyebrow: { color: '#D57B4F', fontWeight: 900, letterSpacing: '1.15px', fontSize: 10 }, gameTitle: { color: '#263445', fontFamily: 'Nunito_800ExtraBold, Nunito, sans-serif', fontWeight: 900, fontSize: 25, lineHeight: 1.1, marginTop: 3 }, mute: { border: '1px solid #E1D4C6', borderRadius: 999, background: '#FFF8EC', color: '#657288', fontWeight: 800, fontSize: 12, padding: '9px 13px', cursor: 'pointer' },
  canvasWrap: { position: 'relative', width: '100%', aspectRatio: '1.607 / 1', minHeight: 225, overflow: 'hidden', borderRadius: 23, background: '#FFF8EC', border: '3px solid #263445', touchAction: 'none', userSelect: 'none' }, canvas: { display: 'block', width: '100%', height: '100%', cursor: 'crosshair', outline: 'none' }, overlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 18px 24px', pointerEvents: 'none' }, startButtons: { display: 'flex', gap: 10, width: 'min(100%, 420px)', pointerEvents: 'auto' }, endButtons: { display: 'flex', gap: 10, width: 'min(100%, 420px)', pointerEvents: 'auto' }, choice: { flex: 1, minHeight: 52, borderRadius: 16, border: '3px solid #263445', padding: '9px 12px', cursor: 'pointer', fontFamily: 'Nunito_800ExtraBold, Nunito, sans-serif', fontWeight: 900, fontSize: 15, boxShadow: '0 5px 0 #263445' }, standard: { background: '#F29A51', color: '#FFFDF8' }, chill: { background: '#B6D9B8', color: '#263445' }, choiceMeta: { display: 'block', fontFamily: 'system-ui, sans-serif', fontWeight: 700, fontSize: 10, opacity: .86, marginTop: 2 },
  hud: { position: 'absolute', top: 13, left: 13, right: 13, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pointerEvents: 'none' }, scorePill: { display: 'flex', alignItems: 'baseline', gap: 8, border: '2px solid #263445', borderRadius: 15, padding: '7px 10px', background: 'rgba(255,253,248,.94)', color: '#263445', boxShadow: '0 3px 0 rgba(38,52,69,.20)' }, hudLabel: { color: '#7B7780', fontWeight: 900, letterSpacing: '.8px', fontSize: 9 }, packed: { color: '#568765', fontWeight: 900, fontSize: 11 }, timerPill: { display: 'flex', alignItems: 'center', gap: 7, border: '2px solid #263445', borderRadius: 18, padding: '4px 7px 4px 4px', background: 'rgba(255,253,248,.94)', boxShadow: '0 3px 0 rgba(38,52,69,.20)' }, ring: { width: 35, height: 35, padding: 4, borderRadius: '50%' }, ringCenter: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', borderRadius: '50%', background: '#FFFDF8', color: '#263445', fontWeight: 900, fontSize: 10 }, instructions: { display: 'flex', flexWrap: 'wrap', gap: '6px 18px', justifyContent: 'center', color: '#778195', fontSize: 11, fontWeight: 700, padding: '13px 4px 2px' },
};
