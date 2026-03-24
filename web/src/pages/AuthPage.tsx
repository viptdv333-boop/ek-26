import { useState, useRef, useEffect } from 'react';
import { authApi, usersApi } from '../services/api/endpoints';
import { useAuthStore } from '../stores/authStore';

const COUNTRIES = [
  { code: '+7', flag: '🇷🇺', name: 'Россия' },
  { code: '+7', flag: '🇰🇿', name: 'Казахстан' },
  { code: '+375', flag: '🇧🇾', name: 'Беларусь' },
  { code: '+380', flag: '🇺🇦', name: 'Украина' },
  { code: '+998', flag: '🇺🇿', name: 'Узбекистан' },
  { code: '+996', flag: '🇰🇬', name: 'Кыргызстан' },
  { code: '+992', flag: '🇹🇯', name: 'Таджикистан' },
  { code: '+993', flag: '🇹🇲', name: 'Туркменистан' },
  { code: '+374', flag: '🇦🇲', name: 'Армения' },
  { code: '+995', flag: '🇬🇪', name: 'Грузия' },
  { code: '+994', flag: '🇦🇿', name: 'Азербайджан' },
  { code: '+373', flag: '🇲🇩', name: 'Молдова' },
  { code: '+370', flag: '🇱🇹', name: 'Литва' },
  { code: '+371', flag: '🇱🇻', name: 'Латвия' },
  { code: '+372', flag: '🇪🇪', name: 'Эстония' },
  { code: '+1', flag: '🇺🇸', name: 'США' },
  { code: '+44', flag: '🇬🇧', name: 'Великобритания' },
  { code: '+49', flag: '🇩🇪', name: 'Германия' },
  { code: '+33', flag: '🇫🇷', name: 'Франция' },
  { code: '+39', flag: '🇮🇹', name: 'Италия' },
  { code: '+34', flag: '🇪🇸', name: 'Испания' },
  { code: '+90', flag: '🇹🇷', name: 'Турция' },
  { code: '+971', flag: '🇦🇪', name: 'ОАЭ' },
  { code: '+972', flag: '🇮🇱', name: 'Израиль' },
  { code: '+86', flag: '🇨🇳', name: 'Китай' },
  { code: '+82', flag: '🇰🇷', name: 'Южная Корея' },
  { code: '+81', flag: '🇯🇵', name: 'Япония' },
  { code: '+91', flag: '🇮🇳', name: 'Индия' },
  { code: '+55', flag: '🇧🇷', name: 'Бразилия' },
  { code: '+52', flag: '🇲🇽', name: 'Мексика' },
  { code: '+61', flag: '🇦🇺', name: 'Австралия' },
];

type Tab = 'login' | 'register';
type Step = 'form' | 'code' | 'profile';

