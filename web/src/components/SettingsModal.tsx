import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { usersApi, chatActionsApi } from '../services/api/endpoints';
import { uploadFile } from '../services/api/upload';
import { useChatStore } from '../stores/chatStore';
import { useTranslation } from '../i18n';

interface Props {
  onClose: () => void;
  initialTab?: 'profile' | 'appearance';
}

const WALLPAPER_PRESETS = [
  { id: 'default', labelKey: 'wallpaper.default', color: '#1a1a2e' },
  { id: 'dark-blue', labelKey: 'wallpaper.darkBlue', color: '#0f1b2d' },
  { id: 'dark-green', labelKey: 'wallpaper.darkGreen', color: '#0d1f17' },
  { id: 'dark-purple', labelKey: 'wallpaper.darkPurple', color: '#1a0f2e' },
  { id: 'gradient-blue-purple', labelKey: 'wallpaper.bluePurple', gradient: 'linear-gradient(135deg, #0f1b2d, #1a0f2e)' },
  { id: 'gradient-green-teal', labelKey: 'wallpaper.greenTeal', gradient: 'linear-gradient(135deg, #0d1f17, #0f2027)' },
];

type SettingsTab = 'profile' | 'appearance';

export function SettingsModal({ onClose, initialTab = 'profile' }: Props) {
  const { t, lang, setLang } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const authLogout = useAuthStore((s) => s.logout);
  const resetChat = useChatStore((s) => s.reset);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [email, setEmail] = useState((user as any)?.email || '');
  const [status, setStatus] = useState((user as any)?.status || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Theme
  const [theme, setTheme] = useState(() => localStorage.getItem('ek26_theme') || 'dark');
  // Wallpaper
  const [wallpaper, setWallpaper] = useState(() => localStorage.getItem('ek26_wallpaper') || 'default');
  const [wallpaperUploading, setWallpaperUploading] = useState(false);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  // Load fresh profile from server
  useEffect(() => {
    usersApi.getProfile().then((profile: any) => {
      setDisplayName(profile.displayName || '');
      setEmail(profile.email || '');
      setStatus(profile.status || '');
      setAvatarUrl(profile.avatarUrl || '');
    }).catch(() => {});
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > 5 * 1024 * 1024) {
      alert(t('settings.avatarMaxSize'));
      return;
    }

    setUploading(true);
    try {
      const att = await uploadFile(file);
      setAvatarUrl(att.url);
    } catch (err: any) {
      alert(err.message || t('settings.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await usersApi.updateProfile({
        displayName: displayName.trim() || undefined,
        avatarUrl: avatarUrl || null,
        email: email.trim() || null,
        status: status.trim(),
      } as any);
      updateUser({
        displayName: (updated as any).displayName,
        avatarUrl: (updated as any).avatarUrl,
        email: (updated as any).email,
        status: (updated as any).status,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert(err.message || t('settings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  // Font size
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('ek26_font_size') || '3'));
  // Bubble style
  const [bubbleShape, setBubbleShape] = useState(() => localStorage.getItem('ek26_bubble_shape') || 'rounded');
  const [bubbleColor, setBubbleColor] = useState(() => localStorage.getItem('ek26_bubble_color') || '#6366f1');
  const [bubbleColorOther, setBubbleColorOther] = useState(() => localStorage.getItem('ek26_bubble_color_other') || '#22222f');

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

  const handleDeleteAccount = async () => {
    if (deleteInput !== t('settings.deleteWord')) return;
    try {
      await chatActionsApi.deleteAccount();
      resetChat();
      authLogout();
    } catch (err: any) {
      alert(err.message || t('settings.deleteAccountError'));
    }
  };

  const initial = displayName ? displayName[0]?.toUpperCase() : '?';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-dark-700 rounded-2xl w-full max-w-md mx-4 overflow-hidden shadow-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-500">
          <h2 className="text-lg font-semibold text-white">{t('settings.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-dark-500">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'profile' ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t('settings.profile')}
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'appearance' ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t('settings.appearance')}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'profile' ? (
            <div className="px-6 py-5 space-y-5">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="relative group"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-20 h-20 rounded-full object-cover" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center">
                      <span className="text-accent text-2xl font-medium">{initial}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                  </div>
                  {uploading && (
                    <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center">
                      <span className="text-white text-xs">{t('settings.uploading')}</span>
                    </div>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <p className="text-xs text-gray-500">{t('settings.changePhoto')}</p>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">{t('settings.name')}</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t('settings.namePlaceholder')}
                  className="w-full px-4 py-2.5 bg-dark-600 border border-dark-500 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">{t('settings.email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-4 py-2.5 bg-dark-600 border border-dark-500 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">{t('settings.status')}</label>
                <input
                  value={status}
                  onChange={(e) => setStatus(e.target.value.slice(0, 140))}
                  placeholder={t('settings.statusPlaceholder')}
                  maxLength={140}
                  className="w-full px-4 py-2.5 bg-dark-600 border border-dark-500 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
                />
                <p className="text-xs text-gray-600 mt-1 text-right">{status.length}/140</p>
              </div>

              {/* Phone (read-only) */}
              {user?.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">{t('settings.phone')}</label>
                  <div className="w-full px-4 py-2.5 bg-dark-600/50 border border-dark-500 rounded-xl text-sm text-gray-400">
                    {user.phone}
                  </div>
                </div>
              )}

              {/* Save button */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {t('settings.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !displayName.trim()}
                  className="px-6 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
                >
                  {saved ? t('settings.saved') : saving ? t('settings.saving') : t('settings.save')}
                </button>
              </div>

              {/* Contacts sync toggle */}
              <div className="pt-4 border-t border-dark-500">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <p className="text-sm text-white">{t('contacts.syncContacts')}</p>
                    <p className="text-xs text-gray-500">{t('contacts.syncContactsDesc')}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localStorage.getItem('ek26_contacts_sync') === 'true'}
                    onChange={(e) => {
                      localStorage.setItem('ek26_contacts_sync', String(e.target.checked));
                    }}
                    className="w-5 h-5 rounded accent-accent"
                  />
                </label>
              </div>

              {/* Logout */}
              <div className="pt-4 border-t border-dark-500">
                <button
                  onClick={() => { authLogout(); onClose(); }}
                  className="w-full py-2.5 bg-dark-600 hover:bg-dark-500 text-white font-medium rounded-xl transition-colors text-sm border border-dark-400"
                >
                  {t('settings.logout')}
                </button>
              </div>

              {/* Delete account */}
              <div className="pt-4 border-t border-dark-500">
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium rounded-xl transition-colors text-sm border border-red-600/30"
                  >
                    {t('settings.deleteAccount')}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-red-400">
                      {t('settings.deleteAccountConfirm')}
                    </p>
                    <p className="text-xs text-gray-400">
                      {t('settings.deleteAccountHint')}
                    </p>
                    <input
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                      placeholder={t('settings.deleteWord')}
                      className="w-full px-4 py-2.5 bg-dark-600 border border-red-500/50 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                        className="flex-1 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        {t('settings.cancel')}
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteInput !== t('settings.deleteWord')}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-xl disabled:opacity-30 transition-colors"
                      >
                        {t('settings.deleteForever')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="px-6 py-5 space-y-6">
              {/* Language selector */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">{t('settings.language')}</label>
                <div className="flex gap-2">
                  {[
                    { code: 'ru' as const, label: 'Рус' },
                    { code: 'en' as const, label: 'Eng' },
                    { code: 'zh' as const, label: '中文' },
                  ].map(item => (
                    <button
                      key={item.code}
                      onClick={() => setLang(item.code)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        lang === item.code ? 'bg-accent text-white' : 'bg-dark-600 text-gray-400 hover:text-white'
                      }`}
                    >
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
                    localStorage.setItem('ek26_auto_translate', current ? 'false' : 'true');
                    window.dispatchEvent(new Event('auto-translate-changed'));
                    // Force re-render
                    setTheme(prev => prev);
                  }}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    localStorage.getItem('ek26_auto_translate') === 'true' ? 'bg-accent' : 'bg-dark-500'
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    localStorage.getItem('ek26_auto_translate') === 'true' ? 'translate-x-5.5 left-[1.375rem]' : 'left-0.5'
                  }`} />
                </button>
              </div>

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
          )}
        </div>
      </div>
    </div>
  );
}
