import { useState, useEffect } from 'react';
import { useMayakTheme } from '../../hooks/useMayakTheme';

function WeatherWidget() {
  const { th } = useMayakTheme();
  const [weather, setWeather] = useState<{ temp: string; icon: string; desc: string; city: string } | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch('https://wttr.in/?format=j1');
        const data = await res.json();
        const current = data.current_condition?.[0];
        const city = data.nearest_area?.[0]?.areaName?.[0]?.value || '';
        if (current) {
          const temp = current.temp_C;
          const code = parseInt(current.weatherCode);
          const desc = current.lang_ru?.[0]?.value || current.weatherDesc?.[0]?.value || '';
          let icon = '☀️';
          if (code >= 200 && code < 300) icon = '⛈️';
          else if (code >= 300 && code < 600) icon = '🌧️';
          else if (code >= 600 && code < 700) icon = '❄️';
          else if (code >= 700 && code < 800) icon = '🌫️';
          else if (code === 113) icon = '☀️';
          else if (code === 116) icon = '⛅';
          else if (code === 119 || code === 122) icon = '☁️';
          else if (code >= 176) icon = '🌧️';
          setWeather({ temp: `${temp}°`, icon, desc, city });
        }
      } catch {}
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!weather) return <span style={{ fontSize: 14, color: th.sec }}>...</span>;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} title={`${weather.city}: ${weather.desc}`}>
      <span style={{ fontSize: 24 }}>{weather.icon}</span>
      <span style={{ fontSize: 18, fontWeight: 800, color: th.text }}>{weather.temp}</span>
      <span style={{ fontSize: 14, color: th.sec, fontWeight: 600 }}>{weather.city}</span>
      <span style={{ fontSize: 13, color: th.sec }}>{weather.desc}</span>
    </div>
  );
}

const QUOTES = [
  { t: 'Единственный способ делать великую работу — любить то, что делаешь.', a: 'С. Джобс' },
  { t: 'Будь собой, остальные роли уже заняты.', a: 'О. Уайльд' },
  { t: 'Успех — это идти от неудачи к неудаче не теряя энтузиазма.', a: 'У. Черчилль' },
  { t: 'Не бойся идти медленно, бойся стоять на месте.', a: '' },
  { t: 'Простота — это высшая утончённость.', a: 'Л. да Винчи' },
  { t: 'Действие — основной ключ к успеху.', a: 'П. Пикассо' },
  { t: 'Воображение важнее знания.', a: 'А. Эйнштейн' },
  { t: 'Познай самого себя.', a: 'Сократ' },
  { t: 'Дорога в тысячу ли начинается с первого шага.', a: 'Лао-цзы' },
  { t: 'Думай иначе.', a: 'С. Джобс' },
];

function QuoteWidget() {
  const { th } = useMayakTheme();
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const fullText = quote.a ? `${quote.t} — ${quote.a}` : quote.t;

  return (
    <div style={{ fontSize: 12, color: th.sec, fontStyle: 'italic', textAlign: 'center', padding: '0 8px' }} title={fullText}>
      <span style={{ color: th.primary, marginRight: 4 }}>💬</span>
      {fullText.length > 60 ? fullText.slice(0, 57) + '…' : fullText}
    </div>
  );
}

function RemindersWidget() {
  const { th } = useMayakTheme();
  const [reminders, setReminders] = useState<{ text: string; time: string }[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('ek26_reminders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const now = Date.now() - 3600000;
        setReminders(parsed.filter((r: any) => new Date(r.time).getTime() > now));
      } catch {}
    }
  }, []);

  const next = reminders.find(r => new Date(r.time) > new Date());
  if (!next) return <span style={{ fontSize: 12, color: th.sec }}>🔔 Нет напоминаний</span>;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: th.sec }}>
      <span>🔔</span>
      <span style={{ color: th.text, fontWeight: 600 }}>
        {new Date(next.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
      <span>{next.text}</span>
    </div>
  );
}

export function HeaderWidget() {
  const [widget, setWidget] = useState(() => localStorage.getItem('ek26_header_widget') || 'weather');

  useEffect(() => {
    const handler = () => setWidget(localStorage.getItem('ek26_header_widget') || 'weather');
    window.addEventListener('widget-changed', handler);
    return () => window.removeEventListener('widget-changed', handler);
  }, []);

  switch (widget) {
    case 'weather': return <WeatherWidget />;
    case 'quote': return <QuoteWidget />;
    case 'reminders': return <RemindersWidget />;
    case 'none': return null;
    default: return <WeatherWidget />;
  }
}
