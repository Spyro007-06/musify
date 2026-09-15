import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { env } from '@config/env';
import path from 'path';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom log format for development
const devFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
});

// Production JSON format
const prodFormat = combine(
  errors({ stack: true }),
  timestamp(),
  json(),
);

// Development console format
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  devFormat,
);

const logDir = path.resolve(env.LOG_DIR);

// Daily rotating file transport for errors
const errorFileTransport = new DailyRotateFile({
  dirname: logDir,
  filename: 'error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '30d',
  zippedArchive: true,
});

// Daily rotating file transport for combined logs
const combinedFileTransport = new DailyRotateFile({
  dirname: logDir,
  filename: 'combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '50m',
  maxFiles: '14d',
  zippedArchive: true,
});

const transports: winston.transport[] = [
  errorFileTransport,
  combinedFileTransport,
];

if (env.NODE_ENV !== 'production') {
  transports.push(new winston.transports.Console({ format: consoleFormat }));
} else {
  transports.push(
    new winston.transports.Console({
      format: prodFormat,
      level: 'warn',
    }),
  );
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: prodFormat,
  transports,
  exitOnError: false,
});

// Convenience methods for domain-specific logging
export const logRequest = (method: string, url: string, statusCode: number, duration: number, userId?: string) => {
  logger.http('Request', {
    method,
    url,
    statusCode,
    duration: `${duration}ms`,
    userId: userId ?? 'anonymous',
  });
};

export const logError = (error: Error, context?: Record<string, unknown>) => {
  logger.error(error.message, {
    stack: error.stack,
    ...context,
  });
};

export const logAuth = (action: string, userId: string, meta?: Record<string, unknown>) => {
  logger.info(`Auth: ${action}`, { userId, ...meta });
};

export const logDB = (query: string, duration: number) => {
  logger.debug('DB Query', { query, duration: `${duration}ms` });
};

