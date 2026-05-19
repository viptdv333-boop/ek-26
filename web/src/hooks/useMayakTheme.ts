import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';

export type MayakThemeKey = 'lavender' | 'cosmos' | 'warm';

export interface MayakTheme {
  key: MayakThemeKey;
  name: string;
  dark: boolean;
  bg: string;
  bgFlat: string;
  surface: string;
  surfHov: string;
  primary: string;
  glow: string;
  text: string;
  sec: string;
  online: string;
  sentBg: string;
  sentFg: string;
  recvBg: string;
  recvFg: string;
  inputBg: string;
  divider: string;
  navBg: string;
  ring: string;
  stars: boolean;
}

const themes: Record<MayakThemeKey, MayakTheme> = {
  lavender: {
    key: 'lavender', name: 'Лаванда', dark: false,
    bg: 'linear-gradient(180deg,#EDE8FF 0%,#F5F3FF 40%,#FFF 100%)',
    bgFlat: '#F3F0FF', surface: '#fff', surfHov: '#F8F7FF',
    primary: '#6366f1', glow: 'rgba(99,102,241,.22)',
    text: '#1a1a2e', sec: '#908E9B', online: '#22c55e',
    sentBg: '#6366f1', sentFg: '#fff',
    recvBg: '#F0EDE8', recvFg: '#1a1a2e',
    inputBg: '#EFECF5', divider: 'rgba(0,0,0,.05)',
    navBg: 'rgba(255,255,255,.88)', ring: 'rgba(99,102,241,.09)',
    stars: false,
  },
  cosmos: {
    key: 'cosmos', name: 'Космос', dark: true,
    bg: 'linear-gradient(180deg,#110D30 0%,#1A1545 50%,#0E0B22 100%)',
    bgFlat: '#110D30', surface: 'rgba(255,255,255,.07)', surfHov: 'rgba(255,255,255,.11)',
    primary: '#A5B4FC', glow: 'rgba(165,180,252,.30)',
    text: '#EEEDF5', sec: '#7A7890', online: '#34D399',
    sentBg: '#6366f1', sentFg: '#fff',
    recvBg: 'rgba(255,255,255,.08)', recvFg: '#EEEDF5',
    inputBg: 'rgba(255,255,255,.07)', divider: 'rgba(255,255,255,.06)',
    navBg: 'rgba(14,11,34,.92)', ring: 'rgba(165,180,252,.07)',
    stars: true,
  },
  warm: {
    key: 'warm', name: 'Закат', dark: false,
    bg: 'linear-gradient(180deg,#FFF0E6 0%,#FFF7F0 40%,#FFFCFA 100%)',
    bgFlat: '#FFF5EE', surface: '#fff', surfHov: '#FFF8F4',
    primary: '#D97757', glow: 'rgba(217,119,87,.22)',
    text: '#2E1A0E', sec: '#9B8E85', online: '#22c55e',
    sentBg: '#D97757', sentFg: '#fff',
    recvBg: '#F5ECE6', recvFg: '#2E1A0E',
    inputBg: '#F0E8E2', divider: 'rgba(0,0,0,.05)',
    navBg: 'rgba(255,252,250,.88)', ring: 'rgba(217,119,87,.09)',
    stars: false,
  },
};

export { themes as mayakThemes };

const STORAGE_KEY = 'ek26_mayak_theme';

function getStoredTheme(): MayakThemeKey {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (stored === 'lavender' || stored === 'cosmos' || stored === 'warm')) {
      return stored;
    }
    const oldTheme = localStorage.getItem('ek26_theme');
    if (oldTheme === 'dark') return 'cosmos';
    return 'lavender';
  } catch {
    return 'lavender';
  }
}

function applyThemeClass(key: MayakThemeKey) {
  const el = document.documentElement;
  el.classList.remove('theme-lavender', 'theme-cosmos', 'theme-warm', 'dark', 'light');
  el.classList.add(`theme-${key}`);
  if (key === 'cosmos') {
    el.classList.add('dark');
  } else {
    el.classList.add('light');
  }
}

interface MayakThemeContextValue {
  themeKey: MayakThemeKey;
  th: MayakTheme;
  setTheme: (key: MayakThemeKey) => void;
}

export const MayakThemeContext = createContext<MayakThemeContextValue>({
  themeKey: 'lavender',
  th: themes.lavender,
  setTheme: () => {},
});

export function useMayakTheme() {
  return useContext(MayakThemeContext);
}

export function useMayakThemeProvider() {
  const [themeKey, setThemeKey] = useState<MayakThemeKey>(getStoredTheme);

  useEffect(() => {
    applyThemeClass(themeKey);
  }, [themeKey]);

  const setTheme = useCallback((key: MayakThemeKey) => {
    setThemeKey(key);
    localStorage.setItem(STORAGE_KEY, key);
    localStorage.setItem('ek26_theme', key === 'cosmos' ? 'dark' : 'light');
  }, []);

  const value = useMemo<MayakThemeContextValue>(() => ({
    themeKey,
    th: themes[themeKey],
    setTheme,
  }), [themeKey, setTheme]);

  return value;
}
