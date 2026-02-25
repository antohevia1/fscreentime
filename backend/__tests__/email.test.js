// Mock SES before requiring email module
const mockSesSend = jest.fn();
jest.mock('@aws-sdk/client-ses', () => ({
  SESClient: jest.fn(() => ({ send: mockSesSend })),
  SendEmailCommand: jest.fn((p) => ({ _type: 'SendEmailCommand', ...p })),
}));

const { sendEmail, templates, escapeHtml } = require('../email');

beforeEach(() => {
  mockSesSend.mockReset();
});

describe('escapeHtml', () => {
  test('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });

  test('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  test('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  test('returns empty string for null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml('')).toBe('');
  });
});

describe('email templates', () => {
  test('paymentSetupComplete generates valid email with logo', () => {
    const email = templates.paymentSetupComplete('user@test.com');
    expect(email.subject).toContain('Payment method saved');
    expect(email.html).toContain('fScreentime');
    expect(email.html).toContain('icon-1024.png');
    expect(email.html).toContain('securely saved');
    expect(email.text).toContain('securely saved');
  });

  test('goalPassed shows correct stats', () => {
    const email = templates.goalPassed('user@test.com', {
      weekStart: '2026-02-16',
      weekEnd: '2026-02-22',
      screenTimeHours: '8.5',
      goalHours: 20,
    });
    expect(email.subject).toContain('8.5');
    expect(email.subject).toContain('20');
    expect(email.html).toContain('8.5h');
    expect(email.html).toContain('20h');
    expect(email.html).toContain('$0.00');
    expect(email.html).toContain('2026-02-16');
  });

  test('penaltyCharged shows amount and charity', () => {
    const email = templates.penaltyCharged('user@test.com', {
      weekStart: '2026-02-16',
      weekEnd: '2026-02-22',
      screenTimeHours: '25.0',
      goalHours: 20,
      amount: 1000,
      charity: 'Red Cross',
    });
    expect(email.subject).toContain('$10.00');
    expect(email.html).toContain('$10.00');
    expect(email.html).toContain('Red Cross');
    expect(email.text).toContain('Red Cross');
  });

  test('penaltyCharged works without charity', () => {
    const email = templates.penaltyCharged('user@test.com', {
      weekStart: '2026-02-16',
      weekEnd: '2026-02-22',
      screenTimeHours: '25.0',
      goalHours: 20,
      amount: 1000,
      charity: '',
    });
    expect(email.html).not.toContain('donated to');
  });

  test('chargeFailed shows reason and CTA', () => {
    const email = templates.chargeFailed('user@test.com', {
      weekStart: '2026-02-16',
      reason: 'Your card has insufficient funds.',
    });
    expect(email.subject).toContain('action required');
    expect(email.html).toContain('insufficient funds');
    expect(email.html).toContain('Update Payment Method');
  });

  test('goalCancelled shows charge info when charged', () => {
    const email = templates.goalCancelled('user@test.com', {
      weekStart: '2026-02-16',
      charged: true,
      amount: 1000,
    });
    expect(email.html).toContain('$10.00');
    expect(email.html).toContain('cancelled');
  });

  test('goalCancelled shows no charge when not charged', () => {
    const email = templates.goalCancelled('user@test.com', {
      weekStart: '2026-02-16',
      charged: false,
      amount: 0,
    });
    expect(email.html).toContain('No charge was made');
  });

  test('goalRenewed shows next week details', () => {
    const email = templates.goalRenewed('user@test.com', {
      weekStart: '2026-02-23',
      weekEnd: '2026-03-01',
      dailyLimit: 2,
      weeklyLimit: 14,
      charity: 'UNICEF',
    });
    expect(email.subject).toContain('2026-02-23');
    expect(email.subject).toContain('2026-03-01');
    expect(email.html).toContain('2h');
    expect(email.html).toContain('14h');
    expect(email.html).toContain('UNICEF');
    expect(email.html).toContain('$10.00');
    expect(email.html).toContain('Cancel Renewal');
    expect(email.text).toContain('auto-renewal');
  });

  test('contactFormSubmission escapes HTML in message', () => {
    const email = templates.contactFormSubmission({
      name: 'Test User',
      email: 'test@test.com',
      rating: 4,
      message: '<script>alert("xss")</script>Hello',
    });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
    expect(email.subject).toContain('Test User');
    expect(email.html).toContain('★★★★☆');
  });
});

describe('sendEmail', () => {
  test('sends email via SES', async () => {
    mockSesSend.mockResolvedValueOnce({});

    await sendEmail('test@test.com', {
      subject: 'Test',
      html: '<p>Hello</p>',
      text: 'Hello',
    });

    expect(mockSesSend).toHaveBeenCalledTimes(1);
  });

  test('does not throw on SES failure', async () => {
    mockSesSend.mockRejectedValueOnce(new Error('SES error'));

    // Should not throw
    await expect(
      sendEmail('test@test.com', { subject: 'Test', html: '', text: '' }),
    ).resolves.toBeUndefined();
  });
});
