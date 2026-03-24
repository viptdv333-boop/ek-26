import { useState, useRef, useEffect, useCallback } from 'react';
import { authApi, usersApi } from '../services/api/endpoints';
import { useAuthStore } from '../stores/authStore';

const TELEGRAM_BOT_NAME = 'chat_fomo_bot';

type Tab = 'login' | 'register';
type Step = 'form' | 'code' | 'emailWait' | 'setPassword' | 'profile';

export function AuthPage() {
  const [tab, setTab] = useState<Tab>('login');
  const [step, setStep] = useState<Step>('form');

  // Form fields
  const [phone, setPhone] = useState('+7');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Code verification
  const [code, setCode] = useState(['', '', '', '']);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [countdown, setCountdown] = useState(0);

  // Set password fields (separate from register password)
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');

  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const tgContainerRef = useRef<HTMLDivElement | null>(null);
  const login = useAuthStore((s) => s.login);

  // ── Telegram auth ──────────────────────────────────────────────
  const handleTelegramAuth = useCallback(
    async (tgUser: Record<string, string | number>) => {
      setError('');
      setLoading(true);
      try {
        const res = await authApi.telegramLogin(tgUser);
        if ((res as any).needsPassword) {
          useAuthStore.getState().setTokens(res.accessToken, res.refreshToken);
          setStep('setPassword');
        } else if (res.isNewUser) {
          useAuthStore.getState().setTokens(res.accessToken, res.refreshToken);
          setStep('profile');
        } else {
          login(res.accessToken, res.refreshToken, res.user);
        }
      } catch (e: any) {
        setError(e.message || 'Ошибка авторизации через Telegram');
      } finally {
        setLoading(false);
      }
    },
    [login],
  );

  // Mount Telegram Login Widget
  useEffect(() => {
    if (step !== 'form' || !tgContainerRef.current) return;

    (window as any).onTelegramAuth = handleTelegramAuth;

    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.setAttribute('data-telegram-login', TELEGRAM_BOT_NAME);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '12');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');

    tgContainerRef.current.innerHTML = '';
    tgContainerRef.current.appendChild(script);

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, [step, tab, handleTelegramAuth]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  // ── Switch tabs ────────────────────────────────────────────────
  const switchTab = (t: Tab) => {
    setTab(t);
    setStep('form');
    setError('');
    setCode(['', '', '', '']);
  };

  // ── Login ──────────────────────────────────────────────────────
  const handleLogin = async () => {
    if (phone.length < 12) {
      setError('Введите номер в формате +7XXXXXXXXXX');
      return;
    }
    if (!password) {
      setError('Введите пароль');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(phone, password);
      login(res.accessToken, res.refreshToken, res.user);
    } catch (e: any) {
      setError(e.message || 'Неверный номер или пароль');
    } finally {
      setLoading(false);
    }
  };

  // ── Register ───────────────────────────────────────────────────
  const handleRegister = async () => {
    if (phone.length < 12) {
      setError('Введите номер в формате +7XXXXXXXXXX');
      return;
    }
    if (!email) {
      setError('Введите email');
      return;
    }
    if (!password || password.length < 6) {
      setError('Пароль минимум 6 символов');
      return;
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.register({ phone, email, password, confirmPassword });
      setStep('code');
      setCountdown(60);
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    } catch (e: any) {
      setError(e.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  // ── Code input ─────────────────────────────────────────────────
  const handleCodeInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...code];
    next[index] = value.slice(-1);
    setCode(next);
    if (value && index < 3) {
      codeRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d) && next.join('').length === 4) {
      verifyPhone(next.join(''));
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length === 4) {
      e.preventDefault();
      const next = pasted.split('');
      setCode(next);
      codeRefs.current[3]?.focus();
      verifyPhone(pasted);
    }
  };

  const verifyPhone = async (fullCode: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await authApi.registerVerifyPhone(phone, fullCode);
      if (res.isNewUser) {
        useAuthStore.getState().setTokens(res.accessToken, res.refreshToken);
        setStep('profile');
      } else {
        login(res.accessToken, res.refreshToken, res.user);
      }
    } catch (e: any) {
      setError('Неверный код');
      setCode(['', '', '', '']);
      codeRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setLoading(true);
    try {
      await authApi.register({ phone, email, password, confirmPassword });
      setCountdown(60);
    } catch (e: any) {
      setError(e.message || 'Ошибка повторной отправки');
    } finally {
      setLoading(false);
    }
  };

  // ── Email confirmed → login ────────────────────────────────────
  const handleEmailConfirmed = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(phone, password);
      login(res.accessToken, res.refreshToken, res.user);
    } catch (e: any) {
      setError(e.message || 'Email ещё не подтверждён или неверные данные');
    } finally {
      setLoading(false);
    }
  };

  // ── Set password ───────────────────────────────────────────────
  const handleSetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('Пароль минимум 6 символов');
      return;
    }
    if (newPassword !== newConfirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.setPassword(newPassword, newConfirmPassword);
      const profile = await usersApi.getProfile();
      const { token, refreshToken } = useAuthStore.getState();
      login(token!, refreshToken!, profile);
    } catch (e: any) {
      setError(e.message || 'Ошибка сохранения пароля');
    } finally {
      setLoading(false);
    }
  };

  // ── Profile ────────────────────────────────────────────────────
  const handleSetProfile = async () => {
    if (!displayName.trim()) {
      setError('Введите имя');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await usersApi.updateProfile({ displayName: displayName.trim() });
      const profile = await usersApi.getProfile();
      const { token, refreshToken } = useAuthStore.getState();
      login(token!, refreshToken!, profile);
    } catch (e: any) {
      setError(e.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  // ── Shared UI pieces ──────────────────────────────────────────
  const inputClass =
    'w-full px-4 py-3 bg-dark-700 border border-dark-500 rounded-xl text-white focus:outline-none focus:border-accent transition-colors';
  const btnClass =
    'w-full py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-xl text-white font-medium transition-colors';
  const linkClass = 'text-accent text-sm hover:text-accent-hover cursor-pointer';

  const renderDivider = () => (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-dark-500" />
      <span className="text-gray-500 text-sm">или</span>
      <div className="flex-1 h-px bg-dark-500" />
    </div>
  );

  const renderTelegram = () => (
    <div ref={tgContainerRef} className="flex justify-center" />
  );

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo-fomo.png" alt="FOMO" className="h-20 mx-auto mb-4" />
        </div>

        {/* ── FORM step (Login / Register tabs) ─────────────────── */}
        {step === 'form' && (
          <>
            {/* Tabs */}
            <div className="flex mb-6 bg-dark-700 rounded-xl p-1">
              <button
                onClick={() => switchTab('login')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  tab === 'login'
                    ? 'bg-accent text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Вход
              </button>
              <button
                onClick={() => switchTab('register')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  tab === 'register'
                    ? 'bg-accent text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Регистрация
              </button>
            </div>

            {/* ── Login form ──────────────────────────────────── */}
            {tab === 'login' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Номер телефона</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    placeholder="+7 999 123 45 67"
                    className={inputClass + ' text-lg tracking-wider'}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Пароль</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    placeholder="Пароль"
                    className={inputClass}
                  />
                </div>
                <button onClick={handleLogin} disabled={loading} className={btnClass}>
                  {loading ? 'Вход...' : 'Войти'}
                </button>

                {renderDivider()}
                {renderTelegram()}

                <p className="text-center text-gray-500 text-sm">
                  Нет аккаунта?{' '}
                  <span onClick={() => switchTab('register')} className={linkClass}>
                    Зарегистрироваться
                  </span>
                </p>
              </div>
            )}

            {/* ── Register form ───────────────────────────────── */}
            {tab === 'register' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Номер телефона</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 999 123 45 67"
                    className={inputClass + ' text-lg tracking-wider'}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Пароль</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Подтвердите пароль</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                    placeholder="Ещё раз"
                    className={inputClass}
                  />
                </div>
                <button onClick={handleRegister} disabled={loading} className={btnClass}>
                  {loading ? 'Отправка...' : 'Получить код'}
                </button>

                {renderDivider()}
                {renderTelegram()}

                <p className="text-center text-gray-500 text-sm">
                  Уже есть аккаунт?{' '}
                  <span onClick={() => switchTab('login')} className={linkClass}>
                    Войти
                  </span>
                </p>
              </div>
            )}
          </>
        )}

        {/* ── CODE verification step ────────────────────────────── */}
        {step === 'code' && (
          <div className="space-y-4">
            <p className="text-center text-gray-400 text-sm">
              Мы позвоним на <span className="text-white">{phone}</span>,<br />
              введите последние 4 цифры
            </p>
            <div className="flex gap-3 justify-center">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    codeRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeInput(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  onPaste={i === 0 ? handleCodePaste : undefined}
                  className="w-14 h-16 text-center text-2xl font-mono bg-dark-700 border border-dark-500 rounded-xl text-white focus:outline-none focus:border-accent transition-colors"
                />
              ))}
            </div>
            <div className="text-center">
              {countdown > 0 ? (
                <span className="text-gray-500 text-sm">
                  Повторная отправка через {countdown}с
                </span>
              ) : (
                <button onClick={handleResendCode} className={linkClass}>
                  Отправить код повторно
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setStep('form');
                setCode(['', '', '', '']);
              }}
              className="w-full text-center text-gray-500 text-sm hover:text-gray-300"
            >
              Изменить номер
            </button>
          </div>
        )}

        {/* ── EMAIL wait step ───────────────────────────────────── */}
        {step === 'emailWait' && (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-4">📧</div>
              <p className="text-white text-lg font-medium mb-2">Проверьте почту</p>
              <p className="text-gray-400 text-sm">
                Мы отправили ссылку для подтверждения на{' '}
                <span className="text-white">{email}</span>
              </p>
            </div>
            <button onClick={handleEmailConfirmed} disabled={loading} className={btnClass}>
              {loading ? 'Проверяем...' : 'Я подтвердил email'}
            </button>
            <button
              onClick={() => {
                setStep('form');
                setTab('register');
              }}
              className="w-full text-center text-gray-500 text-sm hover:text-gray-300"
            >
              Назад
            </button>
          </div>
        )}

        {/* ── SET PASSWORD step ─────────────────────────────────── */}
        {step === 'setPassword' && (
          <div className="space-y-4">
            <p className="text-center text-white text-lg font-medium mb-2">Задать пароль</p>
            <p className="text-center text-gray-400 text-sm mb-4">
              Придумайте пароль для входа
            </p>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Пароль</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                className={inputClass}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Подтвердите пароль</label>
              <input
                type="password"
                value={newConfirmPassword}
                onChange={(e) => setNewConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
                placeholder="Ещё раз"
                className={inputClass}
              />
            </div>
            <button onClick={handleSetPassword} disabled={loading} className={btnClass}>
              {loading ? 'Сохранение...' : 'Сохранить пароль'}
            </button>
          </div>
        )}

        {/* ── PROFILE step ──────────────────────────────────────── */}
        {step === 'profile' && (
          <div className="space-y-4">
            <p className="text-center text-gray-400 text-sm">Как вас зовут?</p>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSetProfile()}
              placeholder="Имя"
              className={inputClass}
              autoFocus
            />
            <button onClick={handleSetProfile} disabled={loading} className={btnClass}>
              {loading ? 'Сохранение...' : 'Продолжить'}
            </button>
          </div>
        )}

        {/* Error */}
        {error && <p className="mt-4 text-center text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  );
}
