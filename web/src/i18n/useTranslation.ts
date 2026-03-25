import { useState, useCallback } from 'react';
import { translations, Lang } from './translations';

export function useTranslation() {
  const [lang, setLangState] = useState<Lang>(() =>
    (localStorage.getItem('ek26_lang') as Lang) || 'ru'
  );

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('ek26_lang', newLang);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    let text = translations[lang][key] || translations['ru'][key] || key;
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
