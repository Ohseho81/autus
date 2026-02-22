# AUTUS Monitoring Infrastructure Usage Guide

This guide explains how to use the monitoring and logging infrastructure in the AUTUS vercel-api project.

## Overview

The monitoring infrastructure consists of three main components:

1. **monitoring.ts** - Sentry integration for error tracking and performance monitoring
2. **logger.ts** - Structured JSON logger for development and production
3. **api-utils.ts** - Updated with request ID tracking in all responses

## Installation (Optional)

The monitoring module works without any additional dependencies. To enable Sentry integration:

```bash
npm install @sentry/nextjs
```

Set the `SENTRY_DSN` environment variable:

```bash
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

## Usage Examples

### 1. Basic Logging

```typescript
import logger from '@/lib/logger';

// Info logging
logger.info('User logged in successfully', { userId: '123', email: 'user@example.com' });

// Warning logging
logger.warn('Rate limit approaching', { remaining: 5, limit: 100 });

// Error logging
logger.error('Database connection failed', error, { database: 'postgres', host: 'localhost' });

// Debug logging (only in development)
logger.debug('Cache miss', { key: 'user:123', ttl: 300 });
```

### 2. HTTP Request Logging

```typescript
import logger from '@/lib/logger';

// Log API requests
logger.httpRequest('POST', '/api/events', 200, 150, { requestId: 'req_abc123' });
// Output: POST /api/events 200 (150ms)

// Log slow requests
logger.httpRequest('GET', '/api/calculations', 201, 5000, {
  requestId: 'req_xyz789',
  warning: 'Slow request'
});
```

### 3. Child Loggers (with common metadata)

```typescript
import logger from '@/lib/logger';

// Create a logger with default metadata
const userLogger = logger.child({ userId: '123', sessionId: 'sess_abc' });

// All logs will include userId and sessionId
userLogger.info('Profile updated');
userLogger.warn('Invalid input', { field: 'email' });
```

### 4. Error Tracking with Sentry

```typescript
import { captureError, captureMessage } from '@/lib/monitoring';

// Capture errors
try {
  await riskyOperation();
} catch (error) {
  await captureError(error as Error, {
    userId: '123',
    operation: 'riskyOperation',
    context: 'payment-processing'
  });
}

// Capture messages
await captureMessage('Payment gateway timeout', 'warning', {
  gateway: 'stripe',
  amount: 1000
});
```

### 5. Performance Tracking

```typescript
import { startTransaction, endTransaction } from '@/lib/monitoring';

// Start tracking
const transactionId = startTransaction('calculate-v-index', requestId);

try {
  await calculateVIndex();
  await endTransaction(transactionId, { nodes: 48, duration: 250 });
} catch (error) {
  await endTransaction(transactionId, { error: true });
  throw error;
}
```

### 6. API Route with Full Monitoring

```typescript
import { NextRequest } from 'next/server';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-utils';
import { generateRequestId, startTransaction, endTransaction, captureError } from '@/lib/monitoring';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const transactionId = startTransaction('api-event-create', requestId);
  const startTime = Date.now();

  try {
    logger.info('Event creation request received', { requestId });

    const body = await req.json();

    // Validate input
    if (!body.eventType) {
      logger.warn('Missing eventType in request', { requestId, body });
      return errorResponse('eventType is required', 400, undefined, requestId);
    }

    // Process event
    const result = await createEvent(body);

    const duration = Date.now() - startTime;
    await endTransaction(transactionId, { eventId: result.id, duration });

    logger.httpRequest('POST', '/api/events', 200, duration, { requestId, eventId: result.id });

    return successResponse(result, 'Event created successfully', 201, requestId);

  } catch (error) {
    const duration = Date.now() - startTime;

    await captureError(error as Error, {
      requestId,
      path: '/api/events',
      method: 'POST'
    });

    logger.error('Event creation failed', error as Error, { requestId });
    logger.httpRequest('POST', '/api/events', 500, duration, { requestId, error: true });

    await endTransaction(transactionId, { error: true, duration });

    return serverErrorResponse(error, 'Event creation', requestId);
  }
}
```

### 7. Database Query Logging

```typescript
import logger from '@/lib/logger';

