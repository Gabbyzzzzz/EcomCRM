# Coding Conventions

**Analysis Date:** 2026-02-19

## Naming Patterns

**Files:**
- TypeScript source files: `camelCase.ts` or `camelCase.tsx`
- Component files: `PascalCase.tsx` for React components (e.g., `UserCard.tsx`)
- Utility/service files: `camelCase.ts` (e.g., `shopifyClient.ts`, `rfmEngine.ts`)
- API route handlers: Route structure follows Next.js App Router pattern with nested folders (e.g., `src/app/api/webhooks/shopify/route.ts`)
- Schema/types: `camelCase.ts` for export-focused files (e.g., `schema.ts`, `types.ts`)

**Functions:**
- Regular functions: `camelCase` (e.g., `calculateRfmScore()`, `syncCustomers()`)
- React hooks: `useCustomPrefixedName` (e.g., `useCustomerSegments()`)
- API handlers: `GET`, `POST`, `PUT`, `DELETE` exports from route handlers
- Internal/private functions: `_prefixedName` or within module scope (not exported)

**Variables:**
- Regular variables: `camelCase` (e.g., `customerId`, `rfmScores`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `SHOPIFY_API_VERSION`, `RFM_SCORE_THRESHOLD`)
- Boolean variables: prefix with `is`, `has`, `can`, `should` (e.g., `isEnabled`, `hasOrderHistory`, `shouldRecalculate`)

**Types/Interfaces:**
- Type names: `PascalCase` (e.g., `Customer`, `AutomationTrigger`, `MessageLog`)
- Props interfaces: `ComponentNameProps` (e.g., `CustomerCardProps`)
- Enum values: `PascalCase` for enum name, `SCREAMING_SNAKE_CASE` for enum members (e.g., `enum SegmentType { CHAMPION, LOYAL, AT_RISK }`)

## Code Style

**Formatting:**
- No dedicated Prettier config file — Next.js 14 defaults apply
- Line length: Follow editor/IDE defaults (typically 80-100 characters for readability)
- Indentation: 2 spaces (Next.js/React convention)
- Semicolons: Required (TypeScript strict mode)
- Trailing commas: Use in multiline objects/arrays for cleaner diffs

**Linting:**
- Tool: `next lint` (Next.js built-in ESLint configuration)
- Command: `npm run lint`
- Config: ESLint config managed by Next.js, located at Next.js internal defaults
- Key rules enforced by Next.js:
  - `react/no-unescaped-entities` - Proper JSX escaping
  - `@next/next/no-img-element` - Use Next.js `Image` component
  - `@next/next/no-html-link-for-pages` - Use Next.js `Link` component for internal routes
  - No unused imports/variables

## Import Organization

**Order:**
1. **React and framework imports** - `import React, { useState } from 'react'` and `import { type Metadata } from 'next'`
2. **Third-party library imports** - External packages (e.g., `zod`, `drizzle-orm`, `resend`)
3. **Internal absolute imports** - Using `@/*` path alias (e.g., `import { cn } from '@/lib/utils'`)
4. **Relative imports** - `.` and `..` imports (avoid when possible, prefer absolute)

**Path Aliases:**
- `@/*`: Maps to `src/*` (configured in `tsconfig.json`)
- `@/components`: Points to shared UI components
- `@/lib`: Points to utility functions and business logic
- `@/lib/shopify`: Shopify integration modules
- `@/lib/db`: Database and Drizzle schema
- `@/lib/rfm`: RFM scoring engine
- `@/lib/automation`: Automation rule evaluation
- `@/lib/email`: Email sending utilities
- `@/lib/ai`: Claude API integrations
- `@/hooks`: React custom hooks
- `@/emails`: React Email templates
- `@/inngest`: Inngest function definitions

