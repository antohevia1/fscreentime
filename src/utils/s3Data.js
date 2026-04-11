import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const BUCKET = import.meta.env.VITE_DATA_BUCKET;
const REGION = import.meta.env.VITE_AWS_REGION || 'us-east-1';

export async function fetchScreenTimeData(credentials, identityId, { noCache = false } = {}) {
  const s3 = new S3Client({ region: REGION, credentials });

  const params = { Bucket: BUCKET, Key: `${identityId}/all.json` };
  if (noCache) params.ResponseCacheControl = 'no-cache';

  let resp;
  try {
    resp = await s3.send(new GetObjectCommand(params));
  } catch (err) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 403 || err.$metadata?.httpStatusCode === 404) {
      return { entries: [], goalHistory: [] }; // No data yet
    }
    throw err;
  }

  const text = await resp.Body.transformToString();
  const allData = JSON.parse(text);

  if (!allData.days) return { entries: [], goalHistory: [] };

  const entries = Object.entries(allData.days).flatMap(([date, dayData]) => {
    const dayEntries = Array.isArray(dayData) ? dayData : dayData.entries || [];
    return dayEntries.map(e => ({ ...e, date }));
  });

  return { entries, goalHistory: allData.goalHistory || [] };
}