async function queryUsers(orgId: string) {
  const start = Date.now();

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('org_id', orgId);

    const duration = Date.now() - start;
    logger.dbQuery('SELECT * FROM users WHERE org_id = $1', duration, {
      orgId,
      rowCount: data?.length || 0
    });

    return data;
  } catch (error) {
    logger.error('Database query failed', error as Error, { query: 'queryUsers', orgId });
    throw error;
  }
}
```

### 8. External API Call Logging

```typescript
import logger from '@/lib/logger';

async function callClaudeAPI(prompt: string) {
  const start = Date.now();

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      },
      body: JSON.stringify({ prompt }),
    });

    const duration = Date.now() - start;
    logger.apiCall('Claude', '/v1/messages', response.status, duration, {
      promptLength: prompt.length
    });

    return await response.json();
  } catch (error) {
    logger.error('Claude API call failed', error as Error, { service: 'Claude' });
    throw error;
  }
}
```

## Environment Variables

### Development
```bash
NODE_ENV=development
# Sentry is optional
SENTRY_DSN=https://your-dsn@sentry.io/project
```

### Production
```bash
NODE_ENV=production
# Highly recommended for production
SENTRY_DSN=https://your-dsn@sentry.io/project
```

### Test
```bash
NODE_ENV=test
# Logs are suppressed by default in tests
LOG_IN_TESTS=true  # Set this to see logs during tests
```

## Log Output Format

### Development (Colored Console)
```
[14:23:45] ✓ INFO : User logged in successfully
  Request ID: req_abc123xyz
  Metadata:
    userId: 123
    email: user@example.com
```

### Production (JSON)
```json
{"timestamp":"2026-02-13T14:23:45.123Z","level":"info","message":"User logged in successfully","requestId":"req_abc123xyz","userId":"123","email":"user@example.com"}
```

## Best Practices

1. **Always include requestId** in API responses and logs for traceability
2. **Use child loggers** for operations with common metadata
3. **Capture errors** with context for better debugging
4. **Track performance** for critical operations (DB queries, API calls, calculations)
5. **Log at appropriate levels**:
   - `debug` - Detailed debugging info (dev only)
   - `info` - General informational messages
   - `warn` - Warning conditions that should be reviewed
   - `error` - Error conditions that need attention
6. **Include relevant metadata** in logs for filtering and searching
7. **Use structured logging** - pass objects instead of string concatenation

## Migration from Old Logging

### Before
```typescript
console.log('User login:', userId);
console.error('Error:', error);
```

### After
```typescript
import logger from '@/lib/logger';

logger.info('User login', { userId });
logger.error('Login failed', error, { userId });
```

## Request ID Flow

```
Client Request
    ↓
API Route Handler (generates requestId)
    ↓
All logs include requestId
    ↓
Response includes X-Request-ID header
    ↓
Client can track request through logs
```

## Sentry Context Enrichment

```typescript
import { setUserContext, setTag } from '@/lib/monitoring';

// Set user context (persists across errors)
await setUserContext({
  id: '123',
  email: 'user@example.com',
  username: 'johndoe'
});

// Set custom tags for filtering
await setTag('environment', 'production');
await setTag('version', 'v1.0.0');
await setTag('orgId', 'org_abc123');
```

## Next Steps

1. Install `@sentry/nextjs` if you want error tracking
2. Set `SENTRY_DSN` environment variable
3. Replace existing `console.log` calls with `logger.*` calls
4. Add request ID tracking to all API routes
5. Add performance tracking to critical operations
6. Set up Sentry dashboard for monitoring

## Troubleshooting

### Logs not appearing in development
- Check `NODE_ENV` is set to `development` or not set
- Debug logs only appear in development mode

### Sentry not capturing errors
- Verify `SENTRY_DSN` is set correctly
- Check Sentry project settings
- Ensure `@sentry/nextjs` is installed

### Request IDs not in responses
- Verify you're using the updated response helpers from `api-utils.ts`
- Check that `X-Request-ID` header is present in network tab
