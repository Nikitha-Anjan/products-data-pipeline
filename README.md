# CSV Data Ingestion

## Overview
 Your task is to implement a CSV data parser that processes **large datasets efficiently** (10,000+ rows) and transforms them for MongoDB ingestion. This project includes a streaming parser, validation, transformation, and optional MongoDB insertion.

## The Challenge

You've been provided with a CSV file containing 10,000+ product records. Your goal is to implement:

1. **Efficient CSV parsing** - Processing for large files
2. **Core validation** - Validate critical fields and data types
3. **Data transformation** - Convert CSV format to MongoDB documents
4. **Logging and metrics** - Track progress and performance
5. **Error handling** - Gracefully handle and report invalid rows

## Project Structure

```
├── data/
│   └── products.csv          # 10,000+ row CSV file
├── src/
│   ├── types.ts              # Type definitions (complete)
│   ├── logger.ts             # Logging implementation(complete)
│   ├── validator.ts          # Core validation (complete)
│   ├── transformer.ts        # Data transformation (complete)
│   ├── parser.ts             # Parser (complete)
│   ├── index.ts              # Entry point (complete)
│   └── __tests__/            # Test suites
├── package.json
├── tsconfig.json
└── jest.config.js
```

## What You Need to Implement

### 1. Logger (`src/logger.ts`) - 10 minutes
**Simple structured logging for observability:**
- `info(message, context)` - Log progress updates
- `error(message, context)` - Log errors
- `getLogs()` - Retrieve logs for inspection
- `clear()` - Clear logs

**That's it.** No fancy log levels or complex features. Keep it lean for performance.

### 2. Validator (`src/validator.ts`) - 15-20 minutes
**Core validation only - speed matters:**
- Required fields: `product_id`, `name`, `category`, `price`, `stock_quantity`
- `price` must be positive number
- `stock_quantity` must be non-negative integer
- `created_at` must be valid ISO 8601 date
- `is_active` must be 'true' or 'false'

Return validation errors per row, keep it fast since this runs on every row.

### 3. Transformer (`src/transformer.ts`) - 15-20 minutes
**Essential conversions for MongoDB:**
- Convert snake_case → camelCase
- Parse numbers: `price`, `stockQuantity`, `weight`
- Parse boolean: `is_active` → `isActive`
- Parse date: `created_at` → `createdAt` (Date object)
- Parse tags: split by comma → array
- Parse dimensions: "12x8x4" → `{ length, width, height }`

Keep transformations lightweight - this runs on every valid row.

### 4. Parser (`src/parser.ts`) - 30-40 minutes
**CSV processing - the core of this assessment:**

Key requirements:
- **Use memory efficiently** 10k+ rows shouldn't require GB of RAM
- **Process rows as they arrive** from the CSV parser
- **Validate → Transform** pipeline for each row
- **Collect errors** separately from valid products
- **Log progress** periodically (e.g., every 1000 rows)
- **Track metrics**: total rows, valid/invalid counts, processing time

Potential implementation approach:
```
1. Create file read stream
2. Pipe through csv-parse parser
3. For each row:
   - Validate
   - If valid: transform
   - If invalid: collect error
4. Log progress at intervals
5. Return results with statistics
```

## CSV Data Format

The file has 10,002 rows (header + 10,000 data + 2 intentionally bad rows):

| Column | Type | Notes |
|--------|------|-------|
| product_id | string | Format: P000001, P000002, etc. |
| name | string | Required, quoted if contains comma |
| category | string | Required |
| price | number | Must be positive |
| stock_quantity | number | Must be non-negative integer |
| supplier_id | string | - |
| description | string | Quoted if contains comma |
| tags | string | Comma-separated, e.g. "electronics,computer,wireless" |
| weight_kg | number | Weight in kilograms |
| dimensions_cm | string | Format: "LengthxWidthxHeight", e.g. "12x8x4" |
| created_at | ISO 8601 | Date string |
| is_active | string | "true" or "false" |

## Expected MongoDB Document Format

```json
{
  "productId": "P000001",
  "name": "Product Name",
  "category": "Electronics",
  "price": 29.99,
  "stockQuantity": 150,
  "supplierId": "SUP001",
  "description": "Product description",
  "tags": ["electronics", "computer", "wireless"],
  "weight": 0.15,
  "dimensions": {
    "length": 12,
    "width": 8,
    "height": 4
  },
  "createdAt": "2024-01-15T10:30:00.000Z",
  "isActive": true
}
```

## Getting Started

### 1. Install Dependencies

This project targets Node.js 18+. Use `npm ci` to install from lockfile for reproducible installs (recommended):

```bash
npm ci
```

### 2. Run Tests

Tests are your specification. Start with one module at a time:

```bash
npm test
```

Suggested order:
1. Logger (fastest)
2. Validator
3. Transformer
4. Parser (most complex)

### 3. Run the Application

Build and run the parser (default parses `data/products.csv`):

```bash
npm run build
npm start
```

By default the parser will collect valid products in memory and print stats. For large runs or production you should use `--batchSize` and an `onBatch` handler (the CLI supports batch mode and optional Mongo insertion).

### Running with MongoDB

This repository supports optional MongoDB insertion (implemented). To insert parsed batches into a MongoDB instance set `MONGODB_URI` and run with the `--mongo` flag. You can optionally provide `--collection <name>` to control the target collection.

There is also a helper script for local testing that uses an ephemeral in-memory MongoDB server (`mongodb-memory-server`):

```bash
# run the helper (starts in-memory Mongo, inserts batches, prints a small sample)
node scripts/run-in-memory-mongo.js
```

### 4. What Success Looks Like

- [ ] All tests pass
- [ ] Application runs without errors
- [ ] Processing 10,000 rows completes in < 10 seconds
- [ ] Valid rows are properly transformed
- [ ] Invalid rows are reported
- [ ] Logs show progress updates

## Evaluation Criteria

### Performance (40%)
- Processes 10,000 rows efficiently
- memory-conscious
- Completes in reasonable time
- Handles large files without slowdown

### Code Quality (30%)
- Clean, readable code
- Proper TypeScript types
- Modular structure
- Minimal dependencies

### Correctness (20%)
- All tests pass
- Proper validation logic
- Correct data transformation
- Accurate statistics

### Observability (10%)
- Meaningful logging
- Progress tracking
- Performance metrics

If you finish early:

- **Batch processing** - Process rows in batches for better performance
- **Progress reporting** - Show progress percentage or speed (rows/sec)
- **Memory metrics** - Track memory usage
- **Parallel validation** - Can you validate while transforming?
- **Error recovery** - Continue processing even with severe errors
- **MongoDB integration** - Actually insert data (requires local/atlas instance)

1. **Focus on ingesting the file efficiently first** - This is the key differentiator
2. **Start simple** - Get basic flow working before optimizing
3. **Test incrementally** - Run tests after each component
4. **Think about scale** - How would 1M rows work?
5. **Log smartly** - Not too much (impacts performance), not too little (can't debug)
6. **Handle backpressure** - csv-parse backpressure handling is important for large files


Ensure:
- [ ] All tests pass (`npm test`)
- [ ] Code compiles (`npm run build`)
- [ ] Application runs successfully (`npm start`)
- [ ] Processing time is reasonable (< 10 seconds for 10k rows)
