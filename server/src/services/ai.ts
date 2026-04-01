import { getAiSettings } from '../models/Settings';

// Rate limiting: in-memory counter per user per day
const dailyUsage = new Map<string, { count: number; date: string }>();

function getDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function checkRateLimit(userId: string, limit: number): boolean {
  const day = getDayKey();
  const usage = dailyUsage.get(userId);
  if (!usage || usage.date !== day) {
    dailyUsage.set(userId, { count: 1, date: day });
    return true;
  }
  if (usage.count >= limit) return false;
  usage.count++;
  return true;
}

export function getRemainingQuota(userId: string, limit: number): number {
  const day = getDayKey();
  const usage = dailyUsage.get(userId);
  if (!usage || usage.date !== day) return limit;
  return Math.max(0, limit - usage.count);
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function getAiResponse(
  history: ChatMessage[],
  userQuery: string,
): Promise<string> {
  const settings = await getAiSettings();

  if (settings.provider === 'disabled') {
    return 'AI-помощник отключён администратором.';
  }

  if (settings.provider === 'gemini') {
    return callGemini(settings.geminiApiKey, settings.geminiModel, settings.systemPrompt, settings.searchEnabled, history, userQuery);
  }

  if (settings.provider === 'openai') {
    return callOpenAI(settings.openaiApiKey, settings.openaiModel, settings.systemPrompt, history, userQuery);
  }

  return 'AI-провайдер не настроен.';
}

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  searchEnabled: boolean,
  history: ChatMessage[],
  userQuery: string,
): Promise<string> {
  if (!apiKey) return 'Gemini API ключ не настроен. Обратитесь к администратору.';

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Build contents array with history
  const contents: any[] = [];
  for (const msg of history) {
    contents.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    });
  }
  contents.push({ role: 'user', parts: [{ text: userQuery }] });

  const body: any = {
    contents,
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.7,
    },
  };

  // Google Search grounding
  if (searchEnabled) {
    body.tools = [{ googleSearch: {} }];
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[AI] Gemini error:', res.status, err);
      return `Ошибка AI: ${res.status}`;
    }

    const data = await res.json() as any;
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('[AI] No text in response:', JSON.stringify(data).slice(0, 500));
      return 'AI не смог сформировать ответ.';
    }
    return text;
  } catch (err) {
    console.error('[AI] Gemini fetch error:', err);
    return 'Ошибка соединения с AI.';
  }
}

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: ChatMessage[],
  userQuery: string,
): Promise<string> {
  if (!apiKey) return 'OpenAI API ключ не настроен. Обратитесь к администратору.';

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
    { role: 'user', content: userQuery },
  ];

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, max_tokens: 1024, temperature: 0.7 }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[AI] OpenAI error:', res.status, err);
      return `Ошибка AI: ${res.status}`;
    }

    const data = await res.json() as any;
    return data?.choices?.[0]?.message?.content || 'AI не смог ответить.';
  } catch (err) {
    console.error('[AI] OpenAI fetch error:', err);
    return 'Ошибка соединения с AI.';
  }
}
