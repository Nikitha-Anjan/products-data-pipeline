
export interface LogEntry {
  level: 'info' | 'error';
  message: string;
  context?: Record<string, unknown>;
  timestamp: Date;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface RowError {
  row: number;
  /** Aggregated message for the row */
  message: string;
  /** Optional detailed field-level validation errors */
  fieldErrors?: ValidationError[];
}

export interface ProgressReport {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rowsPerSec?: number;
  percent?: number;
  memory?: {
    heapUsed: number;
    rss: number;
  };
}

export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

export interface Product {
  productId: string;
  name: string;
  category: string;
  price: number;
  stockQuantity: number;
  supplierId?: string;
  description?: string;
  tags: string[];
  weight?: number;
  dimensions?: Dimensions;
  createdAt?: Date;
  isActive: boolean;
}

export interface ParseResult {
  products: Product[];
  /** Row-level errors (aggregated). For streaming consumers, this may be empty if `onError` was used. */
  errors: RowError[];
  stats: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    durationMs: number;
  };
}
