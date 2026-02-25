// ── Mock AWS SDK + Stripe ─────────────────────────────────────────────
const mockDdbSend = jest.fn();
const mockS3Send = jest.fn();
const mockStripe = {
  customers: { create: jest.fn() },
  setupIntents: { create: jest.fn() },
  paymentIntents: { create: jest.fn() },
  webhooks: { constructEvent: jest.fn() },
};

jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: jest.fn() }));
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: mockDdbSend }) },
  PutCommand: jest.fn((p) => ({ _type: 'PutCommand', ...p })),
  GetCommand: jest.fn((p) => ({ _type: 'GetCommand', ...p })),
  UpdateCommand: jest.fn((p) => ({ _type: 'UpdateCommand', ...p })),
  ScanCommand: jest.fn((p) => ({ _type: 'ScanCommand', ...p })),
}));
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: mockS3Send })),
  GetObjectCommand: jest.fn((p) => ({ _type: 'GetObjectCommand', ...p })),
}));
jest.mock('stripe', () => jest.fn(() => mockStripe));

const mockSendEmail = jest.fn();
jest.mock('../email', () => ({
  sendEmail: mockSendEmail,
  templates: {
    paymentSetupComplete: jest.fn(() => ({ subject: 'test', html: '<p>test</p>', text: 'test' })),
    goalPassed: jest.fn(() => ({ subject: 'test', html: '<p>test</p>', text: 'test' })),
    penaltyCharged: jest.fn(() => ({ subject: 'test', html: '<p>test</p>', text: 'test' })),
    chargeFailed: jest.fn(() => ({ subject: 'test', html: '<p>test</p>', text: 'test' })),
    goalCancelled: jest.fn(() => ({ subject: 'test', html: '<p>test</p>', text: 'test' })),
  },
}));

process.env.DYNAMODB_PAYMENTS_TABLE = 'test-payments';
process.env.DYNAMODB_GOALS_TABLE = 'test-goals';
process.env.DATA_BUCKET = 'test-data';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake';

const stripe = require('../stripe');

// ── Helpers ───────────────────────────────────────────────────────────
function makeEvent(body, { headers = {}, authorizer } = {}) {
  return {
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body || {}),
    isBase64Encoded: false,
    requestContext: authorizer ? { authorizer: { jwt: { claims: { sub: authorizer } } } } : {},
  };
}

function s3Body(data) {
  return { Body: { transformToString: () => Promise.resolve(JSON.stringify(data)) } };
}

beforeEach(() => {
  mockDdbSend.mockReset();
  mockS3Send.mockReset();
  mockSendEmail.mockReset();
  mockStripe.customers.create.mockReset();
  mockStripe.setupIntents.create.mockReset();
  mockStripe.paymentIntents.create.mockReset();
  mockStripe.webhooks.constructEvent.mockReset();
});

