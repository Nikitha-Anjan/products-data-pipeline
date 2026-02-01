import fs from 'fs';
import { parse } from 'csv-parse';

import { logger } from './logger';
import { validateRow } from './validator';
import { transformRow } from './transformer';
import { ParseResult, ValidationError, Product, RowError, ProgressReport } from './types';

type ParseOptions = {
  /** If provided, products will be emitted in batches via onBatch instead of being accumulated in memory. */
  batchSize?: number;
  /** Called for each full batch (or final partial batch) when batchSize is set. Can return a Promise to apply backpressure. */
  onBatch?: (batch: Product[]) => Promise<void> | void;
  /** Called for each invalid row; if provided, errors will be streamed and not kept in memory. */
  onError?: (rowError: RowError) => Promise<void> | void;
  /** Called periodically with progress metrics (rows processed, rows/sec, memory). */
  onProgress?: (progress: ProgressReport) => void | Promise<void>;
  /** Number of rows to process in parallel. Default: 1 (synchronous). */
  concurrency?: number;
  /** How often (in rows) to log progress and metrics. Default: 1000. */
  progressInterval?: number;
};

/**
 * Parse a CSV file into products and errors.
 *
 * Non-breaking: if no options are provided -(returns all products in memory).
 */
export async function parseCSV(
  filePath: string,
  options?: ParseOptions
): Promise<ParseResult> {
  const start = Date.now();
  const products: Product[] = [];
  const errors: RowError[] = [];

  const batchMode = !!(options && options.onBatch && options.batchSize && options.batchSize > 0);
  const batchSize = options?.batchSize || 0;
  const batch: Product[] = [];

  let totalRows = 0;
  let validRows = 0;
  let invalidRows = 0;
  const concurrency = Math.max(1, options?.concurrency ?? 1);
  const progressInterval = options?.progressInterval ?? 1000;
  const fileStat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
  const fileSize = fileStat ? fileStat.size : 0;

  let inFlight = 0;
  const inFlightPromises = new Set<Promise<void>>();

  return new Promise((resolve, reject) => {
    // We parse as raw arrays (columns: false) so we can capture the
    // header row ourselves and handle rows that contain unquoted commas
    // inside fields (notably the `tags` field). This lets us reconstruct
    // rows where extra columns were created by commas inside a field.
    const parser = parse({
      columns: false,
      skip_empty_lines: true,
      trim: false,
      bom: true,
      // allow rows with varying field counts so we can handle them heuristically
      relax_column_count: true,
    });

    const fileStream = fs.createReadStream(filePath);

    fileStream.on('error', (err: Error) => {
      logger.error('File read failed', { error: err.message });
      reject(err);
    });

    const stream = fileStream.pipe(parser);

    // We will capture the header (first record) and use it to map subsequent
    // array records into objects. If a row has more fields than the header
    // (commonly because `tags` contains unquoted commas), we reassemble
    // by joining the middle fields into the `tags` column. This heuristic
    // matches the expected CSV layout from the README.
    let headers: string[] | null = null;

    stream.on('data', (rec: string[]) => {
      // Launch an async task for the record and allow up to `concurrency` tasks in-flight.
      const task = (async () => {
        try {
          // First row is header
          if (!headers) {
            headers = (rec as string[]).map(h => (h || '').trim());
            return;
          }

          totalRows++;

          const fields = rec as string[];
          const hLen = headers.length;

          // build a mapping from header -> value, handling too-long records
          const rowObj: Record<string, string> = {};

          if (fields.length === hLen) {
            for (let i = 0; i < hLen; i++) {
              rowObj[headers[i]] = (fields[i] || '').trim();
            }
          } else if (fields.length > hLen) {
            // Heuristic: tags is at index 7, and the last 4 columns are
            // weight_kg, dimensions_cm, created_at, is_active
            const tagsIndex = headers.indexOf('tags');
            const tailCount = hLen - (tagsIndex + 1); // number of columns after tags
            const tailStart = fields.length - tailCount;

            // map columns before tags normally
            for (let i = 0; i < tagsIndex; i++) {
              rowObj[headers[i]] = (fields[i] || '').trim();
            }

            // join everything between tagsIndex .. tailStart-1 into tags
            const tagsSlice = fields.slice(tagsIndex, Math.max(tagsIndex, tailStart));
            rowObj['tags'] = tagsSlice.map(s => (s || '').trim()).join(',');

            // map tail columns
            let tailIdx = tailStart;
            for (let i = tagsIndex + 1; i < hLen; i++) {
              rowObj[headers[i]] = (fields[tailIdx++] || '').trim();
            }
          } else {
            // too few fields: map what we have and leave the rest empty
            for (let i = 0; i < fields.length; i++) {
              rowObj[headers[i]] = (fields[i] || '').trim();
            }
            for (let i = fields.length; i < hLen; i++) {
              rowObj[headers[i]] = '';
            }
          }

          const validationErrors = validateRow(rowObj, totalRows);
          if (validationErrors.length > 0) {
            invalidRows++;
            const message = validationErrors.map(e => `${e.field}: ${e.message}`).join('; ');
            const rowError: RowError = { row: totalRows, message, fieldErrors: validationErrors };
            if (options?.onError) {
              try {
                await Promise.resolve(options.onError(rowError));
              } catch (err) {
                logger.error('onError callback failed', { error: (err as Error).message });
              }
            } else {
              errors.push(rowError);
            }
          } else {
            validRows++;
            const prod = transformRow(rowObj);

            if (batchMode) {
              batch.push(prod);
              if (batch.length >= batchSize) {
                const toSend = batch.splice(0, batch.length);
                try {
                  await Promise.resolve(options!.onBatch!(toSend));
                } catch (err) {
                  logger.error('onBatch callback failed', { error: (err as Error).message });
                }
              }
            } else {
              products.push(prod);
            }
          }

          // Progress & metrics reporting
          if (totalRows % progressInterval === 0) {
            const durationSec = (Date.now() - start) / 1000;
            const rowsPerSec = Math.round(totalRows / (durationSec || 1));
            const mem = process.memoryUsage();
            const percent = fileSize > 0 && fileStream.bytesRead ? Math.min(100, Math.round((fileStream.bytesRead / fileSize) * 100)) : undefined;
            logger.info('Progress update', {
              processed: totalRows,
              validRows,
              invalidRows,
              rowsPerSec,
              percent,
              memory: {
                heapUsed: mem.heapUsed,
                rss: mem.rss,
              },
            });
            // also invoke onProgress callback if provided
            if (options?.onProgress) {
              try {
                await Promise.resolve(options.onProgress({
                  totalRows,
                  validRows,
                  invalidRows,
                  rowsPerSec,
                  percent,
                  memory: { heapUsed: mem.heapUsed, rss: mem.rss },
                }));
              } catch (err) {
                logger.error('onProgress callback failed', { error: (err as Error).message });
              }
            }
          }
        } catch (err) {
          logger.error('Row processing failed', { error: (err as Error).message, row: totalRows });
        }
      })();

      // Track concurrency
      inFlight++;
      const p = task.then(() => {
        inFlight--;
        inFlightPromises.delete(p);
        if (stream.isPaused() && inFlight < concurrency) {
          stream.resume();
        }
      });
      inFlightPromises.add(p);
      if (inFlight >= concurrency) {
        stream.pause();
      }
    });

    stream.on('end', async () => {
      // wait for any in-flight processing to complete
      try {
        if (inFlightPromises.size > 0) {
          await Promise.all(Array.from(inFlightPromises));
        }
      } catch (err) {
        // swallow - individual tasks have logged errors
      }

      // flush remaining batch if needed
      if (batchMode && batch.length > 0) {
        try {
          await Promise.resolve(options!.onBatch!(batch.splice(0, batch.length)));
        } catch (err) {
          logger.error('onBatch callback failed', { error: (err as Error).message });
        }
      }

      const durationMs = Date.now() - start;
      logger.info('Parsing completed', {
        totalRows,
        validRows,
        invalidRows,
        durationMs,
      });

      resolve({
        products,
        errors,
        stats: { totalRows, validRows, invalidRows, durationMs },
      });
    });

    stream.on('error', (err: Error) => {
      logger.error('Parsing failed', { error: err.message });
      reject(err);
    });
  });
}
