# TypeScript Errors - Categorized Report

## Summary
Total errors: 25
- Test setup errors: 19
- Type incompatibility errors: 4
- Environment variable errors: 2

## Categories

### 1. Test Setup Errors (19 errors)
**File:** `src/components/__tests__/project-chooser.test.tsx`
**Issue:** Jest DOM matchers not recognized
**Pattern:** `Property 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'`

```
Lines affected: 31, 32, 43, 53, 57, 62, 92, 93, 94, 95, 97, 98, 99, 126, 127, 128, 129, 172, 217
```

**Root Cause:** TypeScript doesn't recognize jest-dom matchers
**Solution:** 
1. Ensure `@types/testing-library__jest-dom` is installed
2. Add to `tsconfig.json` types array: `"@testing-library/jest-dom"`

### 2. Environment Variable Errors (2 errors)
**File:** `src/lib/mcp-daemon-client.ts`
**Lines:** 9, 10

```typescript
// Error: Property does not exist on env type
const DAEMON_STATUS_URL = env.NEXT_PUBLIC_MCP_DAEMON_URL || 'http://localhost:8090'
const OBSERVATORY_SERVER_URL = env.NEXT_PUBLIC_OBSERVATORY_TEST_SERVER_URL || 'http://localhost:8765'
```

**Root Cause:** New environment variables not added to env type definition
**Solution:** Update `src/lib/env.ts` to include these variables

### 3. Type Incompatibility Errors

#### 3.1 Middleware Handler Type Mismatch (1 error)
**File:** `src/lib/api/secure-middleware.ts`
**Line:** 71

```typescript
// Error: Argument type mismatch in withProjectValidation
wrappedHandler = withProjectValidation(wrappedHandler) as any
```

**Root Cause:** Function signature mismatch between handler types
**Solution:** Update handler to match expected signature or fix type definitions

#### 3.2 Request/Response Type Confusion (1 error)
**File:** `src/lib/security/rate-limit.ts`
**Line:** 258

```typescript
// Error: Converting NextRequest to NextResponse
result = response as any
```

**Root Cause:** Attempting to cast incompatible types
**Solution:** Fix the middleware composition logic

#### 3.3 Token Revocation Type Error (1 error)
**File:** `src/lib/security/token-revocation.ts`
**Line:** Unknown (needs investigation)

**Root Cause:** Likely a type definition issue
**Solution:** Review and fix type definitions

## Fix Priority

1. **High Priority** (Blocking functionality):
   - Environment variable errors (2) - Quick fix
   - Middleware type errors (2) - May affect API functionality

2. **Medium Priority** (Development experience):
   - Test setup errors (19) - Only affects running tests

3. **Low Priority**:
   - Type casting issues that are already using `as any`

## Quick Fixes Script

```bash
# 1. Install missing types
npm install --save-dev @types/testing-library__jest-dom

# 2. Update tsconfig.json
# Add to compilerOptions.types: ["@testing-library/jest-dom"]

# 3. Run type check again
npx tsc --noEmit
```

## Detailed Error List

### Full error output:
```
src/components/__tests__/project-chooser.test.tsx(31,48): error TS2339: Property 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.
src/components/__tests__/project-chooser.test.tsx(32,69): error TS2339: Property 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.
src/components/__tests__/project-chooser.test.tsx(43,44): error TS2339: Property 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.
src/components/__tests__/project-chooser.test.tsx(53,55): error TS2339: Property 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.
src/components/__tests__/project-chooser.test.tsx(57,49): error TS2339: Property 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.
src/components/__tests__/project-chooser.test.tsx(62,57): error TS2339: Property 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.
src/components/__tests__/project-chooser.test.tsx(92,43): error TS2339: Property 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.
src/components/__tests__/project-chooser.test.tsx(93,40): error TS2339: Property 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.
src/components/__tests__/project-chooser.test.tsx(94,44): error TS2339: Property 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.
src/components/__tests__/project-chooser.test.tsx(95,42): error TS2339: Property 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.
src/components/__tests__/project-chooser.test.tsx(97,43): error TS2339: Property 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.
src/components/__tests__/project-chooser.test.tsx(98,40): error TS2339: Property 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.
src/components/__tests__/project-chooser.test.tsx(99,50): error TS2339: Property 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.
src/components/__tests__/project-chooser.test.tsx(126,70): error TS2339: Property 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.
src/components/__tests__/project-chooser.test.tsx(127,51): error TS2339: Property 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.
src/components/__tests__/project-chooser.test.tsx(128,51): error TS2339: Property 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.
src/components/__tests__/project-chooser.test.tsx(129,61): error TS2339: Property 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.
src/components/__tests__/project-chooser.test.tsx(172,61): error TS2339: Property 'toBeInTheDocument' does not exist on type 'JestMatchers<HTMLElement>'.
src/components/__tests__/project-chooser.test.tsx(217,59): error TS2339: Property 'toBeInTheDocument' does not exist on type 'Matchers<void, HTMLElement>'.
src/lib/api/secure-middleware.ts(71,44): error TS2345: Argument of type '(req: NextRequest, context: SecureContext, routeContext: T) => Promise<NextResponse<unknown>>' is not assignable to parameter of type '(request: NextRequest, context: { params: Record<string, unknown> & { projectId: string; }; }) => Promise<NextResponse<unknown>>'.
src/lib/mcp-daemon-client.ts(9,31): error TS2339: Property 'NEXT_PUBLIC_MCP_DAEMON_URL' does not exist on type...
src/lib/mcp-daemon-client.ts(10,36): error TS2339: Property 'NEXT_PUBLIC_OBSERVATORY_TEST_SERVER_URL' does not exist on type...
src/lib/security/rate-limit.ts(258,12): error TS2352: Conversion of type 'NextRequest' to type 'NextResponse<unknown>' may be a mistake...
src/lib/security/token-revocation.ts(error details pending)
```