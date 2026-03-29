import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authApi, usersApi } from '../services/api/endpoints';
import { useAuthStore } from '../stores/authStore';
import { useTranslation } from '../i18n';

const flagUrl = (iso: string) => `https://flagcdn.com/w40/${iso.toLowerCase()}.png`;

const COUNTRIES = [
  { code: '+7', nameKey: 'country.russia', isoCode: 'RU' },
  { code: '+7', nameKey: 'country.kazakhstan', isoCode: 'KZ' },
  { code: '+375', nameKey: 'country.belarus', isoCode: 'BY' },
  { code: '+998', nameKey: 'country.uzbekistan', isoCode: 'UZ' },
  { code: '+996', nameKey: 'country.kyrgyzstan', isoCode: 'KG' },
  { code: '+992', nameKey: 'country.tajikistan', isoCode: 'TJ' },
  { code: '+993', nameKey: 'country.turkmenistan', isoCode: 'TM' },
  { code: '+374', nameKey: 'country.armenia', isoCode: 'AM' },
  { code: '+995', nameKey: 'country.georgia', isoCode: 'GE' },
  { code: '+994', nameKey: 'country.azerbaijan', isoCode: 'AZ' },
  { code: '+373', nameKey: 'country.moldova', isoCode: 'MD' },
  { code: '+370', nameKey: 'country.lithuania', isoCode: 'LT' },
  { code: '+371', nameKey: 'country.latvia', isoCode: 'LV' },
  { code: '+372', nameKey: 'country.estonia', isoCode: 'EE' },
  { code: '+1', nameKey: 'country.usa', isoCode: 'US' },
  { code: '+44', nameKey: 'country.uk', isoCode: 'GB' },
  { code: '+49', nameKey: 'country.germany', isoCode: 'DE' },
  { code: '+33', nameKey: 'country.france', isoCode: 'FR' },
  { code: '+39', nameKey: 'country.italy', isoCode: 'IT' },
  { code: '+34', nameKey: 'country.spain', isoCode: 'ES' },
  { code: '+90', nameKey: 'country.turkey', isoCode: 'TR' },
  { code: '+971', nameKey: 'country.uae', isoCode: 'AE' },
  { code: '+972', nameKey: 'country.israel', isoCode: 'IL' },
  { code: '+86', nameKey: 'country.china', isoCode: 'CN' },
  { code: '+82', nameKey: 'country.southKorea', isoCode: 'KR' },
  { code: '+81', nameKey: 'country.japan', isoCode: 'JP' },
  { code: '+91', nameKey: 'country.india', isoCode: 'IN' },
  { code: '+55', nameKey: 'country.brazil', isoCode: 'BR' },
  { code: '+52', nameKey: 'country.mexico', isoCode: 'MX' },
  { code: '+61', nameKey: 'country.australia', isoCode: 'AU' },
];

type Tab = 'login' | 'register';
type Step = 'phone' | 'code' | 'setPassword' | 'created' | 'linkEmail';

