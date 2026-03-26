import { FastifyInstance } from 'fastify';

export default async function translateRoutes(app: FastifyInstance) {
  app.post('/api/translate', { preHandler: [app.authenticate] }, async (request) => {
    const { text, to } = request.body as { text: string; from?: string; to: string };

    // Try MyMemory API (free, no key needed, 5000 chars/day)
    try {
      const langMap: Record<string, string> = { ru: 'ru', en: 'en', zh: 'zh-CN' };
      const targetLang = langMap[to] || to;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=autodetect|${targetLang}`;
      const res = await fetch(url);
      const data = await res.json() as any;
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        const translated = data.responseData.translatedText;
        // MyMemory returns uppercase original if it can't translate — detect this
        if (translated.toUpperCase() !== text.toUpperCase()) {
          return { translated, detectedLang: data.responseData?.detectedLanguage };
        }
      }
    } catch {}

    // Fallback: Google translate via @vitalets
    try {
      const { translate } = await import('@vitalets/google-translate-api');
      const result = await translate(text, { from: 'auto', to });
      return { translated: result.text, detectedLang: result.raw?.src };
    } catch {}

    return { translated: text, error: 'Translation failed' };
  });
}
