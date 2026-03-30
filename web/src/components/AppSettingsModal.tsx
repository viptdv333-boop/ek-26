import { useState, useRef, useEffect } from 'react';
import { uploadFile } from '../services/api/upload';
import { usersApi, contactsApi } from '../services/api/endpoints';
import { useTranslation } from '../i18n';
import { previewMessageSound, previewCallSound, uploadCustomSound, hasCustomSound, removeCustomSound } from '../services/sounds';

interface Props {
  onClose: () => void;
}

const WALLPAPER_PRESETS = [
  { id: 'default', labelKey: 'wallpaper.default', color: '#1a1a2e' },
  { id: 'dark-blue', labelKey: 'wallpaper.darkBlue', color: '#0f1b2d' },
  { id: 'dark-green', labelKey: 'wallpaper.darkGreen', color: '#0d1f17' },
  { id: 'light-beige', labelKey: 'wallpaper.lightBeige', color: '#f5f0e8' },
  { id: 'light-blue', labelKey: 'wallpaper.lightBlue', color: '#e8f0f8' },
  { id: 'light-mint', labelKey: 'wallpaper.lightMint', color: '#e8f5f0' },
  { id: 'gradient-sunset', labelKey: 'wallpaper.sunset', gradient: 'linear-gradient(135deg, #1a0f2e, #2d1b0f)' },
];

type Section = 'language' | 'appearance' | 'notifications' | 'contacts' | 'devices' | 'widget' | 'faq' | 'about';

// Simple vCard parser
function parseVCard(text: string): { name: string; phones: string[] }[] {
  const contacts: { name: string; phones: string[] }[] = [];
  const cards = text.split(/BEGIN:VCARD/i).filter(Boolean);
  for (const card of cards) {
    let name = '';
    const phones: string[] = [];
    for (const line of card.split(/\r?\n/)) {
      if (/^FN[;:]/.test(line)) {
        name = line.replace(/^FN[;:][^:]*:/i, '').replace(/^FN:/i, '').trim();
      }
      if (/^TEL[;:]/.test(line)) {
        let ph = line.replace(/^TEL[^:]*:/i, '').replace(/[^\d+]/g, '');
        if (ph.startsWith('8') && ph.length === 11) ph = '+7' + ph.slice(1);
        if (!ph.startsWith('+')) ph = '+' + ph;
        if (ph.length >= 10) phones.push(ph);
      }
    }
    if (phones.length > 0) contacts.push({ name: name || phones[0], phones });
  }
  return contacts;
}

const LANGUAGES = [
  { code: 'ru' as const, label: 'Русский', flag: 'https://flagcdn.com/w40/ru.png' },
  { code: 'en' as const, label: 'English', flag: 'https://flagcdn.com/w40/gb.png' },
  { code: 'zh' as const, label: '中文', flag: 'https://flagcdn.com/w40/cn.png' },
];

