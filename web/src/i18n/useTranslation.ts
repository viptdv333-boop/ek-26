import { useSyncExternalStore, useCallback } from 'react';
import { translations, Lang } from './translations';

// Global language state with subscribers
let currentLang: Lang = (localStorage.getItem('ek26_lang') as Lang) || 'ru';
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Lang {
  return currentLang;
}

function setGlobalLang(newLang: Lang) {
  currentLang = newLang;
  localStorage.setItem('ek26_lang', newLang);
  listeners.forEach(l => l());
}

export function useTranslation() {
  const lang = useSyncExternalStore(subscribe, getSnapshot);

  const setLang = useCallback((newLang: Lang) => {
    setGlobalLang(newLang);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    let text = translations[lang]?.[key] || translations['ru'][key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }, [lang]);

  const locale = lang === 'zh' ? 'zh-CN' : lang === 'en' ? 'en-US' : 'ru-RU';

  return { t, lang, setLang, locale };
}
