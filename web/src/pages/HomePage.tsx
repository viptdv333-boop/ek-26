import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

/* ─── i18n ─── */
type Lang = 'ru' | 'en' | 'zh';
const t = (lang: Lang) => ({
  ru: {
    login: 'Войти', register: 'Регистрация', themeLight: 'Светлая', themeDark: 'Тёмная',
    badge: 'Бесплатный мессенджер',
    heroTitle1: 'Все свои',
    heroTitle2: 'рядом',
    heroDesc: 'Звонки, чаты, шифрование и автоперевод — бесплатно и без рекламы.',
    heroBtn: 'Начать общение',
    installBtn: 'Установить приложение',
    footer: { privacy: 'Конфиденциальность', terms: 'Условия использования', support: 'Поддержка' },
  },
  en: {
    login: 'Sign in', register: 'Sign up', themeLight: 'Light', themeDark: 'Dark',
    badge: 'Free Messenger',
    heroTitle1: 'Your people,',
    heroTitle2: 'one place',
    heroDesc: 'Calls, chats, encryption and auto-translation — free, no ads.',
    heroBtn: 'Start chatting',
    installBtn: 'Install app',
    footer: { privacy: 'Privacy Policy', terms: 'Terms of Service', support: 'Support' },
  },
  zh: {
    login: '登录', register: '注册', themeLight: '浅色', themeDark: '深色',
    badge: '免费通讯',
    heroTitle1: '所有好友',
    heroTitle2: '在身边',
    heroDesc: '通话、聊天、加密和自动翻译——免费且无广告。',
    heroBtn: '开始聊天',
    installBtn: '安装应用',
    footer: { privacy: '隐私政策', terms: '使用条款', support: '支持' },
  },
})[lang];

/* ─── SVG Icons ─── */
const IconArrowRight = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconDownload = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
);

/* ─── Language Switcher ─── */
function LangSwitcher({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const langs: { code: Lang; flag: string; alt: string }[] = [
    { code: 'ru', flag: 'https://flagcdn.com/w40/ru.png', alt: 'Русский' },
    { code: 'en', flag: 'https://flagcdn.com/w40/gb.png', alt: 'English' },
    { code: 'zh', flag: 'https://flagcdn.com/w40/cn.png', alt: '中文' },
  ];
  return (
    <div className="flex items-center gap-1.5">
      {langs.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`w-8 h-8 rounded-full overflow-hidden border-2 transition-all ${
            lang === l.code ? 'border-[var(--h-accent)] scale-110 shadow-md' : 'border-transparent opacity-50 hover:opacity-80'
          }`}
          title={l.alt}
        >
          <img src={l.flag} alt={l.alt} className="w-full h-full object-cover" />
        </button>
      ))}
    </div>
  );
}

/* ─── Theme Toggle ─── */
function ThemeToggle({ dark, toggle, labelLight, labelDark }: { dark: boolean; toggle: () => void; labelLight: string; labelDark: string }) {
  return (
    <button
      onClick={toggle}
      className="relative flex items-center bg-[var(--h-secondary)] border border-[var(--h-border)] rounded-full h-9 w-[140px] cursor-pointer transition-all overflow-hidden"
    >
      <div
        className="absolute top-0.5 h-8 w-[68px] rounded-full bg-[var(--h-primary)] shadow-md transition-transform duration-300 ease-out"
        style={{ transform: dark ? 'translateX(68px)' : 'translateX(2px)' }}
      />
      <span className={`relative z-10 flex-1 text-center text-xs font-semibold transition-colors duration-300 ${!dark ? 'text-white' : 'text-[var(--h-muted)]'}`}>
        {labelLight}
      </span>
      <span className={`relative z-10 flex-1 text-center text-xs font-semibold transition-colors duration-300 ${dark ? 'text-white' : 'text-[var(--h-muted)]'}`}>
        {labelDark}
      </span>
    </button>
  );
}

