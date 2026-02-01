
import { Product } from './types';

export function transformRow(row: Record<string, string>): Product {
  const dims = row.dimensions_cm?.split('x').map(Number);
  const dimensions =
    dims && dims.length === 3 && dims.every(n => !isNaN(n))
      ? { length: dims[0], width: dims[1], height: dims[2] }
      : undefined;

  return {
    productId: row.product_id,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    stockQuantity: Number(row.stock_quantity),
    supplierId: row.supplier_id || undefined,
    description: row.description || undefined,
    tags: row.tags ? row.tags.split(',').map(t => t.trim()) : [],
    weight: row.weight_kg ? Number(row.weight_kg) : undefined,
    dimensions,
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    isActive: row.is_active === 'true',
  };
}
