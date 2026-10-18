import { useCallback, useEffect, useRef, useState } from 'react';

// Keep this list separate from the game engine. It can later be replaced with
// a trip's real packing list without changing movement or scoring.
export const PACKING_ITEMS = [
  { id: 'passport', label: 'Passport', color: '#6F72DD', x: 270, y: 165, glyph: '▣' },
  { id: 'sunglasses', label: 'Sunglasses', color: '#25334B', x: 470, y: 180, glyph: '⌐' },
  { id: 'camera', label: 'Camera', color: '#F47759', x: 625, y: 250, glyph: '●' },
  { id: 'charger', label: 'Charger', color: '#7356B8', x: 165, y: 338, glyph: '⌁' },
  { id: 'swimwear', label: 'Swimwear', color: '#32AFA8', x: 435, y: 363, glyph: '≈' },
  { id: 'hoodie', label: 'Hoodie', color: '#D86D92', x: 715, y: 380, glyph: '⌂' },
  { id: 'snack-box', label: 'Snack box', color: '#ECA548', x: 302, y: 448, glyph: '✦' },
  { id: 'guidebook', label: 'Guidebook', color: '#3F8BCB', x: 555, y: 458, glyph: '▤' },
] as const;

type ItemId = (typeof PACKING_ITEMS)[number]['id'];
type Mode = 'standard' | 'chill';
type Screen = 'start' | 'play' | 'end';
type ItemState = 'loose' | 'carried' | 'packed';

type Runtime = {
  mode: Mode | null;
  phase: Screen;
  capy: { x: number; y: number; targetX: number; targetY: number; carrying: ItemId[]; hopUntil: number; stumbleUntil: number; walk: number };
  items: Record<ItemId, { state: ItemState; x: number; y: number }>;
  packed: ItemId[];
  score: number;
  seconds: number;
  last: number;
  dog: { x: number; y: number; direction: number; hitUntil: number };
  robot: { x: number; y: number; direction: number; hitUntil: number };
  particles: { x: number; y: number; born: number; color: string }[];
  message: string;
};

const W = 900;
const H = 560;
const SUITCASE = { x: 700, y: 458, r: 63 };
const DOOR = { x: 825, y: 165, r: 54 };

const Div = 'div' as any;
const Canvas = 'canvas' as any;
const Button = 'button' as any;

function makeRuntime(mode: Mode | null): Runtime {
  return {
    mode,
    phase: mode ? 'play' : 'start',
    capy: { x: 145, y: 435, targetX: 145, targetY: 435, carrying: [], hopUntil: 0, stumbleUntil: 0, walk: 0 },
    items: Object.fromEntries(PACKING_ITEMS.map((item) => [item.id, { state: 'loose' as const, x: item.x, y: item.y }])) as Runtime['items'],
    packed: [], score: 0, seconds: 60, last: 0,
    dog: { x: 270, y: 328, direction: 1, hitUntil: 0 },
    robot: { x: 640, y: 120, direction: -1, hitUntil: 0 },
    particles: [], message: '',
  };
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) { return Math.hypot(a.x - b.x, a.y - b.y); }
function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)); }