/* ─── Orbital Demo (static RadialHub visualization) ─── */
function OrbitalDemo() {
  const contacts = [
    { name: 'Аня', color: '#6366f1', angle: -60, dist: 0.76, sz: 56, unread: 3 },
    { name: 'Макс', color: '#f59e0b', angle: 30, dist: 0.72, sz: 52, unread: 0 },
    { name: 'Ира', color: '#ec4899', angle: 140, dist: 0.80, sz: 50, unread: 1 },
    { name: 'Дима', color: '#10b981', angle: -140, dist: 0.74, sz: 48, unread: 0 },
    { name: 'Лена', color: '#8b5cf6', angle: 80, dist: 0.68, sz: 46, unread: 0 },
    { name: 'Работа', color: '#ef4444', angle: 170, dist: 0.82, sz: 44, unread: 5 },
  ];

  return (
    <div className="relative w-[340px] h-[340px]">
      {/* Orbit rings */}
      {[160, 240].map((d, i) => (
        <div
          key={i}
          style={{
            position: 'absolute', left: '50%', top: '50%',
            transform: 'translate(-50%,-50%)',
            width: d, height: d, borderRadius: '50%',
            border: '1.5px dashed rgba(99,102,241,0.15)',
          }}
        />
      ))}

      {/* Center — user */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%,-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, zIndex: 5,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(135deg,#EF4444,#DC2626)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 800, color: '#fff',
          boxShadow: '0 0 30px rgba(239,68,68,0.3), 0 6px 20px rgba(0,0,0,.08)',
        }}>
          F
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--h-accent)' }}>Вы</span>
      </div>

      {/* Contact bubbles */}
      {contacts.map((c, i) => {
        const rad = (c.angle * Math.PI) / 180;
        const x = 50 + c.dist * 40 * Math.cos(rad);
        const y = 50 + c.dist * 40 * Math.sin(rad);
        return (
          <div
            key={i}
            className="home-slide-up"
            style={{
              position: 'absolute', left: `${x}%`, top: `${y}%`,
              transform: 'translate(-50%,-50%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              animationDelay: `${300 + i * 100}ms`,
            }}
          >
            <div style={{ position: 'relative' }}>
              {c.unread > 0 && (
                <div style={{
                  position: 'absolute', inset: -6, borderRadius: '50%',
                  background: `radial-gradient(circle,${c.color}40 0%,transparent 65%)`,
                  animation: 'mkPulse 2s ease-in-out infinite',
                }} />
              )}
              <div style={{
                width: c.sz, height: c.sz, borderRadius: '50%',
                background: c.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: c.sz * 0.38, fontWeight: 800, color: '#fff',
                boxShadow: c.unread > 0
                  ? `0 0 20px ${c.color}44, 0 4px 12px rgba(0,0,0,.1)`
                  : '0 4px 12px rgba(0,0,0,.06)',
              }}>
                {c.name[0]}
              </div>
              {c.unread > 0 && (
                <div style={{
                  position: 'absolute', top: -3, right: -4,
                  minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px',
                  background: '#EF4444', color: '#fff', fontSize: 10, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {c.unread}
                </div>
              )}
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--h-fg)' }}>{c.name}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── PWA Install Hook ─── */
function useInstallPrompt() {
  const deferredPrompt = useRef<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e;
    };
    window.addEventListener('beforeinstallprompt', handler as any);
    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);

  const install = async () => {
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt();
      await deferredPrompt.current.userChoice;
      deferredPrompt.current = null;
    } else {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        alert('Нажмите кнопку «Поделиться» ⎋ → «На экран Домой»');
      } else {
        alert('Откройте сайт в Chrome на телефоне → меню ⋮ → «Установить приложение»');
      }
    }
  };

  return { install };
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export function HomePage() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('ek26_home_theme') === 'dark');
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('ek26_home_lang');
    if (saved === 'en' || saved === 'zh') return saved;
    return 'ru';
  });
  const { install } = useInstallPrompt();

  const s = t(lang);

  const saveLang = (l: Lang) => { setLang(l); localStorage.setItem('ek26_home_lang', l); };
  const toggleTheme = () => { const d = !isDark; setIsDark(d); localStorage.setItem('ek26_home_theme', d ? 'dark' : 'light'); };

  return (
    <div className={`home-page ${isDark ? 'home-dark' : 'home-light'}`}>
      {/* ── NAV ── */}
      <nav className="flex items-center h-16 px-8 relative z-10">
        <div className="flex items-center gap-3">
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#EF4444,#DC2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: '#fff',
          }}>F</div>
          <span className="text-xl font-bold tracking-tight text-[var(--h-fg)]">FOMO <span className="text-[var(--h-accent)]">Chat</span></span>
        </div>

        <div className="flex-1 flex items-center justify-end gap-10">
          <LangSwitcher lang={lang} setLang={saveLang} />
          <ThemeToggle dark={isDark} toggle={toggleTheme} labelLight={s.themeLight} labelDark={s.themeDark} />
          <div className="flex items-center gap-5">
            <Link to="/auth?tab=login" className="text-sm font-medium text-[var(--h-muted)] hover:text-[var(--h-fg)] transition-colors hidden sm:inline">{s.login}</Link>
            <Link to="/auth?tab=register" className="home-btn-accent text-sm px-6 py-2.5">{s.register}</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="home-hero flex-1 flex flex-col">
        <div className="home-hero-bg" />
        <div className="home-container relative z-10 flex-1 flex items-center">
          <div className="grid lg:grid-cols-2 gap-12 items-center w-full">
            <div className="home-slide-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--h-accent)]/10 border border-[var(--h-accent)]/20 mb-6">
                <div className="w-2 h-2 rounded-full bg-[var(--h-accent)] animate-pulse" />
                <span className="text-sm font-medium text-[var(--h-accent)]">{s.badge}</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-[var(--h-fg)] mb-4">
                {s.heroTitle1}<br />
                <span className="text-[var(--h-accent)]">{s.heroTitle2}</span>
              </h1>

              <p className="text-base md:text-lg text-[var(--h-muted)] mb-8 max-w-lg leading-relaxed">{s.heroDesc}</p>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/auth?tab=register" className="home-btn-accent text-base px-8 py-3.5 flex items-center justify-center gap-2">
                  {s.heroBtn}
                  <IconArrowRight />
                </Link>
                <button
                  onClick={install}
                  className="text-base px-8 py-3.5 flex items-center justify-center gap-2 rounded-full border-2 border-[var(--h-accent)] text-[var(--h-accent)] font-semibold hover:bg-[var(--h-accent)]/10 transition-colors"
                >
                  <IconDownload />
                  {s.installBtn}
                </button>
              </div>
            </div>

            <div className="hidden lg:flex justify-center home-slide-up" style={{ animationDelay: '200ms' }}>
              <OrbitalDemo />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="relative z-10 py-4 border-t border-[var(--h-border)]">
          <div className="home-container">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-[var(--h-muted)]">&copy; 2026 FOMO Chat</p>
              <div className="flex items-center gap-4 text-xs">
                <Link to="/privacy" className="text-[var(--h-muted)] hover:text-[var(--h-accent)] transition-colors">{s.footer.privacy}</Link>
                <Link to="/terms" className="text-[var(--h-muted)] hover:text-[var(--h-accent)] transition-colors">{s.footer.terms}</Link>
                <a href="mailto:support@fomo.broker" className="text-[var(--h-muted)] hover:text-[var(--h-accent)] transition-colors">{s.footer.support}</a>
              </div>
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}
