import { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Dashboard from '../components/Dashboard';
import Goals from './Goals';
import Ranking from './Ranking';

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
    fetch('/sample-data.json')
      .then(r => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const handleSignOut = () => { signOut(); navigate('/'); };

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-52'} shrink-0 bg-surface-light border-r border-border flex flex-col transition-all duration-200`}>
        <div className="px-4 py-5 flex items-center justify-between">
          {!collapsed && <span className="text-sm font-semibold text-caramel tracking-tight">screentime</span>}
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

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
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
    </div>
  );
}
