# AUTUS Monitoring Quick Reference

**TL;DR**: Replace `console.log` with `logger.*`, add request IDs to API routes.

---

## Quick Start (Copy & Paste)

### Basic API Route Template

```typescript
import { NextRequest } from 'next/server';
import { generateRequestId, startTransaction, endTransaction } from '@/lib/monitoring';
import { successResponse, serverErrorResponse } from '@/lib/api-utils';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const transactionId = startTransaction('api-your-endpoint', requestId);
  const reqLogger = logger.child({ requestId, path: '/api/your-endpoint' });

  try {
    reqLogger.info('Request received');
    const body = await req.json();

    // Your business logic here
    const result = await yourBusinessLogic(body, reqLogger);

    await endTransaction(transactionId, { success: true });
    reqLogger.info('Request completed');
    return successResponse(result, 'Success', 200, requestId);

  } catch (error) {
    await endTransaction(transactionId, { error: true });
    reqLogger.error('Request failed', error as Error);
    return serverErrorResponse(error, 'Your endpoint', requestId);
  }
}
```

---

## Common Imports

```typescript
// Logging
import logger from '@/lib/logger';

// Monitoring
import {
  generateRequestId,
  captureError,
  startTransaction,
  endTransaction
} from '@/lib/monitoring';

// API Responses
import {
  successResponse,
  errorResponse,
  serverErrorResponse
} from '@/lib/api-utils';
```

---

## Logger Methods

```typescript
// Info (general)
logger.info('User logged in', { userId: '123' });

// Warning (unexpected but handled)
logger.warn('Rate limit approaching', { remaining: 10 });

// Error (needs attention)
logger.error('Database connection failed', error, { db: 'postgres' });

// Debug (dev only)
logger.debug('Cache hit', { key: 'user:123' });

// HTTP Request
logger.httpRequest('POST', '/api/events', 201, 150, { userId: '123' });

// Database Query
logger.dbQuery('SELECT * FROM users WHERE id = $1', 45, { userId: '123' });

// External API Call
logger.apiCall('Stripe', '/charges', 200, 320, { amount: 1000 });

// Child Logger (with common metadata)
const reqLogger = logger.child({ requestId, userId: '123' });
reqLogger.info('Action performed'); // Includes requestId and userId
```

---

## Response Helpers

```typescript
// Success (200)
return successResponse(data, 'Operation successful', 200, requestId);

// Created (201)
return successResponse(data, 'Resource created', 201, requestId);

// Bad Request (400)
return errorResponse('Invalid input', 400, undefined, requestId);

// Unauthorized (401)
return unauthorizedResponse('Invalid token', requestId);

// Not Found (404)
return notFoundResponse('User', requestId);

// Validation Error (422)
return validationErrorResponse({ email: 'Invalid format' }, requestId);

// Server Error (500)
return serverErrorResponse(error, 'Operation name', requestId);
```

---

## Performance Tracking

```typescript
// Start tracking
const transactionId = startTransaction('calculate-v-index', requestId);

try {
  const result = await expensiveOperation();

  // End with success metrics
  await endTransaction(transactionId, {
    nodes: 48,
    duration: 250,
    success: true
  });

  return result;
} catch (error) {
  // End with error
  await endTransaction(transactionId, { error: true });
  throw error;
}
```

---

## Error Tracking

```typescript
try {
  await riskyOperation();
} catch (error) {
  // Capture with context
  await captureError(error as Error, {
    requestId,
    userId: '123',
    operation: 'riskyOperation',
    context: 'payment-processing'
  });

  throw error;
}
```

---

## Request ID Flow

```typescript
// 1. Generate at start of request
const requestId = generateRequestId();

// 2. Create logger with requestId
const reqLogger = logger.child({ requestId });

// 3. Use in all logs
reqLogger.info('Processing request');

// 4. Include in response
return successResponse(data, 'Success', 200, requestId);
// Response includes: X-Request-ID header + meta.requestId in body
```

---

## Migration Patterns

### Before
```typescript
console.log('User login:', userId);
console.error('Error:', error);
return NextResponse.json({ success: true, data });
```

### After
```typescript
logger.info('User login', { userId });
logger.error('Login failed', error, { userId });
return successResponse(data, 'Success', 200, requestId);
```

---

## Environment Variables

```bash
# Optional - only needed for Sentry
SENTRY_DSN=https://your-key@sentry.io/project-id
```

---

## Installation (Optional)

```bash
# Install Sentry (optional - monitoring works without it)
npm install @sentry/nextjs

# Set DSN in .env.local
echo "SENTRY_DSN=your-dsn-here" >> .env.local
```

---

## Log Levels

- `debug` - Detailed debugging (dev only, hidden in production)
- `info` - General information (always shown)
- `warn` - Warning conditions (always shown)
- `error` - Error conditions (always shown)

---

## Best Practices

1. **Always include requestId in responses**
   ```typescript
   return successResponse(data, message, 200, requestId);
   ```

2. **Use child loggers for context**
   ```typescript
   const reqLogger = logger.child({ requestId, userId });
   ```

3. **Log at appropriate levels**
   - Use `info` for normal operations
   - Use `warn` for recoverable issues
   - Use `error` for failures

4. **Include relevant metadata**
   ```typescript
   logger.info('Payment processed', { userId, amount, method });
   ```

5. **Track slow operations**
   ```typescript
   // Track anything > 100ms
   const txId = startTransaction('slow-operation');
   await slowOp();
   await endTransaction(txId);
   ```

---

## Common Mistakes

### ❌ Don't
```typescript
console.log('User:', user);
console.error(error);
return NextResponse.json({ data });
```

### ✅ Do
```typescript
logger.info('User action', { userId: user.id });
logger.error('Operation failed', error, { userId: user.id });
return successResponse(data, 'Success', 200, requestId);
```

---

## File Locations

- Logger: `/lib/logger.ts`
- Monitoring: `/lib/monitoring.ts`
- API Utils: `/lib/api-utils.ts`
- Full docs: `/lib/MONITORING_USAGE.md`
- Examples: `/lib/MONITORING_EXAMPLE.ts`

---

## Support

Questions? Check:
1. `/lib/MONITORING_USAGE.md` - Detailed usage guide
2. `/lib/MONITORING_EXAMPLE.ts` - Working examples
3. `/MONITORING_SETUP.md` - Setup instructions

---

**Pro Tip**: Start with just replacing `console.log` → `logger.info`. Add request IDs and performance tracking later.
