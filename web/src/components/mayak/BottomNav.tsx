import { useMayakTheme } from '../../hooks/useMayakTheme';

export type MayakScreen = 'hub' | 'calls' | 'contacts' | 'ai' | 'settings';

interface BottomNavProps {
  active: MayakScreen;
  onNav: (screen: MayakScreen) => void;
  large?: boolean;
}

const items: { id: MayakScreen; label: string; icon: JSX.Element }[] = [
  {
    id: 'hub', label: 'Чат',
    icon: <><circle cx="12" cy="12" r="9" strokeWidth="1.8" /><circle cx="12" cy="12" r="3" strokeWidth="1.8" /></>,
  },
  {
    id: 'calls', label: 'Звонки',
    icon: <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />,
  },
  {
    id: 'contacts', label: 'Контакты',
    icon: <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>,
  },
  {
    id: 'ai', label: 'AI',
    icon: <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />,
  },
  {
    id: 'settings', label: 'Ещё',
    icon: <><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></>,
  },
];

export function BottomNav({ active, onNav, large }: BottomNavProps) {
  const { th } = useMayakTheme();
  const iconSize = large ? 32 : 22;
  const labelSize = large ? 14 : 11;
  const gap = large ? 6 : 3;
  const pad = large ? '18px 16px 18px' : '10px 12px calc(env(safe-area-inset-bottom, 8px) + 10px)';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-around',
        padding: pad,
        background: th.navBg,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderTop: `1px solid ${th.divider}`,
        position: 'relative',
        zIndex: 10,
        flexShrink: 0,
      }}
    >
      {items.map((it) => {
        const on = active === it.id;
        return (
          <div
            key={it.id}
            onClick={() => onNav(it.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap,
              cursor: 'pointer',
              opacity: on ? 1 : 0.4,
              transition: 'opacity .15s',
              minWidth: large ? 72 : 48,
            }}
          >
            <svg
              width={iconSize}
              height={iconSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke={on ? th.primary : th.sec}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {it.icon}
            </svg>
            <span style={{ fontSize: labelSize, fontWeight: 700, color: on ? th.primary : th.sec }}>
              {it.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
