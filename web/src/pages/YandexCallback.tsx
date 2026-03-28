import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api/endpoints';
import { useAuthStore } from '../stores/authStore';

export function YandexCallback() {
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) {
      setError('No authorization code received');
      return;
    }

    authApi.yandexLogin(code)
      .then((res) => {
        login(res.accessToken, res.refreshToken, res.user);
        navigate('/', { replace: true });
      })
      .catch((err) => {
        console.error('Yandex auth error:', err);
        setError(err.message || 'Authorization failed');
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-lg">{error}</p>
          <a href="/auth" className="text-accent hover:underline">Back to login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <div className="text-center space-y-4">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-gray-400">Authenticating with Yandex...</p>
      </div>
    </div>
  );
}
