import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

/* ─── i18n для лендинга ─── */
type Lang = 'ru' | 'en' | 'zh';
const t = (lang: Lang) => ({
  ru: {
    nav: { features: 'Возможности', security: 'Безопасность', download: 'Скачать', login: 'Войти', register: 'Регистрация' },
    badge: 'Безопасный мессенджер',
    heroTitle1: 'Общение без',
    heroTitle2: 'компромиссов',
    heroDesc: 'Мессенджер с шифрованием, звонками, автопереводом и синхронизацией контактов. Всё, что нужно — в одном приложении.',
    heroBtn: 'Начать бесплатно',
    heroBtn2: 'Узнать больше',
    stats: { e2e: 'Шифрование', hd: 'Видеозвонки', langs: 'Языка перевода', files: 'Размер файлов' },
    featTitle: 'Всё для общения',
    featDesc: 'Мессенджер, который сочетает удобный дизайн с мощными функциями',
    feat1: { t: 'Умные чаты', d: 'Групповые и личные чаты, ответы, пересылка, редактирование, реакции. Всё работает мгновенно.' },
    feat2: { t: 'Безопасность', d: 'End-to-end шифрование сообщений. Ваши данные остаются только вашими.' },
    feat3: { t: 'Звонки и видео', d: 'HD видео и голосовые звонки. Голосовые сообщения с визуализацией.' },
    feat4: { t: 'Автоперевод', d: 'Мгновенный перевод сообщений на русский, английский и китайский языки.' },
    feat5: { t: 'Синхронизация', d: 'Импорт контактов из Google, телефонной книги. Имена и аватары подтягиваются автоматически.' },
    feat6: { t: 'Мгновенная доставка', d: 'WebSocket в реальном времени. Статусы: отправлено, доставлено, прочитано.' },
    secBadge: 'Защищено',
    secTitle1: 'Ваша приватность —',
    secTitle2: 'наш приоритет',
    secDesc: 'FOMO Chat использует современные протоколы шифрования. Сообщения зашифрованы от отправителя до получателя — даже мы не можем их прочитать.',
    secList: ['End-to-end шифрование всех сообщений', 'Нет доступа к переписке на сервере', 'Безопасная авторизация по SMS + OAuth', 'Код подтверждения с ограниченным временем жизни'],
    ctaTitle: 'Начните общаться прямо сейчас',
    ctaDesc: 'Регистрация за 30 секунд. Никаких паролей — только номер телефона и код подтверждения.',
    ctaBtn: 'Открыть FOMO Chat',
    ctaSub: 'Бесплатно • Без рекламы • Без ограничений',
    footer: { privacy: 'Конфиденциальность', terms: 'Условия использования', support: 'Поддержка' },
    mockOnline: 'в сети',
    mockInput: 'Введите сообщение...',
    mockM1: 'Привет! Как дела? 😊',
    mockM2: 'Всё отлично! Встретимся в 15:00?',
    mockM3: 'Договорились! 🎉',
    mockM4: 'Жду!',
  },
  en: {
    nav: { features: 'Features', security: 'Security', download: 'Download', login: 'Sign in', register: 'Sign up' },
    badge: 'Secure Messenger',
    heroTitle1: 'Communication',
    heroTitle2: 'without limits',
    heroDesc: 'Messenger with encryption, calls, auto-translation, and contact sync. Everything you need — in one app.',
    heroBtn: 'Get started free',
    heroBtn2: 'Learn more',
    stats: { e2e: 'Encryption', hd: 'Video calls', langs: 'Translation langs', files: 'File size' },
    featTitle: 'Everything for communication',
    featDesc: 'A messenger that combines great design with powerful features',
    feat1: { t: 'Smart chats', d: 'Group and private chats, replies, forwarding, editing, reactions. Everything works instantly.' },
    feat2: { t: 'Security', d: 'End-to-end message encryption. Your data stays yours.' },
    feat3: { t: 'Calls & video', d: 'HD video and voice calls. Voice messages with visualization.' },
    feat4: { t: 'Auto-translate', d: 'Instant message translation to Russian, English, and Chinese.' },
    feat5: { t: 'Sync', d: 'Import contacts from Google, phone book. Names and avatars are pulled automatically.' },
    feat6: { t: 'Instant delivery', d: 'Real-time WebSocket. Statuses: sent, delivered, read.' },
    secBadge: 'Protected',
    secTitle1: 'Your privacy —',
    secTitle2: 'our priority',
    secDesc: 'FOMO Chat uses modern encryption protocols. Messages are encrypted end-to-end — even we cannot read them.',
    secList: ['End-to-end encryption of all messages', 'No server access to conversations', 'Secure SMS + OAuth authorization', 'Time-limited verification codes'],
    ctaTitle: 'Start chatting right now',
    ctaDesc: 'Sign up in 30 seconds. No passwords — just your phone number and a verification code.',
    ctaBtn: 'Open FOMO Chat',
    ctaSub: 'Free • No ads • No limits',
    footer: { privacy: 'Privacy Policy', terms: 'Terms of Service', support: 'Support' },
    mockOnline: 'online',
    mockInput: 'Type a message...',
    mockM1: 'Hey! How are you? 😊',
    mockM2: 'Great! Meet at 3pm?',
    mockM3: 'Deal! 🎉',
    mockM4: "Can't wait!",
  },
  zh: {
    nav: { features: '功能', security: '安全', download: '下载', login: '登录', register: '注册' },
    badge: '安全通讯',
    heroTitle1: '无妥协的',
    heroTitle2: '沟通体验',
    heroDesc: '加密通讯、通话、自动翻译和联系人同步。一个应用，满足所有需求。',
    heroBtn: '免费开始',
    heroBtn2: '了解更多',
    stats: { e2e: '加密', hd: '视频通话', langs: '翻译语言', files: '文件大小' },
    featTitle: '沟通所需的一切',
    featDesc: '将出色设计与强大功能完美结合的通讯工具',
    feat1: { t: '智能聊天', d: '群聊和私聊，回复、转发、编辑、表情反应。一切即时响应。' },
    feat2: { t: '安全性', d: '端到端消息加密。您的数据只属于您自己。' },
    feat3: { t: '通话和视频', d: '高清视频和语音通话。语音消息带可视化。' },
    feat4: { t: '自动翻译', d: '即时将消息翻译为俄语、英语和中文。' },
    feat5: { t: '同步', d: '从Google、通讯录导入联系人。自动获取名称和头像。' },
    feat6: { t: '即时送达', d: '实时WebSocket。状态：已发送、已送达、已读。' },
    secBadge: '受保护',
    secTitle1: '您的隐私 —',
    secTitle2: '是我们的首要任务',
    secDesc: 'FOMO Chat 使用现代加密协议。消息端到端加密 — 即使我们也无法读取。',
    secList: ['所有消息端到端加密', '服务器无法访问对话内容', '安全的短信 + OAuth 授权', '限时验证码'],
    ctaTitle: '现在就开始聊天',
    ctaDesc: '30秒注册。无需密码 — 只需手机号和验证码。',
    ctaBtn: '打开 FOMO Chat',
    ctaSub: '免费 • 无广告 • 无限制',
    footer: { privacy: '隐私政策', terms: '使用条款', support: '支持' },
    mockOnline: '在线',
    mockInput: '输入消息...',
    mockM1: '你好！最近怎么样？😊',
    mockM2: '很好！下午3点见？',
    mockM3: '说定了！🎉',
    mockM4: '期待！',
  },
})[lang];

