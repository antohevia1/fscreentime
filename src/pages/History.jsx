import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import CardManagement from '../components/CardManagement';

function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadge(status) {
  const map = {
    active: { label: 'Active', cls: 'bg-caramel/20 text-caramel' },
    passed: { label: 'Passed', cls: 'bg-emerald-500/20 text-emerald-400' },
    charged: { label: 'Charged', cls: 'bg-red-500/20 text-red-400' },
    cancelled: { label: 'Cancelled', cls: 'bg-surface-hover text-muted' },
    charge_failed: { label: 'Charge Failed', cls: 'bg-red-500/20 text-red-400' },
    charge_abandoned: { label: 'Abandoned', cls: 'bg-surface-hover text-muted' },
    failed_no_payment: { label: 'No Card', cls: 'bg-red-500/20 text-red-400' },
    requires_authentication: { label: 'Auth Required', cls: 'bg-yellow-500/20 text-yellow-400' },
  };
  const s = map[status] || { label: status || 'Active', cls: 'bg-caramel/20 text-caramel' };
  return <span className={`text-xs px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}

export default function History() {
  const { user, signOut } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    if (!user?.token) return;
    api.get('/goals/history', {
      headers: { Authorization: `Bearer ${user.token}` },
    }).then(resp => {
      setGoals(resp.data || []);
    }).catch(err => {
      console.error('Failed to fetch goal history:', err);
    }).finally(() => setLoading(false));
  }, [user?.token]);

  const handleDeleteAccount = useCallback(async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.post('/delete-account', {
        identityId: user?.identityId,
      }, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      localStorage.clear();
      signOut();
      window.location.href = '/';
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete account data');
      setDeleting(false);
    }
  }, [user, signOut]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted text-sm">Loading history...</p>
      </div>
    );
  }

  const pastGoals = goals.filter(g => g.status !== 'active');
  const totalCharged = pastGoals.filter(g => g.status === 'charged' || g.status === 'cancelled').reduce((sum, g) => sum + (g.amount || 10), 0);
  const totalPassed = pastGoals.filter(g => g.status === 'passed').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-cream">History</h2>
        <p className="text-sm text-muted mt-1">Your past goals and payment method</p>
      </div>

      {/* Card Management */}
      <CardManagement />

      {/* Summary stats */}
      {pastGoals.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface-card border border-border rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted">Goals Completed</p>
            <p className="text-lg font-semibold text-cream mt-1">{pastGoals.length}</p>
          </div>
          <div className="bg-surface-card border border-border rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted">Goals Passed</p>
            <p className="text-lg font-semibold text-emerald-400 mt-1">{totalPassed}</p>
          </div>
          <div className="bg-surface-card border border-border rounded-xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted">Total Donated</p>
            <p className="text-lg font-semibold text-red-400 mt-1">${totalCharged}</p>
          </div>
        </div>
      )}

      {/* Goal list */}
      {pastGoals.length === 0 ? (
        <div className="bg-surface-card border border-border rounded-xl p-8 text-center">
          <p className="text-muted text-sm">No past goals yet. Complete a challenge week to see your history here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pastGoals.map((g) => (
            <div key={`${g.userId}-${g.weekStart}`} className="bg-surface-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-cream font-medium">
                  {fmtDate(g.weekStart)} → {fmtDate(g.weekEnd)}
                </p>
                {statusBadge(g.status)}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
                <span>Limit: {g.weeklyLimit}h</span>
                {g.screenTimeActual && <span>Actual: {g.screenTimeActual}h</span>}
                <span>Charity: {g.charity}</span>
                {(g.status === 'charged' || g.status === 'cancelled') && (
                  <span className="text-red-400">${g.amount || 10} charged</span>
                )}
                {g.status === 'passed' && (
                  <span className="text-emerald-400">$0 charged</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete account */}
      <div className="border-t border-border pt-6 mt-6">
        <h3 className="text-sm font-medium text-red-400 mb-2">Danger Zone</h3>
        <p className="text-xs text-muted mb-3">
          Permanently delete all your screen time data and goal history. This cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-xs text-red-400 border border-red-500/30 rounded-lg px-3 py-1.5 hover:bg-red-500/10 transition"
        >
          Delete My Data
        </button>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-surface-card border border-border rounded-xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-semibold text-red-400">Delete all data?</h3>
            <p className="text-sm text-muted leading-relaxed">
              This will permanently delete all your screen time data, goal history, and payment records. You will be signed out.
            </p>
            <p className="text-xs text-muted">This action cannot be undone.</p>
            {deleteError && <p className="text-sm text-red-400">{deleteError}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowDeleteConfirm(false)} disabled={deleting}
                className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted hover:text-cream hover:border-caramel/40 transition disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleDeleteAccount} disabled={deleting}
                className="flex-1 py-2.5 rounded-lg bg-red-500/20 border border-red-500/40 text-sm text-red-400 font-semibold hover:bg-red-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed">
                {deleting ? 'Deleting...' : 'Delete Everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
