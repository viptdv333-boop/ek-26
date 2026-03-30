import { useState, useRef } from 'react';
import { Contact, useContactsStore } from '../stores/contactsStore';
import { uploadFile } from '../services/api/upload';

interface Props {
  contact: Contact;
  onClose: () => void;
}

export function ContactCard({ contact, onClose }: Props) {
  const updateContact = useContactsStore((s) => s.updateContact);
  const [nickname, setNickname] = useState(contact.nickname || contact.displayName);
  const [note, setNote] = useState(contact.note || '');
  const [avatarUrl, setAvatarUrl] = useState(contact.avatarUrl || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > 5 * 1024 * 1024) {
      alert('Максимальный размер — 5 МБ');
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
      await updateContact(contact.userId, {
        nickname: nickname.trim() || null,
        note: note.trim() || null,
        customAvatar: avatarUrl || null,
      });
      onClose();
    } catch (err: any) {
      alert(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const initial = (nickname || contact.displayName)?.[0]?.toUpperCase() || '?';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-dark-700 rounded-2xl w-full max-w-sm mx-4 overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-500">
          <h2 className="text-lg font-semibold text-white">Контакт</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="relative group"
            >
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
          </div>

          {/* Nickname */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Имя / Никнейм</label>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Имя контакта"
              className="w-full px-4 py-2.5 bg-dark-600 border border-dark-500 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Заметка</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Заметка о контакте..."
              rows={3}
              className="w-full px-4 py-2.5 bg-dark-600 border border-dark-500 rounded-xl text-sm text-white placeholder-gray-500 resize-none focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Phone (read-only) */}
          {contact.phone && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Телефон</label>
              <div className="w-full px-4 py-2.5 bg-dark-600/50 border border-dark-500 rounded-xl text-sm text-gray-400">
                {contact.phone}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-dark-500 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-colors"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
