import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { AuthPage } from './pages/AuthPage';
import { ChatPage } from './pages/ChatPage';
import { AdminPage } from './pages/AdminPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { HomePage } from './pages/HomePage';

export function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAdmin = useAuthStore((s) => s.user?.isAdmin);

  return (
    <Routes>
      <Route path="/home" element={<HomePage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/auth" element={isAuthenticated ? <Navigate to="/" /> : <AuthPage />} />
      <Route path="/admin" element={isAuthenticated && isAdmin ? <AdminPage /> : <Navigate to="/" />} />
      <Route path="/" element={isAuthenticated ? <ChatPage /> : <Navigate to="/auth" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
