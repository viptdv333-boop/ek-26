import { useMayakTheme } from '../../hooks/useMayakTheme';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { MkAvatar } from './MkAvatar';
import { Stars } from './Stars';

interface CallsScreenProps {
  onOpenChat: (conversationId: string) => void;
}

export function CallsScreen({ onOpenChat }: CallsScreenProps) {
  const { th } = useMayakTheme();
  const conversations = useChatStore((s) => s.conversations);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const user = useAuthStore((s) => s.user);

  const getOther = (c: any) => {
    const other = (c.participants as any[])?.find((p: any) => (typeof p === 'string' ? p : p.id) !== user?.id);
    return other && typeof other !== 'string' ? other : null;
  };

  const onlineContacts = conversations
    .filter((c) => c.type === 'direct')
    .map((c) => {
      const other = getOther(c);
      if (!other || !onlineUsers.has(other.id)) return null;
      return { convId: c.id, name: other.displayName || '?', avatarUrl: other.avatarUrl, online: true };
    })
    .filter(Boolean) as { convId: string; name: string; avatarUrl?: string; online: boolean }[];

  const recentChats = conversations
    .filter((c) => c.type === 'direct')
    .sort((a, b) => {
      const aT = a.lastMessage?.createdAt || a.updatedAt || '';
      const bT = b.lastMessage?.createdAt || b.updatedAt || '';
      return bT.localeCompare(aT);
    })
    .slice(0, 10)
    .map((c) => {
      const other = getOther(c);
      return {
        convId: c.id,
        name: other?.displayName || '?',
        avatarUrl: other?.avatarUrl,
        online: other ? onlineUsers.has(other.id) : false,
        lastTime: c.lastMessage?.createdAt
          ? new Date(c.lastMessage.createdAt).toLocaleString('ru', { hour: '2-digit', minute: '2-digit' })
          : '',
      };
    });

  return (
    <div
      style={{
        background: th.bg,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {th.stars && <Stars />}

      {/* Header */}
      <div style={{ padding: '16px 20px 12px', position: 'relative', zIndex: 2, flexShrink: 0 }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: th.text, letterSpacing: -0.5 }}>Звонки</div>
      </div>

      {/* Quick call — online contacts */}
      {onlineContacts.length > 0 && (
        <div
          style={{
            padding: '0 16px 16px',
            display: 'flex',
            gap: 12,
            overflow: 'auto',
            position: 'relative',
            zIndex: 1,
            flexShrink: 0,
          }}
          className="scrollbar-hide"
        >
          {onlineContacts.map((c) => (
            <div
              key={c.convId}
              onClick={() => onOpenChat(c.convId)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                minWidth: 64,
              }}
            >
              <MkAvatar name={c.name} avatarUrl={c.avatarUrl} size={52} online />
              <span style={{ fontSize: 12, fontWeight: 700, color: th.text, whiteSpace: 'nowrap' }}>
                {c.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recent conversations */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            padding: '8px 20px 6px',
            fontSize: 13,
            fontWeight: 700,
            color: th.sec,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          Недавние
        </div>
        {recentChats.map((c) => (
          <div
            key={c.convId}
            onClick={() => onOpenChat(c.convId)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 18px',
              cursor: 'pointer',
              borderBottom: `1px solid ${th.divider}`,
            }}
          >
            <MkAvatar name={c.name} avatarUrl={c.avatarUrl} size={46} online={c.online} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: th.text }}>{c.name}</div>
              <div style={{ fontSize: 13, color: th.sec }}>{c.lastTime}</div>
            </div>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: th.inputBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke={th.primary}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />
              </svg>
            </div>
          </div>
        ))}
        {recentChats.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: th.sec, fontSize: 15 }}>
            Нет недавних звонков
          </div>
        )}
      </div>
    </div>
  );
}
