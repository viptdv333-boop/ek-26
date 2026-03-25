import { FastifyInstance } from 'fastify';

export default async function translateRoutes(app: FastifyInstance) {
  app.post('/api/translate', { preHandler: [app.authenticate] }, async (request) => {
    const { text, from, to } = request.body as { text: string; from?: string; to: string };

    try {
      const { translate } = await import('@vitalets/google-translate-api');
      const result = await translate(text, { from: from || 'auto', to });
      return { translated: result.text, detectedLang: result.raw?.src };
    } catch (err: any) {
      return { translated: text, error: err.message };
    }
  });
}
