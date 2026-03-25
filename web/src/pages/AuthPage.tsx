import { useState, useRef, useEffect, useCallback } from 'react';
import { authApi, usersApi } from '../services/api/endpoints';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../i18n';

function generateCaptcha() {
  const ops = ['+', '-', '×'] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;
  switch (op) {
    case '+': a = Math.floor(Math.random() * 20) + 1; b = Math.floor(Math.random() * 20) + 1; answer = a + b; break;
    case '-': a = Math.floor(Math.random() * 20) + 5; b = Math.floor(Math.random() * a) + 1; answer = a - b; break;
    case '×': a = Math.floor(Math.random() * 9) + 2; b = Math.floor(Math.random() * 9) + 2; answer = a * b; break;
  }
  return { question: `${a} ${op} ${b} = ?`, answer };
}

const COUNTRIES = [
  { code: '+7', flag: '\u{1F1F7}\u{1F1FA}', nameKey: 'country.russia' },
  { code: '+7', flag: '\u{1F1F0}\u{1F1FF}', nameKey: 'country.kazakhstan' },
  { code: '+375', flag: '\u{1F1E7}\u{1F1FE}', nameKey: 'country.belarus' },
  { code: '+380', flag: '\u{1F1FA}\u{1F1E6}', nameKey: 'country.ukraine' },
  { code: '+998', flag: '\u{1F1FA}\u{1F1FF}', nameKey: 'country.uzbekistan' },
  { code: '+996', flag: '\u{1F1F0}\u{1F1EC}', nameKey: 'country.kyrgyzstan' },
  { code: '+992', flag: '\u{1F1F9}\u{1F1EF}', nameKey: 'country.tajikistan' },
  { code: '+993', flag: '\u{1F1F9}\u{1F1F2}', nameKey: 'country.turkmenistan' },
  { code: '+374', flag: '\u{1F1E6}\u{1F1F2}', nameKey: 'country.armenia' },
  { code: '+995', flag: '\u{1F1EC}\u{1F1EA}', nameKey: 'country.georgia' },
  { code: '+994', flag: '\u{1F1E6}\u{1F1FF}', nameKey: 'country.azerbaijan' },
  { code: '+373', flag: '\u{1F1F2}\u{1F1E9}', nameKey: 'country.moldova' },
  { code: '+370', flag: '\u{1F1F1}\u{1F1F9}', nameKey: 'country.lithuania' },
  { code: '+371', flag: '\u{1F1F1}\u{1F1FB}', nameKey: 'country.latvia' },
  { code: '+372', flag: '\u{1F1EA}\u{1F1EA}', nameKey: 'country.estonia' },
  { code: '+1', flag: '\u{1F1FA}\u{1F1F8}', nameKey: 'country.usa' },
  { code: '+44', flag: '\u{1F1EC}\u{1F1E7}', nameKey: 'country.uk' },
  { code: '+49', flag: '\u{1F1E9}\u{1F1EA}', nameKey: 'country.germany' },
  { code: '+33', flag: '\u{1F1EB}\u{1F1F7}', nameKey: 'country.france' },
  { code: '+39', flag: '\u{1F1EE}\u{1F1F9}', nameKey: 'country.italy' },
  { code: '+34', flag: '\u{1F1EA}\u{1F1F8}', nameKey: 'country.spain' },
  { code: '+90', flag: '\u{1F1F9}\u{1F1F7}', nameKey: 'country.turkey' },
  { code: '+971', flag: '\u{1F1E6}\u{1F1EA}', nameKey: 'country.uae' },
  { code: '+972', flag: '\u{1F1EE}\u{1F1F1}', nameKey: 'country.israel' },
  { code: '+86', flag: '\u{1F1E8}\u{1F1F3}', nameKey: 'country.china' },
  { code: '+82', flag: '\u{1F1F0}\u{1F1F7}', nameKey: 'country.southKorea' },
  { code: '+81', flag: '\u{1F1EF}\u{1F1F5}', nameKey: 'country.japan' },
  { code: '+91', flag: '\u{1F1EE}\u{1F1F3}', nameKey: 'country.india' },
  { code: '+55', flag: '\u{1F1E7}\u{1F1F7}', nameKey: 'country.brazil' },
  { code: '+52', flag: '\u{1F1F2}\u{1F1FD}', nameKey: 'country.mexico' },
  { code: '+61', flag: '\u{1F1E6}\u{1F1FA}', nameKey: 'country.australia' },
];

type Tab = 'login' | 'register';
type Step = 'form' | 'code' | 'profile';

