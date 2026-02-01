import path from 'path';
import { parseCSV } from '../parser';

async function run() {
  const filePath = path.join(__dirname, '../../data/products.csv');

  let batches = 0;
  await parseCSV(filePath, {
    batchSize: 1000,
    onBatch: async (batch) => {
      batches++;
      console.log(`Received batch #${batches} size=${batch.length}`);
      // Example: insert into MongoDB here
      // await collection.insertMany(batch);
    },
    onError: (rowError) => {
      // Stream invalid rows to logs or a file rather than storing in memory
      console.error('Row error', rowError.row, rowError.message);
    },
  });

  console.log('Finished processing with batch example');
}

if (require.main === module) {
  run().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
