import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';

const BUCKET = import.meta.env.VITE_DATA_BUCKET;
const REGION = import.meta.env.VITE_AWS_REGION || 'us-east-1';

export async function fetchScreenTimeData(credentials, identityId) {
  const s3 = new S3Client({ region: REGION, credentials });

  // List all date files for this user: {identityId}/{date}.json
  const list = await s3.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: `${identityId}/`,
  }));

  if (!list.Contents?.length) return [];

  // Fetch all JSON files in parallel
  const fetches = list.Contents
    .filter(obj => obj.Key.endsWith('.json'))
    .map(async (obj) => {
      const resp = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: obj.Key }));
      const text = await resp.Body.transformToString();
      const entries = JSON.parse(text);
      // Extract date from key: {identityId}/{date}.json
      const date = obj.Key.split('/').pop().replace('.json', '');
      return entries.map(e => ({ ...e, date: e.date || date }));
    });

  const results = await Promise.all(fetches);
  return results.flat();
}
