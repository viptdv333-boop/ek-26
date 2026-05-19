import { useMemo } from 'react';
import { useMayakTheme } from '../../hooks/useMayakTheme';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { Stars } from './Stars';
import { hashColor } from './MkAvatar';

interface RadialContact {
  id: string;
  name: string;
  avatarUrl?: string | null;
  color: string;
  angle: number;
  dist: number;
  sz: number;
  unread: number;
  online: boolean;
}

const ANGLE_PRESETS = [-70, 25, -140, 130, 170, 70, -30, 90, -100, 150];
const DIST_PRESETS = [0.74, 0.70, 0.78, 0.82, 0.62, 0.84, 0.68, 0.76, 0.72, 0.80];
const SIZE_PRESETS = [60, 54, 56, 52, 48, 46, 50, 44, 46, 42];

interface RadialHubProps {
  onOpenChat: (conversationId: string) => void;
}

export function RadialHub({ onOpenChat }: RadialHubProps) {
  const { th } = useMayakTheme();
  const conversations = useChatStore((s) => s.conversations);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const user = useAuthStore((s) => s.user);

  const hubContacts = useMemo<RadialContact[]>(() => {
    const sorted = [...conversations]
      .filter((c) => c.type !== 'ai')
      .sort((a, b) => {
        const unreadDiff = (b.unreadCount || 0) - (a.unreadCount || 0);
        if (unreadDiff !== 0) return unreadDiff;
        const aTime = a.lastMessage?.createdAt || a.updatedAt || '';
        const bTime = b.lastMessage?.createdAt || b.updatedAt || '';
        return bTime.localeCompare(aTime);
      })
      .slice(0, 8);

    return sorted.map((conv, i) => {
      const isGroup = conv.type === 'group';
      const other = !isGroup
        ? (conv.participants as any[])?.find((p) => (typeof p === 'string' ? p : p.id) !== user?.id)
        : null;
      const otherObj = other && typeof other !== 'string' ? other : null;
      const name = isGroup
        ? (conv.groupMeta?.name || 'Группа')
        : (otherObj?.displayName || 'Чат');
      const avatarUrl = isGroup ? conv.groupMeta?.avatarUrl : otherObj?.avatarUrl;

      return {
        id: conv.id,
        name,
        avatarUrl,
        color: hashColor(name),
        angle: ANGLE_PRESETS[i % ANGLE_PRESETS.length],
        dist: DIST_PRESETS[i % DIST_PRESETS.length],
        sz: SIZE_PRESETS[i % SIZE_PRESETS.length],
        unread: conv.unreadCount || 0,
        online: otherObj ? onlineUsers.has(otherObj.id) : false,
      };
    });
  }, [conversations, onlineUsers, user?.id]);

  const userInitial = user?.displayName?.charAt(0)?.toUpperCase() || '?';

  return (
    <div
      style={{
        background: th.bg,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {th.stars && <Stars />}

      {/* Header */}
      <div
        style={{
          padding: '16px 20px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          position: 'relative',
          zIndex: 2,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: 'linear-gradient(135deg,#EF4444,#DC2626)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            fontWeight: 800,
            color: '#fff',
          }}
        >
          F
        </div>
        <span style={{ fontSize: 24, fontWeight: 800, color: th.text, letterSpacing: -0.3 }}>
          Чат
        </span>
      </div>

      {/* Radial field */}
      <div style={{ flex: 1, position: 'relative', margin: '0 8px', zIndex: 1 }}>
        {/* Orbit rings */}
        {[180, 260].map((d, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '46%',
              transform: 'translate(-50%,-50%)',
              width: d,
              height: d,
              borderRadius: '50%',
              border: `1.2px dashed ${th.ring}`,
              pointerEvents: 'none',
            }}
          />
        ))}

        {/* Center — current user */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '46%',
            transform: 'translate(-50%,-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            zIndex: 5,
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: `linear-gradient(135deg,${th.key === 'warm' ? '#D97757' : '#6366f1'},#818CF8)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              fontWeight: 800,
              color: '#fff',
              boxShadow: `0 0 28px ${th.glow}, 0 6px 20px rgba(0,0,0,.08)`,
              overflow: 'hidden',
            }}
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              userInitial
            )}
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: th.primary }}>Вы</span>
        </div>

        {/* Contact bubbles */}
        {hubContacts.map((c) => (
          <HubBubble key={c.id} c={c} onClick={() => onOpenChat(c.id)} />
        ))}

        {/* Empty state */}
        {hubContacts.length === 0 && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '70%',
              transform: 'translate(-50%,-50%)',
              textAlign: 'center',
              color: th.sec,
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            Нет чатов. Начните общение!
          </div>
        )}
      </div>
    </div>
  );
}

function HubBubble({ c, onClick }: { c: RadialContact; onClick: () => void }) {
  const { th } = useMayakTheme();
  const cx = 50,
    cy = 46;
  const rad = (c.angle * Math.PI) / 180;
  const x = cx + c.dist * 38 * Math.cos(rad);
  const y = cy + c.dist * 38 * Math.sin(rad);

  return (
    <div
      onClick={onClick}
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%,-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 5,
        cursor: 'pointer',
        zIndex: c.unread > 0 ? 3 : 1,
        transition: 'transform .15s',
      }}
    >
      <div style={{ position: 'relative' }}>
        {/* Glow + ring for unread */}
        {c.unread > 0 && (
          <>
            <div
              style={{
                position: 'absolute',
                inset: -10,
                borderRadius: '50%',
                background: `radial-gradient(circle,${c.color}50 0%,transparent 65%)`,
                animation: 'mkPulse 2s ease-in-out infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                border: `2.5px solid ${c.color}`,
                animation: 'mkRing 2s ease-in-out infinite',
              }}
            />
          </>
        )}

        {/* Avatar */}
        <div
          style={{
            width: c.sz,
            height: c.sz,
            borderRadius: '50%',
            background: c.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: c.sz * 0.38,
            fontWeight: 800,
            color: '#fff',
            position: 'relative',
            boxShadow: c.unread > 0
              ? `0 0 24px ${c.color}55, 0 4px 14px rgba(0,0,0,.1)`
              : '0 4px 14px rgba(0,0,0,.08)',
            overflow: 'hidden',
          }}
        >
          {c.avatarUrl ? (
            <img src={c.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            c.name.charAt(0)
          )}
          {c.online && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 13,
                height: 13,
                borderRadius: '50%',
                background: th.online,
                border: `2.5px solid ${th.dark ? th.bgFlat : '#fff'}`,
              }}
            />
          )}
        </div>

        {/* Unread badge */}
        {c.unread > 0 && (
          <div
            style={{
              position: 'absolute',
              top: -4,
              right: -6,
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              padding: '0 5px',
              background: '#EF4444',
              color: '#fff',
              fontSize: 11,
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

      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: th.text,
          textShadow: th.dark ? '0 1px 4px rgba(0,0,0,.6)' : '0 1px 3px rgba(255,255,255,.9)',
          whiteSpace: 'nowrap',
          maxWidth: 70,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {c.name}
      </span>
    </div>
  );
}
