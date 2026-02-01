import fs from 'fs';
import path from 'path';
import { parseCSV } from '../parser';
import { logger } from '../logger';

describe('CSVParser heuristic for unquoted tags', () => {
  const testCsvPath = path.join(__dirname, 'heuristic-test.csv');

  beforeAll(() => {
    const header = 'product_id,name,category,price,stock_quantity,supplier_id,description,tags,weight_kg,dimensions_cm,created_at,is_active\n';

    // Row 1: tags field is unquoted and contains commas -> will produce extra fields if not handled
    const row1 = 'P100,Unquoted Tags Product,Electronics,19.99,10,SUPX,Some desc,electronics,computer,wireless,0.2,10x5x2,2024-01-01T00:00:00.000Z,true\n';

    // Row 2: normal/quoted tags
    const row2 = 'P101,Quoted Tags Product,Books,9.99,5,SUPY,Book desc,"reading,books",0.5,20x15x2,2024-01-02T00:00:00.000Z,false\n';

    fs.writeFileSync(testCsvPath, header + row1 + row2);
  });

  afterAll(() => {
    try { fs.unlinkSync(testCsvPath); } catch (e) { /* ignore */ }
  });

  beforeEach(() => {
    logger.clear();
  });

  it('reconstructs rows where tags are unquoted and returns correct products', async () => {
    const result = await parseCSV(testCsvPath);

    expect(result.stats.totalRows).toBe(2);
    expect(result.stats.validRows).toBe(2);
    expect(result.stats.invalidRows).toBe(0);
    expect(result.products.length).toBe(2);

    const p1 = result.products.find(p => p.productId === 'P100');
    expect(p1).toBeDefined();
    expect(p1?.tags).toEqual(['electronics', 'computer', 'wireless']);

    const p2 = result.products.find(p => p.productId === 'P101');
    expect(p2).toBeDefined();
    expect(p2?.tags).toEqual(['reading', 'books']);
  });
});
