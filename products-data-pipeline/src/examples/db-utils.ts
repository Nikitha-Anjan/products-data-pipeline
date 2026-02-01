import { Product } from '../types';

export type InsertResult = { insertedCount: number };
export type InsertFn = (batch: Product[]) => Promise<InsertResult>;

// Default mocked insert function with occasional transient failure (for examples)
export async function mockInsertMany(batch: Product[]): Promise<InsertResult> {
  // Simulate 20% failure rate
  if (Math.random() < 0.2) {
    const err: any = new Error('Transient DB error');
    err.transient = true;
    throw err;
  }
  return { insertedCount: batch.length };
}

export async function insertWithRetry(
  batch: Product[],
  insertFn: InsertFn,
  maxRetries = 3
): Promise<InsertResult> {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      return await insertFn(batch);
    } catch (err: any) {
      attempt++;
      if (!err.transient || attempt > maxRetries) throw err;
      const backoff = Math.pow(2, attempt) * 100; // exponential backoff
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw new Error('insertWithRetry: failed to insert batch');
}
