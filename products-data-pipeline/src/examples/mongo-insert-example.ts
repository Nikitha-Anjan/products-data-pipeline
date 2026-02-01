import path from 'path';
import { parseCSV } from '../parser';
import { mockInsertMany, insertWithRetry } from './db-utils';
import { Product } from '../types';
import { MongoClient, Collection } from 'mongodb';

async function run() {
  const filePath = path.join(__dirname, '../../data/products.csv');
  const mongoUri = process.env.MONGODB_URI;
  let client: MongoClient | null = null;
  let collection: Collection<Product> | null = null;

  if (mongoUri) {
    client = new MongoClient(mongoUri);
    try {
      await client.connect();
      const dbName = client.db().databaseName || 'test';
      const collName = `products_import_${Date.now()}`;
      collection = client.db(dbName).collection<Product>(collName);
      console.log('Connected to MongoDB, will insert into collection', collName);
    } catch (err) {
      console.error('Failed to connect to MongoDB, falling back to dry-run', err);
      collection = null;
    }
  } else {
    console.log('MONGODB_URI not provided — running in dry-run mode (mock inserts)');
  }

  await parseCSV(filePath, {
    batchSize: 1000,
    concurrency: 2,
    onBatch: async (batch: Product[]) => {
      try {
        if (collection) {
          // real insertion path
          const insertFn = async (b: Product[]) => {
            const r = await collection!.insertMany(b as any[]);
            return { insertedCount: r.insertedCount };
          };
          const res = await insertWithRetry(batch, insertFn, 3);
          console.log('Inserted batch', res.insertedCount);
        } else {
          // dry-run/mock path
          const res = await insertWithRetry(batch, mockInsertMany, 3);
          console.log('Mock inserted batch', res.insertedCount);
        }
      } catch (err) {
        console.error('Failed to insert batch after retries', err);
      }
    },
    onError: (rowError) => {
      // stream errors to a file or monitoring system
      console.error('Invalid row', rowError.row, rowError.message);
    },
    onProgress: (p) => {
      console.log('Progress', p.totalRows, 'rows processed —', p.rowsPerSec, 'r/s');
    }
  });

  if (client) {
    try {
      await client.close();
      console.log('Closed MongoDB connection');
    } catch (err) {
      console.warn('Error closing MongoDB client', err);
    }
  }
}

if (require.main === module) run().catch(err => { console.error(err); process.exit(1); });
