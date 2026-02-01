
import { ValidationError } from './types';

export function validateRow(
  row: Record<string, string>,
  rowNumber: number
): ValidationError[] {
  const errors: ValidationError[] = [];

  const required = ['product_id', 'name', 'category', 'price', 'stock_quantity'];

  for (const field of required) {
    if (!row[field] || row[field].trim() === '') {
      errors.push({ row: rowNumber, field, message: `${field} is required` });
    }
  }

  const price = Number(row.price);
  if (isNaN(price) || price <= 0) {
    errors.push({ row: rowNumber, field: 'price', message: 'price must be positive' });
  }

  const stock = Number(row.stock_quantity);
  if (!Number.isInteger(stock) || stock < 0) {
    errors.push({
      row: rowNumber,
      field: 'stock_quantity',
      message: 'stock_quantity must be non-negative integer',
    });
  }

  if (row.created_at && isNaN(Date.parse(row.created_at))) {
    errors.push({
      row: rowNumber,
      field: 'created_at',
      message: 'created_at must be valid ISO date',
    });
  }

  if (
    row.is_active !== undefined &&
    row.is_active !== 'true' &&
    row.is_active !== 'false'
  ) {
    errors.push({
      row: rowNumber,
      field: 'is_active',
      message: 'is_active must be true or false',
    });
  }

  return errors;
}
