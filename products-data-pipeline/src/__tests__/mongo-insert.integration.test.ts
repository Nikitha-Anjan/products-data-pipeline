import { MongoClient } from 'mongodb';
import path from 'path';
import { parseCSV } from '../parser';

jest.setTimeout(60000);

describe('Mongo insert integration (in-memory)', () => {
  let mongod: any = null;
  let MongoMemoryServer: any = null;
  let client: MongoClient | null = null;
  let shouldSkip = false;

  beforeAll(async () => {
    try {
      // dynamic require so the test file doesn't hard-fail when the package isn't installed
      // (useful in environments where installing dev deps isn't performed)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      MongoMemoryServer = require('mongodb-memory-server').MongoMemoryServer;
    } catch (err) {
      // mongodb-memory-server not available; skip the suite
      // mark and return early
      // eslint-disable-next-line no-console
      console.warn('mongodb-memory-server not installed; skipping in-memory mongo integration test');
      shouldSkip = true;
      return;
    }

    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    client = new MongoClient(uri);
    await client.connect();
  });

  afterAll(async () => {
    if (client) await client.close();
    if (mongod) await mongod.stop();
  });

  it('inserts batches into in-memory mongodb and verifies count', async () => {
    if (shouldSkip) {
      // skip gracefully when dependency not available
      return;
    }

    if (!mongod || !client) throw new Error('mongod/client not initialized');

    const db = client.db();
    const collName = 'products_import_test';
    const coll = db.collection(collName);

    const filePath = path.join(__dirname, '../../data/products.csv');

    // Use batch mode to exercise insertion path. Keep insert concurrency low for test.
    const options: any = {
      batchSize: 1000,
      concurrency: 2,
      progressInterval: 2000,
      onBatch: async (batch: any[]) => {
        if (!batch || batch.length === 0) return;
        await coll.insertMany(batch as any[]);
      },
    };

    const result = await parseCSV(filePath, options);

    // wait a moment for any outstanding writes (should already be awaited by onBatch)
    const count = await coll.countDocuments();

    expect(result.stats.totalRows).toBe(10002);
    // invalidRows should not be inserted
    expect(result.stats.validRows + result.stats.invalidRows).toBe(result.stats.totalRows);
    expect(count).toBe(result.stats.validRows);
  });
});
