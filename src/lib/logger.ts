/**
 * Centralized Logging Utility
 * Use this instead of console.log/error directly to allow for 
 * future integration with external monitoring services.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  message: string;
  level: LogLevel;
  context?: any;
  timestamp: string;
  userId?: string;
}

export const logger = {
  log: (level: LogLevel, message: string, context?: any) => {
    const payload: LogPayload = {
      message,
      level,
      context,
      timestamp: new Date().toISOString(),
    };

    const styles = {
      info: 'color: #3b82f6; font-weight: bold;',
      warn: 'color: #f59e0b; font-weight: bold;',
      error: 'color: #ef4444; font-weight: bold;',
      debug: 'color: #6b7280; font-weight: bold;',
    };

    if (process.env.NODE_ENV !== 'production' || level === 'error') {
      console.group(`[${payload.level.toUpperCase()}] ${payload.message}`);
      console.log(`%cTime:`, 'font-weight: bold', payload.timestamp);
      if (context) console.log(`%cContext:`, 'font-weight: bold', context);
      console.groupEnd();
    }
  },

  info: (message: string, context?: any) => logger.log('info', message, context),
  warn: (message: string, context?: any) => logger.log('warn', message, context),
  error: (message: string, context?: any) => logger.log('error', message, context),
  debug: (message: string, context?: any) => logger.log('debug', message, context),
};
