const AWS = require('aws-sdk');
const cloudwatch = new AWS.CloudWatchLogs();

const LOG_GROUP = `/aws/lambda/screen-time-api-${process.env.STAGE}`;

async function logInfo(message, metadata = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    message,
    ...metadata,
  };
  
  console.log(JSON.stringify(logEntry));
  return logEntry;
}

async function logError(message, error, metadata = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    message,
    error: {
      message: error.message,
      stack: error.stack,
    },
    ...metadata,
  };
  
  console.error(JSON.stringify(logEntry));
  return logEntry;
}

module.exports = {
  logInfo,
  logError,
};
