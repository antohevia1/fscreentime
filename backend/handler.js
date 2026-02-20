const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});
const GOALS_TABLE = process.env.DYNAMODB_GOALS_TABLE;
const DATA_BUCKET = process.env.DATA_BUCKET;

const headers = { 'Content-Type': 'application/json' };
const res = (statusCode, body) => ({ statusCode, headers, body: JSON.stringify(body) });
const getUserId = (event) => event.requestContext?.authorizer?.jwt?.claims?.sub;

// POST /ingest — phone devices send screen time data, stored as JSON in S3
module.exports.ingest = async (event) => {
  try {
    const apiKey = event.headers?.['x-api-key'];
    if (apiKey !== process.env.API_KEY) return res(401, { error: 'Unauthorized' });

    const { deviceKey, date, entries } = JSON.parse(event.body);
    if (!deviceKey || !date || !Array.isArray(entries)) {
      return res(400, { error: 'Missing deviceKey, date, or entries' });
    }

    // Store as s3://{bucket}/{deviceKey}/{date}.json
    await s3.send(new PutObjectCommand({
      Bucket: DATA_BUCKET,
      Key: `${deviceKey}/${date}.json`,
      Body: JSON.stringify(entries),
      ContentType: 'application/json',
    }));

    return res(200, { stored: entries.length });
  } catch (err) {
    console.error('Ingest error:', err);
    return res(500, { error: 'Ingest failed' });
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

// GET /goals?weekStart=YYYY-MM-DD
module.exports.getGoal = async (event) => {
  try {
    const userId = getUserId(event);
    const { weekStart } = event.queryStringParameters || {};

    const params = {
      TableName: GOALS_TABLE,
      KeyConditionExpression: weekStart
        ? 'userId = :uid AND weekStart = :ws'
        : 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
      ScanIndexForward: false,
      Limit: 1,
    };
    if (weekStart) params.ExpressionAttributeValues[':ws'] = weekStart;

    const result = await ddb.send(new QueryCommand(params));
    return res(200, result.Items?.[0] || null);
  } catch (err) {
    console.error('GetGoal error:', err);
    return res(500, { error: 'Failed to retrieve goal' });
  }
};
