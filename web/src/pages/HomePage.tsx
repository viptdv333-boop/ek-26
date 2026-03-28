import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

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

/* ─── Feature Card ─── */
function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode; title: string; desc: string; delay: number }) {
  return (
    <div
      className="home-card group"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="home-card-icon">{icon}</div>
      <h3 className="text-lg font-semibold text-[var(--h-fg)] mb-2">{title}</h3>
      <p className="text-sm leading-relaxed text-[var(--h-muted)]">{desc}</p>
    </div>
  );
}

/* ─── Floating chat mock ─── */
function ChatMock() {
  return (
    <div className="home-mock-chat">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[var(--h-border)]">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white text-sm font-bold">А</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--h-fg)]">Анна</p>
          <p className="text-xs text-emerald-500">в сети</p>
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--h-secondary)] flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-[var(--h-muted)]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72" /></svg>
          </div>
        </div>
      </div>
      {/* Messages */}
      <div className="px-4 py-4 space-y-3 flex-1">
        <div className="flex justify-start">
          <div className="home-bubble-received">Привет! Как дела? 😊</div>
        </div>
        <div className="flex justify-end">
          <div className="home-bubble-sent">Всё отлично! Встретимся в 15:00?</div>
        </div>
        <div className="flex justify-start">
          <div className="home-bubble-received">Договорились! 🎉</div>
        </div>
        <div className="flex justify-end">
          <div className="home-bubble-sent">
            <span className="flex items-center gap-1">
              Жду!
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-blue-300 inline-block ml-1" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /><path d="M15 6L4 17" /></svg>
            </span>
          </div>
        </div>
      </div>
      {/* Input */}
      <div className="px-4 py-3 border-t border-[var(--h-border)]">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-10 rounded-xl bg-[var(--h-secondary)] px-4 flex items-center">
            <span className="text-sm text-[var(--h-muted)]">Введите сообщение...</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[var(--h-primary)] flex items-center justify-center">
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

