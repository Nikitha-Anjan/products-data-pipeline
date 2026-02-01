import { logger } from '../logger';

describe('logger', () => {
  beforeEach(() => {
    logger.clear();
  });

  it('should log info messages', () => {
    logger.info('Processing started');
    const logs = logger.getLogs();

    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('info');
    expect(logs[0].message).toBe('Processing started');
  });

  it('should log info messages with context', () => {
    logger.info('Progress update', { rowsProcessed: 5000 });
    const logs = logger.getLogs();

    expect(logs[0].context).toEqual({ rowsProcessed: 5000 });
  });

  it('should log error messages', () => {
    logger.error('Parse error', { rowNumber: 100 });
    const logs = logger.getLogs();

    expect(logs).toHaveLength(1);
    expect(logs[0].level).toBe('error');
    expect(logs[0].message).toBe('Parse error');
  });

  it('should clear logs', () => {
    logger.info('Test');
    logger.clear();

    expect(logger.getLogs()).toHaveLength(0);
  });
});