export function AuthPage() {
  const [tab, setTab] = useState<Tab>('register');
  const [step, setStep] = useState<Step>('form');
  const [theme, setTheme] = useState(() => localStorage.getItem('ek26_theme') || 'dark');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('ek26_theme', newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  // Form fields
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const countryPickerRef = useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = useState('');
  const phone = selectedCountry.code + phoneNumber.replace(/\D/g, '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Code verification
  const [code, setCode] = useState(['', '', '', '']);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [countdown, setCountdown] = useState(0);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);

  // Close country picker on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryPickerRef.current && !countryPickerRef.current.contains(e.target as Node)) {
        setShowCountryPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
    if (phoneNumber.replace(/\D/g, '').length < 6) {
      setError('Введите номер телефона');
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
    if (phoneNumber.replace(/\D/g, '').length < 6) {
      setError('Введите номер телефона');
      return;
    }
    if (!password || password.length < 6) {
      setError('Пароль минимум 6 символов');
      return;
    }
    if (!/[A-ZА-ЯЁ]/.test(password)) {
      setError('Пароль должен содержать заглавную букву');
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
      setError('Пароль должен содержать один из символов: !@#$%^&*_-');
      return;
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.register({ phone, email: email || '', password, confirmPassword });
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
      await authApi.register({ phone, email: email || '', password, confirmPassword });
      setCountdown(60);
    } catch (e: any) {
      setError(e.message || 'Ошибка повторной отправки');
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

  const filteredCountries = countrySearch
    ? COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch))
    : COUNTRIES;

  const phoneInput = (autoFocus?: boolean, onEnter?: () => void) => (
    <div className="relative" ref={countryPickerRef}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setShowCountryPicker(!showCountryPicker); setCountrySearch(''); }}
          className="flex items-center gap-1 px-3 py-3 bg-dark-700 border border-dark-500 rounded-xl text-white hover:border-accent transition-colors shrink-0"
        >
          <span className="text-lg">{selectedCountry.flag}</span>
          <span className="text-sm text-gray-400">{selectedCountry.code}</span>
          <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d\s\-()]/g, ''))}
          onKeyDown={onEnter ? (e) => e.key === 'Enter' && onEnter() : undefined}
          placeholder="999 123 45 67"
          className={inputClass + ' text-lg tracking-wider flex-1'}
          autoFocus={autoFocus}
        />
      </div>
      {showCountryPicker && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-dark-700 border border-dark-500 rounded-xl shadow-xl z-50 max-h-64 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-dark-500">
            <input
              type="text"
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              placeholder="Поиск страны..."
              className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white text-sm focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto">
            {filteredCountries.map((c, i) => (
              <button
                key={`${c.code}-${c.name}-${i}`}
                onClick={() => { setSelectedCountry(c); setShowCountryPicker(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-dark-600 transition-colors text-left ${
                  c.code === selectedCountry.code && c.name === selectedCountry.name ? 'bg-dark-600' : ''
                }`}
              >
                <span className="text-lg">{c.flag}</span>
                <span className="text-white text-sm flex-1">{c.name}</span>
                <span className="text-gray-400 text-sm">{c.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── Shared UI pieces ──────────────────────────────────────────
  const inputClass =
    'w-full px-4 py-3 bg-dark-700 border border-dark-500 rounded-xl text-white focus:outline-none focus:border-accent transition-colors';
  const btnClass =
    'w-full py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-xl text-white font-medium transition-colors';
  const linkClass = 'text-accent text-sm hover:text-accent-hover cursor-pointer';

  const eyeIcon = (show: boolean) => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      {show ? (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </>
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
      )}
    </svg>
  );

  const passwordInput = (
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
    show: boolean,
    toggleShow: () => void,
    onKeyDown?: (e: React.KeyboardEvent) => void,
    autoFocus?: boolean,
  ) => (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={inputClass + ' pr-12'}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        onClick={toggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
      >
        {eyeIcon(show)}
      </button>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900 relative">
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2 rounded-full bg-dark-700 hover:bg-dark-600 text-gray-400 hover:text-white transition-colors"
        title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      >
        {theme === 'dark' ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
          </svg>
        )}
      </button>

      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo-f.png" alt="FOMO" className="h-16 mx-auto mb-4 object-contain" />
        </div>

        {/* ── FORM step (Login / Register tabs) ─────────────────── */}
        {step === 'form' && (
          <>
            {/* Tabs */}
            <div className="flex mb-6 bg-dark-700 rounded-xl p-1">
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
            </div>

            {/* ── Login form ──────────────────────────────────── */}
            {tab === 'login' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Номер телефона</label>
                  {phoneInput(true, handleLogin)}
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Пароль</label>
                  {passwordInput(password, setPassword, 'Пароль', showPassword, () => setShowPassword(!showPassword), (e) => e.key === 'Enter' && handleLogin())}
                </div>
                <button onClick={handleLogin} disabled={loading} className={btnClass}>
                  {loading ? 'Вход...' : 'Войти'}
                </button>

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
                  {phoneInput(true)}
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Email <span className="text-gray-600">(необязательно)</span></label>
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
                  {passwordInput(password, setPassword, 'Aa + !@#$%, мин. 6', showPassword, () => setShowPassword(!showPassword))}
                  <p className="text-xs text-gray-500 mt-1">Минимум 6 символов, заглавная буква и один из: !@#$%^&*</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Подтвердите пароль</label>
                  {passwordInput(confirmPassword, setConfirmPassword, 'Ещё раз', showConfirmPassword, () => setShowConfirmPassword(!showConfirmPassword), (e) => e.key === 'Enter' && handleRegister())}
                </div>
                <button onClick={handleRegister} disabled={loading} className={btnClass}>
                  {loading ? 'Отправка...' : 'Получить код'}
                </button>

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
