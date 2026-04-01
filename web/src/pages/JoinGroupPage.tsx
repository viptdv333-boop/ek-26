import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api/client';
import { useChatStore } from '../stores/chatStore';

export function JoinGroupPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<{ id: string; name: string; avatarUrl: string | null; memberCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!inviteCode) return;
    api.get<any>(`/conversations/invite/${inviteCode}`)
      .then(setGroup)
      .catch(() => setError('Группа не найдена или ссылка недействительна'))
      .finally(() => setLoading(false));
  }, [inviteCode]);

  const handleJoin = async () => {
    if (!inviteCode) return;
    setJoining(true);
    try {
      const res = await api.post<any>(`/conversations/join/${inviteCode}`, {});
      if (res.id) {
        const store = useChatStore.getState();
        const existing = store.conversations.find(c => c.id === res.id);
        if (!existing) {
          store.addConversation(res);
        }
        store.setActiveConversation(res.id);
        navigate('/');
      }
    } catch {
      setError('Ошибка при вступлении в группу');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-dark-900)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-[var(--color-dark-900)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error || 'Группа не найдена'}</p>
          <button onClick={() => navigate('/')} className="px-6 py-2 bg-accent text-white rounded-xl">
            На главную
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-dark-900)] flex items-center justify-center">
      <div className="w-full max-w-sm bg-[var(--color-dark-800)] rounded-2xl p-6 text-center shadow-2xl">
        {group.avatarUrl ? (
          <img src={group.avatarUrl} alt="" className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4" />
        ) : (
          <div className="w-20 h-20 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-accent text-2xl font-bold">#</span>
          </div>
        )}
        <h2 className="text-xl font-bold text-white mb-1">{group.name}</h2>
        <p className="text-sm text-gray-400 mb-6">{group.memberCount} участников</p>
        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
        >
          {joining ? 'Вступаем...' : 'Вступить в группу'}
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full py-2 mt-2 text-gray-400 hover:text-white text-sm transition-colors"
        >
          Отмена
        </button>
      </div>
    </div>
  );
}