/* ─── SVG Icons ─── */
const IconChat = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    <path d="M8 10h.01" /><path d="M12 10h.01" /><path d="M16 10h.01" />
  </svg>
);
const IconShield = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);
const IconVideo = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);
const IconGlobe = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
const IconUsers = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const IconZap = () => (
  <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
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

/* ─── Feature Card ─── */
function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode; title: string; desc: string; delay: number }) {
  return (
    <div className="home-card group" style={{ animationDelay: `${delay}ms` }}>
      <div className="home-card-icon">{icon}</div>
      <h3 className="text-lg font-semibold text-[var(--h-fg)] mb-2">{title}</h3>
      <p className="text-sm leading-relaxed text-[var(--h-muted)]">{desc}</p>
    </div>
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

/* ─── Stat counter ─── */
function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-3xl md:text-4xl font-bold text-[var(--h-accent)]">{value}</p>
      <p className="text-sm text-[var(--h-muted)] mt-1">{label}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export function HomePage() {
  const [scrollY, setScrollY] = useState(0);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('ek26_home_theme') === 'dark');
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('ek26_home_lang');
    if (saved === 'en' || saved === 'zh') return saved;
    return 'ru';
  });

  const s = t(lang);

  useEffect(() => {
    localStorage.setItem('ek26_home_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('ek26_home_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`home-page ${isDark ? 'home-dark' : 'home-light'}`}>
      {/* ── NAV ── */}
      <nav className={`home-nav ${scrollY > 40 ? 'home-nav-scrolled' : ''}`}>
        <div className="home-container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img src="/logo-f.png" alt="FOMO Chat" className="h-10 w-auto" />
            <span className="text-xl font-bold tracking-tight text-[var(--h-fg)]">FOMO <span className="text-[var(--h-accent)]">Chat</span></span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-[var(--h-muted)] hover:text-[var(--h-fg)] transition-colors">{s.nav.features}</a>
            <a href="#security" className="text-sm text-[var(--h-muted)] hover:text-[var(--h-fg)] transition-colors">{s.nav.security}</a>
            <a href="#download" className="text-sm text-[var(--h-muted)] hover:text-[var(--h-fg)] transition-colors">{s.nav.download}</a>
          </div>

          <div className="flex items-center gap-3">
            <LangSwitcher lang={lang} setLang={setLang} />
            <ThemeSwitcher dark={isDark} toggle={() => setIsDark(!isDark)} />
            <Link to="/auth" className="text-sm font-medium text-[var(--h-muted)] hover:text-[var(--h-fg)] transition-colors hidden sm:inline">{s.nav.login}</Link>
            <Link to="/auth" className="home-btn-accent text-sm px-5 py-2.5">{s.nav.register}</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="home-hero">
        <div className="home-hero-bg" />
        <div className="home-container relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-4rem)] py-20">
            <div className="home-slide-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--h-accent)]/10 border border-[var(--h-accent)]/20 mb-8">
                <div className="w-2 h-2 rounded-full bg-[var(--h-accent)] animate-pulse" />
                <span className="text-sm font-medium text-[var(--h-accent)]">{s.badge}</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-[var(--h-fg)] mb-6">
                {s.heroTitle1}<br />
                <span className="text-[var(--h-accent)]">{s.heroTitle2}</span>
              </h1>

              <p className="text-lg md:text-xl text-[var(--h-muted)] mb-10 max-w-lg leading-relaxed">{s.heroDesc}</p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth" className="home-btn-accent text-base px-8 py-4 flex items-center justify-center gap-2">
                  {s.heroBtn}
                  <IconArrowRight />
                </Link>
                <a href="#features" className="home-btn-secondary text-base px-8 py-4 flex items-center justify-center">{s.heroBtn2}</a>
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
      </section>

      {/* ── STATS ── */}
      <section className="py-16 border-y border-[var(--h-border)] bg-[var(--h-card)]">
        <div className="home-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatItem value="E2E" label={s.stats.e2e} />
            <StatItem value="HD" label={s.stats.hd} />
            <StatItem value="3" label={s.stats.langs} />
            <StatItem value="∞" label={s.stats.files} />
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24">
        <div className="home-container">
          <div className="text-center mb-16 home-slide-up">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--h-fg)] mb-4">{s.featTitle}</h2>
            <p className="text-lg text-[var(--h-muted)] max-w-2xl mx-auto">{s.featDesc}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard icon={<IconChat />} title={s.feat1.t} desc={s.feat1.d} delay={0} />
            <FeatureCard icon={<IconShield />} title={s.feat2.t} desc={s.feat2.d} delay={100} />
            <FeatureCard icon={<IconVideo />} title={s.feat3.t} desc={s.feat3.d} delay={200} />
            <FeatureCard icon={<IconGlobe />} title={s.feat4.t} desc={s.feat4.d} delay={300} />
            <FeatureCard icon={<IconUsers />} title={s.feat5.t} desc={s.feat5.d} delay={400} />
            <FeatureCard icon={<IconZap />} title={s.feat6.t} desc={s.feat6.d} delay={500} />
          </div>
        </div>
      </section>

      {/* ── SECURITY ── */}
      <section id="security" className="py-24 bg-[var(--h-card)]">
        <div className="home-container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="home-slide-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-emerald-500">{s.secBadge}</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--h-fg)] mb-6">
                {s.secTitle1}<br />{s.secTitle2}
              </h2>
              <p className="text-lg text-[var(--h-muted)] mb-8 leading-relaxed">{s.secDesc}</p>
              <ul className="space-y-4">
                {s.secList.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                    </div>
                    <span className="text-[var(--h-fg)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-center home-slide-up" style={{ animationDelay: '200ms' }}>
              <div className="home-shield-visual">
                <div className="home-shield-ring home-shield-ring-1" />
                <div className="home-shield-ring home-shield-ring-2" />
                <div className="home-shield-ring home-shield-ring-3" />
                <div className="home-shield-center">
                  <svg viewBox="0 0 24 24" className="w-16 h-16 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section id="download" className="py-24">
        <div className="home-container text-center">
          <div className="max-w-2xl mx-auto home-slide-up">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--h-fg)] mb-6">{s.ctaTitle}</h2>
            <p className="text-lg text-[var(--h-muted)] mb-10">{s.ctaDesc}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth" className="home-btn-accent text-lg px-10 py-4 flex items-center justify-center gap-2">
                {s.ctaBtn}
                <IconArrowRight />
              </Link>
            </div>
            <p className="text-sm text-[var(--h-muted)] mt-6">{s.ctaSub}</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 border-t border-[var(--h-border)] bg-[var(--h-card)]">
        <div className="home-container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/logo-f.png" alt="FOMO Chat" className="h-8 w-auto" />
              <span className="font-bold text-[var(--h-fg)]">FOMO <span className="text-[var(--h-accent)]">Chat</span></span>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <Link to="/privacy" className="text-[var(--h-muted)] hover:text-[var(--h-accent)] transition-colors">{s.footer.privacy}</Link>
              <Link to="/terms" className="text-[var(--h-muted)] hover:text-[var(--h-accent)] transition-colors">{s.footer.terms}</Link>
              <a href="mailto:support@fomo.broker" className="text-[var(--h-muted)] hover:text-[var(--h-accent)] transition-colors">{s.footer.support}</a>
            </div>

            <p className="text-sm text-[var(--h-muted)]">&copy; 2026 FOMO Chat</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
