# Testing Patterns

**Analysis Date:** 2026-02-19

## Test Framework

**Runner:**
- Not yet configured (project is in initial setup phase)
- Recommended: Vitest (lighter than Jest, better ESM support for Next.js)
- Alternative: Jest (if heavy integration with Next.js internals needed)

**Assertion Library:**
- Not yet selected
- Recommended: Vitest's built-in assertions or `@testing-library/react` for component testing

**Installation (when ready):**
```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom
npm install -D @types/vitest
```

**Run Commands (to be added to package.json):**
```bash
npm run test              # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run test:ui          # Vitest UI dashboard
```

**Suggested package.json entries:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest --coverage",
    "test:ui": "vitest --ui"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^23.0.0"
  }
}
```

## Test File Organization

**Location:**
- Co-located with source code using `.test.ts` or `.test.tsx` suffix
- Example: Source `src/lib/rfm/engine.ts` → Test `src/lib/rfm/engine.test.ts`
- Component test: `src/components/CustomerCard.tsx` → `src/components/CustomerCard.test.tsx`

**Naming:**
- Test files: `[moduleName].test.ts` or `[moduleName].test.tsx`
- Snapshot files (if used): `__snapshots__/[moduleName].test.tsx.snap`
- Test data/fixtures: `__fixtures__/mockCustomers.ts` (in same directory as tests using them)

**Structure:**
```
src/
├── lib/
│   ├── rfm/
│   │   ├── engine.ts
│   │   ├── engine.test.ts          # Co-located test
│   │   └── __fixtures__/
│   │       └── mockCustomers.ts    # Test data
│   ├── shopify/
│   │   ├── sync.ts
│   │   ├── sync.test.ts
│   │   └── webhooks.ts
│   │   └── webhooks.test.ts
│   └── db/
│       ├── queries.ts
│       └── queries.test.ts
├── components/
│   ├── CustomerCard.tsx
│   └── CustomerCard.test.tsx
└── app/
    └── api/
        ├── customers/
        │   ├── route.ts
        │   └── route.test.ts        # API route tests
```

## Test Structure

**Suite Organization:**
```typescript
// src/lib/rfm/engine.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { calculateRfmScores, segmentCustomersByRfm } from "./engine";
import { mockCustomers } from "./__fixtures__/mockCustomers";

describe("RFM Engine", () => {
  let customerId: string;

  beforeEach(() => {
    customerId = "test-customer-123";
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup if needed
  });

  describe("calculateRfmScores", () => {
    it("should calculate RFM scores for a customer with orders", async () => {
      // Arrange
      const mockDb = vi.mocked(db);

      // Act
      const result = await calculateRfmScores(customerId);

      // Assert
      expect(result).toHaveProperty("recency");
      expect(result.recency).toBeGreaterThanOrEqual(1);
      expect(result.recency).toBeLessThanOrEqual(5);
    });

    it("should throw error if customer not found", async () => {
      // Arrange, Act, Assert
      await expect(calculateRfmScores("nonexistent")).rejects.toThrow(
        "Customer not found"
      );
    });

    it("should handle customers with no order history", async () => {
      // Test edge case: new customer
      const result = await calculateRfmScores(mockCustomers.new.id);
      expect(result.frequency).toBe(0);
    });
  });

  describe("segmentCustomersByRfm", () => {
    it("should segment customers into correct groups", async () => {
      // Arrange
      const mockDb = vi.mocked(db);
      mockDb.select().from(customers).execute.mockResolvedValue(
        mockCustomers.all
      );

      // Act
      const segments = await segmentCustomersByRfm("shop-123");

      // Assert
      expect(segments).toHaveProperty("champion");
      expect(segments.champion).toBeInstanceOf(Array);
      expect(segments.champion.length).toBeGreaterThan(0);
    });
  });
});
```

**Patterns:**
- **Setup pattern**: `beforeEach()` for test isolation, `afterEach()` for cleanup
- **Teardown pattern**: Close databases, clear file system, reset time mocks
- **Assertion pattern**: Use `expect()` with Vitest matchers (similar to Jest)
- **Test naming**: Descriptive strings starting with "should" or "must"
- **AAA pattern**: Arrange (setup), Act (execute), Assert (verify)

## Mocking

**Framework:** `vitest` built-in `vi` object

**Patterns:**
```typescript
import { vi, describe, it, expect } from "vitest";

