import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Amplify } from 'aws-amplify';
import { amplifyConfig } from './config/amplify';
import { AuthProvider, useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import AppShell from './pages/AppShell';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';

Amplify.configure(amplifyConfig);

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center"><p className="text-muted text-sm">Loading…</p></div>;
  return user ? children : <Navigate to="/auth" />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/app/*" element={<ProtectedRoute><AppShell /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
