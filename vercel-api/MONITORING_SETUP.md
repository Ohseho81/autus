# AUTUS Monitoring Infrastructure Setup

## Overview

The AUTUS vercel-api project now has a complete monitoring infrastructure with:

1. **Structured Logging** - JSON logs for production, colored console for development
2. **Error Tracking** - Sentry integration (optional) with fallback to console
3. **Performance Monitoring** - Transaction tracking for critical operations
4. **Request Tracing** - Request IDs in all API responses and logs

## Files Created

### Core Infrastructure

1. `/lib/monitoring.ts` - Sentry integration and request ID generation
2. `/lib/logger.ts` - Structured JSON logger with development/production modes
3. `/lib/api-utils.ts` - Updated with request ID tracking in all response helpers

### Documentation & Examples

4. `/lib/MONITORING_USAGE.md` - Comprehensive usage guide with examples
5. `/lib/MONITORING_EXAMPLE.ts` - Full example API route with monitoring
6. `MONITORING_SETUP.md` - This file (setup instructions)

## Quick Start

### 1. No Additional Setup Required (Basic Mode)

The monitoring infrastructure works out of the box without any additional dependencies:

```typescript
// Use the logger immediately
import logger from '@/lib/logger';

logger.info('Application started', { version: '1.0.0' });
```

All API responses now include:
- `X-Request-ID` header for request tracing
- `meta.requestId` in the JSON response body

### 2. Enable Sentry (Optional - Recommended for Production)

To enable full error tracking and performance monitoring:

```bash
cd /Users/oseho/Desktop/autus/vercel-api
npm install @sentry/nextjs
```

Set environment variables in `.env.local`:

```bash
# Sentry Configuration (Optional)
SENTRY_DSN=https://your-key@sentry.io/your-project-id

# Get your DSN from https://sentry.io/settings/projects/
```

That's it! The monitoring module will automatically detect and use Sentry when available.

## Environment Variables

### Required (Already Set)

```bash
NODE_ENV=development  # or production
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-anthropic-key
```

### Optional (Monitoring)

```bash
# Sentry Error Tracking (Optional)
SENTRY_DSN=https://your-key@sentry.io/project-id

# Show logs during tests (Optional)
LOG_IN_TESTS=true  # Set to see logs during test runs
```

## Integration Guide

### Step 1: Update Existing API Routes

Replace console.log/console.error with structured logging:

#### Before
```typescript
export async function POST(req: NextRequest) {
  try {
    console.log('Processing request...');
    const result = await doSomething();
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
  }
}
```

#### After
```typescript
import { generateRequestId } from '@/lib/monitoring';
import { successResponse, serverErrorResponse } from '@/lib/api-utils';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const reqLogger = logger.child({ requestId, path: '/api/example', method: 'POST' });

  try {
    reqLogger.info('Processing request');
    const result = await doSomething();
    reqLogger.info('Request completed successfully');
    return successResponse(result, 'Success', 200, requestId);
  } catch (error) {
    reqLogger.error('Request failed', error as Error);
    return serverErrorResponse(error, 'Example operation', requestId);
  }
}
```

### Step 2: Add Performance Tracking (Optional)

For critical operations, add performance tracking:

```typescript
import { startTransaction, endTransaction } from '@/lib/monitoring';

const transactionId = startTransaction('calculate-v-index', requestId);

try {
  const result = await calculateVIndex();
  await endTransaction(transactionId, { nodes: 48, success: true });
  return result;
} catch (error) {
  await endTransaction(transactionId, { error: true });
  throw error;
}
```

### Step 3: Use Reference Example

Copy the pattern from `/lib/MONITORING_EXAMPLE.ts` for a complete example.

## Testing the Setup

### 1. Test Basic Logging

Create a test file or use Node REPL:

```typescript
import logger from './lib/logger';

logger.info('Test message', { key: 'value' });
logger.error('Test error', new Error('This is a test'), { context: 'testing' });
```

### 2. Test API Endpoints

```bash
# Make a request to any API endpoint
curl -v http://localhost:3000/api/health

# Check for X-Request-ID header in response
# X-Request-ID: abc123xyz...
```

### 3. Check Logs

#### Development Mode
You should see colored output like:
```
[14:23:45] ✓ INFO : Test message
  Metadata:
    key: value
```

#### Production Mode
You should see JSON output like:
```json
{"timestamp":"2026-02-13T14:23:45.123Z","level":"info","message":"Test message","key":"value"}
```

## Migration Checklist

- [ ] Install `@sentry/nextjs` (optional)
- [ ] Set `SENTRY_DSN` environment variable (optional)
- [ ] Replace `console.log` with `logger.info`
- [ ] Replace `console.error` with `logger.error`
- [ ] Update API routes to use response helpers from `api-utils.ts`
- [ ] Add request ID generation to all routes
- [ ] Add performance tracking to critical operations
- [ ] Test in development mode
- [ ] Test in production mode
- [ ] Configure Sentry dashboard (if using Sentry)

