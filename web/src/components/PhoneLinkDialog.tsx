import { useState, useRef, useEffect } from 'react';
import { authApi } from '../services/api/endpoints';
import { useAuthStore } from '../stores/authStore';

interface Props {
  onClose: () => void;
}

type Step = 'phone' | 'code';

export function PhoneLinkDialog({ onClose }: Props) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('+7');
  const [code, setCode] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [verifyMethod, setVerifyMethod] = useState<'call' | 'sms'>('sms');

  useEffect(() => {
    authApi.getVerifyMethod().then(r => setVerifyMethod(r.method)).catch(() => {});
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRequestCode = async () => {
    if (phone.length < 12) {
      setError('Введите номер в формате +7XXXXXXXXXX');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.linkPhoneRequest(phone);
      setStep('code');
      startCountdown();
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    } catch (e: any) {
      const msg = e.message || '';
      if (msg.includes('409')) {
        setError('Этот номер уже привязан к другому аккаунту');
      } else if (msg.includes('429')) {
        setError('Подождите перед повторной отправкой');
      } else {
        setError('Ошибка звонка');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCodeInput = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...code];
    next[index] = value.slice(-1);
    setCode(next);
    if (value && index < 3) {
      codeRefs.current[index + 1]?.focus();
    }
    if (next.every((d) => d) && next.join('').length === 4) {
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
      const res = await authApi.linkPhoneVerify(phone, fullCode);
      updateUser({ phone: res.user.phone });
      onClose();
    } catch {
      setError('Неверный код');
      setCode(['', '', '', '']);
      codeRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-full max-w-md bg-dark-700 rounded-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white mb-1">Привязать номер телефона</h2>
        <p className="text-gray-400 text-sm mb-4">
          Привяжите номер, чтобы другие пользователи могли найти вас по телефону
        </p>

        {step === 'phone' && (
          <div className="space-y-3">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRequestCode()}
              placeholder="+7 999 123 45 67"
              className="w-full px-4 py-3 bg-dark-800 border border-dark-500 rounded-xl text-white text-lg tracking-wider focus:outline-none focus:border-accent transition-colors"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-dark-500 text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleRequestCode}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-white font-medium transition-colors"
              >
                {loading ? (verifyMethod === 'call' ? 'Звоним...' : 'Отправляем...') : 'Получить код'}
              </button>
            </div>
          </div>
        )}

        {step === 'code' && (
          <div className="space-y-3">
            <p className="text-center text-gray-400 text-sm">
              {verifyMethod === 'call' ? 'Мы позвоним на' : 'Мы отправим код на'} <span className="text-white">{phone}</span>
            </p>
            <p className="text-center text-gray-500 text-xs">
              {verifyMethod === 'call' ? 'Введите последние 4 цифры входящего номера' : 'Введите код из SMS'}
            </p>
            <div className="flex gap-3 justify-center">
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
                  className="w-14 h-16 text-center text-2xl font-mono bg-dark-800 border border-dark-500 rounded-xl text-white focus:outline-none focus:border-accent transition-colors"
                />
              ))}
            </div>
            <div className="text-center">
              {countdown > 0 ? (
                <span className="text-gray-500 text-sm">Повторная отправка через {countdown}с</span>
              ) : (
                <button onClick={handleRequestCode} className="text-accent text-sm hover:text-accent-hover">
                  Отправить повторно
                </button>
              )}
            </div>
            <button
              onClick={() => { setStep('phone'); setCode(['', '', '', '']); }}
              className="w-full text-center text-gray-500 text-sm hover:text-gray-300"
            >
              Изменить номер
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-center text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  );
}
