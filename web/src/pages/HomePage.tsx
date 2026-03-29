import { Link } from 'react-router-dom';
import { useState } from 'react';


/* ─── i18n для лендинга ─── */
type Lang = 'ru' | 'en' | 'zh';
const t = (lang: Lang) => ({
  ru: {
    login: 'Войти', register: 'Регистрация',
    badge: 'Безопасный мессенджер',
    heroTitle1: 'Общение без',
    heroTitle2: 'компромиссов',
    heroDesc: 'Мессенджер с шифрованием, звонками, автопереводом и синхронизацией контактов.',
    heroBtn: 'Начать бесплатно',
    footer: { privacy: 'Конфиденциальность', terms: 'Условия использования', support: 'Поддержка' },
    mockOnline: 'в сети', mockInput: 'Введите сообщение...',
    mockM1: 'Привет! Как дела? 😊', mockM2: 'Всё отлично! Встретимся в 15:00?',
    mockM3: 'Договорились! 🎉', mockM4: 'Жду!',
  },
  en: {
    login: 'Sign in', register: 'Sign up',
    badge: 'Secure Messenger',
    heroTitle1: 'Communication',
    heroTitle2: 'without limits',
    heroDesc: 'Messenger with encryption, calls, auto-translation, and contact sync.',
    heroBtn: 'Get started free',
    footer: { privacy: 'Privacy Policy', terms: 'Terms of Service', support: 'Support' },
    mockOnline: 'online', mockInput: 'Type a message...',
    mockM1: 'Hey! How are you? 😊', mockM2: 'Great! Meet at 3pm?',
    mockM3: 'Deal! 🎉', mockM4: "Can't wait!",
  },
  zh: {
    login: '登录', register: '注册',
    badge: '安全通讯',
    heroTitle1: '无妥协的',
    heroTitle2: '沟通体验',
    heroDesc: '加密通讯、通话、自动翻译和联系人同步。一个应用，满足所有需求。',
    heroBtn: '免费开始',
    footer: { privacy: '隐私政策', terms: '使用条款', support: '支持' },
    mockOnline: '在线', mockInput: '输入消息...',
    mockM1: '你好！最近怎么样？😊', mockM2: '很好！下午3点见？',
    mockM3: '说定了！🎉', mockM4: '期待！',
  },
})[lang];

/* ─── SVG Icons ─── */
const IconArrowRight = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
  </svg>
);

/* ─── Language Switcher ─── */
function LangSwitcher({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const langs: { code: Lang; label: string }[] = [
    { code: 'ru', label: 'RU' },
    { code: 'en', label: 'EN' },
    { code: 'zh', label: '中' },
  ];
  return (
    <div className="flex items-center gap-1 bg-[var(--h-secondary)] rounded-lg p-0.5 border border-[var(--h-border)]">
      {langs.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            lang === l.code
              ? 'bg-[var(--h-primary)] text-white shadow-sm'
              : 'text-[var(--h-muted)] hover:text-[var(--h-fg)]'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

/* ─── Theme Switcher ─── */
function ThemeSwitcher({ dark, toggle }: { dark: boolean; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-xl bg-[var(--h-secondary)] border border-[var(--h-border)] hover:bg-[var(--h-border)] transition-all"
      title={dark ? 'Light mode' : 'Dark mode'}
    >
      {dark ? (
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--h-fg)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-[var(--h-fg)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

/* ─── Floating chat mock ─── */
function ChatMock({ s }: { s: ReturnType<typeof t> }) {
  return (
    <div className="home-mock-chat">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--h-border)]">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white text-sm font-bold">А</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--h-fg)]">Анна</p>
          <p className="text-xs text-emerald-500">{s.mockOnline}</p>
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--h-secondary)] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--h-muted)]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72" /></svg>
          </div>
        </div>
      </div>
      <div className="px-4 py-4 space-y-3 flex-1">
        <div className="flex justify-start"><div className="home-bubble-received">{s.mockM1}</div></div>
        <div className="flex justify-end"><div className="home-bubble-sent">{s.mockM2}</div></div>
        <div className="flex justify-start"><div className="home-bubble-received">{s.mockM3}</div></div>
        <div className="flex justify-end">
          <div className="home-bubble-sent">
            <span className="flex items-center gap-1">
              {s.mockM4}
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-blue-400 inline-block ml-1" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /><path d="M15 6L4 17" /></svg>
            </span>
          </div>
        </div>
      </div>
      <div className="px-4 py-3 border-t border-[var(--h-border)]">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-10 rounded-xl bg-[var(--h-secondary)] px-4 flex items-center">
            <span className="text-sm text-[var(--h-muted)]">{s.mockInput}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[var(--h-accent)] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
          </div>
        </div>
      </div>
    </div>
  );
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

  const s = t(lang);

  const saveLang = (l: Lang) => { setLang(l); localStorage.setItem('ek26_home_lang', l); };
  const toggleTheme = () => { const d = !isDark; setIsDark(d); localStorage.setItem('ek26_home_theme', d ? 'dark' : 'light'); };

  return (
    <div className={`home-page ${isDark ? 'home-dark' : 'home-light'}`}>
      {/* ── NAV ── */}
      <nav className="flex items-center justify-between h-16 px-6 relative z-10">
        <div className="flex items-center gap-3">
          <img src="/logo-f.png" alt="FOMO Chat" className="h-10 w-auto" />
          <span className="text-xl font-bold tracking-tight text-[var(--h-fg)]">FOMO <span className="text-[var(--h-accent)]">Chat</span></span>
        </div>

        <div className="flex items-center gap-6">
          <LangSwitcher lang={lang} setLang={saveLang} />
          <ThemeSwitcher dark={isDark} toggle={toggleTheme} />
          <Link to="/auth?tab=login" className="text-sm font-medium text-[var(--h-muted)] hover:text-[var(--h-fg)] transition-colors hidden sm:inline">{s.login}</Link>
          <Link to="/auth?tab=register" className="home-btn-accent text-sm px-6 py-2.5">{s.register}</Link>
        </div>
      </nav>

      {/* ── HERO + FOOTER — single screen ── */}
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
              </div>
            </div>

            <div className="hidden lg:flex justify-center home-slide-up" style={{ animationDelay: '200ms' }}>
              <div className="relative">
                <div className="home-mock-glow" />
                <ChatMock s={s} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer inside hero — always at bottom */}
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
