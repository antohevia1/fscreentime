import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { amplifyConfig } from './config/amplify';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import AppShell from './pages/AppShell';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';

Amplify.configure(amplifyConfig);

const PAGE_TITLES = {
  '/': 'fScreentime — Reclaim Your Hours, Challenge Your Habits',
  '/auth': 'Sign In — fScreentime',
  '/privacy': 'Privacy Policy — fScreentime',
  '/terms': 'Terms of Service — fScreentime',
  '/app/dashboard': 'Dashboard — fScreentime',
  '/app/goals': 'Goals — fScreentime',
  '/app/settings': 'Settings — fScreentime',
  '/app/ranking': 'Ranking — fScreentime',
};

function PageTitleUpdater() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = PAGE_TITLES[pathname] || 'fScreentime';
  }, [pathname]);
  return null;
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center"><p className="text-muted text-sm">Loading…</p></div>;
  return user ? children : <Navigate to="/auth" />;
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <PageTitleUpdater />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/app/*" element={<ProtectedRoute><AppShell /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