export function SuitcaseSprint({ onJoinWaitlist }: { onJoinWaitlist: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Runtime>(makeRuntime(null));
  const audioRef = useRef<{ context: AudioContext | null; loop: ReturnType<typeof setInterval> | null }>({ context: null, loop: null });
  const [screen, setScreen] = useState<Screen>('start');
  const [hud, setHud] = useState({ score: 0, seconds: 60, packed: 0, mode: null as Mode | null });
  const [muted, setMuted] = useState(false);

  const buzz = useCallback((pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  }, []);

  const tone = useCallback((frequency: number, seconds = .11, volume = .035) => {
    if (muted || typeof window === 'undefined') return;
    const audio = audioRef.current;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    audio.context ??= new AudioCtx();
    const context = audio.context;
    if (context.state === 'suspended') void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(volume, context.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + seconds);
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + seconds);
  }, [muted]);

  const stopMusic = useCallback(() => {
    if (audioRef.current.loop) clearInterval(audioRef.current.loop);
    audioRef.current.loop = null;
  }, []);

  const startMusic = useCallback(() => {
    stopMusic();
    if (muted) return;
    const notes = [261.63, 329.63, 392, 329.63, 293.66, 349.23];
    let step = 0;
    const play = () => { tone(notes[step++ % notes.length], .42, .017); };
    play();
    audioRef.current.loop = setInterval(play, 1300);
  }, [muted, stopMusic, tone]);

  const publishHud = useCallback((game: Runtime) => {
    setHud({ score: game.score, seconds: Math.max(0, Math.ceil(game.seconds)), packed: game.packed.length, mode: game.mode });
  }, []);

  const begin = useCallback((mode: Mode) => {
    const game = makeRuntime(mode);
    gameRef.current = game;
    setScreen('play'); publishHud(game); startMusic();
  }, [publishHud, startMusic]);

  const finish = useCallback((game: Runtime, completed: boolean) => {
    if (game.phase !== 'play') return;
    if (completed && game.mode === 'standard') game.score += Math.max(0, Math.floor(game.seconds)) * 10;
    game.phase = 'end';
    game.message = completed ? 'The capybara is ready for the trip.' : 'The suitcase needs one more cozy sprint.';
    stopMusic(); tone(completed ? 523.25 : 196, .42, .05); publishHud(game); setScreen('end');
  }, [publishHud, stopMusic, tone]);

  const hop = useCallback(() => {
    const game = gameRef.current;
    if (game.phase !== 'play') return;
    const now = performance.now();
    if (game.capy.stumbleUntil > now || game.capy.hopUntil > now) return;
    game.capy.hopUntil = now + 480; tone(660, .09, .028); buzz(8);
  }, [buzz, tone]);

  const toggleMute = useCallback(() => {
    setMuted((wasMuted) => {
      const nextMuted = !wasMuted;
      if (nextMuted) stopMusic(); else if (gameRef.current.phase === 'play') startMusic();
      return nextMuted;
    });
  }, [startMusic, stopMusic]);

  useEffect(() => () => stopMusic(), [stopMusic]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    let frame = 0;
    let lastHudSecond = -1;
    let cssWidth = 0;
    let cssHeight = 0;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const nextWidth = Math.max(1, bounds.width);
      const nextHeight = Math.max(1, bounds.height);
      if (nextWidth === cssWidth && nextHeight === cssHeight) return;
      cssWidth = nextWidth; cssHeight = nextHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(nextWidth * ratio); canvas.height = Math.round(nextHeight * ratio);
    };

    const drawRoundRect = (x: number, y: number, width: number, height: number, radius: number, fill: string, stroke = '#29313D', line = 3) => {
      context.beginPath(); context.roundRect(x, y, width, height, radius); context.fillStyle = fill; context.fill();
      if (stroke) { context.lineWidth = line; context.strokeStyle = stroke; context.stroke(); }
    };
    const text = (value: string, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'left', weight = 800) => {
      context.fillStyle = color; context.textAlign = align; context.textBaseline = 'middle'; context.font = `${weight} ${size}px Nunito, ui-rounded, system-ui, sans-serif`; context.fillText(value, x, y);
    };
    const ellipse = (x: number, y: number, radiusX: number, radiusY: number, fill: string, stroke = '#29313D', line = 3) => {
      context.beginPath(); context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2); context.fillStyle = fill; context.fill();
      if (stroke) { context.lineWidth = line; context.strokeStyle = stroke; context.stroke(); }
    };

    const drawRoom = () => {
      context.fillStyle = '#FFF8EC'; context.fillRect(0, 0, W, H);
      context.fillStyle = '#F4C989'; context.fillRect(0, 355, W, H - 355);
      context.fillStyle = '#E9B970'; context.fillRect(0, 350, W, 10);
      for (let x = -80; x < W; x += 95) { context.strokeStyle = 'rgba(133,81,42,.18)'; context.lineWidth = 2; context.beginPath(); context.moveTo(x, 560); context.lineTo(x + 80, 360); context.stroke(); }
      // Window and evening sky.
      drawRoundRect(58, 52, 212, 155, 20, '#FFCF92', '#29313D', 5);
      context.fillStyle = '#D97989'; context.fillRect(72, 68, 184, 123);
      context.fillStyle = '#FFD67A'; context.beginPath(); context.arc(198, 106, 31, 0, Math.PI * 2); context.fill();
      context.strokeStyle = '#29313D'; context.lineWidth = 5; context.beginPath(); context.moveTo(164, 68); context.lineTo(164, 191); context.moveTo(72, 128); context.lineTo(256, 128); context.stroke();
      // Sofa.
      drawRoundRect(325, 67, 300, 132, 27, '#B7A2DE', '#29313D', 5); drawRoundRect(348, 112, 112, 83, 19, '#D6CAF1', '#29313D', 4); drawRoundRect(470, 112, 132, 83, 19, '#D6CAF1', '#29313D', 4);
      context.fillStyle = '#7F6AA7'; context.fillRect(349, 191, 16, 44); context.fillRect(584, 191, 16, 44);
      // Poster.
      drawRoundRect(680, 49, 110, 123, 12, '#F8F1DC', '#29313D', 4); context.fillStyle = '#6FC5C7'; context.beginPath(); context.moveTo(694, 150); context.lineTo(730, 89); context.lineTo(775, 150); context.fill(); text('MIRA', 735, 71, 10, '#29313D', 'center');
      // Plant.
      drawRoundRect(92, 238, 74, 67, 15, '#D5765D', '#29313D', 4); context.strokeStyle = '#397C65'; context.lineWidth = 12; context.lineCap = 'round'; [[128, 236, 105, 210], [128, 237, 151, 198], [130, 240, 129, 188]].forEach(([x1, y1, x2, y2]) => { context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke(); });
      // Door and luggage corner.
      drawRoundRect(786, 182, 98, 160, 12, '#7186A8', '#29313D', 5); context.fillStyle = '#F9DB88'; context.beginPath(); context.arc(863, 261, 6, 0, Math.PI * 2); context.fill();
      text('HOME', 835, 352, 11, '#697489', 'center');
    };

    const drawSuitcase = (game: Runtime) => {
      const closed = game.packed.length === PACKING_ITEMS.length;
      const wobble = game.capy.carrying.length && distance(game.capy, SUITCASE) < 110 ? Math.sin(performance.now() / 85) * .04 : 0;
      context.save(); context.translate(SUITCASE.x, SUITCASE.y); context.rotate(wobble);
      context.fillStyle = 'rgba(37,49,61,.12)'; context.beginPath(); context.ellipse(0, 52, 73, 12, 0, 0, Math.PI * 2); context.fill();
      drawRoundRect(-63, -35, 126, 85, 18, closed ? '#91B99B' : '#E9A45A', '#29313D', 5);
      context.strokeStyle = '#29313D'; context.lineWidth = 5; context.beginPath(); context.moveTo(-24, -37); context.quadraticCurveTo(-24, -66, 0, -66); context.quadraticCurveTo(24, -66, 24, -37); context.stroke();
      if (!closed) {
        drawRoundRect(-57, -66, 114, 42, 16, '#F8DAAE', '#29313D', 4);
        game.packed.forEach((id, index) => { const item = PACKING_ITEMS.find((entry) => entry.id === id)!; drawRoundRect(-43 + (index % 4) * 23, -57 + Math.floor(index / 4) * 13, 18, 10, 4, '#B9DEB8', '#4F866A', 1); context.fillStyle = item.color; context.fillRect(-40 + (index % 4) * 23, -55 + Math.floor(index / 4) * 13, 9, 6); });
      } else { text('READY!', 0, 9, 13, '#F2FFF1', 'center'); }
      context.restore();
    };

    const drawItem = (item: (typeof PACKING_ITEMS)[number], location: { x: number; y: number }) => {
      context.save(); context.translate(location.x, location.y);
      context.fillStyle = 'rgba(37,49,61,.15)'; context.beginPath(); context.ellipse(0, 18, 20, 6, 0, 0, Math.PI * 2); context.fill();
      drawRoundRect(-21, -20, 42, 35, 10, item.color, '#29313D', 3);
      text(item.glyph, 0, -3, 19, '#FFFFFF', 'center', 900);
      context.restore();
    };

    const drawCapy = (game: Runtime, start = false) => {
      const capy = game.capy; const now = performance.now();
      const hopping = capy.hopUntil > now; const hopHeight = hopping ? Math.sin((1 - (capy.hopUntil - now) / 480) * Math.PI) * 44 : 0;
      const walking = Math.abs(capy.targetX - capy.x) + Math.abs(capy.targetY - capy.y) > 4;
      const stride = walking ? Math.sin(capy.walk * 12) * 7 : 0;
      context.save(); context.translate(capy.x, capy.y - hopHeight);
      context.fillStyle = 'rgba(37,49,61,.17)'; context.beginPath(); context.ellipse(0, 42 + hopHeight, 39, 10, 0, 0, Math.PI * 2); context.fill();
      // Body, ears and snout use thick outlines to retain the comic look at small sizes.
      ellipse(-4, 3, 42, 33, '#B97852', '#29313D', 4);
      ellipse(-20, -31, 11, 12, '#B97852', '#29313D', 4); ellipse(17, -31, 11, 12, '#B97852', '#29313D', 4);
      ellipse(-4, -16, 36, 30, '#C98C62', '#29313D', 4);
      ellipse(20, -7, 17, 12, '#E8B38A', '#29313D', 3);
      context.fillStyle = '#29313D'; context.beginPath(); context.arc(25, -8, 3, 0, Math.PI * 2); context.fill(); context.beginPath(); context.arc(-13, -19, 3.8, 0, Math.PI * 2); context.fill(); context.beginPath(); context.arc(7, -19, 3.8, 0, Math.PI * 2); context.fill();
      context.strokeStyle = '#29313D'; context.lineWidth = 4; context.lineCap = 'round'; context.beginPath(); context.moveTo(-22, 29); context.lineTo(-20 + stride, 42); context.moveTo(13, 29); context.lineTo(15 - stride, 42); context.stroke();
      if (start) { context.strokeStyle = '#29313D'; context.lineWidth = 4; context.beginPath(); context.moveTo(23, 2); context.lineTo(45, -13 + Math.sin(now / 160) * 5); context.stroke(); }
      capy.carrying.forEach((id, index) => { const item = PACKING_ITEMS.find((entry) => entry.id === id)!; context.shadowColor = '#F3A247'; context.shadowBlur = 16; drawItem(item, { x: -18 + index * 18, y: -61 - index * 17 }); context.shadowBlur = 0; });
      context.restore();
    };

    const drawDog = (game: Runtime) => {
      const dog = game.dog; context.save(); context.translate(dog.x, dog.y); ellipse(0, 0, 43, 25, '#E8C48B', '#29313D', 4); ellipse(33, -12, 19, 16, '#E8C48B', '#29313D', 4); context.fillStyle = '#29313D'; context.beginPath(); context.arc(39, -13, 2.6, 0, Math.PI * 2); context.fill(); context.strokeStyle = '#29313D'; context.lineWidth = 4; context.beginPath(); context.moveTo(-16, -18); context.lineTo(-29, -37); context.moveTo(36, -25); context.lineTo(48, -39); context.stroke(); text('z', 40, -49, 14, '#8E799F', 'center'); text('z', 54, -61, 10, '#8E799F', 'center'); context.restore();
    };

    const drawRobot = (game: Runtime) => { const robot = game.robot; context.save(); context.translate(robot.x, robot.y); ellipse(0, 0, 30, 23, '#8AB6D9', '#29313D', 4); context.strokeStyle = '#DFF4FF'; context.lineWidth = 4; context.beginPath(); context.arc(0, 0, 13, 0, Math.PI * 2); context.stroke(); context.fillStyle = '#EE7185'; context.beginPath(); context.arc(12, -5, 3, 0, Math.PI * 2); context.fill(); context.restore(); };

    const drawParticles = (game: Runtime, now: number) => {
      game.particles = game.particles.filter((particle) => now - particle.born < 650);
      game.particles.forEach((particle, index) => { const age = (now - particle.born) / 650; context.globalAlpha = 1 - age; text('✦', particle.x + Math.cos(index * 2.2) * age * 32, particle.y - age * 48, 18, particle.color, 'center'); }); context.globalAlpha = 1;
    };

    const drawStart = () => {
      const game = gameRef.current; drawRoom();
      context.fillStyle = 'rgba(37,49,61,.25)'; context.fillRect(0, 0, W, H);
      drawRoundRect(164, 108, 572, 354, 38, '#FFF9EE', '#29313D', 5);
      context.fillStyle = '#FFF0CE'; context.beginPath(); context.arc(643, 172, 63, 0, Math.PI * 2); context.fill();
      game.capy.x = 269; game.capy.y = 316; drawCapy(game, true);
      text('SUITCASE SPRINT', 470, 187, 37, '#263445', 'center', 900);
      text('A tiny pre-trip packing game', 470, 222, 17, '#687387', 'center', 700);
      text('Click a spot to walk. Tap capybara to hop. Pack three at a time.', 470, 400, 14, '#687387', 'center', 700);
    };

    const drawEnd = () => {
      const game = gameRef.current; drawRoom(); drawSuitcase(game);
      context.fillStyle = 'rgba(37,49,61,.24)'; context.fillRect(0, 0, W, H);
      drawRoundRect(170, 118, 560, 330, 38, '#FFF9EE', '#29313D', 5);
      game.capy.x = 292; game.capy.y = 320; drawCapy(game, true);
      text('SUITCASE SPRINT', 478, 182, 15, '#D57B4F', 'center', 900);
      text(`${game.score} points`, 478, 237, 48, '#263445', 'center', 900);
      text(game.message, 478, 283, 19, '#687387', 'center', 700);
      text(`${game.packed.length} of ${PACKING_ITEMS.length} essentials packed`, 478, 315, 14, '#687387', 'center', 700);
    };

    const drawPlay = (game: Runtime, now: number) => {
      drawRoom(); drawSuitcase(game);
      PACKING_ITEMS.forEach((item) => { const location = game.items[item.id]; if (location.state === 'loose') drawItem(item, location); });
      drawDog(game); drawRobot(game); drawCapy(game); drawParticles(game, now);
      if (game.packed.length === PACKING_ITEMS.length) { text('Carry your closed suitcase to the door!', 450, 335, 16, '#657288', 'center', 800); }
      if (game.capy.carrying.length === 3) { text('Suitcase is calling', SUITCASE.x, SUITCASE.y + 84, 12, '#BF6D3D', 'center', 900); }
    };

    const update = (game: Runtime, now: number) => {
      if (!game.last) game.last = now;
      const dt = Math.min(.04, (now - game.last) / 1000); game.last = now;
      if (game.mode === 'standard') {
        game.seconds -= dt;
        if (game.seconds <= 0) { game.seconds = 0; finish(game, false); return; }
      }
      const capy = game.capy;
      if (capy.stumbleUntil <= now) {
        const dx = capy.targetX - capy.x; const dy = capy.targetY - capy.y; const remaining = Math.hypot(dx, dy); const step = Math.min(155 * dt, remaining);
        if (remaining > 1) { capy.x += dx / remaining * step; capy.y += dy / remaining * step; capy.walk += dt * 7; }
      }
      capy.x = clamp(capy.x, 48, W - 48); capy.y = clamp(capy.y, 250, H - 45);
      game.dog.x += game.dog.direction * dt * 25; if (game.dog.x > 720 || game.dog.x < 190) game.dog.direction *= -1;
      game.robot.y += game.robot.direction * dt * 33; if (game.robot.y > 300 || game.robot.y < 96) game.robot.direction *= -1;
      PACKING_ITEMS.forEach((item) => {
        const location = game.items[item.id];
        if (location.state === 'loose' && capy.carrying.length < 3 && distance(capy, location) < 41) {
          location.state = 'carried'; capy.carrying.push(item.id); tone(554, .1, .038); buzz(10);
        }
      });
      if (capy.hopUntil < now && capy.stumbleUntil < now) {
        const hitDog = distance(capy, game.dog) < 55 && game.dog.hitUntil < now;
        const hitRobot = distance(capy, game.robot) < 49 && game.robot.hitUntil < now;
        if (hitDog || hitRobot) {
          capy.stumbleUntil = now + (hitDog ? 720 : 480); (hitDog ? game.dog : game.robot).hitUntil = now + 1300;
          if (hitDog) { game.seconds = Math.max(0, game.seconds - 3); const loose = capy.carrying.pop(); if (loose) { game.items[loose] = { state: 'loose', x: capy.x + 32, y: capy.y + 18 }; } }
          tone(hitDog ? 150 : 180, .18, .05); buzz(hitDog ? [18, 30, 18] : 15);
        }
      }
      if (game.packed.length === PACKING_ITEMS.length && distance(capy, DOOR) < 59) finish(game, true);
      const roundedSecond = Math.ceil(game.seconds);
      if (roundedSecond !== lastHudSecond) { lastHudSecond = roundedSecond; publishHud(game); }
    };

    const render = (now: number) => {
      resize(); const ratio = canvas.width / Math.max(1, cssWidth); context.setTransform(ratio * cssWidth / W, 0, 0, ratio * cssHeight / H, 0, 0);
      const game = gameRef.current;
      if (game.phase === 'start') drawStart(); else if (game.phase === 'end') drawEnd(); else { update(game, now); drawPlay(game, now); }
      frame = requestAnimationFrame(render);
    };

    const pointFor = (event: any) => { const bounds = canvas.getBoundingClientRect(); return { x: (event.clientX - bounds.left) / bounds.width * W, y: (event.clientY - bounds.top) / bounds.height * H }; };
    const pointerDown = (event: any) => {
      const game = gameRef.current; if (game.phase !== 'play') return;
      const point = pointFor(event); const capy = game.capy;
      if (distance(point, capy) < 54) { hop(); return; }
      if (distance(point, SUITCASE) < SUITCASE.r + 16 && capy.carrying.length) {
        const packedNow = [...capy.carrying]; capy.carrying = [];
        packedNow.forEach((id, index) => { game.items[id].state = 'packed'; game.packed.push(id); game.score += 125; game.particles.push({ x: SUITCASE.x - 30 + index * 31, y: SUITCASE.y - 60, born: performance.now(), color: '#F3A247' }); });
        tone(740, .12, .045); buzz([8, 20, 12]); publishHud(game); return;
      }
      capy.targetX = clamp(point.x, 45, W - 45); capy.targetY = clamp(point.y, 245, H - 40);
    };
    const keyDown = (event: KeyboardEvent) => {
      const game = gameRef.current; if (game.phase !== 'play') return;
      const moves: Record<string, [number, number]> = { ArrowUp: [0, -90], ArrowDown: [0, 90], ArrowLeft: [-90, 0], ArrowRight: [90, 0] };
      if (event.key === ' ' || event.key === 'Spacebar') { event.preventDefault(); hop(); return; }
      const movement = moves[event.key]; if (!movement) return;
      event.preventDefault(); game.capy.targetX = clamp(game.capy.targetX + movement[0], 45, W - 45); game.capy.targetY = clamp(game.capy.targetY + movement[1], 245, H - 40);
    };
    canvas.addEventListener('pointerdown', pointerDown); window.addEventListener('keydown', keyDown); frame = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frame); canvas.removeEventListener('pointerdown', pointerDown); window.removeEventListener('keydown', keyDown); };
  }, [buzz, finish, hop, publishHud, tone]);

  const isStandard = hud.mode === 'standard';
  const ringFill = isStandard ? clamp(hud.seconds / 60 * 100, 0, 100) : 100;
  return <Div style={styles.shell}>
    <Div style={styles.gameTopline}><Div><Div style={styles.eyebrow}>TRAVINO MINI GAME</Div><Div style={styles.gameTitle}>Suitcase Sprint</Div></Div><Button type="button" onClick={toggleMute} aria-label={muted ? 'Turn sound on' : 'Mute sound'} style={styles.mute}>{muted ? 'Sound off' : 'Sound on'}</Button></Div>
    <Div style={styles.canvasWrap}>
      <Canvas ref={canvasRef} style={styles.canvas} aria-label="Suitcase Sprint game. Click or tap to move the capybara." />
      {screen === 'start' && <Div style={styles.overlay}><Div style={styles.startButtons}><Button type="button" onClick={() => begin('standard')} style={{ ...styles.choice, ...styles.standard }}>Standard <span style={styles.choiceMeta}>60 sec</span></Button><Button type="button" onClick={() => begin('chill')} style={{ ...styles.choice, ...styles.chill }}>Chill <span style={styles.choiceMeta}>No timer</span></Button></Div></Div>}
      {screen === 'play' && <Div style={styles.hud}><Div style={styles.scorePill}><span style={styles.hudLabel}>SCORE</span><strong>{hud.score}</strong><span style={styles.packed}>{hud.packed}/8 packed</span></Div><Div style={styles.timerPill}><Div style={{ ...styles.ring, background: `conic-gradient(#F19A50 ${ringFill}%, #F8E7D1 0)` }}><Div style={styles.ringCenter}>{isStandard ? `${hud.seconds}s` : '∞'}</Div></Div><span style={styles.hudLabel}>{isStandard ? 'HURRY GENTLY' : 'CHILL MODE'}</span></Div></Div>}
      {screen === 'end' && <Div style={styles.overlay}><Div style={styles.endButtons}><Button type="button" onClick={() => begin(hud.mode ?? 'standard')} style={{ ...styles.choice, ...styles.standard }}>Play again</Button><Button type="button" onClick={onJoinWaitlist} style={{ ...styles.choice, ...styles.chill }}>Join the waitlist</Button></Div></Div>}
    </Div>
    <Div style={styles.instructions}><span>Click to walk</span><span>Tap capybara or press space to hop</span><span>Arrow keys also work</span></Div>
  </Div>;
}

