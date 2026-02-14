# AUTUS API Testing Guide

## Quick Start

```bash
# Install dependencies
npm install

# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

## Project Structure

```
vercel-api/
├── vitest.config.ts              # Vitest configuration
├── lib/
│   └── __tests__/
│       ├── test-utils.ts         # Shared test utilities
│       ├── api-utils.test.ts     # Tests for API utilities
│       └── README.md             # Detailed testing docs
└── app/
    └── api/
        └── v1/
            ├── heartbeat/__tests__/
            │   └── route.test.ts # Heartbeat API tests
            └── metrics/__tests__/
                └── route.test.ts # Metrics API tests
```

## What's Included

### 1. Vitest Configuration
- Global test utilities (describe, it, expect)
- Node environment for API testing
- Code coverage with lcov reports
- Path alias support (@/)

### 2. Test Utilities (`lib/__tests__/test-utils.ts`)
- **Mock Supabase Client**: Simulate database queries
- **Mock NextRequest**: Create test HTTP requests
- **Mock Anthropic Client**: Simulate AI responses
- **Response Parser**: Parse NextResponse for assertions
- **Test Fixtures**: Common test data (MOCK_ORG_ID, MOCK_USER, etc.)
- **Environment Mocking**: Safely mock environment variables

### 3. Example Tests

#### API Utils Tests (`lib/__tests__/api-utils.test.ts`)
- Response helpers (success, error, validation)
- Request validation
- Rate limiting
- Caching utilities
- CORS headers

#### Heartbeat API Tests (`app/api/v1/heartbeat/__tests__/route.test.ts`)
- External heartbeat endpoint
- Voice heartbeat endpoint
- Resonance analysis
- Keywords detail
- Mock data generation

#### Metrics API Tests (`app/api/metrics/__tests__/route.test.ts`)
- System metrics
- Database metrics with Supabase mocking
- Business metrics (omega, sigma distribution)
- Error handling
- CORS compliance

## Writing Tests

### Basic Test Structure

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

### Testing with Supabase

```typescript
import { vi, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@/lib/__tests__/test-utils';

// Mock the Supabase module
vi.mock('@/lib/supabase', () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { getSupabaseAdmin } from '@/lib/supabase';

describe('Database Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should query nodes', async () => {
    const mockData = {
      autus_nodes: [
        { node_id: 'node-1', name: 'Test Node' }
      ]
    };

    const mockSupabase = createMockSupabaseClient(mockData);
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockSupabase as any);

    // Your test logic here
  });
});
```

### Testing Request Parameters

```typescript
it('should accept query parameters', async () => {
  const request = createMockNextRequest('/api/v1/endpoint', {
    searchParams: {
      org_id: 'test-org',
      period: '7d'
    }
  });

  const response = await GET(request);
  const parsed = await parseNextResponse(response);

  expect(parsed.status).toBe(200);
});
```

### Testing POST Requests

```typescript
it('should create a resource', async () => {
  const request = createMockNextRequest('/api/v1/nodes', {
    method: 'POST',
    body: {
      name: 'New Node',
      type: 'customer'
    }
  });

  const response = await POST(request);
  const parsed = await parseNextResponse(response);

  expect(parsed.status).toBe(201);
  expect(parsed.data.data).toBeDefined();
});
```

### Testing Error Handling

```typescript
it('should handle errors gracefully', async () => {
  const mockSupabase = createMockSupabaseClient({}, {
    shouldError: true,
    errorMessage: 'Database connection failed'
  });

  vi.mocked(getSupabaseAdmin).mockReturnValue(mockSupabase as any);

  const request = createMockNextRequest('/api/v1/endpoint');
  const response = await GET(request);
  const parsed = await parseNextResponse(response);

  expect(parsed.status).toBe(500);
  expect(parsed.data.success).toBe(false);
  expect(parsed.data.error).toBeDefined();
});
```

## Common Assertions

```typescript
// Status codes
expect(parsed.status).toBe(200);
expect(parsed.status).toBe(400);
expect(parsed.status).toBe(500);

// Success response structure
expect(parsed.data.success).toBe(true);
expect(parsed.data.data).toBeDefined();
expect(parsed.data.message).toBe('Expected message');
expect(parsed.data.meta.timestamp).toBeDefined();

// Error response structure
expect(parsed.data.success).toBe(false);
expect(parsed.data.error).toBeDefined();
expect(parsed.data.error).toContain('expected error');

// CORS headers
expect(parsed.headers['access-control-allow-origin']).toBe('*');

// Data types
expect(parsed.data.data.items).toBeInstanceOf(Array);
expect(parsed.data.data.items.length).toBeGreaterThan(0);
```

## Test Coverage

Run coverage report:
```bash
npm run test:coverage
```

Coverage reports are generated in:
- `coverage/index.html` - Visual HTML report
- `coverage/lcov.info` - LCOV format for CI/CD

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm run test:run
      - run: npm run test:coverage
```

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Mock External Services**: Always mock Supabase, Anthropic, etc.
3. **Test Edge Cases**: Test error handling, validation failures, missing params
4. **Use Fixtures**: Reuse common test data from test-utils.ts
5. **Clear Mocks**: Use `beforeEach(() => vi.clearAllMocks())` to reset state
6. **Descriptive Names**: Test names should clearly describe what is tested
7. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and validation

## Next Steps

To add tests for a new endpoint:

1. Create `__tests__` directory next to your route file
2. Create `route.test.ts` in the `__tests__` directory
3. Import test utilities and the route handlers
4. Write tests for each endpoint and error case
5. Run tests to verify

Example:
```bash
mkdir app/api/v1/my-endpoint/__tests__
touch app/api/v1/my-endpoint/__tests__/route.test.ts
npm test
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Next.js Testing](https://nextjs.org/docs/testing)
- Detailed testing guide: `lib/__tests__/README.md`

## Need Help?

Common issues:
- **Module not found**: Check path aliases in `vitest.config.ts`
- **Mock not working**: Ensure `vi.mock()` is called before imports
- **Async tests failing**: Make sure to `await` responses
- **Type errors**: Use `as any` when mocking Supabase client

For more examples, see the existing test files in:
- `lib/__tests__/api-utils.test.ts`
- `app/api/v1/heartbeat/__tests__/route.test.ts`
- `app/api/metrics/__tests__/route.test.ts`
