import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { usersApi, chatActionsApi } from '../services/api/endpoints';
import { uploadFile } from '../services/api/upload';
import { useChatStore } from '../stores/chatStore';
import { useTranslation } from '../i18n';

interface Props {
  onClose: () => void;
}

export function ProfileModal({ onClose }: Props) {
  const { t } = useTranslation();
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-500">
          <h2 className="text-lg font-semibold text-white">{t('settings.profile')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="relative group">
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
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
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

          {/* Phone */}
          {user?.phone && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">{t('settings.phone')}</label>
              <div className="w-full px-4 py-2.5 bg-dark-600/50 border border-dark-500 rounded-xl text-sm text-gray-400">
                {user.phone}
              </div>
            </div>
          )}

          {/* Save */}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
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
                <p className="text-sm text-red-400">{t('settings.deleteAccountConfirm')}</p>
                <p className="text-xs text-gray-400">{t('settings.deleteAccountHint')}</p>
                <input
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder={t('settings.deleteWord')}
                  className="w-full px-4 py-2.5 bg-dark-600 border border-red-500/50 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
                />
                <div className="flex gap-2">
                  <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }} className="flex-1 py-2 text-sm text-gray-400 hover:text-white transition-colors">
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
      </div>
    </div>
  );
}
