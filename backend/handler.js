const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const GOALS_TABLE = process.env.DYNAMODB_GOALS_TABLE;
const DATA_BUCKET = process.env.DATA_BUCKET;

const headers = { 'Content-Type': 'application/json' };
const res = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const getUserId = (event) => event.requestContext?.authorizer?.jwt?.claims?.sub;

// Parse comma-separated entries: "Google Chrome (2h 13m),Spotify (6m),iTerm (52s)"
function parseEntries(str) {
  // Strip invisible Unicode characters iOS Shortcuts may insert BEFORE splitting
  const clean = str.replace(/[\u200E\u200F\u200B-\u200D\uFEFF\u2060\u00AD]/g, '');
  return clean.split(/,(?=\s*[A-Za-z0-9])/).map(part => {
    const trimmed = part.trim();
    const match = trimmed.match(/^([^,]+?)\s*\((?:(\d+)h)?\s*(?:(\d+)m)?\s*(?:(\d+)s)?\)$/i);
    if (!match) return null;
    const app = match[1].trim();
    const minutes = parseInt(match[2] || '0', 10) * 60
      + parseInt(match[3] || '0', 10)
      + (parseInt(match[4] || '0', 10) >= 30 ? 1 : 0);
    if (!app || minutes === 0) return null;
    return { app, minutes };
  }).filter(Boolean);
}

const MONTHS = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
                  Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };

// Parse "Mon, 23 Feb 2026 20:50:51 GMT+11" → { localDate, timezone, tzOffsetHours }
// Also accepts plain "YYYY-MM-DD" for backward compatibility.
function parseDateStr(dateStr) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { localDate: dateStr, timezone: null, tzOffsetHours: null };
  }
  const m = dateStr.match(/\w+,\s+(\d+)\s+(\w+)\s+(\d{4})\s+[\d:]+\s+GMT([+-]\d+)/);
  if (!m) return { localDate: null, timezone: null, tzOffsetHours: null };
  const month = MONTHS[m[2]];
  if (!month) return { localDate: null, timezone: null, tzOffsetHours: null };
  return {
    localDate: `${m[3]}-${month}-${m[1].padStart(2, '0')}`,
    timezone: `GMT${m[4]}`,
    tzOffsetHours: parseInt(m[4], 10),
  };
}

// Read existing all.json for a deviceKey, or return empty structure
async function readAllJson(deviceKey) {
  try {
    const resp = await s3.send(new GetObjectCommand({
      Bucket: DATA_BUCKET,
      Key: `${deviceKey}/all.json`,
    }));
    const text = await resp.Body.transformToString();
    return JSON.parse(text);
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return { days: {} };
    }
    if (err instanceof SyntaxError) {
      console.error('Corrupted all.json for', deviceKey);
      return { days: {} };
    }
    throw err;
  }
}

// POST /ingest — phone devices send screen time data, stored as JSON in S3
module.exports.ingest = async (event) => {
  try {
    const apiKey = event.headers?.['x-api-key'];
    if (apiKey !== process.env.API_KEY) return res(401, { error: 'Unauthorized' });

    let raw = event.body || '';
    if (event.isBase64Encoded) raw = Buffer.from(raw, 'base64').toString('utf-8');

    const parsed = JSON.parse(raw);
    const { deviceKey, date: rawDate, systemVersion, deviceName } = parsed;

    const entries = typeof parsed.entries === 'string'
      ? parseEntries(parsed.entries)
      : parsed.entries;

    // Support both "YYYY-MM-DD" and "Mon, 23 Feb 2026 20:50:51 GMT+11"
    const { localDate: date, timezone, tzOffsetHours } = parseDateStr(rawDate);

    if (!deviceKey || !date || !Array.isArray(entries) || entries.length === 0) {
      return res(400, { error: 'Missing deviceKey, date, or entries' });
    }

    // Read existing all.json, upsert this day, write back
    const allData = await readAllJson(deviceKey);
    allData.days[date] = { entries, systemVersion, deviceName };

    // Persist the customer's timezone from the most recent ingest
    if (timezone) {
      allData.timezone = timezone;
      allData.tzOffsetHours = tzOffsetHours;
    }

    await s3.send(new PutObjectCommand({
      Bucket: DATA_BUCKET,
      Key: `${deviceKey}/all.json`,
      Body: JSON.stringify(allData),
      ContentType: 'application/json',
    }));

    return res(200, { stored: entries.length });
  } catch (err) {
    console.error('Ingest error:', err);
    return res(500, { error: 'Ingest failed' });
  }
};

