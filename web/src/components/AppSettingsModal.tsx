import { useState, useRef } from 'react';
import { uploadFile } from '../services/api/upload';
import { useTranslation } from '../i18n';

interface Props {
  onClose: () => void;
}

const WALLPAPER_PRESETS = [
  { id: 'default', labelKey: 'wallpaper.default', color: '#1a1a2e' },
  { id: 'dark-blue', labelKey: 'wallpaper.darkBlue', color: '#0f1b2d' },
  { id: 'dark-green', labelKey: 'wallpaper.darkGreen', color: '#0d1f17' },
  { id: 'dark-purple', labelKey: 'wallpaper.darkPurple', color: '#1a0f2e' },
  { id: 'gradient-blue-purple', labelKey: 'wallpaper.bluePurple', gradient: 'linear-gradient(135deg, #0f1b2d, #1a0f2e)' },
  { id: 'gradient-green-teal', labelKey: 'wallpaper.greenTeal', gradient: 'linear-gradient(135deg, #0d1f17, #0f2027)' },
];

type Section = 'language' | 'appearance' | 'devices' | 'widget' | 'faq' | 'about';

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
  // Wallpaper
  const [wallpaper, setWallpaper] = useState(() => localStorage.getItem('ek26_wallpaper') || 'default');
  const [wallpaperUploading, setWallpaperUploading] = useState(false);
  // Widget
  const [headerWidget, setHeaderWidget] = useState(() => localStorage.getItem('ek26_header_widget') || 'weather');

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
            { id: 'rounded', label: t('settings.bubbleRounded'),
              path: "M 18,5 C 8,6 3,13 3,22 L 2,72 C 2,83 7,91 18,91 L 162,91 L 184,114 L 173,91 L 182,91 C 193,91 198,83 198,72 L 198,22 C 198,13 193,5 182,5 Z" },
            { id: 'square', label: t('settings.bubbleSquare'),
              path: "M 6,3 L 194,3 C 197,3 199,5 199,8 L 199,83 C 199,87 197,89 194,89 L 175,89 L 186,114 L 160,89 L 6,89 C 3,89 1,87 1,83 L 1,8 C 1,5 3,3 6,3 Z" },
            { id: 'cloud', label: t('settings.bubbleCloud'),
              path: "M 35,10 C 60,-4 145,-4 172,8 C 198,20 202,42 196,58 C 202,76 192,89 172,91 L 158,91 Q 170,105 174,114 Q 155,100 145,93 C 115,96 50,96 25,87 C 2,76 -2,50 6,30 C 12,14 24,12 35,10 Z" },
          ] as const).map((shape) => (
            <button
              key={shape.id}
              onClick={() => handleBubbleShapeChange(shape.id)}
              className={`flex-1 flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-colors ${
                bubbleShape === shape.id ? 'border-accent bg-accent/10' : 'border-dark-500 hover:border-gray-400'
              }`}
            >
              <div className="relative w-20 h-10">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 120" preserveAspectRatio="none">
                  <path d={shape.path} fill={bubbleColor} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs text-white" style={{ zIndex: 1, paddingBottom: '6px' }}>
                  {t('settings.bubbleHello')}
                </span>
              </div>
              <span className="text-xs text-gray-400">{shape.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bubble color — own */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-3">{t('settings.ownBubbleColor')}</label>
        <div className="flex items-center gap-2 flex-wrap">
          {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'].map((color) => (
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
          {['#22222f', '#1e3a5f', '#2d1b3d', '#1a3327', '#3d2b1a', '#3b1a1a', '#1a2f3d', '#2a2a38'].map((color) => (
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

  const renderDevicesSection = () => (
    <div className="flex flex-col items-center justify-center py-16 text-gray-500">
      <svg className="w-12 h-12 mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
      <p className="text-sm">{t('appSettings.comingSoon')}</p>
    </div>
  );

  const renderWidgetSection = () => (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-400 mb-3">{t('appSettings.widgetTitle')}</label>
      {[
        { id: 'weather', labelKey: 'appSettings.widgetWeather' },
        { id: 'clock', labelKey: 'appSettings.widgetClock' },
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
