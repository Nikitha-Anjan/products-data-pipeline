Project: CSV Data Ingestion — Technical Assessment
Author: <Nikitha.M.A>
Date: 2026-01-24
Node.js tested on: 18.x

Contents included
- src/ (TypeScript source)
- data/products.csv (sample CSV)
- tests (src/__tests__/)
- scripts/ (helper utilities)
- package.json and package-lock.json
- README.md
- SUBMISSION.md (this file)

Summary
-------
This submission implements a stream-based CSV ingestion pipeline that validates and transforms product records into MongoDB-ready documents. The solution focuses on efficient processing, correctness, and observability, in line with the assignment requirements.

The parser processes rows incrementally using streams, applies core validation rules, transforms valid rows into the expected document shape, logs progress periodically, and reports summary metrics on completion.

What I implemented (high level)
- Streaming parser (`src/parser.ts`) — raw-array parsing, header handling, heuristic for malformed rows, concurrency & backpressure, periodic progress reporting, memory metrics.
- Validator (`src/validator.ts`) — row-level checks per spec (required fields, numeric checks, date/boolean checks).
- Transformer (`src/transformer.ts`) — snake_case→camelCase, numeric/boolean/date parsing, tags and dimensions parsing.
- In-memory verification script: `scripts/run-in-memory-mongo.js` (starts `mongodb-memory-server`, inserts batches, prints sample docs).
- Tests: unit tests

How to run (quick)
------------------
1. Install (reproducible):

```bash
npm ci
```

2. Run tests:

```bash
npm test
```

3. Parse the sample CSV (default):

```bash
npm run build
npm start
```

4. Run with in-memory Mongo (no external DB required):(Optional)

```bash
node scripts/run-in-memory-mongo.js
```

What to verify
---------------
- Tests pass: `npm test`
- `npm run build, npm start` - Logs and Stats are printed.
- `node scripts/run-in-memory-mongo.js` Running the in-memory helper prints parse stats and a small sample of inserted docs.


Notes for reviewers
------------------
- See `README.md` for verification steps.
- `scripts/run-in-memory-mongo.js` is the quickest way to verify the insertion path without external DB access.


Thank you!
