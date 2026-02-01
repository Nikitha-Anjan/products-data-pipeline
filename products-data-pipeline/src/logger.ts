
import { LogEntry } from './types';

const logs: LogEntry[] = [];

export const logger = {
  info(message: string, context?: Record<string, unknown>) {
    logs.push({
      level: 'info',
      message,
      context,
      timestamp: new Date(),
    });
  },

  error(message: string, context?: Record<string, unknown>) {
    logs.push({
      level: 'error',
      message,
      context,
      timestamp: new Date(),
    });
  },

  getLogs(): LogEntry[] {
    return logs;
  },

  clear() {
    logs.length = 0;
  },
};