const styles: Record<string, any> = {
  shell: { width: '100%', maxWidth: 1120, margin: '0 auto', borderRadius: 30, padding: 18, background: '#FFFDF8', border: '1px solid #E5D7C5', boxShadow: '0 20px 50px rgba(86, 57, 28, .10)' },
  gameTopline: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '2px 4px 14px' },
  eyebrow: { color: '#D57B4F', fontWeight: 900, letterSpacing: '1.15px', fontSize: 10 }, gameTitle: { color: '#263445', fontFamily: 'Nunito_800ExtraBold, Nunito, sans-serif', fontWeight: 900, fontSize: 25, lineHeight: 1.1, marginTop: 3 },
  mute: { border: '1px solid #E1D4C6', borderRadius: 999, background: '#FFF8EC', color: '#657288', fontWeight: 800, fontSize: 12, padding: '9px 13px', cursor: 'pointer' },
  canvasWrap: { position: 'relative', width: '100%', aspectRatio: '1.607 / 1', minHeight: 225, overflow: 'hidden', borderRadius: 23, background: '#FFF8EC', border: '3px solid #29313D', touchAction: 'none', userSelect: 'none' },
  canvas: { display: 'block', width: '100%', height: '100%', cursor: 'crosshair', outline: 'none' }, overlay: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 18px 24px', pointerEvents: 'none' },
  startButtons: { display: 'flex', gap: 10, width: 'min(100%, 420px)', pointerEvents: 'auto' }, endButtons: { display: 'flex', gap: 10, width: 'min(100%, 420px)', pointerEvents: 'auto' },
  choice: { flex: 1, minHeight: 52, borderRadius: 16, border: '3px solid #29313D', padding: '9px 12px', cursor: 'pointer', fontFamily: 'Nunito_800ExtraBold, Nunito, sans-serif', fontWeight: 900, fontSize: 15, boxShadow: '0 5px 0 #29313D', transition: 'transform 120ms ease, box-shadow 120ms ease' },
  standard: { background: '#F29A51', color: '#FFFDF8' }, chill: { background: '#B6D9B8', color: '#263445' }, choiceMeta: { display: 'block', fontFamily: 'system-ui, sans-serif', fontWeight: 700, fontSize: 10, opacity: .86, marginTop: 2 },
  hud: { position: 'absolute', top: 13, left: 13, right: 13, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', pointerEvents: 'none' }, scorePill: { display: 'flex', alignItems: 'baseline', gap: 8, border: '2px solid #29313D', borderRadius: 15, padding: '7px 10px', background: 'rgba(255,253,248,.94)', color: '#263445', boxShadow: '0 3px 0 rgba(41,49,61,.20)' }, hudLabel: { color: '#7B7780', fontWeight: 900, letterSpacing: '.8px', fontSize: 9 }, packed: { color: '#6A8B6A', fontWeight: 900, fontSize: 11 }, timerPill: { display: 'flex', alignItems: 'center', gap: 7, border: '2px solid #29313D', borderRadius: 18, padding: '4px 7px 4px 4px', background: 'rgba(255,253,248,.94)', boxShadow: '0 3px 0 rgba(41,49,61,.20)' }, ring: { width: 35, height: 35, padding: 4, borderRadius: '50%' }, ringCenter: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', borderRadius: '50%', background: '#FFFDF8', color: '#263445', fontWeight: 900, fontSize: 10 },
  instructions: { display: 'flex', flexWrap: 'wrap', gap: '6px 18px', justifyContent: 'center', color: '#778195', fontSize: 11, fontWeight: 700, padding: '13px 4px 2px' },
};
