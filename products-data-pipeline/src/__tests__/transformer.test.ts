import { transformRow } from '../transformer';

describe('ProductTransformer', () => {
  it('should transform CSV row into MongoDB product document', () => {
    const row = {
      product_id: 'P000001',
      name: 'Wireless Mouse',
      category: 'Electronics',
      price: '29.99',
      stock_quantity: '150',
      supplier_id: 'SUP001',
      description: 'Ergonomic wireless mouse',
      tags: 'electronics,computer,wireless',
      weight_kg: '0.15',
      dimensions_cm: '12x8x4',
      created_at: '2024-01-15T10:30:00.000Z',
      is_active: 'true',
    };

    const product = transformRow(row);

    expect(product).toEqual({
      productId: 'P000001',
      name: 'Wireless Mouse',
      category: 'Electronics',
      price: 29.99,
      stockQuantity: 150,
      supplierId: 'SUP001',
      description: 'Ergonomic wireless mouse',
      tags: ['electronics', 'computer', 'wireless'],
      weight: 0.15,
      dimensions: {
        length: 12,
        width: 8,
        height: 4,
      },
      createdAt: new Date('2024-01-15T10:30:00.000Z'),
      isActive: true,
    });
  });

  it('should handle optional fields gracefully', () => {
    const row = {
      product_id: 'P000002',
      name: 'Simple Book',
      category: 'Books',
      price: '10',
      stock_quantity: '5',
      is_active: 'false',
    };

    const product = transformRow(row);

    expect(product.productId).toBe('P000002');
    expect(product.tags).toEqual([]);
    expect(product.dimensions).toBeUndefined();
    expect(product.weight).toBeUndefined();
    expect(product.createdAt).toBeUndefined();
    expect(product.isActive).toBe(false);
  });
});
