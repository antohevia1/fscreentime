import { useState } from 'react';
import api from '../utils/api';

function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={`text-2xl transition-colors ${
            star <= (hover || value) ? 'text-accent' : 'text-border'
          }`}
        >
          {star <= (hover || value) ? '\u2605' : '\u2606'}
        </button>
      ))}
    </div>
  );
}

export default function FeedbackForm({ onClose }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    setError(null);

    try {
      await api.post('/contact', {
        name: name.trim(),
        email: email.trim(),
        rating,
        message: message.trim(),
      });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-4">&#10003;</div>
        <h3 className="text-lg font-semibold text-cream mb-2">Thank you!</h3>
        <p className="text-muted text-sm mb-6">
          Your feedback has been received. We'll get back to you if needed.
        </p>
        <button
          onClick={onClose}
          className="px-5 py-2 bg-surface-hover text-cream rounded-lg text-sm hover:bg-border transition"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-muted mb-1">Name (optional)</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-cream text-sm focus:outline-none focus:border-caramel transition"
          placeholder="Your name"
        />
      </div>

      <div>
        <label className="block text-sm text-muted mb-1">Email (optional)</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={254}
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-cream text-sm focus:outline-none focus:border-caramel transition"
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label className="block text-sm text-muted mb-1">Rating</label>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div>
        <label className="block text-sm text-muted mb-1">
          Message <span className="text-caramel">*</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={4}
          required
          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-cream text-sm focus:outline-none focus:border-caramel transition resize-none"
          placeholder="Tell us what you think, report an issue, or ask a question..."
        />
        <p className="text-xs text-muted mt-1 text-right">{message.length}/2000</p>
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-muted text-sm hover:text-cream transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={sending || !message.trim()}
          className="px-5 py-2 bg-caramel text-surface rounded-lg text-sm font-medium hover:bg-caramel-light transition disabled:opacity-50"
        >
          {sending ? 'Sending...' : 'Send Feedback'}
        </button>
      </div>
    </form>
  );
}
