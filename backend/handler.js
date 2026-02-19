const AWS = require('aws-sdk');
const { parseParquet, convertToParquet } = require('./utils/parquet');
const { logError, logInfo } = require('./utils/logger');
const { validateCustomerId, sanitizeInput } = require('./utils/security');

const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();

const RAW_BUCKET = process.env.RAW_BUCKET;
const PROCESSED_BUCKET = process.env.PROCESSED_BUCKET;
const METADATA_TABLE = process.env.DYNAMODB_TABLE;
const CACHE_TABLE = process.env.DYNAMODB_CACHE_TABLE;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Api-Key',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Content-Security-Policy': "default-src 'none'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

// JWT/API Key authorizer
module.exports.authorizer = async (event) => {
  try {
    const token = event.authorizationToken;
    const customerId = extractCustomerId(token);
    
    if (!customerId || !validateCustomerId(customerId)) {
      throw new Error('Unauthorized');
    }

    return {
      principalId: customerId,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [{
          Action: 'execute-api:Invoke',
          Effect: 'Allow',
          Resource: event.methodArn,
        }],
      },
      context: { customerId },
    };
  } catch (error) {
    await logError('Authorization failed', error, { event });
    throw new Error('Unauthorized');
  }
};

// Upload handler with presigned URL
module.exports.upload = async (event) => {
  const startTime = Date.now();
  
  try {
    const customerId = event.requestContext.authorizer.customerId;
    const { date, contentType } = JSON.parse(event.body);
    
    if (!date || !contentType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const sanitizedDate = sanitizeInput(date);
    const key = `raw/${customerId}/${sanitizedDate}/${Date.now()}.parquet`;
    
    // Generate presigned URL for direct upload
    const presignedUrl = s3.getSignedUrl('putObject', {
      Bucket: RAW_BUCKET,
      Key: key,
      ContentType: contentType,
      Expires: 300,
      ServerSideEncryption: 'AES256',
    });

    await logInfo('Upload URL generated', {
      customerId,
      date: sanitizedDate,
      duration: Date.now() - startTime,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        uploadUrl: presignedUrl,
        key,
        expiresIn: 300,
      }),
    };
  } catch (error) {
    await logError('Upload failed', error, { event });
    await sendAlert('Upload Error', error.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Upload failed' }),
    };
  }
};

// Process uploaded file (triggered by S3)
module.exports.processFile = async (event) => {
  const startTime = Date.now();
  
  try {
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    
    const [, customerId, date] = key.split('/');
    
    // Get file from S3
    const fileData = await s3.getObject({ Bucket: bucket, Key: key }).promise();
    
    // Parse and validate data
    let data;
    if (key.endsWith('.json')) {
      data = JSON.parse(fileData.Body.toString());
    } else if (key.endsWith('.parquet')) {
      data = await parseParquet(fileData.Body);
    } else {
      throw new Error('Unsupported file format');
    }

    // Aggregate and compress
    const aggregated = aggregateData(data);
    const parquetBuffer = await convertToParquet(aggregated);
    
    // Store processed data
    const processedKey = `processed/${customerId}/${date}/aggregated.parquet`;
    await s3.putObject({
      Bucket: PROCESSED_BUCKET,
      Key: processedKey,
      Body: parquetBuffer,
      ServerSideEncryption: 'AES256',
      ContentType: 'application/octet-stream',
    }).promise();

    // Update metadata
    await dynamodb.put({
      TableName: METADATA_TABLE,
      Item: {
        customerId,
        date,
        processedKey,
        uploadTimestamp: Date.now(),
        recordCount: aggregated.length,
        ttl: Math.floor(Date.now() / 1000) + (2555 * 24 * 60 * 60),
      },
    }).promise();

    await logInfo('File processed', {
      customerId,
      date,
      recordCount: aggregated.length,
      duration: Date.now() - startTime,
    });

  } catch (error) {
    await logError('Processing failed', error, { event });
    await sendAlert('Processing Error', error.message);
    throw error;
  }
};