export function AuthPage() {
  const { t, lang, setLang } = useTranslation();
  const [tab, setTab] = useState<Tab>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'login' ? 'login' : 'register';
  });
  const [step, setStep] = useState<Step>('phone');
  const [theme, setTheme] = useState(() => localStorage.getItem('ek26_theme') || 'light');

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

  // GeoIP country detection
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        if (data?.country_code) {
          const found = COUNTRIES.find(c => c.isoCode === data.country_code);
          if (found) setSelectedCountry(found);
        }
      })
      .catch(() => {});
  }, []);

  // Form fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const countryPickerRef = useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = useState('');
  const phone = selectedCountry.code + phoneNumber.replace(/\D/g, '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Code verification
  const [code, setCode] = useState(['', '', '', '']);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [verifyMethod, setVerifyMethod] = useState<'call' | 'sms'>('sms');

  // Fetch verify method on mount
  useEffect(() => {
    authApi.getVerifyMethod().then(r => setVerifyMethod(r.method)).catch(() => {});
  }, []);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Math captcha
  const [mathNums, setMathNums] = useState<[number, number]>(() => [
    Math.floor(Math.random() * 9) + 1,
    Math.floor(Math.random() * 9) + 1,
  ]);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const captchaVerified = captchaAnswer.trim() === String(mathNums[0] + mathNums[1]);

  const refreshCaptcha = () => {
    setMathNums([
      Math.floor(Math.random() * 9) + 1,
      Math.floor(Math.random() * 9) + 1,
    ]);
    setCaptchaAnswer('');
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
    setStep('phone');
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

  // ── Register (phone only) ─────────────────────────────────────
  const handleRegister = async () => {
    if (!captchaVerified) {
      setError(t('auth.wrongCaptcha'));
      return;
    }
    if (phoneNumber.replace(/\D/g, '').length < 6) {
      setError(t('auth.enterPhone'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.register({ phone });
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
      await authApi.registerVerifyPhone(phone, fullCode);
      setStep('setPassword');
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
      await authApi.register({ phone });
      setCountdown(60);
    } catch (e: any) {
      setError(e.message || t('auth.resendError'));
    } finally {
      setLoading(false);
    }
  };

  // ── Set password (finalize registration) ─────────────────────
  const handleSetPassword = async () => {
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
      const res = await authApi.registerSetPassword(phone, password, confirmPassword);
      useAuthStore.getState().setTokens(res.accessToken, res.refreshToken);
      setStep('created');
    } catch (e: any) {
      setError(e.message || t('auth.error'));
    } finally {
      setLoading(false);
    }
  };

  // ── Link email (optional) ────────────────────────────────────
  const [emailSent, setEmailSent] = useState(false);

  const handleSendEmailCode = async () => {
    if (!email || !email.includes('@')) {
      setError(t('auth.enterEmail'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.linkEmail(email);
      setEmailSent(true);
    } catch (e: any) {
      setError(e.message || t('auth.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleFinishRegistration = () => {
    const { token, refreshToken } = useAuthStore.getState();
    if (token && refreshToken) {
      usersApi.getProfile().then((profile) => {
        login(token, refreshToken, profile);
      }).catch(() => {
        login(token, refreshToken, { id: '', phone, displayName: phone });
      });
    }
  };

  const filteredCountries = countrySearch
    ? COUNTRIES.filter(c => t(c.nameKey).toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch))
    : COUNTRIES;

  // ── Shared UI pieces ──────────────────────────────────────────
  const phoneInput = (autoFocus?: boolean, onEnter?: () => void) => (
    <div className="relative" ref={countryPickerRef}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setShowCountryPicker(!showCountryPicker); setCountrySearch(''); }}
          className="auth-country-btn"
        >
          <img src={flagUrl(selectedCountry.isoCode)} alt={selectedCountry.isoCode} className="w-6 h-4 object-cover rounded-sm" />
          <span className="text-sm" style={{ color: 'var(--a-muted)' }}>{selectedCountry.code}</span>
          <svg className="w-3 h-3" style={{ color: 'var(--a-subtle)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value.replace(/[^\d\s\-()]/g, ''))}
          onKeyDown={onEnter ? (e) => e.key === 'Enter' && onEnter() : undefined}
          placeholder="(999) 123-45-67"
          className="auth-input flex-1"
          style={{ fontSize: '1rem', letterSpacing: '0.025em' }}
          autoFocus={autoFocus}
        />
      </div>
      {showCountryPicker && (
        <div className="auth-country-dropdown">
          <div className="p-2">
            <input
              type="text"
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              placeholder={t('auth.searchCountry')}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto">
            {filteredCountries.map((c, i) => (
              <button
                key={`${c.code}-${c.nameKey}-${i}`}
                onClick={() => { setSelectedCountry(c); setShowCountryPicker(false); }}
                className="auth-country-item"
                style={c.code === selectedCountry.code && c.nameKey === selectedCountry.nameKey ? { background: 'var(--a-secondary-hover)' } : {}}
              >
                <img src={flagUrl(c.isoCode)} alt={c.isoCode} className="w-6 h-4 object-cover rounded-sm" />
                <span className="text-sm flex-1">{t(c.nameKey)}</span>
                <span className="text-sm" style={{ color: 'var(--a-muted)' }}>{c.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

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

  const passwordField = (
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
        className="auth-input"
        style={{ paddingRight: '3rem' }}
        autoFocus={autoFocus}
      />
      <button
        type="button"
        onClick={toggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
        style={{ color: 'var(--a-muted)' }}
      >
        {eyeIcon(show)}
      </button>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────
  const themeClass = theme === 'dark' ? 'auth-dark' : 'auth-light';

  return (
    <div className={`auth-page ${themeClass}`}>
      {/* Gradient background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="auth-blob" style={{ top: '-10%', right: '-5%', width: 500, height: 500, opacity: 0.2, background: 'radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)' }} />
        <div className="auth-blob" style={{ bottom: '-10%', left: '-5%', width: 400, height: 400, opacity: 0.12, background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)' }} />
      </div>

      {/* Top bar: theme toggle + language */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
        {/* Language flags */}
        <div className="flex items-center gap-1">
          {([
            { l: 'ru' as const, flag: 'ru' },
            { l: 'en' as const, flag: 'gb' },
            { l: 'zh' as const, flag: 'cn' },
          ]).map(({ l, flag }) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className="w-7 h-7 rounded-full overflow-hidden border-2 transition-all"
              style={lang === l
                ? { borderColor: 'var(--a-accent)', transform: 'scale(1.1)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
                : { borderColor: 'transparent', opacity: 0.5 }
              }
            >
              <img src={`https://flagcdn.com/w40/${flag}.png`} alt={l} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl transition-all"
          style={{ background: 'var(--a-secondary-bg)', color: 'var(--a-muted)', border: '1px solid var(--a-border)' }}
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
      </div>

      <div className="auth-card relative z-10 mx-4">
        {/* Logo — horizontal like reference */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src="/logo-f.png" alt="FOMO Chat" className="h-11 w-auto object-contain shrink-0" />
          <div>
            <h1 className="text-lg font-bold leading-tight" style={{ color: 'var(--a-fg)' }}>FOMO <span style={{ color: 'var(--a-accent)' }}>Chat</span></h1>
            <p className="text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--a-muted)' }}>{t('auth.appDescription')}</p>
          </div>
        </div>

        {/* ── PHONE step (Login / Register tabs) ────────────────── */}
        {step === 'phone' && (
          <>
            {/* Tabs */}
            <div className="auth-tabs">
              <button onClick={() => switchTab('register')} className={`auth-tab ${tab === 'register' ? 'active' : ''}`}>
                {t('auth.register')}
              </button>
              <button onClick={() => switchTab('login')} className={`auth-tab ${tab === 'login' ? 'active' : ''}`}>
                {t('auth.login')}
              </button>
            </div>

            {/* ── Login form ──────────────────────────────────── */}
            {tab === 'login' && (
              <div className="space-y-5">
                {/* Title */}
                <div className="text-center">
                  <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--a-fg)' }}>{t('auth.signInTitle')}</h2>
                  <p className="text-sm" style={{ color: 'var(--a-muted)' }}>{t('auth.signInDesc')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--a-fg)' }}>{t('auth.phone')}</label>
                  {phoneInput(true, handleLogin)}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--a-fg)' }}>{t('auth.password')}</label>
                  {passwordField(password, setPassword, t('auth.password'), showPassword, () => setShowPassword(!showPassword), (e) => e.key === 'Enter' && handleLogin())}
                </div>
                <button onClick={handleLogin} disabled={loading} className="auth-btn">
                  {loading ? t('auth.loginLoading') : (
                    <span className="flex items-center justify-center gap-2">
                      {t('auth.signIn')}
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                    </span>
                  )}
                </button>

                {/* OAuth divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: 'var(--a-border)' }} />
                  <span className="text-xs" style={{ color: 'var(--a-subtle)' }}>{t('auth.or')}</span>
                  <div className="flex-1 h-px" style={{ background: 'var(--a-border)' }} />
                </div>

                {/* Yandex login — round icon */}
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      const clientId = 'cf2c3fae1c86457b92cfaa9c74a54cad';
                      const redirectUri = encodeURIComponent(window.location.origin + '/auth/yandex/callback');
                      window.location.href = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`;
                    }}
                    className="w-12 h-12 rounded-full overflow-hidden border transition-all hover:scale-110 hover:shadow-lg"
                    style={{ borderColor: 'var(--a-border)' }}
                    title={t('auth.yandexLogin')}
                  >
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/5/58/Yandex_icon.svg"
                      alt="Yandex"
                      className="w-full h-full object-cover"
                    />
                  </button>
                </div>
              </div>
            )}

            {/* ── Register form ─────────────────────────────────── */}
            {tab === 'register' && (
              <div className="space-y-5">
                {/* Title */}
                <div className="text-center">
                  <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--a-fg)' }}>{t('auth.createAccountTitle')}</h2>
                  <p className="text-sm" style={{ color: 'var(--a-muted)' }}>{t('auth.createAccountDesc')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--a-fg)' }}>{t('auth.phone')}</label>
                  {phoneInput(true)}
                </div>

                {/* Math captcha */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4" style={{ color: 'var(--a-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    <span className="text-sm font-medium" style={{ color: 'var(--a-muted)' }}>{t('auth.securityCheck')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="flex-1 flex items-center justify-center py-3 rounded-xl text-2xl font-bold tracking-wider"
                      style={{ background: 'var(--a-input-bg)', border: '1px solid var(--a-input-border)', color: 'var(--a-fg)' }}
                    >
                      {mathNums[0]} + {mathNums[1]} = ?
                    </div>
                    <button
                      onClick={refreshCaptcha}
                      className="p-2.5 rounded-xl transition-all"
                      style={{ background: 'var(--a-secondary-bg)', color: 'var(--a-muted)', border: '1px solid var(--a-border)' }}
                      title={t('auth.captchaRefresh')}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                      </svg>
                    </button>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                    placeholder={t('auth.captchaAnswer')}
                    className="auth-input mt-3"
                  />
                  {captchaVerified && (
                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#22c55e' }}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      {t('auth.captchaOk')}
                    </p>
                  )}
                </div>

                <button onClick={handleRegister} disabled={loading} className="auth-btn">
                  {loading ? t('auth.sending') : (
                    <span className="flex items-center justify-center gap-2">
                      {t('auth.getCode')}
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                    </span>
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── CODE verification step ────────────────────────────── */}
        {step === 'code' && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--a-fg)' }}>
                {t(verifyMethod === 'call' ? 'auth.weWillCallPhone' : 'auth.weWillCall')}
              </h2>
              <p className="text-sm" style={{ color: 'var(--a-muted)' }}>
                <span style={{ color: 'var(--a-fg)', fontWeight: 600 }}>{phone}</span><br />
                {t(verifyMethod === 'call' ? 'auth.enterLast4Call' : 'auth.enterLast4')}
              </p>
            </div>
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
                  className="auth-code-input"
                />
              ))}
            </div>
            <div className="text-center">
              {countdown > 0 ? (
                <span className="text-sm" style={{ color: 'var(--a-subtle)' }}>
                  {t('auth.resendIn', { countdown })}
                </span>
              ) : (
                <button onClick={handleResendCode} className="auth-link">
                  {t('auth.resendCode')}
                </button>
              )}
            </div>
            <button
              onClick={() => { setStep('phone'); setCode(['', '', '', '']); }}
              className="w-full text-center text-sm transition-colors"
              style={{ color: 'var(--a-subtle)' }}
            >
              {t('auth.changeNumber')}
            </button>
          </div>
        )}

        {/* ── SET PASSWORD step ────────────────────────────────── */}
        {step === 'setPassword' && (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--a-fg)' }}>{t('auth.createAccount')}</h2>
              <p className="text-sm" style={{ color: 'var(--a-muted)' }}>{t('auth.passwordHint')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--a-fg)' }}>{t('auth.password')}</label>
              {passwordField(password, setPassword, t('auth.passwordPlaceholder'), showPassword, () => setShowPassword(!showPassword), undefined, true)}
            </div>
            <ul className="text-xs space-y-1" style={{ color: 'var(--a-subtle)' }}>
              <li style={password.length >= 6 ? { color: '#22c55e' } : {}}>{password.length >= 6 ? '\u2713' : '\u2022'} {t('auth.passwordMin')}</li>
              <li style={/[A-ZА-ЯЁ]/.test(password) ? { color: '#22c55e' } : {}}>{/[A-ZА-ЯЁ]/.test(password) ? '\u2713' : '\u2022'} {t('auth.passwordUppercase')}</li>
              <li style={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) ? { color: '#22c55e' } : {}}>{/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) ? '\u2713' : '\u2022'} {t('auth.passwordSpecial')}</li>
            </ul>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--a-fg)' }}>{t('auth.confirmPassword')}</label>
              {passwordField(confirmPassword, setConfirmPassword, t('auth.confirmPlaceholder'), showConfirmPassword, () => setShowConfirmPassword(!showConfirmPassword), (e) => e.key === 'Enter' && handleSetPassword())}
            </div>
            <button onClick={handleSetPassword} disabled={loading} className="auth-btn">
              {loading ? t('auth.creatingAccount') : (
                <span className="flex items-center justify-center gap-2">
                  {t('auth.createAccount')}
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                </span>
              )}
            </button>
          </div>
        )}

        {/* ── CREATED step ──────────────────────────────────────────── */}
        {step === 'created' && (
          <div className="space-y-5 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>&#10003;</div>
            <p className="text-xl font-semibold" style={{ color: 'var(--a-fg)' }}>{t('auth.accountCreated')}</p>
            <button onClick={() => setStep('linkEmail')} className="auth-btn">
              {t('auth.linkEmail')}
            </button>
            <button onClick={handleFinishRegistration} className="auth-btn-secondary">
              {t('auth.skip')}
            </button>
          </div>
        )}

        {/* ── LINK EMAIL step (optional) ─────────────────────────── */}
        {step === 'linkEmail' && (
          <div className="space-y-5">
            {!emailSent ? (
              <>
                <div className="text-center">
                  <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--a-fg)' }}>{t('auth.linkEmail')}</h2>
                  <p className="text-sm" style={{ color: 'var(--a-muted)' }}>{t('auth.enterEmail')}</p>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendEmailCode()}
                  placeholder="you@example.com"
                  className="auth-input"
                  autoFocus
                />
                <button onClick={handleSendEmailCode} disabled={loading} className="auth-btn">
                  {loading ? t('auth.sending') : t('auth.sendEmailCode')}
                </button>
                <button onClick={handleFinishRegistration} className="auth-btn-secondary">
                  {t('auth.skip')}
                </button>
              </>
            ) : (
              <div className="text-center space-y-5">
                <div className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>&#9993;</div>
                <p className="text-lg font-semibold" style={{ color: 'var(--a-fg)' }}>{t('auth.emailSentTitle')}</p>
                <p className="text-sm" style={{ color: 'var(--a-muted)' }}>
                  {t('auth.emailSentDesc', { email })}
                </p>
                <button onClick={handleFinishRegistration} className="auth-btn">
                  {t('auth.continue')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl text-center text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        {/* Footer — consent text */}
        <div className="auth-footer mt-8 text-center text-xs leading-relaxed" style={{ color: 'var(--a-muted)' }}>
          <p>
            {t('auth.consent')}{' '}
            <Link to="/privacy" style={{ color: 'var(--a-accent)' }}>{t('auth.consentPrivacy')}</Link>
            {' '}{t('auth.consentAnd')}{' '}
            <Link to="/terms" style={{ color: 'var(--a-accent)' }}>{t('auth.consentTerms')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
