import { useState } from 'react';

const MOCK_RANKINGS = [
  { name: 'alex_k', totalHours: 18.2, topCategory: 'Productivity', topApp: 'VS Code' },
  { name: 'maria_j', totalHours: 22.5, topCategory: 'Communication', topApp: 'Slack' },
  { name: 'sam_w', totalHours: 31.0, topCategory: 'Entertainment', topApp: 'Netflix' },
  { name: 'priya_r', totalHours: 15.8, topCategory: 'Productivity', topApp: 'Notion' },
  { name: 'tom_b', totalHours: 27.3, topCategory: 'Browsing', topApp: 'Chrome' },
  { name: 'luna_c', totalHours: 19.6, topCategory: 'Creative', topApp: 'Figma' },
  { name: 'dev_patel', totalHours: 24.1, topCategory: 'Productivity', topApp: 'VS Code' },
  { name: 'jess_m', totalHours: 35.4, topCategory: 'Entertainment', topApp: 'YouTube' },
];

export default function Ranking() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('st_ranking') === 'true');

  const handleEnable = () => {
    localStorage.setItem('st_ranking', 'true');
    setEnabled(true);
  };

  if (!enabled) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <div className="bg-surface-card border border-border rounded-xl p-8 max-w-md w-full text-center">
          <div className="text-4xl mb-4">▦</div>
          <h2 className="text-xl font-semibold text-cream mb-2">Community Ranking</h2>
          <p className="text-sm text-muted leading-relaxed mb-6">
            See how your screen time compares to others. To join the leaderboard,
            you need to consent to sharing your screen time activity under your alias.
            Your email and personal data are never shared.
          </p>
          <div className="bg-surface-light border border-border rounded-lg p-4 mb-6 text-left">
            <p className="text-xs text-muted uppercase tracking-wide mb-2">What gets shared:</p>
            <ul className="text-sm text-cream/80 space-y-1">
              <li>• Your display alias</li>
              <li>• Total weekly screen time</li>
              <li>• Top app category</li>
              <li>• Top app name</li>
            </ul>
          </div>
          <button onClick={handleEnable}
            className="w-full py-3 rounded-lg bg-caramel text-surface font-semibold text-sm hover:bg-caramel-light transition">
            I Consent · Show Leaderboard
          </button>
        </div>
      </div>
    );
  }

  const sorted = [...MOCK_RANKINGS].sort((a, b) => a.totalHours - b.totalHours);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-cream">Weekly Leaderboard</h2>
        <span className="text-xs text-muted border border-border rounded-full px-3 py-1">
          {sorted.length} participants
        </span>
      </div>

      <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-5 py-3 text-xs uppercase tracking-wide text-muted font-medium">#</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wide text-muted font-medium">User</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wide text-muted font-medium">Total Time</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wide text-muted font-medium">Top Category</th>
              <th className="px-5 py-3 text-xs uppercase tracking-wide text-muted font-medium">Top App</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((user, i) => (
              <tr key={user.name} className="border-b border-border/50 hover:bg-surface-hover transition">
                <td className="px-5 py-3">
                  <span className={`font-semibold ${i === 0 ? 'text-caramel' : i < 3 ? 'text-caramel-light' : 'text-muted'}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="px-5 py-3 text-cream font-medium">{user.name}</td>
                <td className="px-5 py-3">
                  <span className="text-cream">{user.totalHours.toFixed(1)}h</span>
                  <div className="w-24 h-1.5 bg-surface-light rounded-full mt-1">
                    <div className="h-full rounded-full bg-caramel/60"
                      style={{ width: `${Math.min(100, (user.totalHours / 40) * 100)}%` }} />
                  </div>
                </td>
                <td className="px-5 py-3 text-muted">{user.topCategory}</td>
                <td className="px-5 py-3 text-muted">{user.topApp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
