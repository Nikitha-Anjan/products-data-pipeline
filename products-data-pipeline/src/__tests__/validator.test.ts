import { validateRow } from '../validator';

describe('ProductValidator', () => {
  it('returns no errors for a valid row', () => {
    const row = {
      product_id: 'P000001',
      name: 'Valid Product',
      category: 'Electronics',
      price: '19.99',
      stock_quantity: '10',
      created_at: '2024-01-01T10:00:00.000Z',
      is_active: 'true',
    };

    const errors = validateRow(row, 1);

    expect(errors).toHaveLength(0);
  });

  it('returns errors for missing required fields', () => {
    const row = {
      product_id: '',
      name: '',
      category: 'Electronics',
      price: '10',
      stock_quantity: '5',
      is_active: 'true',
    };

    const errors = validateRow(row, 2);

    expect(errors.some(e => e.field === 'product_id')).toBe(true);
    expect(errors.some(e => e.field === 'name')).toBe(true);
  });

  it('returns error for invalid price', () => {
    const row = {
      product_id: 'P000002',
      name: 'Bad Price',
      category: 'Electronics',
      price: '-5',
      stock_quantity: '10',
      is_active: 'true',
    };

    const errors = validateRow(row, 3);

    expect(errors.some(e => e.field === 'price')).toBe(true);
  });

  it('returns error for invalid stock quantity', () => {
    const row = {
      product_id: 'P000003',
      name: 'Bad Stock',
      category: 'Electronics',
      price: '10',
      stock_quantity: '-1',
      is_active: 'true',
    };

    const errors = validateRow(row, 4);

    expect(errors.some(e => e.field === 'stock_quantity')).toBe(true);
  });

  it('returns error for invalid created_at date', () => {
    const row = {
      product_id: 'P000004',
      name: 'Bad Date',
      category: 'Electronics',
      price: '10',
      stock_quantity: '5',
      created_at: 'not-a-date',
      is_active: 'true',
    };

    const errors = validateRow(row, 5);

    expect(errors.some(e => e.field === 'created_at')).toBe(true);
  });

  it('returns error for invalid is_active value', () => {
    const row = {
      product_id: 'P000005',
      name: 'Bad Active',
      category: 'Electronics',
      price: '10',
      stock_quantity: '5',
      is_active: 'yes',
    };

    const errors = validateRow(row, 6);

    expect(errors.some(e => e.field === 'is_active')).toBe(true);
  });
});
