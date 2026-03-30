import { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { useAuthStore } from '../stores/authStore';

const QUOTES = [
  { t: 'Единственный способ делать великую работу — любить то, что делаешь.', a: 'Стив Джобс' },
  { t: 'Будь собой, остальные роли уже заняты.', a: 'Оскар Уайльд' },
  { t: 'Будущее принадлежит тем, кто верит в красоту своей мечты.', a: 'Э. Рузвельт' },
  { t: 'Простота — это высшая утончённость.', a: 'Леонардо да Винчи' },
  { t: 'В середине каждой трудности кроется возможность.', a: 'А. Эйнштейн' },
  { t: 'Дорога в тысячу ли начинается с первого шага.', a: 'Лао-цзы' },
  { t: 'Делай то, что можешь, с тем, что имеешь, там, где находишься.', a: 'Т. Рузвельт' },
  { t: 'Воображение важнее знания.', a: 'А. Эйнштейн' },
];

function WeatherMini() {
  const [w, setW] = useState<{ temp: string; icon: string; city: string; country: string; desc: string } | null>(null);
  useEffect(() => {
    fetch('https://wttr.in/?format=j1').then(r => r.json()).then(data => {
      const c = data.current_condition?.[0];
      const area = data.nearest_area?.[0];
      const city = area?.areaName?.[0]?.value || '';
      const country = area?.country?.[0]?.value || '';
      if (c) {
        const code = parseInt(c.weatherCode);
        let icon = '☀️';
        if (code >= 200 && code < 300) icon = '⛈️';
        else if (code >= 300 && code < 600) icon = '🌧️';
        else if (code >= 600 && code < 700) icon = '❄️';
        else if (code >= 700 && code < 800) icon = '🌫️';
        else if (code === 116) icon = '⛅';
        else if (code === 119 || code === 122) icon = '☁️';
        else if (code >= 176) icon = '🌧️';
        setW({ temp: c.temp_C + '°C', icon, city, country, desc: c.lang_ru?.[0]?.value || c.weatherDesc?.[0]?.value || '' });
      }
    }).catch(() => {});
  }, []);
  if (!w) return null;
  return (
    <div className="flex items-center gap-3 px-5 py-3 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--color-dark-700) 85%, transparent)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
      <span className="text-3xl">{w.icon}</span>
      <div>
        <p className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>{w.temp} <span className="font-normal text-sm" style={{ color: 'var(--color-text-secondary)' }}>{w.city}, {w.country}</span></p>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{w.desc}</p>
      </div>
    </div>
  );
}

export function EmptyState() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  const hour = new Date().getHours();
  const greeting = hour < 6 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'color-mix(in srgb, var(--color-dark-700) 85%, transparent)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  };

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6 space-y-6">
        {/* Greeting */}
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {greeting}{user?.displayName ? `, ${user.displayName}` : ''}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {t('empty.selectChat')}
          </p>
        </div>

        {/* Weather */}
        <WeatherMini />

        {/* Quote */}
        <div className="px-5 py-4 rounded-xl" style={cardStyle}>
          <p className="text-sm italic leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            «{quote.t}»
          </p>
          {quote.a && (
            <p className="text-xs mt-2 text-right" style={{ color: 'var(--color-text-muted)' }}>
              — {quote.a}
            </p>
          )}
        </div>

        {/* Feature cards — NOT clickable */}
        <div className="grid grid-cols-2 gap-3 text-left">
          <div className="px-4 py-3 rounded-xl" style={cardStyle}>
            <span className="text-lg">🔒</span>
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--color-text-primary)' }}>E2E шифрование</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Все сообщения защищены</p>
          </div>
          <div className="px-4 py-3 rounded-xl" style={cardStyle}>
            <span className="text-lg">📞</span>
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--color-text-primary)' }}>Звонки</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Голосовые и видео</p>
          </div>
          <div className="px-4 py-3 rounded-xl" style={cardStyle}>
            <span className="text-lg">📎</span>
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--color-text-primary)' }}>Файлы</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Фото, видео, документы</p>
          </div>
          <div className="px-4 py-3 rounded-xl" style={cardStyle}>
            <span className="text-lg">🌍</span>
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--color-text-primary)' }}>Переводчик</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Автоперевод сообщений</p>
          </div>
        </div>
      </div>
    </div>
  );
}