**Example import structure:**
```typescript
import type { Metadata } from "next";
import { useState } from "react";

import { Resend } from "resend";
import { drizzle } from "drizzle-orm/postgres-js";
import { z } from "zod";

import { cn } from "@/lib/utils";
import { syncCustomersFromShopify } from "@/lib/shopify/sync";
import { customers } from "@/lib/db/schema";
import { calculateRfm } from "@/lib/rfm/engine";
import { getUserSegment } from "./utils";
```

## Error Handling

**Patterns:**
- **API route handlers**: Use try-catch blocks with typed error responses
  - Success: `return Response.json({ data, message }, { status: 200 })`
  - Validation error: `return Response.json({ error: "Invalid input" }, { status: 400 })`
  - Server error: `return Response.json({ error: "Server error" }, { status: 500 })`

- **Zod validation**: Wrap with `.parse()` or `.parseAsync()` in try-catch, or use `.safeParse()` for inline handling
  - Use in API routes to validate request bodies before processing
  - Use in server components to validate search params/query data

- **Async operations**: Always wrap database calls and external API calls in try-catch
  - Log errors to console during development
  - For production: Use error tracking service (when configured)

- **HMAC verification errors**: Webhook endpoints must verify HMAC before processing; return 401 if invalid
  - See `src/lib/shopify/webhooks.ts` for verification pattern

- **Database operation failures**: Catch and return meaningful error messages to API consumers
  - Don't expose internal SQL/Drizzle errors to client

**Example error handling:**
```typescript
// API route
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = RequestSchema.parse(body);
    const result = await processRequest(validated);
    return Response.json({ data: result }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: error.errors }, { status: 400 });
    }
    console.error("Request failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Server function with Zod
async function validateAndProcess(input: unknown) {
  const result = QuerySchema.safeParse(input);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.message}`);
  }
  return await executeQuery(result.data);
}
```

## Logging

**Framework:** `console` (built-in Node.js)

**Patterns:**
- Development: `console.log()`, `console.error()`, `console.warn()`
- Use `console.error()` for actual errors in catch blocks
- Use `console.log()` for debugging and important flow events
- Use `console.warn()` for deprecations or unusual conditions
- Include context: `console.error("Failed to sync customer:", customerId, error)`
- Never log sensitive data (customer tokens, API keys, email bodies)
- Log external API calls for debugging: `console.log("Shopify API call:", query)`

**Example logging:**
```typescript
try {
  console.log("Starting customer sync for shop:", shopId);
  const customers = await fetchShopifyCustomers(shopId);
  console.log(`Synced ${customers.length} customers`);
} catch (error) {
  console.error("Customer sync failed:", error);
  throw error;
}
```

## Comments

**When to Comment:**
- Complex RFM scoring logic that isn't self-evident
- GraphQL query explanations (why we fetch certain fields)
- Workarounds or temporary solutions (should include reason and planned removal)
- Business logic that differs from common patterns
- Avoid obvious comments (e.g., `// increment counter` above `counter++`)

**JSDoc/TSDoc:**
- Use for exported functions and types, especially in `src/lib/` modules
- Include `@param`, `@returns`, `@throws` for functions
- Include `@example` for complex utilities

**Example comments:**
```typescript
/**
 * Calculates RFM score for a customer based on all orders in the store.
 * Uses quintile-based scoring (adaptive thresholds) rather than fixed values
 * to account for different store characteristics.
 *
 * @param customerId - The Shopify customer ID
 * @param shopId - The store ID for multi-tenant support
 * @returns RFM score object with R, F, M scores (1-5 each)
 * @throws Error if customer not found in database
 */
export async function calculateCustomerRfm(customerId: string, shopId: string) {
  // ...
}

// GraphQL query to fetch only active customers with recent orders
// (excludes deleted and test customers)
const ACTIVE_CUSTOMERS_QUERY = gql`
  query {
    customers(first: 100, status: ENABLED) {
      ...
    }
  }
