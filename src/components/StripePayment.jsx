import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CARD_STYLE = {
  style: {
    base: {
      color: '#e8ddd3',
      fontFamily: 'inherit',
      fontSize: '16px',
      '::placeholder': { color: '#9a8e80' },
    },
    invalid: { color: '#FF6B6B' },
  },
};

function CheckoutForm({ clientSecret, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(
      clientSecret,
      { payment_method: { card: elements.getElement(CardElement) } },
    );

    if (confirmError) {
      setError(confirmError.message);
      setLoading(false);
      onError?.(confirmError);
    } else if (setupIntent.status === 'succeeded') {
      setLoading(false);
      onSuccess(setupIntent);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs uppercase tracking-wide text-muted block mb-2">Card details</label>
        <div className="bg-surface rounded-lg p-4 border border-border">
          <CardElement options={CARD_STYLE} />
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <p className="text-xs text-muted leading-relaxed">
        Your card will only be charged if you fail your weekly challenge. No upfront charge ($0.00).
      </p>

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full py-3 rounded-lg bg-caramel text-surface font-semibold text-sm hover:bg-caramel-light transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Setting up...' : 'Activate Challenge'}
      </button>
    </form>
  );
}

export default function StripePayment({ clientSecret, onSuccess, onError }) {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm clientSecret={clientSecret} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}
