#!/usr/bin/env node
// Helper: start an in-memory MongoDB, run the parser with onBatch inserting into it,
// then print counts and a small sample. Useful for manual verification.
const path = require('path');
const { MongoClient } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');

// use compiled parser from dist (CommonJS)
const { parseCSV } = require('../dist/parser');

async function main() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  console.log('Started in-memory mongo at', uri);

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  const collName = 'products_import_memtest';
  const coll = db.collection(collName);

  const filePath = path.join(__dirname, '../data/products.csv');

  const argv = require('minimist')(process.argv.slice(2));
  const batchSize = Number(argv['batchSize'] || process.env.BATCH_SIZE || 1000);
  const insertConcurrency = Number(argv['insert-concurrency'] || process.env.INSERT_CONCURRENCY || 2);
  const debug = argv['debug'] || process.env.DEBUG;

  // throttled unordered inserts for better throughput
  const insertOpts = { ordered: false };
  const activeInserts = new Set();

  function trackInsert(p) {
    activeInserts.add(p);
    p.then(() => activeInserts.delete(p)).catch(() => activeInserts.delete(p));
  }

  const options = {
    batchSize,
    concurrency: 2,
    progressInterval: 2000,
    onBatch: async (batch) => {
      if (!batch || batch.length === 0) return;

      const doInsert = async () => {
        await coll.insertMany(batch, insertOpts);
      };

      // throttle
      while (activeInserts.size >= insertConcurrency) {
        await Promise.race(Array.from(activeInserts));
      }

      const p = doInsert();
      trackInsert(p);
      // await the insert to apply backpressure (keeps behavior deterministic)
      await p;

      if (debug) console.log(`[in-memory] inserted batch: ${batch.length}`);
    },
  };

  console.time('parse+insert');
  const result = await parseCSV(filePath, options);

  // wait for any in-flight inserts (should be none since we awaited each), but be safe
  if (activeInserts.size > 0) await Promise.all(Array.from(activeInserts));
  console.timeEnd('parse+insert');

  const count = await coll.countDocuments();
  console.log('Parse stats:', result.stats);
  console.log('Collection count:', count);

  const sample = await coll.find().limit(5).toArray();
  console.log('Sample docs (first 5):');
  console.dir(sample, { depth: 2 });

  await client.close();
  await mongod.stop();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