export function AppSettingsModal({ onClose }: Props) {
  const { t, lang, setLang } = useTranslation();
  const [activeSection, setActiveSection] = useState<Section>('language');
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  // Auto-translate
  const [autoTranslate, setAutoTranslate] = useState(() => localStorage.getItem('ek26_auto_translate') === 'true');

  // Theme
  const [theme, setTheme] = useState(() => localStorage.getItem('ek26_theme') || 'dark');
  // Font size
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('ek26_font_size') || '3'));
  // Bubble style
  const [bubbleShape, setBubbleShape] = useState(() => localStorage.getItem('ek26_bubble_shape') || 'rounded');
  const [bubbleColor, setBubbleColor] = useState(() => localStorage.getItem('ek26_bubble_color') || '#6366f1');
  const [bubbleColorOther, setBubbleColorOther] = useState(() => localStorage.getItem('ek26_bubble_color_other') || '#22222f');
  // Font color
  const [fontColor, setFontColor] = useState(() => localStorage.getItem('ek26_font_color') || '#ffffff');
  const [fontColorOther, setFontColorOther] = useState(() => localStorage.getItem('ek26_font_color_other') || '#18181b');
  // Wallpaper
  const [wallpaper, setWallpaper] = useState(() => localStorage.getItem('ek26_wallpaper') || 'default');
  const [wallpaperUploading, setWallpaperUploading] = useState(false);
  // Widget
  const [headerWidget, setHeaderWidget] = useState(() => localStorage.getItem('ek26_header_widget') || 'weather');

  // Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => localStorage.getItem('ek26_notifications') !== 'false');
  const [messageSound, setMessageSound] = useState(() => localStorage.getItem('ek26_msg_sound') || 'default');
  const [callSound, setCallSound] = useState(() => localStorage.getItem('ek26_call_sound') || 'default');
  const [vibrationEnabled, setVibrationEnabled] = useState(() => localStorage.getItem('ek26_vibration') !== 'false');

  // Contacts import
  const vcfInputRef = useRef<HTMLInputElement>(null);
  const [vcfImporting, setVcfImporting] = useState(false);
  const [vcfResults, setVcfResults] = useState<{ registered: number; unregistered: number } | null>(null);
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [googleResults, setGoogleResults] = useState<{ registered: number; unregistered: number } | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [deletingContacts, setDeletingContacts] = useState(false);

  // --- Handlers (identical to SettingsModal) ---

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('ek26_theme', newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    window.dispatchEvent(new Event('theme-changed'));
  };

  const handleFontSizeChange = (val: number) => {
    setFontSize(val);
    localStorage.setItem('ek26_font_size', String(val));
    window.dispatchEvent(new Event('font-size-changed'));
  };

  const handleBubbleShapeChange = (shape: string) => {
    setBubbleShape(shape);
    localStorage.setItem('ek26_bubble_shape', shape);
    window.dispatchEvent(new Event('bubble-style-changed'));
  };

  const handleBubbleColorChange = (color: string) => {
    setBubbleColor(color);
    localStorage.setItem('ek26_bubble_color', color);
    window.dispatchEvent(new Event('bubble-style-changed'));
  };

  const handleBubbleColorOtherChange = (color: string) => {
    setBubbleColorOther(color);
    localStorage.setItem('ek26_bubble_color_other', color);
    window.dispatchEvent(new Event('bubble-style-changed'));
  };

  const handleFontColorChange = (color: string) => {
    setFontColor(color);
    localStorage.setItem('ek26_font_color', color);
    window.dispatchEvent(new Event('bubble-style-changed'));
  };

  const handleFontColorOtherChange = (color: string) => {
    setFontColorOther(color);
    localStorage.setItem('ek26_font_color_other', color);
    window.dispatchEvent(new Event('bubble-style-changed'));
  };

  const handleWallpaperChange = (id: string) => {
    setWallpaper(id);
    localStorage.setItem('ek26_wallpaper', id);
    window.dispatchEvent(new Event('wallpaper-changed'));
  };

  const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > 10 * 1024 * 1024) {
      alert(t('settings.wallpaperMaxSize'));
      return;
    }
    setWallpaperUploading(true);
    try {
      const att = await uploadFile(file);
      const url = att.url;
      setWallpaper(url);
      localStorage.setItem('ek26_wallpaper', url);
      window.dispatchEvent(new Event('wallpaper-changed'));
    } catch (err: any) {
      alert(err.message || t('settings.uploadError'));
    } finally {
      setWallpaperUploading(false);
    }
  };

  const handleWidgetChange = (widget: string) => {
    setHeaderWidget(widget);
    localStorage.setItem('ek26_header_widget', widget);
    window.dispatchEvent(new Event('widget-changed'));
  };

  // --- Sidebar menu items ---
  const menuItems: { id: Section; labelKey: string; icon: JSX.Element }[] = [
    {
      id: 'language',
      labelKey: 'appSettings.language',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
        </svg>
      ),
    },
    {
      id: 'appearance',
      labelKey: 'appSettings.appearance',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
        </svg>
      ),
    },
    {
      id: 'notifications',
      labelKey: 'appSettings.notifications',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      ),
    },
    {
      id: 'contacts',
      labelKey: 'settings.contacts',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
    },
    {
      id: 'devices',
      labelKey: 'appSettings.devices',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
        </svg>
      ),
    },
    {
      id: 'widget',
      labelKey: 'appSettings.widget',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      ),
    },
    {
      id: 'faq',
      labelKey: 'appSettings.faq',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      ),
    },
    {
      id: 'about',
      labelKey: 'appSettings.about',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
      ),
    },
  ];

  // --- Section renderers ---

  const renderLanguageSection = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-3">{t('settings.language')}</label>
        <div className="flex flex-col gap-2">
          {LANGUAGES.map(item => (
            <button
              key={item.code}
              onClick={() => setLang(item.code)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                lang === item.code ? 'bg-accent text-white' : 'bg-dark-600 text-gray-400 hover:text-white'
              }`}
            >
              <img src={item.flag} alt={item.code} className="w-6 h-4 object-cover rounded-sm" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Auto-translate toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-400">{t('settings.autoTranslate')}</label>
        <button
          onClick={() => {
            const current = localStorage.getItem('ek26_auto_translate') === 'true';
            const next = !current;
            localStorage.setItem('ek26_auto_translate', String(next));
            window.dispatchEvent(new Event('auto-translate-changed'));
            setAutoTranslate(next);
          }}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            autoTranslate ? 'bg-accent' : 'bg-dark-500'
          }`}
        >
          <div
            className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all"
            style={{ left: autoTranslate ? '1.375rem' : '0.125rem' }}
          />
        </button>
      </div>
    </div>
  );

  const renderAppearanceSection = () => (
    <div className="space-y-6">
      {/* Theme toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-3">{t('settings.theme')}</label>
        <div className="flex gap-3">
          <button
            onClick={() => handleThemeChange('dark')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              theme === 'dark' ? 'bg-accent text-white' : 'bg-dark-600 text-gray-400 hover:text-white'
            }`}
          >
            {t('settings.dark')}
          </button>
          <button
            onClick={() => handleThemeChange('light')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              theme === 'light' ? 'bg-accent text-white' : 'bg-dark-600 text-gray-400 hover:text-white'
            }`}
          >
            {t('settings.light')}
          </button>
        </div>
      </div>

      {/* Font size */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-3">{t('settings.fontSize', { size: String(fontSize) })}</label>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={fontSize}
          onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
          className="w-full accent-accent"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{t('settings.fontSmall')}</span>
          <span>{t('settings.fontLarge')}</span>
        </div>
        <p className="text-sm mt-2 text-gray-300" style={{ fontSize: `${[12,13,14,15,16,17,18,19,20,22][fontSize - 1]}px` }}>
          {t('settings.sampleText')}
        </p>
      </div>

      {/* Bubble shape */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-3">{t('settings.bubbleShape')}</label>
        <div className="flex gap-3">
          {([
            { id: 'rounded', label: t('settings.bubbleRounded'), borderRadius: '10px' },
            { id: 'square', label: t('settings.bubbleSquare'), borderRadius: '2px' },
            { id: 'cloud', label: t('settings.bubbleCloud'), borderRadius: '30% 50% 40% 55% / 55% 40% 50% 35%' },
          ] as const).map((shape) => (
            <button
              key={shape.id}
              onClick={() => handleBubbleShapeChange(shape.id)}
              className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-colors ${
                bubbleShape === shape.id ? 'border-accent bg-accent/10' : 'border-dark-500 hover:border-gray-400'
              }`}
            >
              <div
                className="px-3 py-1.5 text-xs text-white"
                style={{ backgroundColor: bubbleColor, borderRadius: shape.borderRadius }}
              >
                {t('settings.bubbleHello')}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bubble color — own */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-3">{t('settings.ownBubbleColor')}</label>
        <div className="flex items-center gap-2 flex-wrap">
          {['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#22222f', '#1e3a5f', '#2d1b3d', '#1a3327'].map((color) => (
            <button
              key={color}
              onClick={() => handleBubbleColorChange(color)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                bubbleColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <label className="relative">
            <input
              type="color"
              value={bubbleColor}
              onChange={(e) => handleBubbleColorChange(e.target.value)}
              className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
            />
            <div className="w-8 h-8 rounded-full border-2 border-dark-500 flex items-center justify-center bg-dark-600 cursor-pointer">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
          </label>
        </div>
      </div>

      {/* Bubble color — other */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-3">{t('settings.otherBubbleColor')}</label>
        <div className="flex items-center gap-2 flex-wrap">
          {['#6366f1', '#10b981', '#ef4444', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316', '#22222f', '#1e3a5f', '#2d1b3d', '#1a3327'].map((color) => (
            <button
              key={color}
              onClick={() => handleBubbleColorOtherChange(color)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                bubbleColorOther === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <label className="relative">
            <input
              type="color"
              value={bubbleColorOther}
              onChange={(e) => handleBubbleColorOtherChange(e.target.value)}
              className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
            />
            <div className="w-8 h-8 rounded-full border-2 border-dark-500 flex items-center justify-center bg-dark-600 cursor-pointer">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
          </label>
        </div>
      </div>

      {/* Font color — own */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-3">{t('settings.ownFontColor')}</label>
        <div className="flex items-center gap-2 flex-wrap">
          {['#ffffff', '#e5e7eb', '#d1d5db', '#fbbf24', '#a78bfa', '#67e8f9', '#f9a8d4', '#18181b'].map((color) => (
            <button
              key={color}
              onClick={() => handleFontColorChange(color)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                fontColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <label className="relative">
            <input
              type="color"
              value={fontColor}
              onChange={(e) => handleFontColorChange(e.target.value)}
              className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
            />
            <div className="w-8 h-8 rounded-full border-2 border-dark-500 flex items-center justify-center bg-dark-600 cursor-pointer">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
          </label>
        </div>
        <div className="mt-2 px-3 py-1.5 rounded-lg inline-block" style={{ backgroundColor: bubbleColor }}>
          <span className="text-sm" style={{ color: fontColor }}>{t('settings.sampleText')}</span>
        </div>
      </div>

      {/* Font color — other */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-3">{t('settings.otherFontColor')}</label>
        <div className="flex items-center gap-2 flex-wrap">
          {['#18181b', '#374151', '#4b5563', '#ffffff', '#dc2626', '#2563eb', '#059669', '#7c3aed'].map((color) => (
            <button
              key={color}
              onClick={() => handleFontColorOtherChange(color)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                fontColorOther === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
          <label className="relative">
            <input
              type="color"
              value={fontColorOther}
              onChange={(e) => handleFontColorOtherChange(e.target.value)}
              className="absolute inset-0 w-8 h-8 opacity-0 cursor-pointer"
            />
            <div className="w-8 h-8 rounded-full border-2 border-dark-500 flex items-center justify-center bg-dark-600 cursor-pointer">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
          </label>
        </div>
        <div className="mt-2 px-3 py-1.5 rounded-lg inline-block" style={{ backgroundColor: bubbleColorOther }}>
          <span className="text-sm" style={{ color: fontColorOther }}>{t('settings.sampleText')}</span>
        </div>
      </div>

      {/* Wallpapers */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-3">{t('settings.chatBackground')}</label>
        <div className="grid grid-cols-4 gap-3">
          {WALLPAPER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleWallpaperChange(preset.id)}
              className={`relative w-full aspect-square rounded-xl border-2 transition-colors ${
                wallpaper === preset.id ? 'border-accent' : 'border-dark-500 hover:border-gray-400'
              }`}
              style={{
                background: preset.gradient || preset.color,
              }}
              title={t(preset.labelKey)}
            >
              {wallpaper === preset.id && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              )}
            </button>
          ))}
          {/* Custom upload */}
          <button
            onClick={() => wallpaperInputRef.current?.click()}
            disabled={wallpaperUploading}
            className={`relative w-full aspect-square rounded-xl border-2 transition-colors flex items-center justify-center ${
              !WALLPAPER_PRESETS.some(p => p.id === wallpaper) && wallpaper !== 'default'
                ? 'border-accent'
                : 'border-dark-500 hover:border-gray-400'
            } bg-dark-600`}
            title={t('settings.uploadWallpaper')}
          >
            {wallpaperUploading ? (
              <span className="text-xs text-gray-400">...</span>
            ) : !WALLPAPER_PRESETS.some(p => p.id === wallpaper) && wallpaper !== 'default' ? (
              <div
                className="absolute inset-0 rounded-xl bg-cover bg-center"
                style={{ backgroundImage: `url(${wallpaper})` }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
              </div>
            ) : (
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            )}
          </button>
        </div>
        <input
          ref={wallpaperInputRef}
          type="file"
          accept="image/*"
          onChange={handleWallpaperUpload}
          className="hidden"
        />
        <p className="text-xs text-gray-500 mt-2">{t('settings.bgSelectHint')}</p>
      </div>
    </div>
  );

  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [terminatingId, setTerminatingId] = useState<string | null>(null);

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const token = localStorage.getItem('ek26_token');
      const res = await fetch('/api/users/me/sessions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSessions(await res.json());
    } catch {} finally { setSessionsLoading(false); }
  };

  const terminateSession = async (sessionId: string) => {
    setTerminatingId(sessionId);
    try {
      const token = localStorage.getItem('ek26_token');
      await fetch(`/api/users/me/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch {} finally { setTerminatingId(null); }
  };

  // Load sessions when devices tab is opened
  useEffect(() => {
    if (activeSection === 'devices') loadSessions();
  }, [activeSection]);

  const deviceIcon = (name: string) => {
    if (/android/i.test(name)) return '📱';
    if (/ios|iphone|ipad/i.test(name)) return '📱';
    if (/windows/i.test(name)) return '💻';
    if (/mac/i.test(name)) return '🖥️';
    if (/linux/i.test(name)) return '🐧';
    return '📟';
  };

  const [callPreviewStop, setCallPreviewStop] = useState<(() => void) | null>(null);
  const [hasCustomMsg, setHasCustomMsg] = useState(() => hasCustomSound('msg'));
  const [hasCustomCall, setHasCustomCall] = useState(() => hasCustomSound('call'));

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      {/* Notifications toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Уведомления</p>
          <p className="text-xs text-gray-500">Push-уведомления о сообщениях и звонках</p>
        </div>
        <button
          onClick={() => {
            const next = !notificationsEnabled;
            setNotificationsEnabled(next);
            localStorage.setItem('ek26_notifications', next ? 'true' : 'false');
          }}
          className={`relative w-11 h-6 rounded-full transition-colors ${notificationsEnabled ? 'bg-accent' : 'bg-dark-500'}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notificationsEnabled ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>

      {/* Message sound */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Звук сообщения</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'default', label: 'Стандартный' },
            { id: 'chime', label: 'Перезвон' },
            { id: 'pop', label: 'Поп' },
            { id: 'ding', label: 'Динь' },
            { id: 'bubble', label: 'Пузырь' },
            { id: 'none', label: 'Без звука' },
            ...(hasCustomMsg ? [{ id: 'custom', label: 'Своя' }] : []),
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setMessageSound(s.id);
                localStorage.setItem('ek26_msg_sound', s.id);
                previewMessageSound(s.id);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                messageSound === s.id
                  ? 'bg-accent text-white'
                  : 'bg-dark-600 text-gray-300 hover:bg-dark-500'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            uploadCustomSound('msg').then(() => {
              setHasCustomMsg(true);
              setMessageSound('custom');
              localStorage.setItem('ek26_msg_sound', 'custom');
            }).catch((e) => alert(e));
          }}
          className="mt-2 text-xs text-accent hover:text-accent/80 transition-colors"
        >
          + Загрузить свою мелодию
        </button>
        {hasCustomMsg && messageSound === 'custom' && (
          <button
            onClick={() => { removeCustomSound('msg'); setHasCustomMsg(false); setMessageSound('default'); localStorage.setItem('ek26_msg_sound', 'default'); }}
            className="ml-3 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Удалить
          </button>
        )}
      </div>

      {/* Call ringtone */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">Мелодия звонка</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'default', label: 'Стандартная' },
            { id: 'classic', label: 'Классика' },
            { id: 'digital', label: 'Цифровая' },
            { id: 'soft', label: 'Мягкая' },
            { id: 'urgent', label: 'Срочная' },
            { id: 'none', label: 'Без звука' },
            ...(hasCustomCall ? [{ id: 'custom', label: 'Своя' }] : []),
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => {
                // Stop previous preview
                callPreviewStop?.();
                setCallSound(s.id);
                localStorage.setItem('ek26_call_sound', s.id);
                const stop = previewCallSound(s.id);
                setCallPreviewStop(() => stop);
              }}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                callSound === s.id
                  ? 'bg-accent text-white'
                  : 'bg-dark-600 text-gray-300 hover:bg-dark-500'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            uploadCustomSound('call').then(() => {
              setHasCustomCall(true);
              setCallSound('custom');
              localStorage.setItem('ek26_call_sound', 'custom');
            }).catch((e) => alert(e));
          }}
          className="mt-2 text-xs text-accent hover:text-accent/80 transition-colors"
        >
          + Загрузить свою мелодию
        </button>
        {hasCustomCall && callSound === 'custom' && (
          <button
            onClick={() => { removeCustomSound('call'); setHasCustomCall(false); setCallSound('default'); localStorage.setItem('ek26_call_sound', 'default'); }}
            className="ml-3 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Удалить
          </button>
        )}
      </div>

      {/* Vibration toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Вибрация</p>
          <p className="text-xs text-gray-500">Вибрация при входящих</p>
        </div>
        <button
          onClick={() => {
            const next = !vibrationEnabled;
            setVibrationEnabled(next);
            localStorage.setItem('ek26_vibration', next ? 'true' : 'false');
          }}
          className={`relative w-11 h-6 rounded-full transition-colors ${vibrationEnabled ? 'bg-accent' : 'bg-dark-500'}`}
        >
          <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${vibrationEnabled ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>
    </div>
  );

  const renderDevicesSection = () => (
    <div className="space-y-3">
      {sessionsLoading ? (
        <div className="flex justify-center py-12">
          <span className="text-gray-400 text-sm">{t('appSettings.loading')}</span>
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-12">{t('appSettings.noSessions')}</p>
      ) : (
        sessions.map(s => (
          <div key={s.id} className="flex items-center gap-3 p-3 bg-dark-600 rounded-xl">
            <span className="text-2xl">{deviceIcon(s.deviceName)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium">
                {s.deviceName}
                {s.isCurrent && <span className="text-accent text-xs ml-1.5">({t('appSettings.currentDevice')})</span>}
              </p>
              <p className="text-xs text-gray-400">
                {s.ip && `${s.ip} · `}
                {s.lastActiveAt && !isNaN(new Date(s.lastActiveAt).getTime())
                  ? `${new Date(s.lastActiveAt).toLocaleDateString()} ${new Date(s.lastActiveAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : s.createdAt && !isNaN(new Date(s.createdAt).getTime())
                    ? new Date(s.createdAt).toLocaleDateString()
                    : ''}
              </p>
            </div>
            {!s.isCurrent && (
              <button
                onClick={() => terminateSession(s.id)}
                disabled={terminatingId === s.id}
                className="px-3 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
              >
                {terminatingId === s.id ? '...' : t('appSettings.terminateSession')}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderWidgetSection = () => (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-400 mb-3">{t('appSettings.widgetTitle')}</label>
      {[
        { id: 'weather', labelKey: 'appSettings.widgetWeather' },
        { id: 'quote', labelKey: 'appSettings.widgetQuote' },
        { id: 'reminders', labelKey: 'appSettings.widgetReminders' },
        { id: 'none', labelKey: 'appSettings.widgetNone' },
      ].map(option => (
        <button
          key={option.id}
          onClick={() => handleWidgetChange(option.id)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
            headerWidget === option.id ? 'bg-accent text-white' : 'bg-dark-600 text-gray-400 hover:text-white'
          }`}
        >
          {headerWidget === option.id && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
          {t(option.labelKey)}
        </button>
      ))}
    </div>
  );

  const renderFaqSection = () => (
    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
      <svg className="w-12 h-12 mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
      </svg>
      <p className="text-sm">{t('appSettings.comingSoon')}</p>
    </div>
  );

  const handleVcfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVcfImporting(true);
    setVcfResults(null);
    try {
      const text = await file.text();
      const parsed = parseVCard(text);
      if (parsed.length === 0) { setVcfImporting(false); return; }

      // Build a list of all contacts with their names and phones
      const allVcfContacts: Array<{ phone: string; name: string }> = [];
      const seenPhones = new Set<string>();
      for (const card of parsed) {
        for (const phone of card.phones) {
          if (!seenPhones.has(phone)) {
            seenPhones.add(phone);
            allVcfContacts.push({ phone, name: card.name });
          }
        }
      }

      const allPhones = allVcfContacts.map(c => c.phone);
      const found = await usersApi.lookupByPhones(allPhones);
      const users = Array.isArray(found) ? found : [];
      const usersByPhone = new Map(users.map((u: any) => [u.phone, u]));

      if (users.length > 0) {
        const userIds = users.map((u: any) => u.id);
        try {
          await contactsApi.batchAdd(userIds);
        } catch {
          for (const id of userIds) {
            try { await contactsApi.add(id); } catch {}
          }
        }
      }

      // Save ALL contacts (registered + unregistered) via syncSave
      const syncPayload = allVcfContacts.map(c => {
        const user = usersByPhone.get(c.phone);
        return {
          phone: c.phone,
          name: c.name,
          registeredUserId: user?.id,
        };
      });
      try {
        await contactsApi.syncSave(syncPayload, 'vcf');
      } catch (err) {
        console.error('syncSave error:', err);
      }

      setVcfResults({ registered: users.length, unregistered: allPhones.length - users.length });
    } catch (err) {
      console.error('VCF import error:', err);
    } finally {
      setVcfImporting(false);
      if (vcfInputRef.current) vcfInputRef.current.value = '';
    }
  };

  const GOOGLE_CLIENT_ID = '1041371304955-o194d2teij50k25qd4asvlhn83nf44p9.apps.googleusercontent.com';

  const getGoogleToken = async (forcePrompt = false): Promise<string> => {
    // Reuse existing token if available and not forcing
    if (googleToken && !forcePrompt) {
      // Test if token is still valid
      try {
        const test = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + googleToken);
        if (test.ok) return googleToken;
      } catch {}
    }

    return new Promise<string>((resolve, reject) => {
      const loadGIS = () => {
        return new Promise<void>((res) => {
          if ((window as any).google?.accounts?.oauth2) { res(); return; }
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.onload = () => res();
          script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
          document.head.appendChild(script);
        });
      };

      loadGIS().then(() => {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/contacts.readonly',
          prompt: forcePrompt ? 'consent' : '',
          callback: (response: any) => {
            if (response.error) {
              reject(new Error(response.error));
            } else {
              setGoogleToken(response.access_token);
              resolve(response.access_token);
            }
          },
        });
        client.requestAccessToken();
      });
    });
  };

  const handleDeleteAllContacts = async () => {
    if (!window.confirm(t('settings.deleteAllConfirm'))) return;
    setDeletingContacts(true);
    try {
      await contactsApi.deleteAll();
      setGoogleResults(null);
      setVcfResults(null);
    } catch (err) {
      console.error('Delete contacts error:', err);
    } finally {
      setDeletingContacts(false);
    }
  };

  const handleGoogleSync = async () => {
    setGoogleSyncing(true);
    setGoogleResults(null);
    try {
      const token = await getGoogleToken();

      const allGoogleContacts: Array<{ phone: string; name: string; avatarUrl?: string }> = [];
      let nextPageToken = '';

      do {
        const url = new URL('https://people.googleapis.com/v1/people/me/connections');
        url.searchParams.set('personFields', 'names,phoneNumbers,photos');
        url.searchParams.set('pageSize', '1000');
        if (nextPageToken) url.searchParams.set('pageToken', nextPageToken);

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        for (const person of (data.connections || [])) {
          const name = person.names?.[0]?.displayName || '';
          const avatarUrl = person.photos?.[0]?.url || undefined;
          for (const ph of (person.phoneNumbers || [])) {
            let num = (ph.value || '').replace(/[^\d+]/g, '');
            if (num.startsWith('8') && num.length === 11) num = '+7' + num.slice(1);
            if (!num.startsWith('+')) num = '+' + num;
            if (num.length >= 10) allGoogleContacts.push({ phone: num, name, avatarUrl });
          }
        }

        nextPageToken = data.nextPageToken || '';
      } while (nextPageToken);

      if (allGoogleContacts.length === 0) {
        setGoogleResults({ registered: 0, unregistered: 0 });
        setGoogleSyncing(false);
        return;
      }

      // Deduplicate by phone, keeping the first occurrence
      const seenPhones = new Set<string>();
      const uniqueGoogleContacts = allGoogleContacts.filter(c => {
        if (seenPhones.has(c.phone)) return false;
        seenPhones.add(c.phone);
        return true;
      });

      const uniquePhones = uniqueGoogleContacts.map(c => c.phone);
      const found = await usersApi.lookupByPhones(uniquePhones);
      const users = Array.isArray(found) ? found : [];
      const usersByPhone = new Map(users.map((u: any) => [u.phone, u]));

      if (users.length > 0) {
        const userIds = users.map((u: any) => u.id);
        try {
          await contactsApi.batchAdd(userIds);
        } catch {
          for (const id of userIds) {
            try { await contactsApi.add(id); } catch {}
          }
        }
      }

      // Save ALL contacts (registered + unregistered) via syncSave
      const syncPayload = uniqueGoogleContacts.map(c => {
        const user = usersByPhone.get(c.phone);
        return {
          phone: c.phone,
          name: c.name,
          avatarUrl: c.avatarUrl,
          registeredUserId: user?.id,
        };
      });
      try {
        await contactsApi.syncSave(syncPayload, 'google');
      } catch (err) {
        console.error('syncSave error:', err);
      }

      setGoogleResults({ registered: users.length, unregistered: uniquePhones.length - users.length });
    } catch (err: any) {
      console.error('Google sync error:', err);
    } finally {
      setGoogleSyncing(false);
    }
  };

  const renderContactsSection = () => (
    <div className="space-y-5">
      {/* Import from vCard */}
      <div>
        <h3 className="text-sm font-medium text-white mb-2">{t('settings.importVcf')}</h3>
        <p className="text-xs text-gray-500 mb-3">{t('settings.importVcfDesc')}</p>
        <input
          ref={vcfInputRef}
          type="file"
          accept=".vcf,.vcard"
          onChange={handleVcfImport}
          className="hidden"
        />
        <button
          onClick={() => vcfInputRef.current?.click()}
          disabled={vcfImporting}
          className="w-full px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {vcfImporting ? t('settings.importing') : t('settings.selectFile')}
        </button>
        {vcfResults && (
          <div className="mt-3 p-3 bg-dark-800 rounded-xl space-y-1">
            <p className="text-sm font-medium text-white">{t('settings.importResults')}</p>
            <p className="text-xs text-green-400">{t('settings.importedRegistered', { count: vcfResults.registered })}</p>
            <p className="text-xs text-gray-400">{t('settings.importedUnregistered', { count: vcfResults.unregistered })}</p>
          </div>
        )}
      </div>

      {/* Google Contacts sync */}
      <div>
        <button
          onClick={handleGoogleSync}
          disabled={googleSyncing}
          className="w-full px-4 py-2.5 bg-dark-600 hover:bg-dark-500 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {googleSyncing ? t('settings.importing') : t('settings.syncGoogle')}
        </button>
        {googleResults && (
          <div className="mt-3 p-3 bg-dark-800 rounded-xl space-y-1">
            <p className="text-sm font-medium text-white">{t('settings.importResults')}</p>
            <p className="text-xs text-green-400">{t('settings.importedRegistered', { count: googleResults.registered })}</p>
            <p className="text-xs text-gray-400">{t('settings.importedUnregistered', { count: googleResults.unregistered })}</p>
          </div>
        )}
      </div>

      {/* Apple hint */}
      <div>
        <p className="text-xs text-gray-500">{t('settings.appleHint')}</p>
      </div>

      {/* Divider */}
      <div className="border-t border-dark-500 pt-4 space-y-3">
        {/* Refresh Google contacts */}
        <button
          onClick={handleGoogleSync}
          disabled={googleSyncing}
          className="w-full px-4 py-2.5 bg-dark-600 hover:bg-dark-500 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
          {googleSyncing ? t('settings.importing') : t('settings.refreshContacts')}
        </button>

        {/* Delete all contacts */}
        <button
          onClick={handleDeleteAllContacts}
          disabled={deletingContacts}
          className="w-full px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
          {deletingContacts ? '...' : t('settings.deleteAllContacts')}
        </button>
      </div>
    </div>
  );

  const renderAboutSection = () => (
    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
      <svg className="w-12 h-12 mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
      <p className="text-sm">{t('appSettings.comingSoon')}</p>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'language': return renderLanguageSection();
      case 'appearance': return renderAppearanceSection();
      case 'notifications': return renderNotificationsSection();
      case 'contacts': return renderContactsSection();
      case 'devices': return renderDevicesSection();
      case 'widget': return renderWidgetSection();
      case 'faq': return renderFaqSection();
      case 'about': return renderAboutSection();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-dark-700 rounded-2xl w-full max-w-2xl mx-4 overflow-hidden shadow-xl flex"
        style={{ minHeight: '480px', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left sidebar */}
        <div className="w-[200px] shrink-0 bg-dark-800 border-r border-dark-500 flex flex-col">
          <div className="px-4 py-4 border-b border-dark-500">
            <h2 className="text-sm font-semibold text-white">{t('appSettings.title')}</h2>
          </div>
          <nav className="flex-1 py-2 overflow-y-auto">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  activeSection === item.id
                    ? 'text-white bg-accent/20 border-r-2 border-accent'
                    : 'text-gray-400 hover:text-white hover:bg-dark-600'
                }`}
              >
                {item.icon}
                <span>{t(item.labelKey)}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Right content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-6 py-4 border-b border-dark-500">
            <h3 className="text-lg font-semibold text-white">
              {t(menuItems.find(m => m.id === activeSection)?.labelKey || '')}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {renderContent()}
          </div>
          <div className="px-6 py-3 border-t border-dark-500 flex justify-end">
            <button
              onClick={onClose}
              className="px-8 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-xl transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