## API Route Migration Priority

### High Priority (Critical Endpoints)
These routes should be migrated first:

1. `/api/autus/calculate/route.ts` - V-Index calculation
2. `/api/autus/value/route.ts` - Value operations
3. `/api/auth/verify/route.ts` - Authentication
4. `/api/brain/route.ts` - AI operations
5. `/api/sync/*/route.ts` - External syncs

### Medium Priority (Frequently Used)
6. `/api/goals/route.ts`
7. `/api/metrics/route.ts`
8. `/api/leaderboard/route.ts`
9. `/api/rewards/route.ts`
10. `/api/organisms/route.ts`

### Low Priority (Admin/Debug)
11. `/api/audit/*/route.ts`
12. `/api/webhook/*/route.ts`
13. Other utility endpoints

## Features

### Request Tracing
Every API response includes a unique `requestId` that can be used to:
- Track requests across logs
- Debug issues in production
- Correlate frontend errors with backend logs
- Search Sentry for specific requests

### Structured Logging
All logs include:
- Timestamp (ISO 8601)
- Log level (debug, info, warn, error)
- Message
- Request ID (when available)
- Custom metadata

### Error Context Enrichment
Errors captured to Sentry include:
- Request ID
- User context (if set)
- Custom tags
- Stack traces
- Environment info

### Performance Monitoring
Track operation duration:
- API endpoint response times
- Database query times
- External API calls
- Custom business logic

## Log Aggregation (Production)

The JSON log format is compatible with:

- **Vercel** - Built-in log aggregation
- **Datadog** - Install Datadog integration
- **New Relic** - Install New Relic integration
- **CloudWatch** - If deployed to AWS
- **Elasticsearch** - Via Logstash or Beats

Example Vercel CLI to view logs:
```bash
vercel logs --follow
```

## Sentry Dashboard Setup (Optional)

If you installed Sentry:

1. Go to https://sentry.io/
2. Create a new project (Next.js)
3. Copy the DSN to your `.env.local`
4. Deploy to production
5. View errors and performance in Sentry dashboard

Useful Sentry features:
- Error grouping and trends
- Performance transaction tracking
- Release tracking
- User feedback
- Alerts and notifications

## Best Practices

### 1. Always Include Request ID
```typescript
const requestId = generateRequestId();
return successResponse(data, message, 200, requestId);
```

### 2. Use Child Loggers for Context
```typescript
const reqLogger = logger.child({ requestId, userId: '123' });
reqLogger.info('User action'); // Includes requestId and userId
```

### 3. Log at Appropriate Levels
- `debug` - Detailed debugging (dev only)
- `info` - General information
- `warn` - Unexpected but handled
- `error` - Errors that need attention

### 4. Include Relevant Metadata
```typescript
logger.info('Payment processed', {
  userId: '123',
  amount: 1000,
  currency: 'USD',
  paymentMethod: 'card',
});
```

### 5. Track Performance for Slow Operations
```typescript
// Operations > 100ms should be tracked
const transactionId = startTransaction('complex-calculation');
// ... do work ...
await endTransaction(transactionId, { itemsProcessed: 1000 });
```

## Troubleshooting

### Logs Not Appearing

**Problem**: No logs in console
**Solution**: Check `NODE_ENV` - debug logs only appear in development

### Sentry Not Working

**Problem**: Errors not appearing in Sentry
**Solution**:
1. Verify `SENTRY_DSN` is set correctly
2. Check `@sentry/nextjs` is installed
3. Verify Sentry project settings
4. Check network connectivity

### Request IDs Missing

**Problem**: No `X-Request-ID` header
**Solution**: Make sure you're using response helpers from `api-utils.ts`:
```typescript
// ✓ Correct
return successResponse(data, message, 200, requestId);

// ✗ Incorrect
return NextResponse.json({ data });
```

### TypeScript Errors

**Problem**: Type errors with logger or monitoring
**Solution**: Ensure all imports are correct:
```typescript
import logger from '@/lib/logger';
import { generateRequestId, captureError } from '@/lib/monitoring';
```

## Next Steps

1. **Immediate**: Start using `logger` instead of `console.log`
2. **This Week**: Migrate high-priority API routes
3. **This Month**: Add performance tracking to slow operations
4. **Ongoing**: Review logs regularly, set up alerts in Sentry

## Support

For questions or issues:
1. Check `/lib/MONITORING_USAGE.md` for examples
2. Review `/lib/MONITORING_EXAMPLE.ts` for patterns
3. Consult Sentry documentation: https://docs.sentry.io/platforms/javascript/guides/nextjs/

## Summary

The monitoring infrastructure is now ready to use! Key benefits:

- **Better Debugging**: Request IDs trace requests through logs
- **Production Visibility**: Know what's happening in production
- **Performance Insights**: Track slow operations
- **Error Context**: Understand why errors happen
- **Zero Config**: Works immediately, Sentry optional
- **Future Proof**: Ready for log aggregation tools

Start using it today by replacing `console.log` with `logger.*` calls!
