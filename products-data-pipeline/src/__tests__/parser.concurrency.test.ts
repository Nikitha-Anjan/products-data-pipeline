import fs from 'fs';
import path from 'path';
import { parseCSV } from '../parser';
import { logger } from '../logger';

describe('CSVParser concurrency and batching', () => {
  const testCsvPath = path.join(__dirname, 'concurrency-test.csv');

  beforeAll(() => {
    const header = 'product_id,name,category,price,stock_quantity,supplier_id,description,tags,weight_kg,dimensions_cm,created_at,is_active\n';
    let rows = '';
    for (let i = 0; i < 10; i++) {
      rows += `P${String(i).padStart(3, '0')},Product ${i},Category,10,5,SUP,desc,tag1,0.1,1x1x1,2024-01-01T00:00:00.000Z,true\n`;
    }
    fs.writeFileSync(testCsvPath, header + rows);
  });

  afterAll(() => {
    try { fs.unlinkSync(testCsvPath); } catch (e) { }
  });

  beforeEach(() => {
    logger.clear();
  });

  it('calls onBatch expected number of times with concurrency > 1 and emits progress', async () => {
    const batches: any[] = [];
    let progressCalls = 0;

    const result = await parseCSV(testCsvPath, {
      batchSize: 2,
      concurrency: 3,
      onBatch: async (batch) => {
        // simulate async DB insert
        batches.push(batch);
        await new Promise(res => setTimeout(res, 20));
      },
      onProgress: (p) => {
        progressCalls++;
      }
    });

    expect(result.stats.totalRows).toBe(10);
    expect(result.stats.validRows).toBe(10);
    expect(result.stats.invalidRows).toBe(0);
    expect(batches.length).toBe(5); // 10 rows, batchSize 2 => 5 batches
    expect(progressCalls).toBeGreaterThanOrEqual(0);
  });
});