describe("Shopify Sync", () => {
  it("should call Shopify API", async () => {
    // Mock external service
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({ customers: [] }),
    });
    global.fetch = mockFetch;

    // Execute
    await syncFromShopify("token");

    // Assert
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("shopify.com"),
      expect.any(Object)
    );
  });

  it("should use mocked database", async () => {
    // Mock database query
    const mockDb = vi.mocked(db);
    mockDb.select().from(customers).execute.mockResolvedValue([
      { id: "1", name: "Test" },
    ]);

    // Execute and assert
    const result = await queryCustomers();
    expect(result).toHaveLength(1);
  });

  it("should reset mocks between tests", () => {
    // beforeEach calls vi.clearAllMocks()
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
```

**What to Mock:**
- External API calls (Shopify, Resend, Claude, etc.)
- Database queries (unless integration test)
- Time (`vi.useFakeTimers()` for scheduling tests)
- File system operations (unlikely for this app, but pattern applies)

**What NOT to Mock:**
- Business logic functions (test the actual implementation)
- Type checks and validation (Zod schemas should be tested with real data)
- Next.js middleware or core router functionality
- Internal helper functions within the same module

## Fixtures and Factories

**Test Data:**
```typescript
// src/lib/rfm/__fixtures__/mockCustomers.ts
import type { Customer } from "@/lib/db/schema";

export const mockCustomers = {
  champion: {
    id: "cust-champion-1",
    shopifyId: "gid://shopify/Customer/123",
    name: "High Value Customer",
    email: "vip@example.com",
    rfmR: 5,
    rfmF: 5,
    rfmM: 5,
    segment: "CHAMPION" as const,
    totalSpent: "15000",
    orderCount: 50,
    lastOrderAt: new Date("2026-02-10"),
    createdAt: new Date("2020-01-01"),
  } as Customer,

  atRisk: {
    id: "cust-at-risk-1",
    shopifyId: "gid://shopify/Customer/456",
    name: "Lapsed Customer",
    email: "inactive@example.com",
    rfmR: 1,
    rfmF: 3,
    rfmM: 3,
    segment: "AT_RISK" as const,
    totalSpent: "500",
    orderCount: 3,
    lastOrderAt: new Date("2024-06-01"),
    createdAt: new Date("2024-01-01"),
  } as Customer,

  new: {
    id: "cust-new-1",
    shopifyId: "gid://shopify/Customer/789",
    name: "New Customer",
    email: "new@example.com",
    rfmR: 5,
    rfmF: 1,
    rfmM: 1,
    segment: "NEW" as const,
    totalSpent: "100",
    orderCount: 1,
    lastOrderAt: new Date(),
    createdAt: new Date(),
  } as Customer,

  all: [...], // Array of various customer types
};

// Factory for generating custom test data
export function createMockCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    ...mockCustomers.champion,
    ...overrides,
  };
}
```

**Location:**
- `src/lib/rfm/__fixtures__/mockCustomers.ts` - Mock customer data
- `src/lib/shopify/__fixtures__/mockResponses.ts` - Mock Shopify API responses
- `src/lib/db/__fixtures__/mockOrders.ts` - Mock order data

## Coverage

**Requirements:** Not enforced yet (to be configured with project)

**Suggested minimum coverage targets (once testing is set up):**
- **Line coverage**: 80%
- **Branch coverage**: 75%
- **Function coverage**: 80%

**View Coverage:**
```bash
npm run test:coverage
# Output: coverage/index.html (open in browser for visual report)
```

**Coverage configuration (to be added to vitest.config.ts):**
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.test.ts",
        "**/__fixtures__/**",
      ],
    },
  },
});
```

## Test Types

**Unit Tests:**
- Scope: Single function or class in isolation
- Location: `src/lib/*/module.test.ts`
- Examples:
  - Test `calculateRfmScores()` with mocked database
  - Test RFM segment classification logic
  - Test Zod schema validation
- Approach: Fast execution (milliseconds), use mocks for dependencies

```typescript
// Example: Unit test for RFM calculation
it("should calculate correct F score from order count", () => {
  // Use actual quintile algorithm with mocked percentile data
  const score = calculateFrequencyScore(42); // 42 total orders
  expect(score).toBe(4); // Falls in 4th quintile
});
```

**Integration Tests:**
- Scope: Multiple modules working together (e.g., sync + RFM calculation)
- Location: `src/lib/*/integration.test.ts` or `src/app/api/**/route.test.ts`
- Examples:
  - Test full Shopify sync flow: fetch → transform → save to DB → recalculate RFM
  - Test API route handler (validation → business logic → response)
  - Test automation trigger evaluation → action execution
- Approach: Use test database or in-memory database, slower but more realistic

