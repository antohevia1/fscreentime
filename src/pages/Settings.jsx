import { useState, useCallback } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import CardManagement from '../components/CardManagement';

export default function Settings() {
  const { user, signOut } = useAuth();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-cream">Settings</h2>
        <p className="text-sm text-muted mt-1">Manage your payment method and account</p>
      </div>

      {/* Card Management */}
      <CardManagement />

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
