const parquet = require('parquetjs');

async function parseParquet(buffer) {
  try {
    const reader = await parquet.ParquetReader.openBuffer(buffer);
    const cursor = reader.getCursor();
    const records = [];
    
    let record = null;
    while (record = await cursor.next()) {
      records.push(record);
    }
    
    await reader.close();
    return records;
  } catch (error) {
    throw new Error(`Failed to parse parquet: ${error.message}`);
  }
}

async function convertToParquet(data) {
  try {
    const schema = new parquet.ParquetSchema({
      app: { type: 'UTF8', compression: 'GZIP', encoding: 'PLAIN_DICTIONARY' },
      totalTime: { type: 'DOUBLE', compression: 'GZIP' },
      sessions: { type: 'INT32', compression: 'GZIP' },
    });

    const writer = await parquet.ParquetWriter.openStream(schema, {
      compression: 'GZIP',
      useDataPageV2: true,
    });
    
    for (const record of data) {
      await writer.appendRow(record);
    }
    
    await writer.close();
    return writer.outputStream;
  } catch (error) {
    throw new Error(`Failed to convert to parquet: ${error.message}`);
  }
}

module.exports = {
  parseParquet,
  convertToParquet,
};