```typescript
// Example: Integration test for customer sync
describe("Customer Sync Integration", () => {
  it("should fetch, transform, and save customers, then recalculate RFM", async () => {
    // Arrange
    const mockShopifyResponse = getFixture("shopifyCustomerResponse");
    vi.mocked(fetchShopifyCustomers).mockResolvedValue(
      mockShopifyResponse
    );

    // Act
    await syncCustomersFromShopify("shop-123");

    // Assert
    const savedCustomers = await db.select().from(customers);
    expect(savedCustomers).toHaveLength(mockShopifyResponse.customers.length);

    // Verify RFM was recalculated
    savedCustomers.forEach((customer) => {
      expect(customer.rfmR).toBeDefined();
      expect(customer.segment).toBeDefined();
    });
  });
});
```

**E2E Tests:**
- Framework: Playwright or Cypress (not yet installed)
- Scope: Full user workflows through the browser
- Location: `e2e/` or `tests/e2e/` (to be created)
- Examples: User logs in → views customer profile → runs automation
- Approach: Test actual app running, verify UI behavior and data persistence
- Note: E2E tests are slow, run less frequently, test critical paths only

**When to add E2E testing:**
- After core features are implemented and stabilized
- Focus on customer-critical workflows: auth → customer view → automation trigger

## Common Patterns

**Async Testing:**
```typescript
// Using async/await (preferred)
it("should fetch customer data", async () => {
  const data = await getCustomer("123");
  expect(data.name).toBe("Test User");
});

// Using .then() (legacy style, avoid)
it("should update customer", () => {
  return updateCustomer("123", { name: "New Name" }).then((result) => {
    expect(result.name).toBe("New Name");
  });
});

// Using done callback (avoid, less readable)
it("should do something", (done) => {
  asyncFunction().then(() => {
    expect(true).toBe(true);
    done();
  });
});
```

**Error Testing:**
```typescript
// Test that function throws expected error
it("should throw error for invalid input", async () => {
  await expect(validateCustomer(null)).rejects.toThrow(
    "Customer data is required"
  );
});

// Test error handling in try-catch
it("should handle API errors gracefully", async () => {
  vi.mocked(fetchShopifyData).mockRejectedValue(new Error("Rate limited"));

  const result = await syncWithRetry();
  expect(result.success).toBe(false);
  expect(result.error).toContain("Rate limited");
});

// Test error path with specific error type
it("should catch ZodError from validation", async () => {
  const result = CreateCustomerSchema.safeParse({ email: "invalid" });
  expect(result.success).toBe(false);
  expect(result.error?.issues).toHaveLength(1);
});
```

**Date/Time Testing:**
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("Recency Calculation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-19"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should calculate days since last order correctly", () => {
    const lastOrder = new Date("2026-02-10");
    const daysSince = calculateDaysSince(lastOrder);
    expect(daysSince).toBe(9);
  });

  it("should handle recent orders", () => {
    const lastOrder = new Date("2026-02-18");
    const recencyScore = calculateRecencyScore(lastOrder);
    expect(recencyScore).toBe(5); // Highest score
  });
});
```

**Database Testing (when DB queries are ready):**
```typescript
// Mock the Drizzle query builder
it("should query customers by segment", async () => {
  const mockDb = vi.mocked(db);
  const mockResult = [mockCustomers.champion, mockCustomers.loyal];

  mockDb
    .select()
    .from(customers)
    .where(eq(customers.segment, "CHAMPION"))
    .execute.mockResolvedValue(mockResult);

  const result = await getCustomersBySegment("CHAMPION");
  expect(result).toHaveLength(2);
  expect(result[0].segment).toBe("CHAMPION");
});
```

## Test Configuration (To Be Created)

**vitest.config.ts** (when ready):
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.test.ts",
        "**/__fixtures__/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**vitest.setup.ts** (when ready):
```typescript
import "@testing-library/jest-dom";
import { vi } from "vitest";

// Global test setup
beforeAll(() => {
  // Mock environment variables if needed
  process.env.DATABASE_URL = "postgresql://test:test@localhost/test_db";
});

afterEach(() => {
  // Clear all mocks after each test
  vi.clearAllMocks();
});
```

## Next Steps for Testing Setup

1. **Install Vitest**: `npm install -D vitest @vitest/ui`
2. **Add testing libraries**: `npm install -D @testing-library/react @testing-library/jest-dom`
3. **Create config files**: `vitest.config.ts` and `vitest.setup.ts`
4. **Add npm scripts**: Update `package.json` with test commands
5. **Start with unit tests**: Begin with `src/lib/*/module.test.ts` files
6. **Add fixtures**: Create mock data in `__fixtures__/` directories
7. **Target 80% coverage**: Monitor with `npm run test:coverage`

---

*Testing analysis: 2026-02-19*
