
import path from 'path';
import fs from 'fs';
import { parseCSV } from './parser';
import { insertWithRetry } from './examples/db-utils';
import { MongoClient } from 'mongodb';

function parseArgNumber(name: string, defaultVal: number) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return defaultVal;
  const v = process.argv[idx + 1];
  const n = Number(v);
  return Number.isFinite(n) ? n : defaultVal;
}

function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const filePath = path.join(__dirname, '../data/products.csv');

  const batchSize = parseArgNumber('batchSize', 0);
  const concurrency = parseArgNumber('concurrency', 1);
  const progressInterval = parseArgNumber('progressInterval', 1000);
  const mongoFlag = hasFlag('mongo');
  const collectionNameFlagIdx = process.argv.indexOf('--collection');
  const collectionName = collectionNameFlagIdx === -1 ? process.env.PRODUCTS_COLLECTION : process.argv[collectionNameFlagIdx + 1];
  const dryRun = hasFlag('dry-run');
  const insertConcurrency = parseArgNumber('insert-concurrency', 1);
  const insertRetries = parseArgNumber('insert-retries', 3);
  const errorsFile = (() => {
    const idx = process.argv.indexOf('--errors-file');
    if (idx === -1) return undefined;
    return process.argv[idx + 1];
  })();

  const options: any = {
    batchSize: batchSize || undefined,
    concurrency,
    progressInterval,
    onProgress: (p: any) => {
      console.log('Progress:', p.totalRows, 'rows —', p.rowsPerSec, 'r/s');
    },
  };

  let client: MongoClient | null = null;
  let collNameToUse: string | undefined = collectionName;

  // metrics for inserts
  let totalInsertedRows = 0;
  let insertedBatches = 0;
  let failedBatches = 0;
  const activeInserts: Promise<void>[] = [];

  function trackInsert(promise: Promise<void>) {
    activeInserts.push(promise);
    // remove when settled
    promise.then(() => {
      const idx = activeInserts.indexOf(promise);
      if (idx !== -1) activeInserts.splice(idx, 1);
    }).catch(() => {
      const idx = activeInserts.indexOf(promise);
      if (idx !== -1) activeInserts.splice(idx, 1);
    });
  }

  if (mongoFlag && process.env.MONGODB_URI) {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    collNameToUse = collNameToUse || `products_import_${Date.now()}`;
    console.log('Mongo mode: inserting to', collNameToUse, '(dry-run=', dryRun, ', insert-concurrency=', insertConcurrency, ')');

    const db = client.db();

    options.onBatch = async (batch: any[]) => {
      if (dryRun) {
        insertedBatches++;
        totalInsertedRows += batch.length;
        console.log(`[dry-run] batch simulated: ${batch.length} rows`);
        return;
      }

      const insertFn = async (b: any[]) => {
        const r = await db.collection(collNameToUse!).insertMany(b as any[]);
        return { insertedCount: r.insertedCount } as any;
      };

      const doInsert = async () => {
        try {
          const res: any = await insertWithRetry(batch, insertFn, insertRetries);
          const inserted = (res && res.insertedCount) || batch.length;
          insertedBatches++;
          totalInsertedRows += inserted;
          console.log(`Inserted batch (${inserted} rows)`);
        } catch (err) {
            failedBatches++;
            console.error('Failed to insert batch after retries:', err);
        }
      };

      // throttle insert concurrency
      if (insertConcurrency > 1) {
        while (activeInserts.length >= insertConcurrency) {
          // wait for the earliest to finish
          await Promise.race(activeInserts);
        }
      }

      const p = doInsert();
      trackInsert(p);
      await p; // ensure parse waits for batch to be fully handled before continuing (backpressure)
    };
  } else if (batchSize > 0) {
    // if batch mode requested but no mongo, we still call onBatch to simulate processing
    options.onBatch = async (batch: any[]) => {
      // noop - keep in memory if caller wants returned products
    };
  }

  if (errorsFile) {
    const ws = fs.createWriteStream(errorsFile, { flags: 'a' });
    options.onError = (rowError: any) => {
      ws.write(JSON.stringify(rowError) + '\n');
    };
  }

  const result = await parseCSV(filePath, options);

  // wait for any in-flight inserts to finish
  if (activeInserts.length > 0) {
    console.log('Waiting for', activeInserts.length, 'in-flight insert(s) to finish...');
    await Promise.all(activeInserts);
  }

  console.log('Stats:', result.stats);
  console.log('Valid products:', result.products.length);
  console.log('Errors:', result.errors.length);

  if (client) {
    console.log('Insert metrics: insertedBatches=', insertedBatches, 'totalInsertedRows=', totalInsertedRows, 'failedBatches=', failedBatches);
    await client.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
