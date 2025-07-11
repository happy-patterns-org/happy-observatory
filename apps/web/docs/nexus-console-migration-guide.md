# Nexus Console Package Migration Guide

## Overview
This guide helps migrate from our placeholder implementation to the official `@happy-devkit/nexus-console` package once it's published.

## Migration Steps

### Step 1: Install the Package
```bash
npm install @happy-devkit/nexus-console
```

### Step 2: Update Imports

#### Before (Placeholder)
```typescript
// src/components/workspace/nexus-console-integration.tsx
const NexusConsoleComponent = dynamic(
  () => import('@happy-devkit/nexus-console').then(mod => mod.NexusConsoleComponent),
  { ssr: false }
)
```

#### After (No changes needed! ✅)
The dynamic import is already correct and will work once the package is available.

### Step 3: Replace Metrics Placeholder

#### Before (Placeholder)
```typescript
// src/components/workspace/nexus-console-metrics.tsx
import { MetricsCollectorPlaceholder } from './nexus-console-metrics'

const collector = new MetricsCollectorPlaceholder({
  bridgeUrl: process.env.NEXT_PUBLIC_BRIDGE_SERVER_URL
})
```

#### After (Real Implementation)
```typescript
// src/components/workspace/nexus-console-metrics.tsx
import { MetricsCollector } from '@happy-devkit/nexus-console'

const collector = new MetricsCollector({
  bridgeUrl: process.env.NEXT_PUBLIC_BRIDGE_SERVER_URL
})
```

### Step 4: Update Terminal Discovery

#### Before
```typescript
// src/hooks/use-terminal-discovery.ts
// Manual fetch implementation
const response = await fetch(`${bridgeUrl}/api/terminals/discover`)
```

#### After
```typescript
// src/hooks/use-terminal-discovery.ts
import { BridgeClient } from '@happy-devkit/nexus-console'

const bridgeClient = new BridgeClient({
  baseUrl: bridgeUrl
})

const endpoints = await bridgeClient.discoverTerminals(projectId)
```

### Step 5: Update TypeScript Types

#### Before
```typescript
// Local interface definitions
interface TerminalEndpoint {
  id: string
  projectId: string
  url: string
  // ...
}
```

#### After
```typescript
// Use package types
import type { 
  TerminalEndpoint, 
  TerminalMetrics,
  BridgeConfig 
} from '@happy-devkit/nexus-console'
```

## Testing the Migration

### 1. Verify Package Installation
```bash
npm list @happy-devkit/nexus-console
```

### 2. Run Type Checks
```bash
npx tsc --noEmit
```

### 3. Test Component Rendering
```typescript
// In browser console
// Should render without errors
document.querySelector('[data-nexus-integration]')
```

### 4. Test Metrics Collection
```typescript
// In browser console
await testMetricsCollection()
```

### 5. Test Bridge Integration
```typescript
// With bridge running
await testBridgeDiscovery()
await testMetricsReporting()
```

## Rollback Plan

If issues occur during migration:

1. **Revert Package Installation**
   ```bash
   npm uninstall @happy-devkit/nexus-console
   ```

2. **Use Iframe Fallback**
   The app automatically falls back to iframe mode if the package isn't available

3. **Re-enable Placeholders**
   Uncomment placeholder implementations until issues are resolved

## Common Issues and Solutions

### Issue: Package Not Found
```
Cannot find module '@happy-devkit/nexus-console'
```
**Solution**: Package might not be published yet. Check npm registry.

### Issue: Type Conflicts
```
Type 'NexusConsoleComponent' is not assignable to...
```
**Solution**: Clear TypeScript cache: `rm -rf node_modules/.cache`

### Issue: Bridge Connection Failed
```
BridgeClient: Connection refused
```
**Solution**: Ensure bridge server is running on expected port.

### Issue: Metrics Not Sending
```
MetricsCollector: Failed to flush
```
**Solution**: Check bridge URL configuration and CORS settings.

## Verification Checklist

After migration, verify:

- [ ] Console component renders
- [ ] Terminal input/output works
- [ ] Resize functionality works
- [ ] Theme switching works
- [ ] Authentication passed correctly
- [ ] Metrics being collected
- [ ] Bridge discovery working
- [ ] No console errors
- [ ] TypeScript compilation passes
- [ ] Tests pass

## Support

If you encounter issues:

1. Check the package documentation
2. Review integration examples
3. Check browser console for errors
4. Verify environment variables
5. Test in isolation (standalone mode)

## Timeline

- **Package Publication**: Awaiting Nexus Console team
- **Migration Window**: 1-2 hours
- **Testing**: 2-4 hours
- **Production Deployment**: After successful staging tests