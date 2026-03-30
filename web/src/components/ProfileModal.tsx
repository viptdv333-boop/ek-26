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
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const EyeToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        {show ? (
          <>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </>
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
        )}
      </svg>
    </button>
  );

  const handleChangePassword = async () => {
    setPwError('');
    if (newPw.length < 6) { setPwError(t('auth.passwordMin') || 'Minimum 6 characters'); return; }
    if (newPw !== confirmPw) { setPwError(t('auth.passwordMismatch') || 'Passwords do not match'); return; }
    setPwSaving(true);
    try {
      const token = localStorage.getItem('ek26_token');
      const res = await fetch('/api/users/me/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: currentPw || undefined, newPassword: newPw }),
      });
      if (!res.ok) {
        const data = await res.json();
        setPwError(data.error || 'Error');
        return;
      }
      setPwSuccess(true);
      setTimeout(() => { setShowChangePassword(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwSuccess(false); }, 1500);
    } catch { setPwError('Network error'); } finally { setPwSaving(false); }
  };

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
      setTimeout(() => onClose(), 1200);
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
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('settings.profile')}</h2>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
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
                <img src={avatarUrl} alt="" className="w-20 h-20 rounded-xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-accent/20 flex items-center justify-center">
                  <span className="text-accent text-2xl font-medium">{initial}</span>
                </div>
              )}
              <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
              </div>
              {uploading && (
                <div className="absolute inset-0 rounded-xl bg-black/60 flex items-center justify-center">
                  <span className="text-white text-xs">{t('settings.uploading')}</span>
                </div>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            <p className="text-xs text-gray-500">{t('settings.changePhoto')}</p>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">{t('settings.name')}</label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('settings.namePlaceholder')}
              className="w-full px-4 py-2.5 bg-dark-600 border border-dark-500 rounded-xl text-sm text-[var(--color-text-primary)] placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">{t('settings.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-4 py-2.5 bg-dark-600 border border-dark-500 rounded-xl text-sm text-[var(--color-text-primary)] placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">{t('settings.status')}</label>
            <input
              value={status}
              onChange={(e) => setStatus(e.target.value.slice(0, 140))}
              placeholder={t('settings.statusPlaceholder')}
              maxLength={140}
              className="w-full px-4 py-2.5 bg-dark-600 border border-dark-500 rounded-xl text-sm text-[var(--color-text-primary)] placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
            />
            <p className="text-xs text-gray-600 mt-1 text-right">{status.length}/140</p>
          </div>

          {/* Phone */}
          {user?.phone && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">{t('settings.phone')}</label>
              <div className="w-full px-4 py-2.5 bg-dark-600/50 border border-dark-500 rounded-xl text-sm text-[var(--color-text-secondary)]">
                {user.phone}
              </div>
            </div>
          )}

          {/* Save */}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
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

          {/* Change password */}
          <div className="pt-4 border-t border-dark-500">
            {!showChangePassword ? (
              <button
                onClick={() => setShowChangePassword(true)}
                className="w-full py-2.5 bg-dark-600 hover:bg-dark-500 text-[var(--color-text-primary)] font-medium rounded-xl transition-colors text-sm border border-dark-400"
              >
                {t('settings.changePassword')}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-[var(--color-text-primary)]">{t('settings.changePassword')}</p>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    placeholder={t('settings.currentPassword')}
                    className="w-full px-4 py-2.5 pr-10 bg-dark-600 border border-dark-500 rounded-xl text-sm text-[var(--color-text-primary)] placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
                  />
                  <EyeToggle show={showCurrentPw} onToggle={() => setShowCurrentPw(!showCurrentPw)} />
                </div>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder={t('settings.newPassword')}
                    className="w-full px-4 py-2.5 pr-10 bg-dark-600 border border-dark-500 rounded-xl text-sm text-[var(--color-text-primary)] placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
                  />
                  <EyeToggle show={showNewPw} onToggle={() => setShowNewPw(!showNewPw)} />
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder={t('settings.confirmNewPassword')}
                    className="w-full px-4 py-2.5 pr-10 bg-dark-600 border border-dark-500 rounded-xl text-sm text-[var(--color-text-primary)] placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
                  />
                  <EyeToggle show={showConfirmPw} onToggle={() => setShowConfirmPw(!showConfirmPw)} />
                </div>
                {pwError && <p className="text-xs text-red-400">{pwError}</p>}
                {pwSuccess && <p className="text-xs text-green-400">{t('settings.passwordChanged')}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowChangePassword(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwError(''); setPwSuccess(false); }}
                    className="flex-1 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                  >
                    {t('settings.cancel')}
                  </button>
                  <button
                    onClick={handleChangePassword}
                    disabled={pwSaving}
                    className="flex-1 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
                  >
                    {pwSaving ? '...' : t('settings.save')}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="pt-4 border-t border-dark-500">
            <button
              onClick={() => { authLogout(); onClose(); }}
              className="w-full py-2.5 bg-dark-600 hover:bg-dark-500 text-[var(--color-text-primary)] font-medium rounded-xl transition-colors text-sm border border-dark-400"
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
                <p className="text-xs text-[var(--color-text-secondary)]">{t('settings.deleteAccountHint')}</p>
                <input
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder={t('settings.deleteWord')}
                  className="w-full px-4 py-2.5 bg-dark-600 border border-red-500/50 rounded-xl text-sm text-[var(--color-text-primary)] placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
                />
                <div className="flex gap-2">
                  <button onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }} className="flex-1 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
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
