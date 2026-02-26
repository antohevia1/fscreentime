import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import StripePayment from './StripePayment';

export default function CardManagement() {
  const { user } = useAuth();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [error, setError] = useState(null);

  const fetchCard = async () => {
    try {
      const resp = await api.get('/payment-method', {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setCard(resp.data.hasCard ? resp.data.card : null);
    } catch (err) {
      console.error('Failed to fetch card:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.token) fetchCard();
  }, [user?.token]);

  const handleUpdate = async () => {
    setUpdating(true);
    setError(null);
    try {
      const resp = await api.post('/update-payment-method', {}, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      setClientSecret(resp.data.client_secret);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start card update');
      setUpdating(false);
    }
  };

  const handlePaymentSuccess = () => {
    setClientSecret(null);
    setUpdating(false);
    setLoading(true);
    fetchCard();
  };

  const handlePaymentError = (err) => {
    setError(err.message || 'Card update failed');
    setClientSecret(null);
    setUpdating(false);
  };

  if (loading) {
    return <p className="text-muted text-sm">Loading card details...</p>;
  }

  // Card expiry warning
  const isExpiringSoon = card && (() => {
    const now = new Date();
    const expDate = new Date(card.exp_year, card.exp_month - 1);
    const diffMs = expDate - now;
    return diffMs < 60 * 24 * 3600000; // within 60 days
  })();

  return (
    <div className="space-y-4">
      {card ? (
        <div className="bg-surface-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-cream mb-3">Payment Method</h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-8 bg-surface-light border border-border rounded flex items-center justify-center text-xs text-muted uppercase">
              {card.brand}
            </div>
            <div>
              <p className="text-cream text-sm font-mono">**** **** **** {card.last4}</p>
              <p className={`text-xs mt-0.5 ${isExpiringSoon ? 'text-red-400' : 'text-muted'}`}>
                Expires {String(card.exp_month).padStart(2, '0')}/{card.exp_year}
                {isExpiringSoon && ' — expiring soon, please update'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface-card border border-border rounded-xl p-5">
          <p className="text-muted text-sm">No payment method on file.</p>
        </div>
      )}

      {isExpiringSoon && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-sm text-red-400">
            Your card expires soon. Update it to avoid failed charges on your next goal.
          </p>
        </div>
      )}

      {clientSecret ? (
        <div className="bg-surface-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-medium text-cream mb-3">Enter new card details</h3>
          <StripePayment
            clientSecret={clientSecret}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
          <button
            onClick={() => { setClientSecret(null); setUpdating(false); }}
            className="w-full mt-3 py-2 text-sm text-muted hover:text-cream transition"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={handleUpdate}
          disabled={updating}
          className="py-2 px-4 rounded-lg border border-border text-sm text-muted hover:text-cream hover:border-caramel/40 transition disabled:opacity-50"
        >
          {updating ? 'Loading...' : card ? 'Update Card' : 'Add Card'}
        </button>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
