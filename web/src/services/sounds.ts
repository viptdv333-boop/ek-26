// Sound service — standard tones via Web Audio API + custom uploaded sounds

type SoundId = string;

const audioCtx = () => new (window.AudioContext || (window as any).webkitAudioContext)();

// Standard message sounds
function playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  const ctx = audioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

const MESSAGE_SOUNDS: Record<string, () => void> = {
  default: () => {
    playTone(880, 0.15, 'sine', 0.25);
    setTimeout(() => playTone(1100, 0.12, 'sine', 0.2), 120);
  },
  chime: () => {
    playTone(1200, 0.2, 'sine', 0.2);
    setTimeout(() => playTone(1500, 0.15, 'sine', 0.15), 150);
    setTimeout(() => playTone(1800, 0.1, 'sine', 0.1), 280);
  },
  pop: () => {
    const ctx = audioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  },
  ding: () => {
    playTone(1400, 0.4, 'sine', 0.25);
  },
  bubble: () => {
    const ctx = audioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.05);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  },
  none: () => {},
};

// Standard call ringtones (repeating patterns)
const CALL_SOUNDS: Record<string, (stop: { current: boolean }) => void> = {
  default: (stop) => {
    const ring = () => {
      if (stop.current) return;
      playTone(440, 0.15, 'sine', 0.3);
      setTimeout(() => { if (!stop.current) playTone(550, 0.15, 'sine', 0.3); }, 180);
      setTimeout(() => { if (!stop.current) playTone(440, 0.15, 'sine', 0.3); }, 360);
      setTimeout(() => { if (!stop.current) ring(); }, 2000);
    };
    ring();
  },
  classic: (stop) => {
    const ring = () => {
      if (stop.current) return;
      playTone(700, 0.08, 'square', 0.15);
      setTimeout(() => { if (!stop.current) playTone(700, 0.08, 'square', 0.15); }, 120);
      setTimeout(() => { if (!stop.current) playTone(700, 0.08, 'square', 0.15); }, 240);
      setTimeout(() => { if (!stop.current) ring(); }, 1500);
    };
    ring();
  },
  digital: (stop) => {
    const ring = () => {
      if (stop.current) return;
      playTone(1000, 0.1, 'sine', 0.2);
      setTimeout(() => { if (!stop.current) playTone(1200, 0.1, 'sine', 0.2); }, 150);
      setTimeout(() => { if (!stop.current) playTone(1000, 0.1, 'sine', 0.2); }, 300);
      setTimeout(() => { if (!stop.current) playTone(1200, 0.1, 'sine', 0.2); }, 450);
      setTimeout(() => { if (!stop.current) ring(); }, 2000);
    };
    ring();
  },
  soft: (stop) => {
    const ring = () => {
      if (stop.current) return;
      playTone(523, 0.3, 'sine', 0.15);
      setTimeout(() => { if (!stop.current) playTone(659, 0.3, 'sine', 0.15); }, 350);
      setTimeout(() => { if (!stop.current) playTone(784, 0.4, 'sine', 0.12); }, 700);
      setTimeout(() => { if (!stop.current) ring(); }, 2500);
    };
    ring();
  },
  urgent: (stop) => {
    const ring = () => {
      if (stop.current) return;
      playTone(800, 0.06, 'sawtooth', 0.15);
      setTimeout(() => { if (!stop.current) playTone(1000, 0.06, 'sawtooth', 0.15); }, 80);
      setTimeout(() => { if (!stop.current) playTone(800, 0.06, 'sawtooth', 0.15); }, 160);
      setTimeout(() => { if (!stop.current) playTone(1000, 0.06, 'sawtooth', 0.15); }, 240);
      setTimeout(() => { if (!stop.current) ring(); }, 800);
    };
    ring();
  },
  none: () => {},
};

// Play custom uploaded sound from localStorage
function playCustom(key: 'msg' | 'call'): HTMLAudioElement | null {
  const b64 = localStorage.getItem(`ek26_custom_${key}_sound`);
  if (!b64) return null;
  const audio = new Audio(b64);
  audio.volume = 0.5;
  audio.play().catch(() => {});
  return audio;
}

// Public API
export function playMessageSound() {
  const id = localStorage.getItem('ek26_msg_sound') || 'default';
  if (id === 'none') return;
  if (id === 'custom') { playCustom('msg'); return; }
  MESSAGE_SOUNDS[id]?.();
}

export function previewMessageSound(id: SoundId) {
  if (id === 'none') return;
  if (id === 'custom') { playCustom('msg'); return; }
  MESSAGE_SOUNDS[id]?.();
}

let callStopRef: { current: boolean } | null = null;
let callAudio: HTMLAudioElement | null = null;

export function playCallSound(): () => void {
  const id = localStorage.getItem('ek26_call_sound') || 'default';
  if (id === 'none') return () => {};

  if (id === 'custom') {
    callAudio = playCustom('call');
    if (callAudio) callAudio.loop = true;
    return () => { callAudio?.pause(); callAudio = null; };
  }

  callStopRef = { current: false };
  CALL_SOUNDS[id]?.(callStopRef);
  const ref = callStopRef;
  return () => { ref.current = true; };
}

export function previewCallSound(id: SoundId): () => void {
  if (id === 'none') return () => {};
  if (id === 'custom') {
    const a = playCustom('call');
    return () => { a?.pause(); };
  }
  const stop = { current: false };
  CALL_SOUNDS[id]?.(stop);
  // Auto-stop preview after 3s
  setTimeout(() => { stop.current = true; }, 3000);
  return () => { stop.current = true; };
}

export function uploadCustomSound(key: 'msg' | 'call'): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { reject('No file'); return; }
      if (file.size > 1024 * 1024) { reject('Файл слишком большой (макс 1 МБ)'); return; }
      const reader = new FileReader();
      reader.onload = () => {
        const b64 = reader.result as string;
        localStorage.setItem(`ek26_custom_${key}_sound`, b64);
        resolve(file.name);
      };
      reader.onerror = () => reject('Ошибка чтения файла');
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

export function hasCustomSound(key: 'msg' | 'call'): boolean {
  return !!localStorage.getItem(`ek26_custom_${key}_sound`);
}

export function removeCustomSound(key: 'msg' | 'call') {
  localStorage.removeItem(`ek26_custom_${key}_sound`);
}
