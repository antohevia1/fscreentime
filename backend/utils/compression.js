const zlib = require('zlib');
const { promisify } = require('util');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const brotliCompress = promisify(zlib.brotliCompress);
const brotliDecompress = promisify(zlib.brotliDecompress);

// Brotli compression (better than gzip for text/JSON)
async function compressBrotli(data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(JSON.stringify(data));
  return await brotliCompress(buffer, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11, // Max compression
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buffer.length,
    },
  });
}

async function decompressBrotli(buffer) {
  return await brotliDecompress(buffer);
}

// Gzip compression (fallback)
async function compressGzip(data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(JSON.stringify(data));
  return await gzip(buffer, { level: 9 }); // Max compression
}

async function decompressGzip(buffer) {
  return await gunzip(buffer);
}

// Analyze compression ratio
function getCompressionRatio(original, compressed) {
  const originalSize = Buffer.byteLength(original);
  const compressedSize = Buffer.byteLength(compressed);
  const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(2);
  
  return {
    originalSize,
    compressedSize,
    ratio: `${ratio}%`,
    savings: originalSize - compressedSize,
  };
}

module.exports = {
  compressBrotli,
  decompressBrotli,
  compressGzip,
  decompressGzip,
  getCompressionRatio,
};
