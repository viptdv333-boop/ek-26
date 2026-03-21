import { useState, useRef, useEffect, useCallback } from 'react';
import { authApi, usersApi } from '../services/api/endpoints';
import { useAuthStore } from '../stores/authStore';

const TELEGRAM_BOT_NAME = 'chat_fomo_bot';

type Step = 'phone' | 'code' | 'profile';

export function AuthPage() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+7');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const tgContainerRef = useRef<HTMLDivElement | null>(null);
  const login = useAuthStore((s) => s.login);

  const handleTelegramAuth = useCallback(async (tgUser: Record<string, string | number>) => {
    setError('');
    setLoading(true);
    try {
      const res = await authApi.telegramLogin(tgUser);
      if (res.isNewUser) {
        setStep('profile');
        // Store tokens temporarily for profile setup
        useAuthStore.getState().setTokens(res.accessToken, res.refreshToken);
      } else {
        login(res.accessToken, res.refreshToken, res.user);
      }
    } catch (e: any) {
      setError(e.message || 'Ошибка авторизации через Telegram');
    } finally {
      setLoading(false);
    }
  }, [login]);

  // Mount Telegram Login Widget
  useEffect(() => {
    if (step !== 'phone' || !tgContainerRef.current) return;

    // Set global callback
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
  }, [step, handleTelegramAuth]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const handleRequestCode = async () => {
    if (phone.length < 12) {
      setError('Введите номер в формате +7XXXXXXXXXX');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.requestCode(phone);
      setStep('code');
      setCountdown(60);
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    } catch (e: any) {
      setError(e.message || 'Ошибка отправки SMS');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...code];
    next[index] = value.slice(-1);
    setCode(next);
    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d) && next.join('').length === 6) {
      verifyCode(next.join(''));
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const verifyCode = async (fullCode: string) => {
    setError('');
    setLoading(true);
    try {
      const res = await authApi.verifyCode(phone, fullCode);
      if (res.isNewUser) {
        setStep('profile');
      } else {
        login(res.accessToken, res.refreshToken, res.user);
      }
    } catch (e: any) {
      setError('Неверный код');
      setCode(['', '', '', '', '', '']);
      codeRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <img src="/logo-fomo.png" alt="FOMO" className="h-20 mx-auto mb-4" />
        </div>

        {/* Phone step */}
        {step === 'phone' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Номер телефона</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRequestCode()}
                placeholder="+7 999 123 45 67"
                className="w-full px-4 py-3 bg-dark-700 border border-dark-500 rounded-xl text-white text-lg tracking-wider focus:outline-none focus:border-accent transition-colors"
                autoFocus
              />
            </div>
            <button
              onClick={handleRequestCode}
              disabled={loading}
              className="w-full py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-xl text-white font-medium transition-colors"
            >
              {loading ? 'Отправка...' : 'Получить код'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-dark-500" />
              <span className="text-gray-500 text-sm">или</span>
              <div className="flex-1 h-px bg-dark-500" />
            </div>

            {/* Telegram Login */}
            <div ref={tgContainerRef} className="flex justify-center" />
          </div>
        )}

        {/* Code step */}
        {step === 'code' && (
          <div className="space-y-4">
            <p className="text-center text-gray-400 text-sm">
              Код отправлен на <span className="text-white">{phone}</span>
            </p>
            <div className="flex gap-2 justify-center">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { codeRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeInput(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-mono bg-dark-700 border border-dark-500 rounded-xl text-white focus:outline-none focus:border-accent transition-colors"
                />
              ))}
            </div>
            <div className="text-center">
              {countdown > 0 ? (
                <span className="text-gray-500 text-sm">Повторная отправка через {countdown}с</span>
              ) : (
                <button onClick={handleRequestCode} className="text-accent text-sm hover:text-accent-hover">
                  Отправить код повторно
                </button>
              )}
            </div>
            <button
              onClick={() => { setStep('phone'); setCode(['', '', '', '', '', '']); }}
              className="w-full text-center text-gray-500 text-sm hover:text-gray-300"
            >
              Изменить номер
            </button>
          </div>
        )}

        {/* Profile step */}
        {step === 'profile' && (
          <div className="space-y-4">
            <p className="text-center text-gray-400 text-sm">Как вас зовут?</p>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSetProfile()}
              placeholder="Имя"
              className="w-full px-4 py-3 bg-dark-700 border border-dark-500 rounded-xl text-white focus:outline-none focus:border-accent transition-colors"
              autoFocus
            />
            <button
              onClick={handleSetProfile}
              disabled={loading}
              className="w-full py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 rounded-xl text-white font-medium transition-colors"
            >
              {loading ? 'Сохранение...' : 'Продолжить'}
            </button>
          </div>
        )}

        {error && <p className="mt-4 text-center text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  );
}