export function AuthPage() {
  const { t } = useTranslation();
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

  // Captcha
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [captchaInput, setCaptchaInput] = useState('');
  const captchaCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const drawCaptcha = useCallback(() => {
    const canvas = captchaCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Background
    ctx.fillStyle = theme === 'dark' ? '#1a1a25' : '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Noise lines
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(${Math.random()*150},${Math.random()*150},${Math.random()*150},0.4)`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }
    // Text with slight rotation
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((Math.random() - 0.5) * 0.15);
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = theme === 'dark' ? '#e5e7eb' : '#374151';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(captcha.question, 0, 0);
    ctx.restore();
  }, [captcha, theme]);

  useEffect(() => { drawCaptcha(); }, [drawCaptcha]);

  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha());
    setCaptchaInput('');
  };

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
      setError(t('auth.enterPhone'));
      return;
    }
    if (!password) {
      setError(t('auth.enterPassword'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(phone, password);
      login(res.accessToken, res.refreshToken, res.user);
    } catch (e: any) {
      setError(e.message || t('auth.wrongCredentials'));
    } finally {
      setLoading(false);
    }
  };

  // ── Register ───────────────────────────────────────────────────
  const handleRegister = async () => {
    if (parseInt(captchaInput) !== captcha.answer) {
      setError(t('auth.wrongCaptcha'));
      refreshCaptcha();
      return;
    }
    if (phoneNumber.replace(/\D/g, '').length < 6) {
      setError(t('auth.enterPhone'));
      return;
    }
    if (!password || password.length < 6) {
      setError(t('auth.passwordMin'));
      return;
    }
    if (!/[A-ZА-ЯЁ]/.test(password)) {
      setError(t('auth.passwordUppercase'));
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
      setError(t('auth.passwordSpecial'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
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
      setError(e.message || t('auth.registerError'));
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
      setError(t('auth.wrongCode'));
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
      setError(e.message || t('auth.resendError'));
    } finally {
      setLoading(false);
    }
  };

  // ── Profile ────────────────────────────────────────────────────
  const handleSetProfile = async () => {
    if (!displayName.trim()) {
      setError(t('auth.enterName'));
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
      setError(e.message || t('auth.error'));
    } finally {
      setLoading(false);
    }
  };

  const filteredCountries = countrySearch
    ? COUNTRIES.filter(c => t(c.nameKey).toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch))
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
              placeholder={t('auth.searchCountry')}
              className="w-full px-3 py-2 bg-dark-600 border border-dark-500 rounded-lg text-white text-sm focus:outline-none focus:border-accent"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto">
            {filteredCountries.map((c, i) => (
              <button
                key={`${c.code}-${c.nameKey}-${i}`}
                onClick={() => { setSelectedCountry(c); setShowCountryPicker(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-dark-600 transition-colors text-left ${
                  c.code === selectedCountry.code && c.nameKey === selectedCountry.nameKey ? 'bg-dark-600' : ''
                }`}
              >
                <span className="text-lg">{c.flag}</span>
                <span className="text-white text-sm flex-1">{t(c.nameKey)}</span>
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
        title={theme === 'dark' ? t('auth.lightTheme') : t('auth.darkTheme')}
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
                {t('auth.register')}
              </button>
              <button
                onClick={() => switchTab('login')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  tab === 'login'
                    ? 'bg-accent text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {t('auth.login')}
              </button>
            </div>

            {/* ── Login form ──────────────────────────────────── */}
            {tab === 'login' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('auth.phone')}</label>
                  {phoneInput(true, handleLogin)}
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('auth.password')}</label>
                  {passwordInput(password, setPassword, t('auth.password'), showPassword, () => setShowPassword(!showPassword), (e) => e.key === 'Enter' && handleLogin())}
                </div>
                <button onClick={handleLogin} disabled={loading} className={btnClass}>
                  {loading ? t('auth.loginLoading') : t('auth.signIn')}
                </button>

                <p className="text-center text-gray-500 text-sm">
                  {t('auth.noAccount')}{' '}
                  <span onClick={() => switchTab('register')} className={linkClass}>
                    {t('auth.signUp')}
                  </span>
                </p>
              </div>
            )}

            {/* ── Register form ───────────────────────────────── */}
            {tab === 'register' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('auth.phone')}</label>
                  {phoneInput(true)}
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('auth.email')} <span className="text-gray-600">{t('auth.emailOptional')}</span></label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('auth.password')}</label>
                  {passwordInput(password, setPassword, t('auth.passwordPlaceholder'), showPassword, () => setShowPassword(!showPassword))}
                  <p className="text-xs text-gray-500 mt-1">{t('auth.passwordHint')}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('auth.confirmPassword')}</label>
                  {passwordInput(confirmPassword, setConfirmPassword, t('auth.confirmPlaceholder'), showConfirmPassword, () => setShowConfirmPassword(!showConfirmPassword), (e) => e.key === 'Enter' && handleRegister())}
                </div>
                {/* Captcha */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <canvas ref={captchaCanvasRef} width={200} height={50} className="rounded-lg border border-dark-500" />
                    <button type="button" onClick={refreshCaptcha} className="text-gray-400 hover:text-white transition-colors p-1" title={t('auth.captchaRefresh')}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M20.015 4.356v4.992" />
                      </svg>
                    </button>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                    placeholder={t('auth.captchaPlaceholder')}
                    className={inputClass + ' text-center'}
                  />
                </div>

                <button onClick={handleRegister} disabled={loading} className={btnClass}>
                  {loading ? t('auth.sending') : t('auth.getCode')}
                </button>

                <p className="text-center text-gray-500 text-sm">
                  {t('auth.haveAccount')}{' '}
                  <span onClick={() => switchTab('login')} className={linkClass}>
                    {t('auth.signIn')}
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
              {t('auth.weWillCall')} <span className="text-white">{phone}</span>,<br />
              {t('auth.enterLast4')}
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
                  {t('auth.resendIn', { countdown })}
                </span>
              ) : (
                <button onClick={handleResendCode} className={linkClass}>
                  {t('auth.resendCode')}
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
              {t('auth.changeNumber')}
            </button>
          </div>
        )}

        {/* ── PROFILE step ──────────────────────────────────────── */}
        {step === 'profile' && (
          <div className="space-y-4">
            <p className="text-center text-gray-400 text-sm">{t('auth.whatsYourName')}</p>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSetProfile()}
              placeholder={t('auth.namePlaceholder')}
              className={inputClass}
              autoFocus
            />
            <button onClick={handleSetProfile} disabled={loading} className={btnClass}>
              {loading ? t('auth.saving') : t('auth.continue')}
            </button>
          </div>
        )}

        {/* Error */}
        {error && <p className="mt-4 text-center text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  );
}
