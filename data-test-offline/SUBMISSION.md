Project: CSV Data Ingestion — Technical Assessment
Author: <Your Name>
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
This submission implements a streaming CSV parser that validates and transforms product rows for MongoDB ingestion. It supports optional, batched MongoDB insertion with retries and configurable concurrency. A helper script runs an ephemeral in-memory MongoDB instance for quick verification without an external DB.

What I implemented (high level)
- Streaming parser (`src/parser.ts`) — raw-array parsing, header handling, heuristic for malformed rows, concurrency & backpressure, periodic progress reporting, memory metrics.
- Validator (`src/validator.ts`) — row-level checks per spec (required fields, numeric checks, date/boolean checks).
- Transformer (`src/transformer.ts`) — snake_case→camelCase, numeric/boolean/date parsing, tags and dimensions parsing.
- CLI (`src/index.ts`) — flags include: `--batchSize`, `--concurrency`, `--progressInterval`, `--errors-file`, `--mongo`, `--collection`, `--dry-run`, `--insert-concurrency`, `--insert-retries`.
- Mongo insertion utilities (`src/examples/db-utils.ts`) — `insertWithRetry` and `mockInsertMany`.
- In-memory verification script: `scripts/run-in-memory-mongo.js` (starts `mongodb-memory-server`, inserts batches, prints sample docs).
- Tests: unit tests + an in-memory Mongo integration test (requires dev deps).

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

4. Run with in-memory Mongo (no external DB required):

```bash
node scripts/run-in-memory-mongo.js
```

5. Run with your MongoDB (real DB):

```bash
export MONGODB_URI='mongodb://localhost:27017/mydb'
npm run start:mongo
# or pass flags directly:
MONGODB_URI="..." npm start -- --mongo --collection products_import --insert-concurrency 4
```

What to verify
---------------
- Tests pass: `npm test`
- Running the in-memory helper prints parse stats and a small sample of inserted docs.
- The CLI prints final Stats (totalRows, validRows, invalidRows) and insert metrics when run in --mongo mode.

Design notes & assumptions
-------------------------
- The parser uses streaming and backpressure (pause/resume) to be memory efficient.
- A heuristic merges extra CSV fields into the `tags` column to recover rows with unquoted commas in tags. If other fields can contain unquoted commas, the heuristic should be extended.
- `mongodb-memory-server` is used for in-memory verification in tests and the helper script (dev dependency). CI uses `npm ci` so devDependencies are installed there.

Known limitations / caveats
-------------------------
- The heuristic assumes `tags` is the only problematic free-text field. For varied inputs you may want a more robust pre-processing or stricter quoting.
- For very large datasets (1M rows), tune `--batchSize` and `--insert-concurrency`. Consider generating data on disk and streaming it to avoid memory pressure in tests.

Notes for reviewers
------------------
- See `README.md` for full CLI flags and verification steps.
- `scripts/run-in-memory-mongo.js` is the quickest way to verify the insertion path without external DB access.
- `package-lock.json` is included so `npm ci` reproduces the environment used during development.

Contact / questions
-------------------
If you'd like a walkthrough, performance numbers for different batch sizes, or a short demo, I can provide one.

Thank you!
