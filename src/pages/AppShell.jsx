import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Dashboard from '../components/Dashboard';
import { LogoText } from '../components/Logo';
import Goals from './Goals';
import Ranking from './Ranking';
import { fetchScreenTimeData } from '../utils/s3Data';

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: '◫' },
  { to: '/app/goals', label: 'Goals', icon: '◎' },
  { to: '/app/ranking', label: 'Ranking', icon: '▦' },
];

export default function AppShell() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!user?.credentials || !user?.identityId) return;
    fetchScreenTimeData(user.credentials, user.identityId)
      .then(setData)
      .catch(() => {
        // Fallback to sample data during development
        fetch('/sample-data.json').then(r => r.json()).then(setData).catch(() => {});
      });
  }, [user]);

  const handleSignOut = () => { signOut(); navigate('/'); };

  return (
    <div className="min-h-screen bg-surface flex">

      {/* ── Desktop sidebar (md+) ── */}
      <aside className={`hidden md:flex ${collapsed ? 'w-16' : 'w-52'} shrink-0 bg-surface-light border-r border-border flex-col transition-all duration-200`}>
        <div className="px-4 py-5 flex items-center justify-between">
          {!collapsed && <LogoText size={24} />}
          <button onClick={() => setCollapsed(!collapsed)}
            className="text-muted hover:text-cream text-xs ml-auto" aria-label="Toggle sidebar">
            {collapsed ? '▸' : '◂'}
          </button>
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  isActive ? 'bg-surface-hover text-caramel' : 'text-muted hover:text-cream hover:bg-surface-card'
                }`
              }>
              <span className="text-base">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="px-2 pb-4 space-y-1">
          {!collapsed && (
            <p className="px-3 text-xs text-muted truncate">{user?.alias || user?.email}</p>
          )}
          <button onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted hover:text-cream hover:bg-surface-card w-full transition">
            <span className="text-base">⏻</span>
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Content column (full width on mobile, flex-1 on desktop) ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top header */}
        <header className="md:hidden bg-surface-light border-b border-border px-4 py-3 flex items-center justify-between">
          <LogoText size={20} />
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted truncate max-w-[130px]">{user?.alias || user?.email}</span>
            <button onClick={handleSignOut}
              className="text-muted hover:text-cream text-base transition" aria-label="Sign out">
              ⏻
            </button>
          </div>
        </header>

        {/* Main content — extra bottom padding on mobile so content clears the tab bar */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6">
            <Routes>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={
                data ? <Dashboard data={data} /> : <p className="text-muted text-sm">Loading…</p>
              } />
              <Route path="goals" element={<Goals data={data} />} />
              <Route path="ranking" element={<Ranking />} />
            </Routes>
          </div>
        </main>

        {/* Mobile bottom tab bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-surface-light border-t border-border flex">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs transition ${
                  isActive ? 'text-caramel' : 'text-muted'
                }`
              }>
              <span className="text-xl leading-none">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

      </div>
    </div>
  );
}
