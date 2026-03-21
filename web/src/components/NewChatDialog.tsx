import { useState } from 'react';
import { usersApi, conversationsApi } from '../services/api/endpoints';
import { useChatStore } from '../stores/chatStore';

interface Props {
  onClose: () => void;
}

export function NewChatDialog({ onClose }: Props) {
  const [phone, setPhone] = useState('+7');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const addConversation = useChatStore((s) => s.addConversation);
  const setActive = useChatStore((s) => s.setActiveConversation);

  const handleSearch = async () => {
    if (phone.length < 12) {
      setError('Введите номер телефона');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await usersApi.lookupByPhone(phone);
      if (!user) {
        setError('Пользователь не найден');
        return;
      }
      const conv = await conversationsApi.create(user.id);
      addConversation(conv);
      setActive(conv.id);
      onClose();
    } catch (e: any) {
      setError(e.message?.includes('404') ? 'Пользователь не найден' : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-full max-w-sm bg-dark-700 rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-4">Новый чат</h2>
        <div className="space-y-3">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="+7 999 123 45 67"
            className="w-full px-4 py-3 bg-dark-800 border border-dark-500 rounded-xl text-white focus:outline-none focus:border-accent transition-colors"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-dark-500 text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-medium transition-colors"
            >
              {loading ? '...' : 'Найти'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