// ═══════════════════════════════════════════════════════════════════════
// POST /create-setup-intent
// ═══════════════════════════════════════════════════════════════════════
describe('POST /create-setup-intent', () => {
  test('returns 401 when no authorizer', async () => {
    const event = makeEvent({});
    const result = await stripe.createSetupIntent(event);
    expect(result.statusCode).toBe(401);
  });

  test('returns already_setup when user has completed setup', async () => {
    mockDdbSend.mockResolvedValueOnce({
      Item: { userId: 'user-1', setup_complete: true, stripe_customer_id: 'cus_123' },
    });

    const event = makeEvent({ email: 'test@test.com' }, { authorizer: 'user-1' });
    const result = await stripe.createSetupIntent(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).already_setup).toBe(true);
    expect(mockStripe.setupIntents.create).not.toHaveBeenCalled();
  });

  test('creates new customer and setup intent for new user', async () => {
    mockDdbSend.mockResolvedValueOnce({ Item: null }); // no existing record
    mockStripe.customers.create.mockResolvedValueOnce({ id: 'cus_new123' });
    mockStripe.setupIntents.create.mockResolvedValueOnce({
      client_secret: 'seti_secret_abc',
    });
    mockDdbSend.mockResolvedValueOnce({}); // PutCommand

    const event = makeEvent({ email: 'new@user.com' }, { authorizer: 'user-new' });
    const result = await stripe.createSetupIntent(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.client_secret).toBe('seti_secret_abc');
    expect(body.customer_id).toBe('cus_new123');
    expect(mockStripe.customers.create).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { userId: 'user-new' }, email: 'new@user.com' }),
    );
  });

  test('reuses existing Stripe customer ID', async () => {
    mockDdbSend.mockResolvedValueOnce({
      Item: { userId: 'user-2', stripe_customer_id: 'cus_existing', setup_complete: false },
    });
    mockStripe.setupIntents.create.mockResolvedValueOnce({
      client_secret: 'seti_secret_reuse',
    });
    mockDdbSend.mockResolvedValueOnce({});

    const event = makeEvent({}, { authorizer: 'user-2' });
    const result = await stripe.createSetupIntent(event);

    expect(result.statusCode).toBe(200);
    expect(mockStripe.customers.create).not.toHaveBeenCalled();
    expect(JSON.parse(result.body).customer_id).toBe('cus_existing');
  });

  test('strips invalid email (e.g. Google federated username) before passing to Stripe', async () => {
    mockDdbSend.mockResolvedValueOnce({ Item: null }); // no existing record
    mockStripe.customers.create.mockResolvedValueOnce({ id: 'cus_google' });
    mockStripe.setupIntents.create.mockResolvedValueOnce({
      client_secret: 'seti_secret_google',
    });
    mockDdbSend.mockResolvedValueOnce({}); // PutCommand

    const event = makeEvent({ email: 'Google_112356695958486946862' }, { authorizer: 'user-google' });
    const result = await stripe.createSetupIntent(event);

    expect(result.statusCode).toBe(200);
    // Should NOT pass the invalid email to Stripe
    expect(mockStripe.customers.create).toHaveBeenCalledWith({
      metadata: { userId: 'user-google' },
    });
    // Email stored in DDB should be null
    const putCall = mockDdbSend.mock.calls[1][0];
    expect(putCall.Item.email).toBeNull();
  });

  test('returns 500 on Stripe API failure', async () => {
    mockDdbSend.mockResolvedValueOnce({ Item: null });
    mockStripe.customers.create.mockRejectedValueOnce(new Error('Stripe is down'));

    const event = makeEvent({}, { authorizer: 'user-3' });
    const result = await stripe.createSetupIntent(event);
    expect(result.statusCode).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// POST /stripe-webhook
// ═══════════════════════════════════════════════════════════════════════
describe('POST /stripe-webhook', () => {
  test('rejects invalid signature', async () => {
    mockStripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const event = makeEvent('{}', { headers: { 'stripe-signature': 'bad_sig' } });
    const result = await stripe.stripeWebhook(event);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/signature/i);
  });

  test('handles setup_intent.succeeded — saves payment method and sends email', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValueOnce({
      type: 'setup_intent.succeeded',
      data: {
        object: {
          metadata: { userId: 'user-webhook' },
          payment_method: 'pm_card_visa',
        },
      },
    });
    mockDdbSend.mockResolvedValueOnce({}); // UpdateCommand
    mockDdbSend.mockResolvedValueOnce({   // GetCommand for email
      Item: { userId: 'user-webhook', email: 'test@example.com' },
    });

    const event = makeEvent('{}', { headers: { 'stripe-signature': 'valid_sig' } });
    const result = await stripe.stripeWebhook(event);

    expect(result.statusCode).toBe(200);
    const updateCall = mockDdbSend.mock.calls[0][0];
    expect(updateCall.ExpressionAttributeValues[':pm']).toBe('pm_card_visa');
    expect(updateCall.ExpressionAttributeValues[':sc']).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledWith('test@example.com', expect.any(Object));
  });

  test('returns 400 when userId missing from metadata', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValueOnce({
      type: 'setup_intent.succeeded',
      data: { object: { metadata: {}, payment_method: 'pm_123' } },
    });

    const event = makeEvent('{}', { headers: { 'stripe-signature': 'valid_sig' } });
    const result = await stripe.stripeWebhook(event);
    expect(result.statusCode).toBe(400);
  });

  test('ignores unhandled event types gracefully', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValueOnce({
      type: 'charge.succeeded',
      data: { object: {} },
    });

    const event = makeEvent('{}', { headers: { 'stripe-signature': 'valid_sig' } });
    const result = await stripe.stripeWebhook(event);
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).received).toBe(true);
    expect(mockDdbSend).not.toHaveBeenCalled();
  });

  test('handles base64 encoded webhook body', async () => {
    mockStripe.webhooks.constructEvent.mockReturnValueOnce({
      type: 'payment_intent.succeeded',
      data: { object: {} },
    });

    const event = {
      headers: { 'stripe-signature': 'valid' },
      body: Buffer.from('{}').toString('base64'),
      isBase64Encoded: true,
    };
    const result = await stripe.stripeWebhook(event);
    expect(result.statusCode).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// POST /goals/cancel (cancelGoal)
// ═══════════════════════════════════════════════════════════════════════
describe('POST /goals/cancel', () => {
  test('returns 401 when not authenticated', async () => {
    const event = makeEvent({ weekStart: '2026-02-23' });
    const result = await stripe.cancelGoal(event);
    expect(result.statusCode).toBe(401);
  });

  test('returns 400 when weekStart missing', async () => {
    const event = makeEvent({}, { authorizer: 'user-c1' });
    const result = await stripe.cancelGoal(event);
    expect(result.statusCode).toBe(400);
  });

  test('returns 404 when goal not found', async () => {
    mockDdbSend.mockResolvedValueOnce({ Item: null });

    const event = makeEvent({ weekStart: '2026-02-23' }, { authorizer: 'user-c2' });
    const result = await stripe.cancelGoal(event);
    expect(result.statusCode).toBe(404);
  });

  test('returns 409 when goal already cancelled', async () => {
    mockDdbSend.mockResolvedValueOnce({
      Item: { userId: 'user-c3', weekStart: '2026-02-23', status: 'cancelled' },
    });

    const event = makeEvent({ weekStart: '2026-02-23' }, { authorizer: 'user-c3' });
    const result = await stripe.cancelGoal(event);
    expect(result.statusCode).toBe(409);
    expect(JSON.parse(result.body).error).toMatch(/already cancelled/);
  });

  test('returns 409 when goal already charged', async () => {
    mockDdbSend.mockResolvedValueOnce({
      Item: { userId: 'user-c4', weekStart: '2026-02-23', status: 'charged' },
    });

    const event = makeEvent({ weekStart: '2026-02-23' }, { authorizer: 'user-c4' });
    const result = await stripe.cancelGoal(event);
    expect(result.statusCode).toBe(409);
  });

  test('cancels without charge when no payment method on file', async () => {
    mockDdbSend.mockResolvedValueOnce({
      Item: { userId: 'user-c5', weekStart: '2026-02-23', status: 'active' },
    });
    mockDdbSend.mockResolvedValueOnce({ Item: { email: null } }); // no payment method
    mockDdbSend.mockResolvedValueOnce({}); // update goal

    const event = makeEvent({ weekStart: '2026-02-23' }, { authorizer: 'user-c5' });
    const result = await stripe.cancelGoal(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.cancelled).toBe(true);
    expect(body.charged).toBe(false);
  });

  test('charges $10 penalty and marks cancelled on success', async () => {
    mockDdbSend.mockResolvedValueOnce({
      Item: { userId: 'user-c6', weekStart: '2026-02-23', status: 'active', charity: 'WWF' },
    });
    mockDdbSend.mockResolvedValueOnce({
      Item: {
        userId: 'user-c6',
        stripe_customer_id: 'cus_c6',
        stripe_payment_method_id: 'pm_c6',
      },
    });
    mockStripe.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_cancel_123' });
    mockDdbSend.mockResolvedValueOnce({}); // update goal

    const event = makeEvent({ weekStart: '2026-02-23' }, { authorizer: 'user-c6' });
    const result = await stripe.cancelGoal(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.cancelled).toBe(true);
    expect(body.charged).toBe(true);
    expect(body.paymentIntentId).toBe('pi_cancel_123');

    // Verify Stripe was called with correct params
    expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1000,
        currency: 'usd',
        customer: 'cus_c6',
        payment_method: 'pm_c6',
        confirm: true,
        off_session: true,
      }),
      { idempotencyKey: 'cancel-user-c6-2026-02-23' },
    );
  });

  test('handles insufficient funds (card_declined)', async () => {
    mockDdbSend.mockResolvedValueOnce({
      Item: { userId: 'user-c7', weekStart: '2026-02-23', status: 'active' },
    });
    mockDdbSend.mockResolvedValueOnce({
      Item: { stripe_customer_id: 'cus_c7', stripe_payment_method_id: 'pm_c7' },
    });

    const stripeErr = new Error('Your card has insufficient funds.');
    stripeErr.code = 'card_declined';
    stripeErr.decline_code = 'insufficient_funds';
    mockStripe.paymentIntents.create.mockRejectedValueOnce(stripeErr);

    const event = makeEvent({ weekStart: '2026-02-23' }, { authorizer: 'user-c7' });
    const result = await stripe.cancelGoal(event);
    expect(result.statusCode).toBe(500);
  });

  test('handles authentication_required (3D Secure / SCA)', async () => {
    mockDdbSend.mockResolvedValueOnce({
      Item: { userId: 'user-c8', weekStart: '2026-02-23', status: 'active' },
    });
    mockDdbSend.mockResolvedValueOnce({
      Item: { stripe_customer_id: 'cus_c8', stripe_payment_method_id: 'pm_c8' },
    });

    const stripeErr = new Error('This payment requires authentication');
    stripeErr.code = 'authentication_required';
    stripeErr.raw = { payment_intent: { id: 'pi_needs_auth' } };
    mockStripe.paymentIntents.create.mockRejectedValueOnce(stripeErr);

    const event = makeEvent({ weekStart: '2026-02-23' }, { authorizer: 'user-c8' });
    const result = await stripe.cancelGoal(event);

    expect(result.statusCode).toBe(402);
    expect(JSON.parse(result.body).code).toBe('authentication_required');
  });

  test('handles expired card error', async () => {
    mockDdbSend.mockResolvedValueOnce({
      Item: { userId: 'user-c9', weekStart: '2026-02-23', status: 'active' },
    });
    mockDdbSend.mockResolvedValueOnce({
      Item: { stripe_customer_id: 'cus_c9', stripe_payment_method_id: 'pm_c9' },
    });

    const stripeErr = new Error('Your card has expired.');
    stripeErr.code = 'expired_card';
    mockStripe.paymentIntents.create.mockRejectedValueOnce(stripeErr);

    const event = makeEvent({ weekStart: '2026-02-23' }, { authorizer: 'user-c9' });
    const result = await stripe.cancelGoal(event);
    expect(result.statusCode).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// processPenalties (scheduled Lambda)
// ═══════════════════════════════════════════════════════════════════════
describe('processPenalties', () => {
  // Helper: make "now" a Monday 9:XX AM for a given UTC offset
  function mockNowForTimezone(offsetHours) {
    // We want localDay=1 (Monday) and localHour=9
    // localNow = nowUtc + offset*3600000
    // We need localNow to be a Monday at 9:XX
    // Pick a Monday: 2026-02-23 is a Monday
    // localNow = 2026-02-23T09:00:00 → UTC = 2026-02-23T09:00:00 - offset
    const localTarget = new Date('2026-02-23T09:30:00Z');
    const utcTime = new Date(localTarget.getTime() - offsetHours * 3600000);
    jest.useFakeTimers({ now: utcTime });
  }

  afterEach(() => {
    jest.useRealTimers();
  });

  test('skips goals when not Monday 9AM in customer timezone', async () => {
    // It's a Monday 9AM UTC but customer is in GMT+11 → local time is 8PM Monday (not 9AM)
    jest.useFakeTimers({ now: new Date('2026-02-23T09:00:00Z') });

    mockDdbSend.mockResolvedValueOnce({
      Items: [{
        userId: 'user-p1',
        identityId: 'id-p1',
        weekStart: '2026-02-16',
        weekEnd: '2026-02-22',
        weeklyLimit: 20,
      }],
    });

    mockS3Send.mockResolvedValueOnce(s3Body({
      days: {},
      tzOffsetHours: 11,
      timezone: 'GMT+11',
    }));

    const result = await stripe.processPenalties();
    expect(result.skipped).toBe(1);
    expect(result.processed).toBe(0);
  });

  test('processes goal when Monday 9AM in customer timezone — PASSED', async () => {
    mockNowForTimezone(11); // GMT+11

    mockDdbSend.mockResolvedValueOnce({
      Items: [{
        userId: 'user-p2',
        identityId: 'id-p2',
        weekStart: '2026-02-16',
        weekEnd: '2026-02-22',
        weeklyLimit: 20,
      }],
    });

    // S3 data: well under 20h limit
    mockS3Send.mockResolvedValueOnce(s3Body({
      days: {
        '2026-02-16': { entries: [{ app: 'Safari', minutes: 60 }] },
        '2026-02-17': { entries: [{ app: 'Chrome', minutes: 60 }] },
      },
      tzOffsetHours: 11,
      timezone: 'GMT+11',
    }));

    // GetCommand for email lookup
    mockDdbSend.mockResolvedValueOnce({
      Item: { userId: 'user-p2', email: 'p2@test.com' },
    });
    mockDdbSend.mockResolvedValueOnce({}); // update to 'passed'

    const result = await stripe.processPenalties();
    expect(result.passed).toBe(1);
    expect(result.charged).toBe(0);

    // Verify goal was marked as passed
    const updateCall = mockDdbSend.mock.calls[2][0];
    expect(updateCall.ExpressionAttributeValues[':v']).toBe('passed');
    expect(mockSendEmail).toHaveBeenCalled();
  });

  test('processes goal when Monday 9AM — FAILED and charges penalty', async () => {
    mockNowForTimezone(0); // UTC

    mockDdbSend.mockResolvedValueOnce({
      Items: [{
        userId: 'user-p3',
        identityId: 'id-p3',
        weekStart: '2026-02-16',
        weekEnd: '2026-02-22',
        weeklyLimit: 10,
        charity: 'UNICEF',
      }],
    });

    // S3 data: 15 hours — over the 10h limit
    mockS3Send.mockResolvedValueOnce(s3Body({
      days: {
        '2026-02-16': { entries: [{ app: 'YouTube', minutes: 300 }] },
        '2026-02-17': { entries: [{ app: 'TikTok', minutes: 300 }] },
        '2026-02-18': { entries: [{ app: 'Instagram', minutes: 300 }] },
      },
      tzOffsetHours: 0,
    }));

    // GetCommand for email + payment info (now single lookup reused)
    mockDdbSend.mockResolvedValueOnce({
      Item: { stripe_customer_id: 'cus_p3', stripe_payment_method_id: 'pm_p3', email: 'p3@test.com' },
    });

    mockStripe.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_penalty_p3' });
    mockDdbSend.mockResolvedValueOnce({}); // update to 'charged'

    const result = await stripe.processPenalties();
    expect(result.charged).toBe(1);

    expect(mockStripe.paymentIntents.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1000,
        currency: 'usd',
        customer: 'cus_p3',
        payment_method: 'pm_p3',
        confirm: true,
        off_session: true,
      }),
      { idempotencyKey: 'penalty-user-p3-2026-02-16' },
    );
    expect(mockSendEmail).toHaveBeenCalled();
  });

  test('marks failed_no_payment when user has no card on file', async () => {
    mockNowForTimezone(5); // GMT+5

    mockDdbSend.mockResolvedValueOnce({
      Items: [{
        userId: 'user-p4',
        identityId: 'id-p4',
        weekStart: '2026-02-16',
        weekEnd: '2026-02-22',
        weeklyLimit: 5,
      }],
    });

    // Over limit
    mockS3Send.mockResolvedValueOnce(s3Body({
      days: {
        '2026-02-16': { entries: [{ app: 'Games', minutes: 600 }] },
      },
      tzOffsetHours: 5,
    }));

    // GetCommand for email+payment — no payment method
    mockDdbSend.mockResolvedValueOnce({ Item: { email: 'p4@test.com' } });
    mockDdbSend.mockResolvedValueOnce({}); // update

    const result = await stripe.processPenalties();
    expect(result.errors).toBe(1);

    const updateCall = mockDdbSend.mock.calls[2][0];
    expect(updateCall.ExpressionAttributeValues[':v']).toBe('failed_no_payment');
  });

  test('handles authentication_required during penalty charge', async () => {
    mockNowForTimezone(-5); // GMT-5

    mockDdbSend.mockResolvedValueOnce({
      Items: [{
        userId: 'user-p5',
        identityId: 'id-p5',
        weekStart: '2026-02-16',
        weekEnd: '2026-02-22',
        weeklyLimit: 5,
      }],
    });

    mockS3Send.mockResolvedValueOnce(s3Body({
      days: { '2026-02-16': { entries: [{ app: 'X', minutes: 600 }] } },
      tzOffsetHours: -5,
    }));

    // GetCommand for email+payment info
    mockDdbSend.mockResolvedValueOnce({
      Item: { stripe_customer_id: 'cus_p5', stripe_payment_method_id: 'pm_p5', email: 'p5@test.com' },
    });

    const stripeErr = new Error('Authentication required');
    stripeErr.code = 'authentication_required';
    stripeErr.raw = { payment_intent: { id: 'pi_auth_needed' } };
    mockStripe.paymentIntents.create.mockRejectedValueOnce(stripeErr);
    mockDdbSend.mockResolvedValueOnce({}); // update

    const result = await stripe.processPenalties();
    expect(result.errors).toBe(1);

    // calls: [0]=Scan, [1]=GetCommand(email+payment), [2]=UpdateCommand
    const updateCall = mockDdbSend.mock.calls[2][0];
    expect(updateCall.ExpressionAttributeValues[':v']).toBe('requires_authentication');
    expect(updateCall.ExpressionAttributeValues[':pi']).toBe('pi_auth_needed');
    expect(mockSendEmail).toHaveBeenCalled();
  });

  test('handles generic Stripe failure during penalty charge', async () => {
    mockNowForTimezone(0);

    mockDdbSend.mockResolvedValueOnce({
      Items: [{
        userId: 'user-p6',
        identityId: 'id-p6',
        weekStart: '2026-02-16',
        weekEnd: '2026-02-22',
        weeklyLimit: 1,
      }],
    });

    mockS3Send.mockResolvedValueOnce(s3Body({
      days: { '2026-02-16': { entries: [{ app: 'X', minutes: 600 }] } },
      tzOffsetHours: 0,
    }));

    // GetCommand for email+payment info
    mockDdbSend.mockResolvedValueOnce({
      Item: { stripe_customer_id: 'cus_p6', stripe_payment_method_id: 'pm_p6', email: 'p6@test.com' },
    });

    const stripeErr = new Error('Card was declined');
    stripeErr.code = 'card_declined';
    stripeErr.message = 'Card was declined';
    mockStripe.paymentIntents.create.mockRejectedValueOnce(stripeErr);
    mockDdbSend.mockResolvedValueOnce({}); // update

    const result = await stripe.processPenalties();
    expect(result.errors).toBe(1);

    // calls: [0]=Scan, [1]=GetCommand(email+payment), [2]=UpdateCommand
    const updateCall = mockDdbSend.mock.calls[2][0];
    expect(updateCall.ExpressionAttributeValues[':v']).toBe('charge_failed');
    expect(updateCall.ExpressionAttributeValues[':fr']).toBe('Card was declined');
    expect(mockSendEmail).toHaveBeenCalled();
  });

  test('skips goals without identityId', async () => {
    mockNowForTimezone(0);

    mockDdbSend.mockResolvedValueOnce({
      Items: [{
        userId: 'user-p7',
        // no identityId
        weekStart: '2026-02-16',
        weekEnd: '2026-02-22',
        weeklyLimit: 10,
      }],
    });

    const result = await stripe.processPenalties();
    expect(result.errors).toBe(1);
    expect(result.processed).toBe(0);
  });

  test('skips goals whose week has not ended yet', async () => {
    mockNowForTimezone(0);

    mockDdbSend.mockResolvedValueOnce({
      Items: [{
        userId: 'user-p8',
        identityId: 'id-p8',
        weekStart: '2026-02-23',
        weekEnd: '2026-03-01', // future
        weeklyLimit: 10,
      }],
    });

    mockS3Send.mockResolvedValueOnce(s3Body({ days: {}, tzOffsetHours: 0 }));

    const result = await stripe.processPenalties();
    expect(result.skipped).toBe(1);
    expect(result.processed).toBe(0);
  });

  test('handles S3 NoSuchKey gracefully (new user with no data)', async () => {
    mockNowForTimezone(0);

    mockDdbSend.mockResolvedValueOnce({
      Items: [{
        userId: 'user-p9',
        identityId: 'id-p9',
        weekStart: '2026-02-16',
        weekEnd: '2026-02-22',
        weeklyLimit: 100, // high limit, no data → passes
      }],
    });

    const noSuchKey = new Error('NoSuchKey');
    noSuchKey.name = 'NoSuchKey';
    mockS3Send.mockRejectedValueOnce(noSuchKey);
    mockDdbSend.mockResolvedValueOnce({ Item: null }); // email lookup
    mockDdbSend.mockResolvedValueOnce({}); // update to 'passed'

    const result = await stripe.processPenalties();
    // 0 minutes < 100h → passed
    expect(result.passed).toBe(1);
  });

  test('processes multiple goals in one run', async () => {
    mockNowForTimezone(0);

    mockDdbSend.mockResolvedValueOnce({
      Items: [
        { userId: 'user-m1', identityId: 'id-m1', weekStart: '2026-02-16', weekEnd: '2026-02-22', weeklyLimit: 100 },
        { userId: 'user-m2', identityId: 'id-m2', weekStart: '2026-02-16', weekEnd: '2026-02-22', weeklyLimit: 1 },
      ],
    });

    // user-m1: passes
    mockS3Send.mockResolvedValueOnce(s3Body({
      days: { '2026-02-16': { entries: [{ app: 'X', minutes: 30 }] } },
      tzOffsetHours: 0,
    }));
    mockDdbSend.mockResolvedValueOnce({ Item: null }); // email lookup
    mockDdbSend.mockResolvedValueOnce({}); // mark passed

    // user-m2: fails (5 hours > 1 hour)
    mockS3Send.mockResolvedValueOnce(s3Body({
      days: { '2026-02-16': { entries: [{ app: 'Y', minutes: 300 }] } },
      tzOffsetHours: 0,
    }));
    mockDdbSend.mockResolvedValueOnce({
      Item: { stripe_customer_id: 'cus_m2', stripe_payment_method_id: 'pm_m2', email: 'm2@test.com' },
    });
    mockStripe.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_m2' });
    mockDdbSend.mockResolvedValueOnce({}); // mark charged

    const result = await stripe.processPenalties();
    expect(result.processed).toBe(2);
    expect(result.passed).toBe(1);
    expect(result.charged).toBe(1);
  });

  test('counts screen time only within the challenge week dates', async () => {
    mockNowForTimezone(0);

    mockDdbSend.mockResolvedValueOnce({
      Items: [{
        userId: 'user-p10',
        identityId: 'id-p10',
        weekStart: '2026-02-16',
        weekEnd: '2026-02-22',
        weeklyLimit: 5,
      }],
    });

    // Data includes dates outside the challenge week
    mockS3Send.mockResolvedValueOnce(s3Body({
      days: {
        '2026-02-15': { entries: [{ app: 'OutOfRange', minutes: 9999 }] }, // before week
        '2026-02-16': { entries: [{ app: 'InRange', minutes: 60 }] },     // in week
        '2026-02-22': { entries: [{ app: 'InRange', minutes: 60 }] },     // in week
        '2026-02-23': { entries: [{ app: 'OutOfRange', minutes: 9999 }] }, // after week
      },
      tzOffsetHours: 0,
    }));

    mockDdbSend.mockResolvedValueOnce({ Item: null }); // email lookup
    mockDdbSend.mockResolvedValueOnce({}); // update to passed (120min = 2h < 5h)

    const result = await stripe.processPenalties();
    expect(result.passed).toBe(1);
  });

  test('handles dayData as flat array (legacy format)', async () => {
    mockNowForTimezone(0);

    mockDdbSend.mockResolvedValueOnce({
      Items: [{
        userId: 'user-p11',
        identityId: 'id-p11',
        weekStart: '2026-02-16',
        weekEnd: '2026-02-22',
        weeklyLimit: 1,
      }],
    });

    // Legacy format where dayData is just the entries array
    mockS3Send.mockResolvedValueOnce(s3Body({
      days: {
        '2026-02-16': [{ app: 'Legacy', minutes: 120 }],
      },
      tzOffsetHours: 0,
    }));

    // GetCommand for email+payment info
    mockDdbSend.mockResolvedValueOnce({
      Item: { stripe_customer_id: 'cus_p11', stripe_payment_method_id: 'pm_p11' },
    });
    mockStripe.paymentIntents.create.mockResolvedValueOnce({ id: 'pi_legacy' });
    mockDdbSend.mockResolvedValueOnce({});

    const result = await stripe.processPenalties();
    expect(result.charged).toBe(1); // 2h > 1h limit
  });
});
