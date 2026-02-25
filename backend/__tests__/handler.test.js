const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');

// ── Mock AWS SDK ──────────────────────────────────────────────────────
const mockDdbSend = jest.fn();
const mockS3Send = jest.fn();

jest.mock('@aws-sdk/client-dynamodb', () => ({ DynamoDBClient: jest.fn() }));
jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: mockDdbSend }) },
  PutCommand: jest.fn((p) => ({ _type: 'PutCommand', ...p })),
  QueryCommand: jest.fn((p) => ({ _type: 'QueryCommand', ...p })),
}));
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({ send: mockS3Send })),
  PutObjectCommand: jest.fn((p) => ({ _type: 'PutObjectCommand', ...p })),
  GetObjectCommand: jest.fn((p) => ({ _type: 'GetObjectCommand', ...p })),
}));

// Set env vars before requiring handler
process.env.DYNAMODB_GOALS_TABLE = 'test-goals';
process.env.DATA_BUCKET = 'test-data';
process.env.API_KEY = 'test-api-key';

const handler = require('../handler');

// Helper: build an API Gateway v2 event
function makeEvent(body, { method = 'POST', path = '/', headers = {}, queryStringParameters, isBase64 = false, authorizer } = {}) {
  return {
    httpMethod: method,
    path,
    headers: { 'content-type': 'application/json', ...headers },
    body: isBase64 ? Buffer.from(JSON.stringify(body)).toString('base64') : JSON.stringify(body),
    isBase64Encoded: isBase64,
    queryStringParameters: queryStringParameters || null,
    requestContext: authorizer ? { authorizer: { jwt: { claims: { sub: authorizer } } } } : {},
  };
}

// Helper: S3 body stream mock
function s3Body(data) {
  return { Body: { transformToString: () => Promise.resolve(JSON.stringify(data)) } };
}

beforeEach(() => {
  mockDdbSend.mockReset();
  mockS3Send.mockReset();
});