// Get data with caching
module.exports.getData = async (event) => {
  const startTime = Date.now();
  
  try {
    const customerId = event.requestContext.authorizer.customerId;
    const requestedCustomerId = event.pathParameters.customerId;
    
    // Ensure users can only access their own data
    if (customerId !== requestedCustomerId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Forbidden' }),
      };
    }

    const { startDate, endDate } = event.queryStringParameters || {};
    const cacheKey = `${customerId}:${startDate}:${endDate}`;
    
    // Check cache
    const cached = await dynamodb.get({
      TableName: CACHE_TABLE,
      Key: { cacheKey },
    }).promise();

    if (cached.Item && cached.Item.ttl > Date.now() / 1000) {
      await logInfo('Cache hit', { customerId, duration: Date.now() - startTime });
      
      return {
        statusCode: 200,
        headers: { ...headers, 'X-Cache': 'HIT' },
        body: cached.Item.data,
      };
    }

    // Query metadata
    const metadata = await dynamodb.query({
      TableName: METADATA_TABLE,
      KeyConditionExpression: 'customerId = :customerId AND #date BETWEEN :startDate AND :endDate',
      ExpressionAttributeNames: { '#date': 'date' },
      ExpressionAttributeValues: {
        ':customerId': customerId,
        ':startDate': startDate || '2000-01-01',
        ':endDate': endDate || '2099-12-31',
      },
    }).promise();

    // Fetch and combine data
    const dataPromises = metadata.Items.map(async (item) => {
      const obj = await s3.getObject({
        Bucket: PROCESSED_BUCKET,
        Key: item.processedKey,
      }).promise();
      return parseParquet(obj.Body);
    });

    const allData = (await Promise.all(dataPromises)).flat();
    const responseBody = JSON.stringify({ data: allData });

    // Cache result
    await dynamodb.put({
      TableName: CACHE_TABLE,
      Item: {
        cacheKey,
        data: responseBody,
        ttl: Math.floor(Date.now() / 1000) + 3600, // 1 hour cache
      },
    }).promise();

    await logInfo('Data retrieved', {
      customerId,
      recordCount: allData.length,
      duration: Date.now() - startTime,
    });

    return {
      statusCode: 200,
      headers: { ...headers, 'X-Cache': 'MISS' },
      body: responseBody,
    };
  } catch (error) {
    await logError('Get data failed', error, { event });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to retrieve data' }),
    };
  }
};

// Daily aggregation job
module.exports.aggregateDaily = async () => {
  try {
    await logInfo('Starting daily aggregation');
    
    // Scan for yesterday's data and create weekly/monthly aggregates
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Implementation for batch aggregation
    await logInfo('Daily aggregation completed');
  } catch (error) {
    await logError('Daily aggregation failed', error);
    await sendAlert('Aggregation Error', error.message);
  }
};

// Cleanup old data
module.exports.cleanupOldData = async () => {
  try {
    const retentionDays = parseInt(process.env.RETENTION_DAYS || '90');
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    await logInfo('Starting cleanup', { cutoffDate: cutoffDate.toISOString() });
    
    // DynamoDB TTL handles automatic deletion
    // This function can handle additional cleanup if needed
    
    await logInfo('Cleanup completed');
  } catch (error) {
    await logError('Cleanup failed', error);
    await sendAlert('Cleanup Error', error.message);
  }
};

// Helper functions
function aggregateData(data) {
  const aggregated = {};
  
  data.forEach(entry => {
    const app = entry.app || entry.application || entry.name || 'Unknown';
    if (!aggregated[app]) {
      aggregated[app] = { app, totalTime: 0, sessions: 0 };
    }
    aggregated[app].totalTime += parseFloat(entry.time || entry.duration || 0);
    aggregated[app].sessions += 1;
  });
  
  return Object.values(aggregated);
}

function extractCustomerId(token) {
  // Implement JWT decode or API key lookup
  // For demo: extract from Bearer token
  return token.replace('Bearer ', '').split(':')[0];
}

async function sendAlert(subject, message) {
  try {
    await sns.publish({
      TopicArn: SNS_TOPIC_ARN,
      Subject: `[Screen Time API] ${subject}`,
      Message: message,
    }).promise();
  } catch (error) {
    console.error('Failed to send alert:', error);
  }
}