`;

// TODO: Replace with Shopify subscription webhooks when lifecycle event is available
// Currently polling customer status every hour
const CUSTOMER_CHECK_INTERVAL = 3600000;
```

## Function Design

**Size:**
- Keep functions under 50 lines of code when possible
- Extract nested logic into separate functions
- One responsibility per function

**Parameters:**
- Use objects for 3+ parameters (destructuring pattern)
- Name parameters to be self-documenting
- Use TypeScript types strictly (no `any`)

**Return Values:**
- Always type the return value explicitly
- Return early to reduce nesting
- For async functions returning data, type as `Promise<Type>`

**Example function design:**
```typescript
// Good: clear purpose, typed, reasonable length
async function updateCustomerSegment(
  customerId: string,
  newSegment: SegmentType
): Promise<Customer> {
  const customer = await getCustomer(customerId);
  if (!customer) throw new Error("Customer not found");

  const updated = await db
    .update(customers)
    .set({ segment: newSegment })
    .where(eq(customers.id, customerId))
    .returning();

  return updated[0];
}

// Good: object parameter for multiple values
async function createAutomation({
  name,
  triggerType,
  triggerConfig,
  actionType,
}: CreateAutomationInput): Promise<Automation> {
  // ...
}
```

## Module Design

**Exports:**
- Named exports for functions and types (enables better tree-shaking)
- Default exports only for React components (when convenient) or entry points
- Group related functions in modules (e.g., all RFM functions in `rfm/engine.ts`)

**Barrel Files:**
- Use index files (`index.ts`) to group related exports only in `src/lib/` subdirectories
- Example: `src/lib/shopify/index.ts` exports `{ syncCustomers, verifyWebhook }`
- Avoid excessive re-exporting; prefer direct imports for clarity

**Example module structure:**
```typescript
// src/lib/rfm/engine.ts
export function calculateRfmScores(customerId: string): Promise<RfmScore> {
  // ...
}

export function segmentCustomersByRfm(shopId: string): Promise<SegmentMap> {
  // ...
}

// src/lib/rfm/index.ts
export { calculateRfmScores, segmentCustomersByRfm } from "./engine";

// Usage
import { calculateRfmScores } from "@/lib/rfm";
```

## Type Safety

**TypeScript Configuration:**
- Strict mode: Enabled (`"strict": true` in `tsconfig.json`)
- No implicit `any`: Enforced
- All function parameters and return types must be explicitly typed
- Use discriminated unions for complex state shapes

**Type Patterns:**
```typescript
// Request/response validation with Zod
const CreateCustomerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  phone: z.string().optional(),
});

type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

// Database types - use Drizzle's type inference
import { InferSelectModel } from "drizzle-orm";
type Customer = InferSelectModel<typeof customers>;

// API response types
type ApiResponse<T> = {
  data: T;
  message?: string;
};
```

## Shopify Integration Specifics

**Money fields:** Always use `Decimal` type from `postgres-js` or string representation
- Never use JavaScript `number` for currency
- Store prices as strings when receiving from Shopify GraphQL (already formatted)

**GraphQL queries:** Use typed client from `@/lib/shopify/client.ts`
- Validate response shape
- Handle rate limits gracefully (exponential backoff)

**Webhook verification:** Check HMAC signature before processing
- Verify in middleware or at route handler start
- Return 401 for invalid signatures

**Rate limiting:** Respect Shopify's GraphQL cost budgeting
- Batch operations when possible
- Implement backoff strategy for rate-limited responses

## React/Component Specifics

**Server vs Client Components:**
- Default to Server Components (no `'use client'`)
- Use Client Components only for interactive state (forms, filters, real-time updates)
- Mark with `'use client'` at top of file

**Props typing:**
```typescript
// Always type props
interface ButtonProps {
  label: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
}

export function Button({ label, onClick, variant = "primary" }: ButtonProps) {
  // ...
}
```

---

*Convention analysis: 2026-02-19*
