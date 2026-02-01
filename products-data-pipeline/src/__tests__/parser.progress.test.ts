import fs from 'fs';
import path from 'path';
import { parseCSV } from '../parser';
import { logger } from '../logger';

describe('CSVParser onProgress reports', () => {
  const testCsvPath = path.join(__dirname, 'progress-test.csv');

  beforeAll(() => {
    const header = 'product_id,name,category,price,stock_quantity,supplier_id,description,tags,weight_kg,dimensions_cm,created_at,is_active\n';
    let rows = '';
    for (let i = 0; i < 6; i++) {
      rows += `P${String(i).padStart(3, '0')},Product ${i},Category,10,5,SUP,desc,tag1,0.1,1x1x1,2024-01-01T00:00:00.000Z,true\n`;
    }
    fs.writeFileSync(testCsvPath, header + rows);
  });

  afterAll(() => {
    try { fs.unlinkSync(testCsvPath); } catch (e) { /* ignore */ }
  });

  beforeEach(() => {
    logger.clear();
  });

  it('emits ProgressReport objects with expected fields', async () => {
    const reports: any[] = [];

    const result = await parseCSV(testCsvPath, {
      progressInterval: 2, // emit at every 2 rows
      onProgress: (p) => {
        reports.push(p);
      },
    });

    // Basic stats
    expect(result.stats.totalRows).toBe(6);
    expect(result.stats.validRows).toBe(6);
    expect(result.stats.invalidRows).toBe(0);

    // We should have received at least one progress report (at rows 2 and 4)
    expect(reports.length).toBeGreaterThanOrEqual(2);

    for (const r of reports) {
      expect(typeof r.totalRows).toBe('number');
      expect(typeof r.validRows).toBe('number');
      expect(typeof r.invalidRows).toBe('number');
      // rowsPerSec may be fractional/undefined in very fast tests; if present it should be a number
      if (r.rowsPerSec !== undefined) expect(typeof r.rowsPerSec).toBe('number');
      if (r.percent !== undefined) expect(typeof r.percent).toBe('number');
      expect(r.memory).toBeDefined();
      expect(typeof r.memory.heapUsed).toBe('number');
      expect(typeof r.memory.rss).toBe('number');
    }
  });
});
