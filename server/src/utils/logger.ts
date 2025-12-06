/**
 * Logger Configuration
 * Winston-based logger for MCP server
 * @module utils/logger
 */

import winston from 'winston';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(colors);

// Define custom format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}\n${stack}`;
    }
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  })
);

// Create logger instance
// IMPORTANT: Use stderr for console output to avoid interfering with MCP stdio protocol
const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports: [
    // Console transport - write to STDERR (not stdout) for MCP compatibility
    new winston.transports.Console({
      stderrLevels: ['error', 'warn', 'info', 'debug'], // All levels to stderr
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      ),
    }),
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: customFormat,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: customFormat,
    }),
  ],
});

export default logger;