// POST /ingest/bulk — backfill up to 90 days at once
module.exports.ingestBulk = async (event) => {
  try {
    const apiKey = event.headers?.['x-api-key'];
    if (apiKey !== process.env.API_KEY) return res(401, { error: 'Unauthorized' });

    let raw = event.body || '';
    if (event.isBase64Encoded) raw = Buffer.from(raw, 'base64').toString('utf-8');

    const parsed = JSON.parse(raw);
    const { deviceKey, days } = parsed;

    if (!deviceKey || !days || typeof days !== 'object') {
      return res(400, { error: 'Missing deviceKey or days object' });
    }

    const dateKeys = Object.keys(days);
    if (dateKeys.length === 0) return res(400, { error: 'No days provided' });
    if (dateKeys.length > 90) return res(400, { error: 'Maximum 90 days per bulk request' });

    // Validate and parse each day's entries
    for (const [date, dayData] of Object.entries(days)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res(400, { error: `Invalid date format: ${date}` });
      }
      if (typeof dayData.entries === 'string') {
        days[date] = { ...dayData, entries: parseEntries(dayData.entries) };
      }
      if (!Array.isArray(days[date].entries) || days[date].entries.length === 0) {
        return res(400, { error: `Missing or empty entries for date: ${date}` });
      }
    }

    // Read existing all.json, merge all days, write back
    const allData = await readAllJson(deviceKey);
    for (const [date, dayData] of Object.entries(days)) {
      allData.days[date] = dayData;
    }

    await s3.send(new PutObjectCommand({
      Bucket: DATA_BUCKET,
      Key: `${deviceKey}/all.json`,
      Body: JSON.stringify(allData),
      ContentType: 'application/json',
    }));

    return res(200, { stored: dateKeys.length, totalDays: Object.keys(allData.days).length });
  } catch (err) {
    console.error('IngestBulk error:', err);
    return res(500, { error: 'Bulk ingest failed' });
  }
};

// POST /goals
module.exports.saveGoal = async (event) => {
  try {
    const userId = getUserId(event);
    const goal = JSON.parse(event.body);

    await ddb.send(new PutCommand({
      TableName: GOALS_TABLE,
      Item: {
        userId,
        weekStart: goal.weekStart,
        ...goal,
        autoRenew: goal.autoRenew !== false,
        createdAt: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + 365 * 24 * 3600,
      },
    }));

    return res(200, { saved: true });
  } catch (err) {
    console.error('SaveGoal error:', err);
    return res(500, { error: 'Failed to save goal' });
  }
};

// GET /goals?weekStart=YYYY-MM-DD&status=active
module.exports.getGoal = async (event) => {
  try {
    const userId = getUserId(event);
    const { weekStart, status } = event.queryStringParameters || {};

    const params = {
      TableName: GOALS_TABLE,
      KeyConditionExpression: weekStart
        ? 'userId = :uid AND weekStart = :ws'
        : 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
      ScanIndexForward: false,
      Limit: status ? 10 : 1,
    };
    if (weekStart) params.ExpressionAttributeValues[':ws'] = weekStart;
    if (status) {
      params.FilterExpression = '#st = :status';
      params.ExpressionAttributeNames = { '#st': 'status' };
      params.ExpressionAttributeValues[':status'] = status;
    }

    const result = await ddb.send(new QueryCommand(params));
    return res(200, result.Items?.[0] || null);
  } catch (err) {
    console.error('GetGoal error:', err);
    return res(500, { error: 'Failed to retrieve goal' });
  }
};

// GET /goals/history — read past goals from S3 all.json
module.exports.getGoalHistory = async (event) => {
  try {
    const userId = getUserId(event);
    if (!userId) return res(401, { error: 'Unauthorized' });

    const { identityId } = event.queryStringParameters || {};
    if (!identityId) return res(400, { error: 'Missing identityId' });

    let allData;
    try {
      const s3Resp = await s3.send(new GetObjectCommand({
        Bucket: DATA_BUCKET,
        Key: `${identityId}/all.json`,
      }));
      allData = JSON.parse(await s3Resp.Body.transformToString());
    } catch (err) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        return res(200, []);
      }
      throw err;
    }

    return res(200, allData.goalHistory || []);
  } catch (err) {
    console.error('GetGoalHistory error:', err);
    return res(500, { error: 'Failed to retrieve goal history' });
  }
};

// POST /delete-account — remove all user data (S3 + DynamoDB goals)
module.exports.deleteAccount = async (event) => {
  try {
    const userId = getUserId(event);
    if (!userId) return res(401, { error: 'Unauthorized' });

    const { identityId } = JSON.parse(event.body || '{}');
    if (!identityId) return res(400, { error: 'Missing identityId' });

    // Delete all S3 objects under the user's prefix
    let continuationToken;
    do {
      const listResp = await s3.send(new ListObjectsV2Command({
        Bucket: DATA_BUCKET,
        Prefix: `${identityId}/`,
        ContinuationToken: continuationToken,
      }));
      for (const obj of (listResp.Contents || [])) {
        await s3.send(new DeleteObjectCommand({
          Bucket: DATA_BUCKET,
          Key: obj.Key,
        }));
      }
      continuationToken = listResp.IsTruncated ? listResp.NextContinuationToken : null;
    } while (continuationToken);

    // Delete all goals from DynamoDB
    const goalsResult = await ddb.send(new QueryCommand({
      TableName: GOALS_TABLE,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
    }));
    for (const goal of (goalsResult.Items || [])) {
      await ddb.send(new DeleteCommand({
        TableName: GOALS_TABLE,
        Key: { userId, weekStart: goal.weekStart },
      }));
    }

    return res(200, { deleted: true });
  } catch (err) {
    console.error('DeleteAccount error:', err);
    return res(500, { error: 'Failed to delete account data' });
  }
};