/* ─── Main page ─── */
export function HomePage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    // Unlock scroll for landing page (app normally locks it)
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    html.style.height = 'auto';
    html.style.overflow = 'auto';
    html.style.position = 'static';
    body.style.height = 'auto';
    body.style.overflow = 'auto';
    body.style.position = 'static';
    if (root) { root.style.height = 'auto'; root.style.overflow = 'auto'; }

    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      // Restore app defaults
      html.style.height = '';
      html.style.overflow = '';
      html.style.position = '';
      body.style.height = '';
      body.style.overflow = '';
      body.style.position = '';
      if (root) { root.style.height = ''; root.style.overflow = ''; }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="home-page">
      {/* ── NAV ── */}
      <nav className={`home-nav ${scrollY > 40 ? 'home-nav-scrolled' : ''}`}>
        <div className="home-container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-[var(--h-primary)] flex items-center justify-center">
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--h-accent)] border-2 border-[var(--h-bg)]" />
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-[var(--h-fg)]">FOMO <span className="text-[var(--h-accent)]">Chat</span></span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-[var(--h-muted)] hover:text-[var(--h-fg)] transition-colors">Возможности</a>
            <a href="#security" className="text-sm text-[var(--h-muted)] hover:text-[var(--h-fg)] transition-colors">Безопасность</a>
            <a href="#download" className="text-sm text-[var(--h-muted)] hover:text-[var(--h-fg)] transition-colors">Скачать</a>
          </div>

          <Link
            to="/auth"
            className="home-btn-primary text-sm px-6 py-2.5"
          >
            Войти
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="home-hero">
        <div className="home-hero-bg" />
        <div className="home-container relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-4rem)] py-20">
            {/* Left */}
            <div className="home-slide-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--h-accent)]/10 border border-[var(--h-accent)]/20 mb-8">
                <div className="w-2 h-2 rounded-full bg-[var(--h-accent)] animate-pulse" />
                <span className="text-sm font-medium text-[var(--h-accent)]">Premium Messenger</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-[var(--h-fg)] mb-6">
                Общение без<br />
                <span className="text-[var(--h-accent)]">компромиссов</span>
              </h1>

              <p className="text-lg md:text-xl text-[var(--h-muted)] mb-10 max-w-lg leading-relaxed">
                Безопасный мессенджер с шифрованием, звонками, автопереводом и синхронизацией контактов. Всё, что нужно — в одном приложении.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  to="/auth"
                  className="home-btn-accent text-base px-8 py-4 flex items-center justify-center gap-2"
                >
                  Начать бесплатно
                  <IconArrowRight />
                </Link>
                <a
                  href="#features"
                  className="home-btn-secondary text-base px-8 py-4 flex items-center justify-center"
                >
                  Узнать больше
                </a>
              </div>
            </div>

            {/* Right — Chat mock */}
            <div className="hidden lg:flex justify-center home-slide-up" style={{ animationDelay: '200ms' }}>
              <div className="relative">
                <div className="home-mock-glow" />
                <ChatMock />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 border-y border-[var(--h-border)] bg-[var(--h-card)]">
        <div className="home-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatItem value="E2E" label="Шифрование" />
            <StatItem value="HD" label="Видеозвонки" />
            <StatItem value="3" label="Языка перевода" />
            <StatItem value="∞" label="Размер файлов" />
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24">
        <div className="home-container">
          <div className="text-center mb-16 home-slide-up">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--h-fg)] mb-4">Всё для общения</h2>
            <p className="text-lg text-[var(--h-muted)] max-w-2xl mx-auto">Мы создали мессенджер, который сочетает премиальный дизайн с мощными функциями</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<IconChat />}
              title="Умные чаты"
              desc="Групповые и личные чаты, ответы, пересылка, редактирование, реакции. Всё работает мгновенно."
              delay={0}
            />
            <FeatureCard
              icon={<IconShield />}
              title="Безопасность"
              desc="End-to-end шифрование сообщений. Ваши данные остаются только вашими."
              delay={100}
            />
            <FeatureCard
              icon={<IconVideo />}
              title="Звонки и видео"
              desc="HD видео и голосовые звонки. Голосовые сообщения с визуализацией."
              delay={200}
            />
            <FeatureCard
              icon={<IconGlobe />}
              title="Автоперевод"
              desc="Мгновенный перевод сообщений на русский, английский и китайский языки."
              delay={300}
            />
            <FeatureCard
              icon={<IconUsers />}
              title="Синхронизация"
              desc="Импорт контактов из Google, телефонной книги. Имена и аватары подтягиваются автоматически."
              delay={400}
            />
            <FeatureCard
              icon={<IconZap />}
              title="Мгновенная доставка"
              desc="WebSocket в реальном времени. Статусы: отправлено, доставлено, прочитано."
              delay={500}
            />
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
                <span className="text-sm font-medium text-emerald-500">Защищено</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-[var(--h-fg)] mb-6">
                Ваша приватность — <br />наш приоритет
              </h2>
              <p className="text-lg text-[var(--h-muted)] mb-8 leading-relaxed">
                FOMO Chat использует современные протоколы шифрования. Сообщения зашифрованы от отправителя до получателя — даже мы не можем их прочитать.
              </p>
              <ul className="space-y-4">
                {[
                  'End-to-end шифрование всех сообщений',
                  'Нет доступа к переписке на сервере',
                  'Безопасная авторизация по SMS + OAuth',
                  'Код подтверждения с ограниченным временем жизни',
                ].map((item, i) => (
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
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--h-fg)] mb-6">
              Начните общаться прямо сейчас
            </h2>
            <p className="text-lg text-[var(--h-muted)] mb-10">
              Регистрация за 30 секунд. Никаких паролей — только номер телефона и код подтверждения.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/auth"
                className="home-btn-accent text-lg px-10 py-4 flex items-center justify-center gap-2"
              >
                Открыть FOMO Chat
                <IconArrowRight />
              </Link>
            </div>
            <p className="text-sm text-[var(--h-muted)] mt-6">Бесплатно • Без рекламы • Без ограничений</p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-10 border-t border-[var(--h-border)] bg-[var(--h-card)]">
        <div className="home-container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-xl bg-[var(--h-primary)] flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              </div>
              <span className="font-bold text-[var(--h-fg)]">FOMO <span className="text-[var(--h-accent)]">Chat</span></span>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <Link to="/privacy" className="text-[var(--h-muted)] hover:text-[var(--h-accent)] transition-colors">Конфиденциальность</Link>
              <Link to="/terms" className="text-[var(--h-muted)] hover:text-[var(--h-accent)] transition-colors">Условия</Link>
              <a href="mailto:support@fomo.broker" className="text-[var(--h-muted)] hover:text-[var(--h-accent)] transition-colors">Поддержка</a>
            </div>

            <p className="text-sm text-[var(--h-muted)]">&copy; 2026 FOMO Chat</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
