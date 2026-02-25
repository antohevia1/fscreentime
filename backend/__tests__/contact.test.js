const mockSendEmail = jest.fn();
jest.mock('../email', () => ({
  sendEmail: mockSendEmail,
  templates: {
    contactFormSubmission: jest.fn(({ name, email, rating, message }) => ({
      subject: `Feedback from ${name}`,
      html: `<p>${message}</p>`,
      text: message,
    })),
  },
  SUPPORT_EMAIL: 'test-support@example.com',
}));

const contact = require('../contact');

function makeEvent(body, { isBase64 = false } = {}) {
  return {
    headers: { 'content-type': 'application/json' },
    body: isBase64 ? Buffer.from(JSON.stringify(body)).toString('base64') : JSON.stringify(body),
    isBase64Encoded: isBase64,
  };
}

beforeEach(() => {
  mockSendEmail.mockReset();
});

describe('POST /contact (submitFeedback)', () => {
  test('sends feedback to support email', async () => {
    mockSendEmail.mockResolvedValueOnce();

    const event = makeEvent({
      name: 'John Doe',
      email: 'john@example.com',
      rating: 5,
      message: 'Great app!',
    });
    const result = await contact.submitFeedback(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).sent).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledWith(
      'test-support@example.com',
      expect.objectContaining({ subject: expect.stringContaining('John Doe') }),
    );
  });

  test('rejects empty message', async () => {
    const event = makeEvent({ name: 'Test', message: '' });
    const result = await contact.submitFeedback(event);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/Message is required/);
  });

  test('rejects missing message', async () => {
    const event = makeEvent({ name: 'Test' });
    const result = await contact.submitFeedback(event);
    expect(result.statusCode).toBe(400);
  });

  test('rejects invalid email format', async () => {
    const event = makeEvent({ name: 'Test', email: 'not-an-email', message: 'Hello' });
    const result = await contact.submitFeedback(event);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/Invalid email/);
  });

  test('strips HTML tags from message (XSS protection)', async () => {
    mockSendEmail.mockResolvedValueOnce();
    const { contactFormSubmission } = require('../email').templates;

    const event = makeEvent({
      name: '<script>alert("xss")</script>John',
      email: 'john@example.com',
      rating: 3,
      message: '<img src=x onerror=alert(1)>Hello <b>world</b>',
    });
    const result = await contact.submitFeedback(event);

    expect(result.statusCode).toBe(200);
    // Verify sanitization happened — name and message should have tags stripped
    const callArgs = contactFormSubmission.mock.calls[0][0];
    expect(callArgs.name).not.toContain('<script>');
    expect(callArgs.message).not.toContain('<img');
    expect(callArgs.message).not.toContain('<b>');
  });

  test('truncates very long messages', async () => {
    mockSendEmail.mockResolvedValueOnce();
    const { contactFormSubmission } = require('../email').templates;

    const event = makeEvent({
      message: 'A'.repeat(5000),
    });
    const result = await contact.submitFeedback(event);

    expect(result.statusCode).toBe(200);
    const callArgs = contactFormSubmission.mock.calls[0][0];
    expect(callArgs.message.length).toBeLessThanOrEqual(2000);
  });

  test('clamps rating between 0 and 5', async () => {
    mockSendEmail.mockResolvedValueOnce();
    const { contactFormSubmission } = require('../email').templates;

    const event = makeEvent({ rating: 99, message: 'Test' });
    const result = await contact.submitFeedback(event);

    expect(result.statusCode).toBe(200);
    const callArgs = contactFormSubmission.mock.calls[0][0];
    expect(callArgs.rating).toBe(5);
  });

  test('handles base64 encoded body', async () => {
    mockSendEmail.mockResolvedValueOnce();

    const event = makeEvent({ message: 'Base64 test' }, { isBase64: true });
    const result = await contact.submitFeedback(event);
    expect(result.statusCode).toBe(200);
  });

  test('works without name or email', async () => {
    mockSendEmail.mockResolvedValueOnce();

    const event = makeEvent({ message: 'Anonymous feedback' });
    const result = await contact.submitFeedback(event);
    expect(result.statusCode).toBe(200);
  });

  test('returns 500 on SES failure', async () => {
    mockSendEmail.mockRejectedValueOnce(new Error('SES down'));

    const event = makeEvent({ message: 'This will fail' });
    const result = await contact.submitFeedback(event);
    expect(result.statusCode).toBe(500);
  });

  test('strips control characters from input', async () => {
    mockSendEmail.mockResolvedValueOnce();
    const { contactFormSubmission } = require('../email').templates;

    const event = makeEvent({
      message: 'Hello\x00\x01\x02World',
    });
    const result = await contact.submitFeedback(event);

    expect(result.statusCode).toBe(200);
    const callArgs = contactFormSubmission.mock.calls[0][0];
    expect(callArgs.message).not.toMatch(/[\x00-\x08]/);
  });
});
