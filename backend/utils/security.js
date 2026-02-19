const crypto = require('crypto');

function validateCustomerId(customerId) {
  // Validate format: alphanumeric, 8-64 chars
  const regex = /^[a-zA-Z0-9]{8,64}$/;
  return regex.test(customerId);
}

function sanitizeInput(input) {
  // Remove any potentially dangerous characters
  return input.replace(/[^a-zA-Z0-9-_:.]/g, '');
}

function hashCustomerId(customerId) {
  return crypto.createHash('sha256').update(customerId).digest('hex');
}

function validateFileSize(size) {
  const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB
  return size <= maxSize;
}

module.exports = {
  validateCustomerId,
  sanitizeInput,
  hashCustomerId,
  validateFileSize,
};
