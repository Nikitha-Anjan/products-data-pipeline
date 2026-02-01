import fs from 'fs';
import path from 'path';
import { parseCSV } from '../parser';
import { logger } from '../logger';

describe('CSVParser', () => {
  const testCsvPath = path.join(__dirname, 'test-products.csv');

  beforeAll(() => {
    const csvContent = `product_id,name,category,price,stock_quantity,is_active
P001,Valid Product,Electronics,10.5,5,true
P002,Invalid Price,Electronics,-5,10,true
P003,Invalid Stock,Electronics,15,-1,true
P004,Another Valid,Books,20,3,false
`;

    fs.writeFileSync(testCsvPath, csvContent);
  });

  afterAll(() => {
    fs.unlinkSync(testCsvPath);
  });

  beforeEach(() => {
    logger.clear();
  });

  it('parses CSV, validates rows, and returns correct stats', async () => {
    const result = await parseCSV(testCsvPath);

    // Stats
    expect(result.stats.totalRows).toBe(4);
    expect(result.stats.validRows).toBe(2);
    expect(result.stats.invalidRows).toBe(2);
    expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);

    // Products
    expect(result.products).toHaveLength(2);
    expect(result.products[0].productId).toBe('P001');
    expect(result.products[1].productId).toBe('P004');

    // Errors
    expect(result.errors.length).toBeGreaterThan(0);

    // Logging
    const logs = logger.getLogs();
    expect(logs.some(l => l.message === 'Parsing completed')).toBe(true);
  });
});
