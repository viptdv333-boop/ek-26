import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { usersApi, chatActionsApi } from '../services/api/endpoints';
import { uploadFile } from '../services/api/upload';
import { useChatStore } from '../stores/chatStore';

interface Props {
  onClose: () => void;
}

const WALLPAPER_PRESETS = [
  { id: 'default', label: 'По умолчанию', color: '#1a1a2e' },
  { id: 'dark-blue', label: 'Тёмно-синий', color: '#0f1b2d' },
  { id: 'dark-green', label: 'Тёмно-зелёный', color: '#0d1f17' },
  { id: 'dark-purple', label: 'Тёмно-фиолетовый', color: '#1a0f2e' },
  { id: 'gradient-blue-purple', label: 'Сине-фиолетовый', gradient: 'linear-gradient(135deg, #0f1b2d, #1a0f2e)' },
  { id: 'gradient-green-teal', label: 'Зелёно-бирюзовый', gradient: 'linear-gradient(135deg, #0d1f17, #0f2027)' },
];

type SettingsTab = 'profile' | 'appearance';

export function SettingsModal({ onClose }: Props) {
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

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

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
      alert('Максимальный размер аватара — 5 МБ');
      return;
    }

    setUploading(true);
    try {
      const att = await uploadFile(file);
      setAvatarUrl(att.url);
    } catch (err: any) {
      alert(err.message || 'Ошибка загрузки');
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
      alert(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('ek26_theme', newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  const handleWallpaperChange = (id: string) => {
    setWallpaper(id);
    localStorage.setItem('ek26_wallpaper', id);
  };

  const handleWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > 10 * 1024 * 1024) {
      alert('Максимальный размер — 10 МБ');
      return;
    }
    setWallpaperUploading(true);
    try {
      const att = await uploadFile(file);
      const url = att.url;
      setWallpaper(url);
      localStorage.setItem('ek26_wallpaper', url);
    } catch (err: any) {
      alert(err.message || 'Ошибка загрузки');
    } finally {
      setWallpaperUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== 'УДАЛИТЬ') return;
    try {
      await chatActionsApi.deleteAccount();
      resetChat();
      authLogout();
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления аккаунта');
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
          <h2 className="text-lg font-semibold text-white">Настройки</h2>
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
            Профиль
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'appearance' ? 'text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'
            }`}
          >
            Оформление
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
                      <span className="text-white text-xs">Загрузка...</span>
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
                <p className="text-xs text-gray-500">Нажмите для смены фото</p>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Имя</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ваше имя"
                  className="w-full px-4 py-2.5 bg-dark-600 border border-dark-500 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Электронная почта</label>
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
                <label className="block text-sm font-medium text-gray-400 mb-1.5">Статус</label>
                <input
                  value={status}
                  onChange={(e) => setStatus(e.target.value.slice(0, 140))}
                  placeholder="Чем занимаетесь?"
                  maxLength={140}
                  className="w-full px-4 py-2.5 bg-dark-600 border border-dark-500 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
                />
                <p className="text-xs text-gray-600 mt-1 text-right">{status.length}/140</p>
              </div>

              {/* Phone (read-only) */}
              {user?.phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Телефон</label>
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
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !displayName.trim()}
                  className="px-6 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
                >
                  {saved ? 'Сохранено' : saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>

              {/* Delete account */}
              <div className="pt-4 border-t border-dark-500">
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium rounded-xl transition-colors text-sm border border-red-600/30"
                  >
                    Удалить аккаунт
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-red-400">
                      Вы уверены? Все ваши данные и переписки будут удалены навсегда.
                    </p>
                    <p className="text-xs text-gray-400">
                      Введите &laquo;УДАЛИТЬ&raquo; для подтверждения:
                    </p>
                    <input
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                      placeholder="УДАЛИТЬ"
                      className="w-full px-4 py-2.5 bg-dark-600 border border-red-500/50 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
                        className="flex-1 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteInput !== 'УДАЛИТЬ'}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-xl disabled:opacity-30 transition-colors"
                      >
                        Удалить навсегда
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="px-6 py-5 space-y-6">
              {/* Theme toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">Тема</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      theme === 'dark'
                        ? 'bg-accent text-white'
                        : 'bg-dark-600 text-gray-400 hover:text-white'
                    }`}
                  >
                    Тёмная
                  </button>
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      theme === 'light'
                        ? 'bg-accent text-white'
                        : 'bg-dark-600 text-gray-400 hover:text-white'
                    }`}
                  >
                    Светлая
                  </button>
                </div>
              </div>

              {/* Wallpapers */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-3">Фон чата</label>
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
                      title={preset.label}
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
                    title="Загрузить своё изображение"
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
                <p className="text-xs text-gray-500 mt-2">Выберите фон для области сообщений</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
