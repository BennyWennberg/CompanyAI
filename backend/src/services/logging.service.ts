// Simple in-memory logging service with module channels

export type LogChannel = 'ai' | 'hr' | 'support' | 'admin' | 'system';

export interface LogEntry {
  id: string;
  timestamp: string;
  channel: LogChannel;
  event: string;
  payload?: any;
}

export class LoggingService {
  private static logs: LogEntry[] = [];
  private static maxEntries = 5000;

  public static logEvent(channel: LogChannel, event: string, payload?: any): void {
    try {
      const entry: LogEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        channel,
        event,
        payload
      };

      LoggingService.logs.push(entry);
      if (LoggingService.logs.length > LoggingService.maxEntries) {
        LoggingService.logs = LoggingService.logs.slice(-LoggingService.maxEntries);
      }
    } catch {
      // ignore logging errors
    }
  }

  public static getLogs(channel?: LogChannel, limit: number = 200): LogEntry[] {
    const filtered = channel
      ? LoggingService.logs.filter(l => l.channel === channel)
      : LoggingService.logs;
    const end = filtered.length;
    const start = Math.max(0, end - limit);
    return filtered.slice(start, end).reverse();
  }

  public static clear(channel?: LogChannel): number {
    if (!channel) {
      const count = LoggingService.logs.length;
      LoggingService.logs = [];
      return count;
    }
    const before = LoggingService.logs.length;
    LoggingService.logs = LoggingService.logs.filter(l => l.channel !== channel);
    return before - LoggingService.logs.length;
  }
}


