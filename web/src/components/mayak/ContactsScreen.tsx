import { useMemo } from 'react';
import { useMayakTheme } from '../../hooks/useMayakTheme';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { MkAvatar } from './MkAvatar';
import { Stars } from './Stars';

interface ContactsScreenProps {
  onOpenChat: (conversationId: string) => void;
}

export function ContactsScreen({ onOpenChat }: ContactsScreenProps) {
  const { th } = useMayakTheme();
  const conversations = useChatStore((s) => s.conversations);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const user = useAuthStore((s) => s.user);

  const contacts = useMemo(() => {
    return conversations
      .filter((c) => c.type === 'direct')
      .map((c) => {
        const other = (c.participants as any[])?.find((p) => (typeof p === 'string' ? p : p.id) !== user?.id);
        const otherObj = other && typeof other !== 'string' ? other : null;
        return {
          convId: c.id,
          name: otherObj?.displayName || '?',
          avatarUrl: otherObj?.avatarUrl,
          online: otherObj ? onlineUsers.has(otherObj.id) : false,
          lastMsg: c.lastMessage?.text || '',
          unread: c.unreadCount || 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [conversations, onlineUsers, user?.id]);

  const onlineContacts = contacts.filter((c) => c.online);

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
      <div
        style={{
          padding: '16px 20px 6px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          position: 'relative',
          zIndex: 2,
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 800, color: th.text, letterSpacing: -0.5, flex: 1 }}>
          Контакты
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '4px 18px 10px', position: 'relative', zIndex: 1, flexShrink: 0 }}>
        <div
          style={{
            background: th.inputBg,
            borderRadius: 16,
            padding: '12px 16px',
            fontSize: 15,
            color: th.sec,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={th.sec}
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          Найти...
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', position: 'relative', zIndex: 1 }}>
        {/* Online now */}
        {onlineContacts.length > 0 && (
          <>
            <div style={{ padding: '6px 18px 4px' }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: th.sec,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  marginBottom: 10,
                }}
              >
                Сейчас в сети
              </div>
              <div style={{ display: 'flex', gap: 14, overflow: 'auto', paddingBottom: 6 }} className="scrollbar-hide">
                {onlineContacts.map((c) => (
                  <div
                    key={c.convId}
                    onClick={() => onOpenChat(c.convId)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 5,
                      cursor: 'pointer',
                      minWidth: 58,
                    }}
                  >
                    <MkAvatar name={c.name} avatarUrl={c.avatarUrl} size={50} online />
                    <span style={{ fontSize: 12, fontWeight: 700, color: th.text, whiteSpace: 'nowrap' }}>
                      {c.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* All contacts */}
        <div
          style={{
            padding: '14px 20px 6px',
            fontSize: 12,
            fontWeight: 700,
            color: th.sec,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          Все контакты
        </div>
        {contacts.map((c) => (
          <div
            key={c.convId}
            onClick={() => onOpenChat(c.convId)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '10px 18px',
              cursor: 'pointer',
              borderBottom: `1px solid ${th.divider}`,
            }}
          >
            <MkAvatar name={c.name} avatarUrl={c.avatarUrl} size={46} online={c.online} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: th.text }}>{c.name}</div>
              <div
                style={{
                  fontSize: 13,
                  color: th.sec,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {c.lastMsg}
              </div>
            </div>
            {c.unread > 0 && (
              <div
                style={{
                  minWidth: 22,
                  height: 22,
                  borderRadius: 11,
                  padding: '0 6px',
                  background: '#EF4444',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {c.unread}
              </div>
            )}
          </div>
        ))}
        {contacts.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: th.sec, fontSize: 15 }}>
            Нет контактов
          </div>
        )}
      </div>
    </div>
  );
}
