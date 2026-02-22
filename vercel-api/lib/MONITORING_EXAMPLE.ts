// ============================================
// AUTUS Monitoring Example
// Example API route demonstrating full monitoring integration
// ============================================

/**
 * This is an example of how to use the monitoring infrastructure
 * in an API route. Copy this pattern for your own routes.
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, serverErrorResponse } from './api-utils';
import { generateRequestId, startTransaction, endTransaction, captureError, setTag } from './monitoring';
import logger from './logger';

// ============================================
// Example: Event Creation API
// ============================================

/**
 * POST /api/events
 * Create a new event with full monitoring
 */
export async function POST(req: NextRequest) {
  // 1. Generate request ID for tracing
  const requestId = generateRequestId();

  // 2. Start performance tracking
  const transactionId = startTransaction('api-event-create', requestId);
  const startTime = Date.now();

  // 3. Create request-scoped logger
  const reqLogger = logger.child({ requestId, path: '/api/events', method: 'POST' });

  reqLogger.info('Event creation request received');

  try {
    // 4. Parse and validate request
    const body = await req.json();
    reqLogger.debug('Request body parsed', { bodyKeys: Object.keys(body) });

    if (!body.eventType) {
      reqLogger.warn('Missing eventType in request', { body });

      // End transaction with validation error
      await endTransaction(transactionId, { error: 'validation', duration: Date.now() - startTime });

      return errorResponse('eventType is required', 400, undefined, requestId);
    }

    // 5. Set monitoring context
    await setTag('event_type', body.eventType);

    // 6. Perform business logic (simulated)
    reqLogger.info('Creating event', { eventType: body.eventType });

    const event = await createEvent(body, reqLogger);

    // 7. Track success metrics
    const duration = Date.now() - startTime;
    await endTransaction(transactionId, {
      eventId: event.id,
      eventType: body.eventType,
      duration,
      success: true,
    });

    // 8. Log successful request
    reqLogger.httpRequest('POST', '/api/events', 201, duration, {
      eventId: event.id,
    });

    reqLogger.info('Event created successfully', {
      eventId: event.id,
      eventType: body.eventType,
    });

    // 9. Return success response with request ID
    return successResponse(event, 'Event created successfully', 201, requestId);

  } catch (error) {
    const duration = Date.now() - startTime;

    // 10. Capture error with context
    await captureError(error as Error, {
      requestId,
      path: '/api/events',
      method: 'POST',
      duration,
    });

    // 11. Log error
    reqLogger.error('Event creation failed', error as Error);

    // 12. Track failed request
    reqLogger.httpRequest('POST', '/api/events', 500, duration, {
      error: true,
      errorMessage: (error as Error).message,
    });

    await endTransaction(transactionId, {
      error: true,
      errorMessage: (error as Error).message,
      duration,
    });

    // 13. Return error response
    return serverErrorResponse(error, 'Event creation', requestId);
  }
}

// ============================================
// Example: Get Events API
// ============================================

/**
 * GET /api/events
 * Get events with pagination and caching
 */
export async function GET(req: NextRequest) {
  const requestId = generateRequestId();
  const transactionId = startTransaction('api-events-list', requestId);
  const startTime = Date.now();

  const reqLogger = logger.child({ requestId, path: '/api/events', method: 'GET' });

  try {
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    reqLogger.info('Fetching events', { page, limit });

    // Simulate database query
    const events = await fetchEvents(page, limit, reqLogger);

    const duration = Date.now() - startTime;
    await endTransaction(transactionId, {
      count: events.length,
      page,
      limit,
      duration,
    });

    reqLogger.httpRequest('GET', '/api/events', 200, duration, {
      count: events.length,
      page,
    });

    return successResponse({ events, page, limit }, undefined, 200, requestId);

  } catch (error) {
    const duration = Date.now() - startTime;

    await captureError(error as Error, {
      requestId,
      path: '/api/events',
      method: 'GET',
    });

    reqLogger.error('Failed to fetch events', error as Error);
    reqLogger.httpRequest('GET', '/api/events', 500, duration, { error: true });

    await endTransaction(transactionId, { error: true, duration });

    return serverErrorResponse(error, 'Fetch events', requestId);
  }
}

// ============================================
// Helper Functions (Simulated)
// ============================================

interface Event {
  id: string;
  eventType: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * Simulate event creation with database and external API calls
 */
async function createEvent(
  data: { eventType: string; metadata?: Record<string, any> },
  logger: ReturnType<typeof import('./logger').default.child>
): Promise<Event> {
  // Simulate database insert
  const dbStart = Date.now();
  logger.debug('Inserting event into database', { eventType: data.eventType });

  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 50));

  const dbDuration = Date.now() - dbStart;
  logger.dbQuery('INSERT INTO events (event_type, metadata) VALUES ($1, $2)', dbDuration, {
    eventType: data.eventType,
  });

  const event: Event = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    eventType: data.eventType,
    timestamp: new Date().toISOString(),
    metadata: data.metadata,
  };

  // Simulate external API call (e.g., analytics service)
  const apiStart = Date.now();
  logger.debug('Sending to analytics service', { eventId: event.id });

  await new Promise(resolve => setTimeout(resolve, 30));

  const apiDuration = Date.now() - apiStart;
  logger.apiCall('Analytics', '/events', 201, apiDuration, {
    eventId: event.id,
  });

  return event;
}

/**
 * Simulate fetching events from database
 */
async function fetchEvents(
  page: number,
  limit: number,
  logger: ReturnType<typeof import('./logger').default.child>
): Promise<Event[]> {
  const dbStart = Date.now();
  logger.debug('Querying events from database', { page, limit });

  // Simulate database query
  await new Promise(resolve => setTimeout(resolve, 40));

  const dbDuration = Date.now() - dbStart;
  logger.dbQuery(
    'SELECT * FROM events ORDER BY timestamp DESC LIMIT $1 OFFSET $2',
    dbDuration,
    { limit, offset: (page - 1) * limit }
  );

  // Return mock data
  return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
    id: `evt_${Date.now()}_${i}`,
    eventType: 'test_event',
    timestamp: new Date().toISOString(),
  }));
}

// ============================================
// Usage in Next.js App Router
// ============================================

/**
 * To use this in your app/api/events/route.ts:
 *
 * import { POST, GET } from '@/lib/MONITORING_EXAMPLE';
 * export { POST, GET };
 *
 * Or copy the pattern and adapt to your needs.
 */
