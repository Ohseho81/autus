// ============================================
// AUTUS Monitoring & Error Tracking
// Set SENTRY_DSN environment variable to activate
// ============================================

/**
 * Monitoring & Error Tracking
 * Set SENTRY_DSN environment variable to activate
 */

// ============================================
// Types
// ============================================

type SentryLevel = 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';

interface SentryInstance {
  captureException: (error: Error, context?: Record<string, unknown>) => string;
  captureMessage: (message: string, level?: SentryLevel) => string;
  setContext: (name: string, context: Record<string, unknown>) => void;
  setTag: (key: string, value: string) => void;
  setUser: (user: { id?: string; email?: string; username?: string }) => void;
}

// ============================================
// Sentry Dynamic Import
// ============================================

let sentryInstance: SentryInstance | null = null;
let sentryInitialized = false;

async function getSentry(): Promise<SentryInstance | null> {
  if (sentryInitialized) {
    return sentryInstance;
  }

  sentryInitialized = true;

  // Only initialize if DSN is configured
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Monitoring] Sentry not configured (SENTRY_DSN not set)');
    }
    return null;
  }

  try {
    // Dynamic import to avoid breaking if @sentry/nextjs is not installed
    const Sentry = await import('@sentry/nextjs');

    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      debug: process.env.NODE_ENV !== 'production',
      integrations: [
        // Add integrations as needed when @sentry/nextjs is installed
      ],
    });

    sentryInstance = Sentry as unknown as SentryInstance;
    console.log('[Monitoring] Sentry initialized successfully');
    return sentryInstance;
  } catch (error) {
    console.warn('[Monitoring] Sentry package not found - falling back to console logging');
    return null;
  }
}

// ============================================
// Request ID Generator
// ============================================

/**
 * Generate a unique request ID using crypto
 * Falls back to timestamp-based ID if crypto is unavailable
 */
export function generateRequestId(): string {
  try {
    // Try using crypto for better uniqueness
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    // Fallback to custom nanoid-like implementation
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let id = '';
    for (let i = 0; i < 21; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  } catch {
    // Ultimate fallback
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

// ============================================
// Error Capture
// ============================================

/**
 * Lightweight error reporter - sends to Sentry when configured, console.error as fallback
 */
export async function captureError(
  error: Error,
  context?: Record<string, unknown>
): Promise<void> {
  const sentry = await getSentry();

  if (sentry) {
    try {
      // Add context if provided
      if (context) {
        sentry.setContext('error_context', context);
      }

      sentry.captureException(error, context);
    } catch (sentryError) {
      console.error('[Monitoring] Failed to send error to Sentry:', sentryError);
    }
  }

  // Always log to console as fallback
  console.error('[AUTUS Error]', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  });
}

// ============================================
// Message Capture
// ============================================

/**
 * Capture a message for monitoring
 */
export async function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, unknown>
): Promise<void> {
  const sentry = await getSentry();

  if (sentry) {
    try {
      if (context) {
        sentry.setContext('message_context', context);
      }

      sentry.captureMessage(message, level as SentryLevel);
    } catch (sentryError) {
      console.error('[Monitoring] Failed to send message to Sentry:', sentryError);
    }
  }

  // Always log to console
  const logLevel = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info';
  console[logLevel]('[AUTUS Message]', {
    message,
    level,
    context,
    timestamp: new Date().toISOString(),
  });
}

// ============================================
// Performance Tracking
// ============================================

interface Transaction {
  name: string;
  startTime: number;
  requestId?: string;
}

const activeTransactions = new Map<string, Transaction>();

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, requestId?: string): string {
  const transactionId = generateRequestId();

  activeTransactions.set(transactionId, {
    name,
    startTime: Date.now(),
    requestId,
  });

  return transactionId;
}

/**
 * End a performance transaction and report it
 */
export async function endTransaction(
  transactionId: string,
  data?: Record<string, unknown>
): Promise<void> {
  const transaction = activeTransactions.get(transactionId);
  if (!transaction) {
    console.warn('[Monitoring] Transaction not found:', transactionId);
    return;
  }

  const duration = Date.now() - transaction.startTime;
  activeTransactions.delete(transactionId);

  // Log performance data
  console.info('[AUTUS Performance]', {
    name: transaction.name,
    duration,
    requestId: transaction.requestId,
    data,
    timestamp: new Date().toISOString(),
  });

  // Send to Sentry if available
  const sentry = await getSentry();
  if (sentry) {
    try {
      sentry.setContext('performance', {
        name: transaction.name,
        duration,
        requestId: transaction.requestId,
        ...data,
      });
    } catch (error) {
      console.warn('[Monitoring] Failed to report performance to Sentry:', error);
    }
  }
}

// ============================================
// Context Enrichment
// ============================================

/**
 * Set user context for error tracking
 */
export async function setUserContext(user: {
  id?: string;
  email?: string;
  username?: string;
}): Promise<void> {
  const sentry = await getSentry();
  if (sentry) {
    try {
      sentry.setUser(user);
    } catch (error) {
      console.warn('[Monitoring] Failed to set user context:', error);
    }
  }
}

/**
 * Set custom tag for filtering in Sentry
 */
export async function setTag(key: string, value: string): Promise<void> {
  const sentry = await getSentry();
  if (sentry) {
    try {
      sentry.setTag(key, value);
    } catch (error) {
      console.warn('[Monitoring] Failed to set tag:', error);
    }
  }
}

// ============================================
// Exports
// ============================================

export default {
  captureError,
  captureMessage,
  generateRequestId,
  startTransaction,
  endTransaction,
  setUserContext,
  setTag,
};
