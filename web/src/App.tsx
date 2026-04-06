import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { AuthPage } from './pages/AuthPage';
import { ChatPage } from './pages/ChatPage';
import { AdminPage } from './pages/AdminPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { HomePage } from './pages/HomePage';
import { YandexCallback } from './pages/YandexCallback';
import { JoinGroupPage } from './pages/JoinGroupPage';

export function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/auth" element={isAuthenticated ? <Navigate to="/chat" /> : <AuthPage />} />
      <Route path="/auth/yandex/callback" element={<YandexCallback />} />
      <Route path="/admin" element={isAuthenticated && isAdmin ? <AdminPage /> : <Navigate to="/chat" />} />
      <Route path="/join/:inviteCode" element={isAuthenticated ? <JoinGroupPage /> : <Navigate to="/auth" />} />
      <Route path="/chat" element={isAuthenticated ? <ChatPage /> : <Navigate to="/auth" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
