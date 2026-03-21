import { useState, useRef, useEffect } from 'react';
import { authApi, usersApi } from '../services/api/endpoints';
import { useAuthStore } from '../stores/authStore';

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
  const login = useAuthStore((s) => s.login);

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
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent flex items-center justify-center">
            <span className="text-2xl font-bold text-white">ЭК</span>
          </div>
          <h1 className="text-2xl font-bold text-white">ЭК-26</h1>
          <p className="text-sm text-gray-400 mt-1">Защищённый мессенджер</p>
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
