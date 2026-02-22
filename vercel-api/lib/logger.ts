// ============================================
// AUTUS Structured JSON Logger
// Development: colored console output
// Production: JSON format for log aggregation
// ============================================

/**
 * Structured JSON Logger for production
 * Development: colored console output
 * Production: JSON format for log aggregation
 */

// ============================================
// Types
// ============================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  [key: string]: unknown;
}

// ============================================
// Environment Detection
// ============================================

const isDevelopment = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';

// ============================================
// Color Codes (for development)
// ============================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

// ============================================
// Level Styling
// ============================================

const levelStyles = {
  debug: { color: colors.dim + colors.cyan, emoji: '🔍', label: 'DEBUG' },
  info: { color: colors.green, emoji: '✓', label: 'INFO ' },
  warn: { color: colors.yellow, emoji: '⚠️', label: 'WARN ' },
  error: { color: colors.red, emoji: '✗', label: 'ERROR' },
};

// ============================================
// Core Logging Function
// ============================================

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  // Skip debug logs in production
  if (level === 'debug' && !isDevelopment) {
    return;
  }

  // Skip all logs in test unless explicitly needed
  if (isTest && !process.env.LOG_IN_TESTS) {
    return;
  }

  const timestamp = new Date().toISOString();
  const logEntry: LogEntry = {
    timestamp,
    level,
    message,
    ...meta,
  };

  if (isDevelopment) {
    // Development: Colored console output
    formatDevelopmentLog(level, message, logEntry);
  } else {
    // Production: JSON one-liner for log aggregation
    formatProductionLog(logEntry);
  }
}

// ============================================
// Development Formatter
// ============================================

function formatDevelopmentLog(
  level: LogLevel,
  message: string,
  entry: LogEntry
): void {
  const style = levelStyles[level];
  const { timestamp, requestId, ...rest } = entry;

  // Format: [TIME] EMOJI LEVEL: Message
  const timeStr = new Date(timestamp).toLocaleTimeString('en-US', { hour12: false });
  const prefix = `${colors.dim}[${timeStr}]${colors.reset} ${style.emoji} ${style.color}${style.label}${colors.reset}`;

  // Main log line
  console.log(`${prefix}: ${message}`);

  // Request ID if present
  if (requestId) {
    console.log(`  ${colors.dim}Request ID: ${requestId}${colors.reset}`);
  }

  // Additional metadata
  const metaKeys = Object.keys(rest).filter(k => k !== 'level' && k !== 'message');
  if (metaKeys.length > 0) {
    console.log(`  ${colors.dim}Metadata:${colors.reset}`);
    metaKeys.forEach(key => {
      const value = rest[key];
      const valueStr = typeof value === 'object'
        ? JSON.stringify(value, null, 2).split('\n').join('\n    ')
        : String(value);
      console.log(`    ${colors.cyan}${key}:${colors.reset} ${valueStr}`);
    });
  }
}

// ============================================
// Production Formatter
// ============================================

function formatProductionLog(entry: LogEntry): void {
  // Production: Single-line JSON for log aggregation tools
  const logLine = JSON.stringify(entry);

  switch (entry.level) {
    case 'error':
      console.error(logLine);
      break;
    case 'warn':
      console.warn(logLine);
      break;
    case 'debug':
      console.debug(logLine);
      break;
    default:
      console.log(logLine);
  }
}

// ============================================
// Logger Interface
// ============================================

const logger = {
  /**
   * Debug level - only shown in development
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    log('debug', message, meta);
  },

  /**
   * Info level - general information
   */
  info(message: string, meta?: Record<string, unknown>): void {
    log('info', message, meta);
  },

  /**
   * Warning level - something unexpected but not critical
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    log('warn', message, meta);
  },

  /**
   * Error level - something went wrong
   */
  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    const errorMeta = error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...meta,
    } : meta;

    log('error', message, errorMeta);
  },

  /**
   * Create a child logger with common metadata
   */
  child(defaultMeta: Record<string, unknown>) {
    return {
      debug: (message: string, meta?: Record<string, unknown>) =>
        logger.debug(message, { ...defaultMeta, ...meta }),
      info: (message: string, meta?: Record<string, unknown>) =>
        logger.info(message, { ...defaultMeta, ...meta }),
      warn: (message: string, meta?: Record<string, unknown>) =>
        logger.warn(message, { ...defaultMeta, ...meta }),
      error: (message: string, error?: Error, meta?: Record<string, unknown>) =>
        logger.error(message, error, { ...defaultMeta, ...meta }),
    };
  },

  /**
   * Log HTTP request
   */
  httpRequest(
    method: string,
    path: string,
    statusCode: number,
    duration?: number,
    meta?: Record<string, unknown>
  ): void {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    const message = `${method} ${path} ${statusCode}`;

    log(level, message, {
      http: {
        method,
        path,
        statusCode,
        duration,
      },
      ...meta,
    });
  },

  /**
   * Log database query
   */
  dbQuery(
    query: string,
    duration?: number,
    meta?: Record<string, unknown>
  ): void {
    log('debug', 'Database query executed', {
      db: {
        query: query.substring(0, 200), // Truncate long queries
        duration,
      },
      ...meta,
    });
  },

  /**
   * Log external API call
   */
  apiCall(
    service: string,
    endpoint: string,
    statusCode?: number,
    duration?: number,
    meta?: Record<string, unknown>
  ): void {
    const level: LogLevel = statusCode && statusCode >= 400 ? 'warn' : 'info';
    const message = `External API call: ${service} - ${endpoint}`;

    log(level, message, {
      api: {
        service,
        endpoint,
        statusCode,
        duration,
      },
      ...meta,
    });
  },
};

// ============================================
// Exports
// ============================================

export { logger };
export default logger;
