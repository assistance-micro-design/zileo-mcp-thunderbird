/**
 * Logger Configuration
 * Winston-based logger for MCP server
 * @module utils/logger
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import winston from "winston";

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

// Define log colors
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  debug: "blue",
};

// Add colors to winston
winston.addColors(colors);

/**
 * Fields managed by winston itself (or by our printf template) that must not
 * be re-serialized as structured metadata.
 */
const RESERVED_FIELDS = new Set(["timestamp", "level", "message", "stack"]);

/**
 * Serializes the structured metadata of a log entry for the printf format.
 * Without this, calls like logger.error("msg", { error }) silently drop
 * the metadata object. Returns an empty string when there is none.
 *
 * @param meta - The metadata properties attached to the log entry
 * @returns A " key=value"-style JSON suffix, or "" when empty/unserializable
 */
export function serializeLogMeta(meta: Record<string, unknown>): string {
  const entries = Object.entries(meta).filter(
    ([key]) => !RESERVED_FIELDS.has(key),
  );
  if (entries.length === 0) {
    return "";
  }
  try {
    return ` ${JSON.stringify(Object.fromEntries(entries))}`;
  } catch {
    // Circular or otherwise unserializable metadata - never break logging
    return " [unserializable metadata]";
  }
}

// Define custom format
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, stack } = info;
    const meta = serializeLogMeta(info as Record<string, unknown>);
    if (stack) {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}${meta}\n${stack}`;
    }
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${meta}`;
  }),
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolves the log directory:
 * - LOG_DIR environment variable when set,
 * - otherwise an absolute "logs/" directory anchored to the package
 *   (module location, independent of the process working directory).
 */
function resolveLogDir(): string {
  if (process.env.LOG_DIR) {
    return path.resolve(process.env.LOG_DIR);
  }
  // utils/ -> src|dist -> server/logs
  return path.resolve(__dirname, "../..", "logs");
}

/**
 * Builds the file transports for the resolved log directory.
 * If the directory cannot be created or written to (read-only container,
 * restricted user), file logging is disabled instead of crashing at startup.
 */
function buildFileTransports(): winston.transport[] {
  const logDir = resolveLogDir();
  try {
    fs.mkdirSync(logDir, { recursive: true });
    fs.accessSync(logDir, fs.constants.W_OK);
  } catch {
    // stderr-only logging; can't use the logger being constructed here,
    // and stdout is reserved for the MCP stdio protocol.
    process.stderr.write(
      `[logger] Log directory not writable, file logging disabled: ${logDir}\n`,
    );
    return [];
  }

  return [
    // File transport for errors (SEC-REVIEW-011: rotation enabled)
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      format: customFormat,
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
    }),
    // File transport for all logs (SEC-REVIEW-011: rotation enabled)
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      format: customFormat,
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
    }),
  ];
}

// Create logger instance
// IMPORTANT: Use stderr for console output to avoid interfering with MCP stdio protocol
const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || "info",
  format: customFormat,
  transports: [
    // Console transport - write to STDERR (not stdout) for MCP compatibility
    new winston.transports.Console({
      stderrLevels: ["error", "warn", "info", "debug"], // All levels to stderr
      format: winston.format.combine(winston.format.colorize(), customFormat),
    }),
    ...buildFileTransports(),
  ],
});

export default logger;