// ═══════════════════════════════════════════════════════════════════════
// parseEntries (tested via ingest)
// ═══════════════════════════════════════════════════════════════════════
describe('POST /ingest', () => {
  const validBody = {
    deviceKey: 'user-123',
    date: '2026-02-23',
    entries: 'Google Chrome (2h 13m),Spotify (6m),iTerm (52s)',
    systemVersion: '18.3',
    deviceName: 'iPhone 15',
  };

  test('rejects missing API key', async () => {
    const event = makeEvent(validBody, { headers: {} });
    const result = await handler.ingest(event);
    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body).error).toBe('Unauthorized');
  });

  test('rejects wrong API key', async () => {
    const event = makeEvent(validBody, { headers: { 'x-api-key': 'wrong-key' } });
    const result = await handler.ingest(event);
    expect(result.statusCode).toBe(401);
  });

  test('rejects missing deviceKey', async () => {
    mockS3Send.mockResolvedValueOnce(s3Body({ days: {} }));
    const event = makeEvent({ ...validBody, deviceKey: '' }, { headers: { 'x-api-key': 'test-api-key' } });
    const result = await handler.ingest(event);
    expect(result.statusCode).toBe(400);
  });

  test('rejects missing entries', async () => {
    mockS3Send.mockResolvedValueOnce(s3Body({ days: {} }));
    const event = makeEvent({ ...validBody, entries: '' }, { headers: { 'x-api-key': 'test-api-key' } });
    const result = await handler.ingest(event);
    expect(result.statusCode).toBe(400);
  });

  test('parses string entries and stores in S3 (YYYY-MM-DD format)', async () => {
    mockS3Send.mockResolvedValueOnce(s3Body({ days: {} })); // readAllJson
    mockS3Send.mockResolvedValueOnce({}); // putObject

    const event = makeEvent(validBody, { headers: { 'x-api-key': 'test-api-key' } });
    const result = await handler.ingest(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).stored).toBe(3);

    // Verify S3 put was called with correct data
    const putCall = mockS3Send.mock.calls[1][0];
    const written = JSON.parse(putCall.Body);
    expect(written.days['2026-02-23'].entries).toHaveLength(3);
    expect(written.days['2026-02-23'].entries[0]).toEqual({ app: 'Google Chrome', minutes: 133 });
    expect(written.days['2026-02-23'].entries[1]).toEqual({ app: 'Spotify', minutes: 6 });
    expect(written.days['2026-02-23'].entries[2]).toEqual({ app: 'iTerm', minutes: 1 }); // 52s rounds up
  });

  test('parses new date format with timezone and stores offset', async () => {
    mockS3Send.mockResolvedValueOnce(s3Body({ days: {} }));
    mockS3Send.mockResolvedValueOnce({});

    const body = {
      ...validBody,
      date: 'Mon, 23 Feb 2026 20:50:51 GMT+11',
    };
    const event = makeEvent(body, { headers: { 'x-api-key': 'test-api-key' } });
    const result = await handler.ingest(event);

    expect(result.statusCode).toBe(200);
    const putCall = mockS3Send.mock.calls[1][0];
    const written = JSON.parse(putCall.Body);
    expect(written.days['2026-02-23']).toBeDefined();
    expect(written.timezone).toBe('GMT+11');
    expect(written.tzOffsetHours).toBe(11);
  });

  test('parses negative timezone offset', async () => {
    mockS3Send.mockResolvedValueOnce(s3Body({ days: {} }));
    mockS3Send.mockResolvedValueOnce({});

    const body = {
      ...validBody,
      date: 'Sun, 22 Feb 2026 08:30:00 GMT-5',
    };
    const event = makeEvent(body, { headers: { 'x-api-key': 'test-api-key' } });
    const result = await handler.ingest(event);

    expect(result.statusCode).toBe(200);
    const putCall = mockS3Send.mock.calls[1][0];
    const written = JSON.parse(putCall.Body);
    expect(written.timezone).toBe('GMT-5');
    expect(written.tzOffsetHours).toBe(-5);
  });

  test('handles base64 encoded body', async () => {
    mockS3Send.mockResolvedValueOnce(s3Body({ days: {} }));
    mockS3Send.mockResolvedValueOnce({});

    const event = makeEvent(validBody, { headers: { 'x-api-key': 'test-api-key' }, isBase64: true });
    const result = await handler.ingest(event);
    expect(result.statusCode).toBe(200);
  });

  test('accepts pre-parsed array entries', async () => {
    mockS3Send.mockResolvedValueOnce(s3Body({ days: {} }));
    mockS3Send.mockResolvedValueOnce({});

    const body = {
      ...validBody,
      entries: [{ app: 'Safari', minutes: 45 }],
    };
    const event = makeEvent(body, { headers: { 'x-api-key': 'test-api-key' } });
    const result = await handler.ingest(event);
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).stored).toBe(1);
  });

  test('merges with existing S3 data', async () => {
    const existing = {
      days: { '2026-02-22': { entries: [{ app: 'Safari', minutes: 30 }] } },
      timezone: 'GMT+10',
      tzOffsetHours: 10,
    };
    mockS3Send.mockResolvedValueOnce(s3Body(existing));
    mockS3Send.mockResolvedValueOnce({});

    const event = makeEvent(validBody, { headers: { 'x-api-key': 'test-api-key' } });
    const result = await handler.ingest(event);

    expect(result.statusCode).toBe(200);
    const putCall = mockS3Send.mock.calls[1][0];
    const written = JSON.parse(putCall.Body);
    expect(Object.keys(written.days)).toHaveLength(2);
    expect(written.days['2026-02-22']).toBeDefined();
    expect(written.days['2026-02-23']).toBeDefined();
  });

  test('creates new all.json when S3 returns NoSuchKey', async () => {
    const noSuchKey = new Error('NoSuchKey');
    noSuchKey.name = 'NoSuchKey';
    mockS3Send.mockRejectedValueOnce(noSuchKey);
    mockS3Send.mockResolvedValueOnce({});

    const event = makeEvent(validBody, { headers: { 'x-api-key': 'test-api-key' } });
    const result = await handler.ingest(event);
    expect(result.statusCode).toBe(200);
  });

  test('handles corrupted S3 JSON gracefully', async () => {
    mockS3Send.mockResolvedValueOnce({
      Body: { transformToString: () => Promise.resolve('not json{{{') },
    });
    mockS3Send.mockResolvedValueOnce({});

    const event = makeEvent(validBody, { headers: { 'x-api-key': 'test-api-key' } });
    const result = await handler.ingest(event);
    expect(result.statusCode).toBe(200);
  });

  test('returns 500 on unexpected S3 error', async () => {
    mockS3Send.mockRejectedValueOnce(new Error('S3 is down'));

    const event = makeEvent(validBody, { headers: { 'x-api-key': 'test-api-key' } });
    const result = await handler.ingest(event);
    expect(result.statusCode).toBe(500);
  });

  test('strips invisible Unicode characters from entries', async () => {
    mockS3Send.mockResolvedValueOnce(s3Body({ days: {} }));
    mockS3Send.mockResolvedValueOnce({});

    const body = {
      ...validBody,
      entries: 'Safari\u200B (1h 30m),\u200EMaps (5m)',
    };
    const event = makeEvent(body, { headers: { 'x-api-key': 'test-api-key' } });
    const result = await handler.ingest(event);
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).stored).toBe(2);
  });

  test('filters out entries with 0 minutes', async () => {
    mockS3Send.mockResolvedValueOnce(s3Body({ days: {} }));
    mockS3Send.mockResolvedValueOnce({});

    const body = {
      ...validBody,
      entries: 'Safari (1h),Useless (0s)',
    };
    const event = makeEvent(body, { headers: { 'x-api-key': 'test-api-key' } });
    const result = await handler.ingest(event);
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).stored).toBe(1);
  });

  test('rejects invalid date format', async () => {
    const body = {
      ...validBody,
      date: 'not-a-date',
    };
    const event = makeEvent(body, { headers: { 'x-api-key': 'test-api-key' } });
    const result = await handler.ingest(event);
    expect(result.statusCode).toBe(400);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// POST /ingest/bulk
// ═══════════════════════════════════════════════════════════════════════
describe('POST /ingest/bulk', () => {
  const validBulk = {
    deviceKey: 'user-123',
    days: {
      '2026-02-20': { entries: 'Safari (2h)', systemVersion: '18.3' },
      '2026-02-21': { entries: 'Chrome (1h 30m)', systemVersion: '18.3' },
    },
  };

  test('rejects missing API key', async () => {
    const event = makeEvent(validBulk, { headers: {} });
    const result = await handler.ingestBulk(event);
    expect(result.statusCode).toBe(401);
  });

  test('rejects missing deviceKey', async () => {
    const event = makeEvent({ days: validBulk.days }, { headers: { 'x-api-key': 'test-api-key' } });
    const result = await handler.ingestBulk(event);
    expect(result.statusCode).toBe(400);
  });

  test('rejects empty days object', async () => {
    const event = makeEvent({ deviceKey: 'user-123', days: {} }, { headers: { 'x-api-key': 'test-api-key' } });
    const result = await handler.ingestBulk(event);
    expect(result.statusCode).toBe(400);
  });

  test('rejects more than 90 days', async () => {
    const days = {};
    for (let i = 0; i < 91; i++) {
      const d = `2026-01-${String(i + 1).padStart(2, '0')}`;
      days[d] = { entries: [{ app: 'Test', minutes: 10 }] };
    }
    const event = makeEvent({ deviceKey: 'user-123', days }, { headers: { 'x-api-key': 'test-api-key' } });
    const result = await handler.ingestBulk(event);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/Maximum 90 days/);
  });

  test('rejects invalid date format in keys', async () => {
    const event = makeEvent(
      { deviceKey: 'user-123', days: { 'Feb 20': { entries: [{ app: 'X', minutes: 1 }] } } },
      { headers: { 'x-api-key': 'test-api-key' } },
    );
    const result = await handler.ingestBulk(event);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error).toMatch(/Invalid date format/);
  });

  test('stores multiple days successfully', async () => {
    mockS3Send.mockResolvedValueOnce(s3Body({ days: {} }));
    mockS3Send.mockResolvedValueOnce({});

    const event = makeEvent(validBulk, { headers: { 'x-api-key': 'test-api-key' } });
    const result = await handler.ingestBulk(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.stored).toBe(2);
    expect(body.totalDays).toBe(2);
  });

  test('merges with existing data', async () => {
    const existing = { days: { '2026-02-19': { entries: [{ app: 'Old', minutes: 5 }] } } };
    mockS3Send.mockResolvedValueOnce(s3Body(existing));
    mockS3Send.mockResolvedValueOnce({});

    const event = makeEvent(validBulk, { headers: { 'x-api-key': 'test-api-key' } });
    const result = await handler.ingestBulk(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).totalDays).toBe(3);
  });

  test('parses string entries within bulk days', async () => {
    mockS3Send.mockResolvedValueOnce(s3Body({ days: {} }));
    mockS3Send.mockResolvedValueOnce({});

    const event = makeEvent(validBulk, { headers: { 'x-api-key': 'test-api-key' } });
    const result = await handler.ingestBulk(event);

    expect(result.statusCode).toBe(200);
    const putCall = mockS3Send.mock.calls[1][0];
    const written = JSON.parse(putCall.Body);
    expect(written.days['2026-02-20'].entries[0]).toEqual({ app: 'Safari', minutes: 120 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// POST /goals (saveGoal)
// ═══════════════════════════════════════════════════════════════════════
describe('POST /goals (saveGoal)', () => {
  test('saves a goal with userId from JWT', async () => {
    mockDdbSend.mockResolvedValueOnce({});

    const goal = { weekStart: '2026-02-23', weeklyLimit: 20, charity: 'Red Cross' };
    const event = makeEvent(goal, { authorizer: 'user-abc' });
    const result = await handler.saveGoal(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).saved).toBe(true);

    const putCall = mockDdbSend.mock.calls[0][0];
    expect(putCall.Item.userId).toBe('user-abc');
    expect(putCall.Item.weekStart).toBe('2026-02-23');
    expect(putCall.Item.weeklyLimit).toBe(20);
    expect(putCall.Item.ttl).toBeGreaterThan(0);
  });

  test('returns 500 on DynamoDB error', async () => {
    mockDdbSend.mockRejectedValueOnce(new Error('DynamoDB down'));

    const event = makeEvent({ weekStart: '2026-02-23' }, { authorizer: 'user-abc' });
    const result = await handler.saveGoal(event);
    expect(result.statusCode).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// GET /goals (getGoal)
// ═══════════════════════════════════════════════════════════════════════
describe('GET /goals (getGoal)', () => {
  test('returns latest goal without weekStart filter', async () => {
    mockDdbSend.mockResolvedValueOnce({
      Items: [{ userId: 'user-abc', weekStart: '2026-02-23', weeklyLimit: 20 }],
    });

    const event = makeEvent(null, { method: 'GET', authorizer: 'user-abc' });
    const result = await handler.getGoal(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).weekStart).toBe('2026-02-23');
  });

  test('filters by weekStart when provided', async () => {
    mockDdbSend.mockResolvedValueOnce({
      Items: [{ userId: 'user-abc', weekStart: '2026-02-16', weeklyLimit: 15 }],
    });

    const event = makeEvent(null, {
      method: 'GET',
      authorizer: 'user-abc',
      queryStringParameters: { weekStart: '2026-02-16' },
    });
    const result = await handler.getGoal(event);
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).weekStart).toBe('2026-02-16');
  });

  test('returns null when no goals exist', async () => {
    mockDdbSend.mockResolvedValueOnce({ Items: [] });

    const event = makeEvent(null, { method: 'GET', authorizer: 'user-abc' });
    const result = await handler.getGoal(event);
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toBeNull();
  });

  test('returns 500 on DynamoDB error', async () => {
    mockDdbSend.mockRejectedValueOnce(new Error('Timeout'));

    const event = makeEvent(null, { method: 'GET', authorizer: 'user-abc' });
    const result = await handler.getGoal(event);
    expect(result.statusCode).toBe(500);
  });
});
