const { sendEmail, templates, escapeHtml, SUPPORT_EMAIL } = require('./email');

const headers = { 'Content-Type': 'application/json' };
const res = (code, body) => ({ statusCode: code, headers, body: JSON.stringify(body) });

// Input sanitization: strip HTML tags and limit length
function sanitize(str, maxLength = 2000) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // strip control chars
    .trim()
    .slice(0, maxLength);
}

/* ─── POST /contact — submit feedback / support request ────────────── */
module.exports.submitFeedback = async (event) => {
  try {
    let raw = event.body || '';
    if (event.isBase64Encoded) raw = Buffer.from(raw, 'base64').toString('utf-8');

    const body = JSON.parse(raw);
    const name = sanitize(body.name, 100);
    const email = sanitize(body.email, 254);
    const message = sanitize(body.message, 2000);
    const rating = Math.min(5, Math.max(0, parseInt(body.rating, 10) || 0));

    if (!message) {
      return res(400, { error: 'Message is required' });
    }

    // Basic email format validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res(400, { error: 'Invalid email format' });
    }

    // Send to internal support mailbox
    const template = templates.contactFormSubmission({ name, email, rating, message });
    await sendEmail(SUPPORT_EMAIL, template);

    return res(200, { sent: true });
  } catch (err) {
    console.error('SubmitFeedback error:', err);
    return res(500, { error: 'Failed to send feedback' });
  }
};
