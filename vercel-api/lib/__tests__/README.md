# AUTUS API Test Infrastructure

## Overview

Test infrastructure for the AUTUS vercel-api project using Vitest.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run tests:
```bash
npm test                # Watch mode
npm run test:run        # Run once
npm run test:coverage   # With coverage report
```

## Test Utilities

### Mock Supabase Client

```typescript
import { createMockSupabaseClient } from '@/lib/__tests__/test-utils';

const mockData = {
  nodes: [{ node_id: 'node-1', name: 'Test Node' }],
  edges: [{ edge_id: 'edge-1', source: 'node-1', target: 'node-2' }],
};

const supabase = createMockSupabaseClient(mockData);

// Simulates error
const errorClient = createMockSupabaseClient({}, {
  shouldError: true,
  errorMessage: 'Connection failed'
});
```

### Mock NextRequest

```typescript
import { createMockNextRequest } from '@/lib/__tests__/test-utils';

const request = createMockNextRequest('/api/v1/health', {
  method: 'GET',
  headers: { 'x-api-key': 'test-key' },
  searchParams: { org_id: 'test-org' },
});
```

### Parse NextResponse

```typescript
import { parseNextResponse } from '@/lib/__tests__/test-utils';

const response = await GET(request);
const parsed = await parseNextResponse(response);

expect(parsed.status).toBe(200);
expect(parsed.data.success).toBe(true);
expect(parsed.headers['access-control-allow-origin']).toBe('*');
```

### Mock Environment Variables

```typescript
import { mockEnvVars } from '@/lib/__tests__/test-utils';

const cleanup = mockEnvVars({
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'test-key',
});

// Run tests

cleanup(); // Restore original values
```

## Test Structure

```
lib/__tests__/
  test-utils.ts           # Shared test utilities
  api-utils.test.ts       # Tests for API utilities
  README.md               # This file

app/api/v1/[endpoint]/__tests__/
  route.test.ts           # Tests for specific endpoint
```

## Writing Tests

### Example Test

```typescript
import { describe, it, expect } from 'vitest';
import { GET } from '../route';
import { createMockNextRequest, parseNextResponse } from '@/lib/__tests__/test-utils';

describe('My API Endpoint', () => {
  it('should return success response', async () => {
    const request = createMockNextRequest('/api/v1/my-endpoint');
    const response = await GET(request);
    const parsed = await parseNextResponse(response);

    expect(parsed.status).toBe(200);
    expect(parsed.data.success).toBe(true);
  });
});
```

### Testing with Mock Data

```typescript
import { MOCK_ORG_ID, MOCK_USER, MOCK_NODE } from '@/lib/__tests__/test-utils';

it('should create a node', async () => {
  const request = createMockNextRequest('/api/v1/nodes', {
    method: 'POST',
    body: {
      ...MOCK_NODE,
      org_id: MOCK_ORG_ID,
    },
  });

  const response = await POST(request);
  // assertions...
});
```

## Coverage

Run coverage report:
```bash
npm run test:coverage
```

Coverage files are generated in `coverage/` directory.

## Best Practices

1. **Mock External Dependencies**: Always mock Supabase, Anthropic, and other external services
2. **Test Edge Cases**: Test error handling, validation failures, missing parameters
3. **Use Fixtures**: Use shared fixtures from test-utils.ts for consistency
4. **Clean State**: Each test should be independent and not rely on other tests
5. **Descriptive Names**: Test names should clearly describe what is being tested

## Common Patterns

### Testing Success Response

```typescript
expect(parsed.status).toBe(200);
expect(parsed.data.success).toBe(true);
expect(parsed.data.data).toBeDefined();
```

### Testing Error Response

```typescript
expect(parsed.status).toBe(400);
expect(parsed.data.success).toBe(false);
expect(parsed.data.error).toBeDefined();
```

### Testing CORS Headers

```typescript
expect(parsed.headers['access-control-allow-origin']).toBe('*');
```

### Testing Validation

```typescript
const result = validateRequest(data, schema);
expect(result.valid).toBe(false);
expect(result.errors.fieldName).toBeDefined();
```
