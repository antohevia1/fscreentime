const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: process.env.SES_REGION || 'ap-southeast-2' });
const FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@fscreentime.app';
const SUPPORT_EMAIL = process.env.SES_SUPPORT_EMAIL || 'ifundfocus@gmail.com';
const APP_URL = process.env.APP_URL || 'https://www.fscreentime.app';

const LOGO_URL = `${APP_URL}/icon-1024.png`;

// ── Base HTML template ────────────────────────────────────────────────
function baseTemplate(title, content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#1a1714;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#1a1714;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background:#242019;border-radius:12px;overflow:hidden;">
          <!-- Header with logo -->
          <tr>
            <td style="padding:32px 40px 20px;text-align:center;border-bottom:1px solid #3e3830;">
              <a href="${APP_URL}" style="text-decoration:none;">
                <img src="${LOGO_URL}" alt="fscreentime" width="48" height="48" style="display:block;margin:0 auto 12px;border-radius:10px;" />
              </a>
              <div style="font-size:22px;font-weight:600;letter-spacing:-0.3px;">
                <span style="color:#c4956a;">fScreentime</span><span style="color:#9a8e80;">.app</span>
              </div>
              <div style="font-size:11px;color:#9a8e80;margin-top:4px;text-transform:uppercase;letter-spacing:1.5px;">Skin in the Game</div>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #3e3830;text-align:center;">
              <p style="margin:0;font-size:13px;color:#9a8e80;line-height:1.5;">
                <a href="${APP_URL}" style="color:#c4956a;text-decoration:none;">fscreentime.app</a>
                &nbsp;&middot;&nbsp;
                <a href="${APP_URL}/privacy" style="color:#9a8e80;text-decoration:none;">Privacy</a>
                &nbsp;&middot;&nbsp;
                <a href="${APP_URL}/terms" style="color:#9a8e80;text-decoration:none;">Terms</a>
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#9a8e80;">
                You received this because you have an active goal on fscreentime.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Email templates ───────────────────────────────────────────────────

function paymentSetupComplete(email) {
  const content = `
    <h2 style="margin:0 0 16px;font-size:22px;color:#f5efe6;font-weight:600;">Payment Method Saved</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#d4aa80;line-height:1.6;">
      Your card has been securely saved. No charges will be made unless you fail to meet your weekly screen time goal.
    </p>
    <div style="background:#2e2a24;border-radius:8px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#9a8e80;">
        <strong style="color:#f5efe6;">How it works:</strong> If you exceed your weekly limit, a $10 penalty will be automatically charged. Meet your goal and you pay nothing.
      </p>
    </div>
    <p style="margin:16px 0 0;font-size:15px;color:#d4aa80;line-height:1.6;">
      Stay focused and keep your screen time in check!
    </p>`;
  return {
    subject: 'Payment method saved — fscreentime',
    html: baseTemplate('Payment Method Saved', content),
    text: `Payment Method Saved\n\nYour card has been securely saved. No charges will be made unless you fail to meet your weekly screen time goal.\n\nHow it works: If you exceed your weekly limit, a $10 penalty will be automatically charged. Meet your goal and you pay nothing.\n\nStay focused!`,
  };
}

function goalPassed(email, { weekStart, weekEnd, screenTimeHours, goalHours }) {
  const content = `
    <h2 style="margin:0 0 16px;font-size:22px;color:#22c55e;font-weight:600;">&#10003; Goal Achieved!</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#d4aa80;line-height:1.6;">
      Congratulations! You stayed within your screen time limit for the week of <strong style="color:#f5efe6;">${weekStart}</strong> to <strong style="color:#f5efe6;">${weekEnd}</strong>.
    </p>
    <div style="background:#2e2a24;border-radius:8px;padding:16px 20px;margin:16px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#9a8e80;">Your screen time</td>
          <td align="right" style="padding:4px 0;font-size:14px;color:#22c55e;font-weight:600;">${screenTimeHours}h</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#9a8e80;">Weekly limit</td>
          <td align="right" style="padding:4px 0;font-size:14px;color:#f5efe6;font-weight:600;">${goalHours}h</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#9a8e80;">Amount charged</td>
          <td align="right" style="padding:4px 0;font-size:14px;color:#22c55e;font-weight:600;">$0.00</td>
        </tr>
      </table>
    </div>
    <p style="margin:16px 0 0;font-size:15px;color:#d4aa80;line-height:1.6;">
      No penalty was charged. Keep up the great work!
    </p>`;
  return {
    subject: `Goal achieved! ${screenTimeHours}h / ${goalHours}h — fscreentime`,
    html: baseTemplate('Goal Achieved', content),
    text: `Goal Achieved!\n\nYou stayed within your screen time limit for ${weekStart} to ${weekEnd}.\n\nYour screen time: ${screenTimeHours}h\nWeekly limit: ${goalHours}h\nAmount charged: $0.00\n\nNo penalty was charged. Keep up the great work!`,
  };
}

function penaltyCharged(email, { weekStart, weekEnd, screenTimeHours, goalHours, amount, charity }) {
  const charityNote = charity
    ? `<p style="margin:12px 0 0;font-size:14px;color:#9a8e80;">Your penalty will be donated to <strong style="color:#f5efe6;">${charity}</strong>.</p>`
    : '';
  const charityText = charity ? `\nYour penalty will be donated to ${charity}.` : '';
  const content = `
    <h2 style="margin:0 0 16px;font-size:22px;color:#ef4444;font-weight:600;">Penalty Charged</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#d4aa80;line-height:1.6;">
      You exceeded your screen time goal for the week of <strong style="color:#f5efe6;">${weekStart}</strong> to <strong style="color:#f5efe6;">${weekEnd}</strong>.
    </p>
    <div style="background:#2e2a24;border-radius:8px;padding:16px 20px;margin:16px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#9a8e80;">Your screen time</td>
          <td align="right" style="padding:4px 0;font-size:14px;color:#ef4444;font-weight:600;">${screenTimeHours}h</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#9a8e80;">Weekly limit</td>
          <td align="right" style="padding:4px 0;font-size:14px;color:#f5efe6;font-weight:600;">${goalHours}h</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#9a8e80;">Amount charged</td>
          <td align="right" style="padding:4px 0;font-size:14px;color:#ef4444;font-weight:600;">$${(amount / 100).toFixed(2)}</td>
        </tr>
      </table>
      ${charityNote}
    </div>
    <p style="margin:16px 0 0;font-size:15px;color:#d4aa80;line-height:1.6;">
      Use this as motivation to reduce your screen time next week.
    </p>`;
  return {
    subject: `Penalty charged: $${(amount / 100).toFixed(2)} — fscreentime`,
    html: baseTemplate('Penalty Charged', content),
    text: `Penalty Charged\n\nYou exceeded your screen time goal for ${weekStart} to ${weekEnd}.\n\nYour screen time: ${screenTimeHours}h\nWeekly limit: ${goalHours}h\nAmount charged: $${(amount / 100).toFixed(2)}${charityText}\n\nUse this as motivation to reduce your screen time next week.`,
  };
}

function chargeFailed(email, { weekStart, reason }) {
  const content = `
    <h2 style="margin:0 0 16px;font-size:22px;color:#e8a04c;font-weight:600;">Payment Failed</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#d4aa80;line-height:1.6;">
      We were unable to process your penalty charge for the week of <strong style="color:#f5efe6;">${weekStart}</strong>.
    </p>
    <div style="background:#2e2a24;border-radius:8px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#e8a04c;">
        <strong>Reason:</strong> ${reason}
      </p>
    </div>
    <p style="margin:16px 0 0;font-size:15px;color:#d4aa80;line-height:1.6;">
      Please update your payment method to avoid issues with future goals.
    </p>
    <a href="${APP_URL}/app" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#c4956a;color:#1a1714;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
      Update Payment Method
    </a>`;
  return {
    subject: 'Payment failed — action required — fscreentime',
    html: baseTemplate('Payment Failed', content),
    text: `Payment Failed\n\nWe were unable to process your penalty charge for the week of ${weekStart}.\n\nReason: ${reason}\n\nPlease update your payment method at ${APP_URL}/app`,
  };
}

function goalCancelled(email, { weekStart, charged, amount }) {
  const chargeText = charged
    ? `A forfeit penalty of <strong style="color:#ef4444;">$${(amount / 100).toFixed(2)}</strong> has been charged to your card.`
    : `No charge was made.`;
  const chargeTextPlain = charged
    ? `A forfeit penalty of $${(amount / 100).toFixed(2)} has been charged to your card.`
    : `No charge was made.`;
  const content = `
    <h2 style="margin:0 0 16px;font-size:22px;color:#f5efe6;font-weight:600;">Goal Cancelled</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#d4aa80;line-height:1.6;">
      Your goal for the week of <strong style="color:#f5efe6;">${weekStart}</strong> has been cancelled.
    </p>
    <div style="background:#2e2a24;border-radius:8px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#d4aa80;">${chargeText}</p>
    </div>
    <p style="margin:16px 0 0;font-size:15px;color:#d4aa80;line-height:1.6;">
      You can set a new goal anytime from the app.
    </p>`;
  return {
    subject: 'Goal cancelled — fscreentime',
    html: baseTemplate('Goal Cancelled', content),
    text: `Goal Cancelled\n\nYour goal for the week of ${weekStart} has been cancelled.\n\n${chargeTextPlain}\n\nYou can set a new goal anytime from the app.`,
  };
}

function contactFormSubmission({ name, email, rating, message }) {
  const stars = rating ? '★'.repeat(rating) + '☆'.repeat(5 - rating) : 'Not rated';
  const content = `
    <h2 style="margin:0 0 16px;font-size:22px;color:#f5efe6;font-weight:600;">New Feedback Received</h2>
    <div style="background:#2e2a24;border-radius:8px;padding:16px 20px;margin:16px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#9a8e80;">From</td>
          <td align="right" style="padding:4px 0;font-size:14px;color:#f5efe6;">${name || 'Anonymous'}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#9a8e80;">Email</td>
          <td align="right" style="padding:4px 0;font-size:14px;color:#f5efe6;">${email || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:14px;color:#9a8e80;">Rating</td>
          <td align="right" style="padding:4px 0;font-size:14px;color:#e8a04c;">${stars}</td>
        </tr>
      </table>
    </div>
    <div style="background:#2e2a24;border-radius:8px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0 0 8px;font-size:12px;color:#9a8e80;text-transform:uppercase;letter-spacing:1px;">Message</p>
      <p style="margin:0;font-size:15px;color:#d4aa80;line-height:1.6;white-space:pre-wrap;">${escapeHtml(message)}</p>
    </div>`;
  return {
    subject: `[fscreentime] Feedback from ${name || 'Anonymous'} — ${stars}`,
    html: baseTemplate('New Feedback', content),
    text: `New Feedback\n\nFrom: ${name || 'Anonymous'}\nEmail: ${email || 'Not provided'}\nRating: ${stars}\n\nMessage:\n${message}`,
  };
}

// ── HTML escaping for user-submitted content ──────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Send email via SES ────────────────────────────────────────────────
async function sendEmail(to, template) {
  try {
    await ses.send(new SendEmailCommand({
      Source: FROM_EMAIL,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: template.subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: template.html, Charset: 'UTF-8' },
          Text: { Data: template.text, Charset: 'UTF-8' },
        },
      },
    }));
    console.log(`Email sent to ${to}: ${template.subject}`);
  } catch (err) {
    console.error(`Failed to send email to ${to}:`, err.message);
    // Don't throw — email failures should not break the main flow
  }
}

module.exports = {
  sendEmail,
  templates: {
    paymentSetupComplete,
    goalPassed,
    penaltyCharged,
    chargeFailed,
    goalCancelled,
    contactFormSubmission,
  },
  escapeHtml,
  FROM_EMAIL,
  SUPPORT_EMAIL,
};
