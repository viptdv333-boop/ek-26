import { useState } from 'react';
import { useMayakTheme, type MayakThemeKey, mayakThemes } from '../../hooks/useMayakTheme';
import { useAuthStore } from '../../stores/authStore';
import { MkAvatar } from './MkAvatar';
import { Stars } from './Stars';
import { useNavigate } from 'react-router-dom';
import { AppSettingsModal } from '../AppSettingsModal';

export function SettingsScreen() {
  const { th, themeKey, setTheme } = useMayakTheme();
  const user = useAuthStore((s) => s.user);
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [sub, setSub] = useState<null | 'theme' | 'lang'>(null);
  const [appSettingsSection, setAppSettingsSection] = useState<string | null>(null);

  const themeOptions: { k: MayakThemeKey; c1: string; c2: string }[] = [
    { k: 'lavender', c1: '#EDE8FF', c2: '#6366f1' },
    { k: 'cosmos', c1: '#1A1545', c2: '#A5B4FC' },
    { k: 'warm', c1: '#FFF0E6', c2: '#D97757' },
  ];

  const menuItems = [
    {
      icon: 'M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10zm-1-14v4l3 3',
      label: 'Оформление',
      desc: mayakThemes[themeKey].name,
      action: () => setSub('theme'),
    },
    {
      icon: 'M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z',
      label: 'Язык',
      desc: 'Русский',
      action: () => setSub('lang'),
    },
    {
      icon: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0',
      label: 'Уведомления',
      desc: 'Включены',
      action: () => {},
    },
    {
      icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
      label: 'Конфиденциальность',
      desc: 'E2EE',
      action: () => {},
    },
    {
      icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
      label: 'Обои и стиль',
      desc: 'Фон, пузыри, шрифт',
      action: () => setAppSettingsSection('appearance'),
    },
    {
      icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
      label: 'Импорт контактов',
      desc: 'Google, VCF',
      action: () => setAppSettingsSection('contacts'),
    },
    {
      icon: 'M3 3v18h18M18.7 8l-5.1 5.2-2.8-2.7L7 14.3',
      label: 'Виджет',
      desc: 'Погода, цитата, напоминания',
      action: () => setAppSettingsSection('widget'),
    },
    {
      icon: 'M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01',
      label: 'FAQ',
      desc: '',
      action: () => {},
    },
  ];

  // Theme sub-screen
  if (sub === 'theme') {
    return (
      <div style={{ background: th.bg, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {th.stars && <Stars />}
        <div style={{ padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 2, flexShrink: 0 }}>
          <BackBtn onClick={() => setSub(null)} />
          <span style={{ fontSize: 22, fontWeight: 800, color: th.text }}>Оформление</span>
        </div>
        <div style={{ padding: '0 18px', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: th.sec, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
            Тема
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {themeOptions.map((o) => {
              const t = mayakThemes[o.k];
              const active = themeKey === o.k;
              return (
                <div
                  key={o.k}
                  onClick={() => setTheme(o.k)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 16px',
                    borderRadius: 20,
                    background: active ? th.primary + '18' : th.surface,
                    border: `2px solid ${active ? th.primary : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg,${o.c1},${o.c2})`,
                      boxShadow: `0 2px 8px ${o.c2}33`,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700, color: th.text }}>{t.name}</div>
                    <div style={{ fontSize: 13, color: th.sec }}>{t.dark ? 'Тёмная тема' : 'Светлая тема'}</div>
                  </div>
                  {active && (
                    <div style={{ marginLeft: 'auto' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={th.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Language sub-screen
  if (sub === 'lang') {
    const langs = [
      { flag: '\u{1F1F7}\u{1F1FA}', name: 'Русский', active: true },
      { flag: '\u{1F1EC}\u{1F1E7}', name: 'English', active: false },
      { flag: '\u{1F1E8}\u{1F1F3}', name: '中文', active: false },
    ];
    return (
      <div style={{ background: th.bg, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {th.stars && <Stars />}
        <div style={{ padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 2, flexShrink: 0 }}>
          <BackBtn onClick={() => setSub(null)} />
          <span style={{ fontSize: 22, fontWeight: 800, color: th.text }}>Язык</span>
        </div>
        <div style={{ padding: '0 18px', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {langs.map((l, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                borderRadius: 20,
                background: l.active ? th.primary + '18' : th.surface,
                border: `2px solid ${l.active ? th.primary : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 24 }}>{l.flag}</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: th.text }}>{l.name}</span>
              {l.active && (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 'auto' }} stroke={th.primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Main settings
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

      {/* Profile card */}
      <div
        style={{
          margin: '16px 18px',
          padding: 18,
          borderRadius: 24,
          background: th.surface,
          boxShadow: '0 2px 12px rgba(0,0,0,.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          position: 'relative',
          zIndex: 2,
          flexShrink: 0,
        }}
      >
        <MkAvatar
          name={user?.displayName || '?'}
          avatarUrl={user?.avatarUrl}
          size={56}
        />
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: th.text }}>{user?.displayName || 'Пользователь'}</div>
          <div style={{ fontSize: 14, color: th.sec }}>{user?.phone || user?.email || ''}</div>
        </div>
      </div>

      {/* Menu items */}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative', zIndex: 1 }}>
        {menuItems.map((it, i) => (
          <div
            key={i}
            onClick={it.action}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 20px',
              cursor: 'pointer',
              borderBottom: `1px solid ${th.divider}`,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: th.inputBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={th.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={it.icon} />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: th.text }}>{it.label}</div>
              {it.desc && <div style={{ fontSize: 13, color: th.sec }}>{it.desc}</div>}
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={th.sec} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        ))}

        {/* Admin panel */}
        {isAdmin && (
          <div
            onClick={() => navigate('/admin')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 20px',
              cursor: 'pointer',
              borderBottom: `1px solid ${th.divider}`,
              marginTop: 8,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: th.primary + '15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={th.primary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, color: th.text }}>Админ-панель</div>
              <div style={{ fontSize: 13, color: th.sec }}>Управление приложением</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={th.sec} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        )}

        {/* Logout */}
        <div
          onClick={() => { if (confirm('Выйти из аккаунта?')) logout(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 20px',
            cursor: 'pointer',
            marginTop: 8,
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'rgba(239,68,68,.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#EF4444' }}>Выйти</div>
        </div>

        {/* App info */}
        <div style={{ padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: th.sec }}>FOMO Chat v2.0</div>
          <div style={{ fontSize: 12, color: th.sec, opacity: 0.6, marginTop: 4 }}>E2EE Messenger</div>
        </div>
      </div>

      {appSettingsSection && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: th.bg }}>
          <AppSettingsModal onClose={() => setAppSettingsSection(null)} defaultSection={appSettingsSection} />
        </div>
      )}
    </div>
  );
}

function BackBtn({ onClick }: { onClick: () => void }) {
  const { th } = useMayakTheme();
  return (
    <div onClick={onClick} style={{ cursor: 'pointer', padding: 4, display: 'flex' }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={th.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </div>
  );
}
