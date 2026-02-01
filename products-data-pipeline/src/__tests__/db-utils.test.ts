import { insertWithRetry } from '../examples/db-utils';
import { Product } from '../types';

describe('insertWithRetry', () => {
  it('retries on transient errors and eventually succeeds', async () => {
    let attempts = 0;
    const insertFn = async (batch: any[]) => {
      attempts++;
      if (attempts < 3) {
        const err: any = new Error('transient');
        err.transient = true;
        throw err;
      }
      return { insertedCount: batch.length };
    };

    const sample: Product = {
      productId: 'P1',
      name: 'Test',
      category: 'Cat',
      price: 1,
      stockQuantity: 1,
      tags: [],
      isActive: true,
    };
    const res = await insertWithRetry([sample], insertFn, 5);
    expect(res.insertedCount).toBe(1);
    expect(attempts).toBe(3);
  });

  it('throws when non-transient error occurs', async () => {
    const insertFn = async (batch: any[]) => {
      const err: any = new Error('permanent');
      err.transient = false;
      throw err;
    };

    const sample2: Product = {
      productId: 'P2',
      name: 'Test2',
      category: 'Cat',
      price: 1,
      stockQuantity: 1,
      tags: [],
      isActive: true,
    };
    await expect(insertWithRetry([sample2], insertFn, 2)).rejects.toThrow('permanent');
  });

  it('throws after exceeding retries for transient errors', async () => {
    let attempts = 0;
    const insertFn = async (batch: any[]) => {
      attempts++;
      const err: any = new Error('transient');
      err.transient = true;
      throw err;
    };

    const sample3: Product = {
      productId: 'P3',
      name: 'Test3',
      category: 'Cat',
      price: 1,
      stockQuantity: 1,
      tags: [],
      isActive: true,
    };
    await expect(insertWithRetry([sample3], insertFn, 2)).rejects.toThrow();
    expect(attempts).toBeGreaterThanOrEqual(3);
  });
});
