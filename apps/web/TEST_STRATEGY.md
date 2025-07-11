# Happy Observatory Test Strategy Charter

## Scope & Goals
- Reach **80% line & branch coverage** on `main` by end of Q1 2025
- No new code may reduce coverage (CI gate enforced)
- Focus on high-value tests that validate business logic and user flows

## Test Pyramid Ratios
- **Unit Tests**: ~70% (pure functions, utilities, hooks)
- **Integration Tests**: ~20% (API routes, WebSocket flows)
- **E2E Tests**: ~10% (critical user journeys)

## Definition of Done
A PR is "green" only when:
1. ✅ ESLint/Prettier pass
2. ✅ TypeScript compiles (strict mode)
3. ✅ Unit tests pass
4. ✅ Integration tests pass
5. ✅ Coverage diff ≥ 0%
6. ✅ No high/critical security vulnerabilities

## Tooling Stack
- **Vitest** + jsdom for unit tests
- **React Testing Library** for component tests
- **MSW (Mock Service Worker)** for API mocking
- **supertest** for HTTP route testing
- **ws** mocks for WebSocket testing
- **Playwright** for E2E tests (future)
- **c8** for coverage reports

## Quality Gates
- **Phase 1** (Current → 30%): Focus on critical paths
- **Phase 2** (30% → 60%): Add integration tests
- **Phase 3** (60% → 80%): Complete coverage, add E2E
- **Maintenance**: 80% global, 70% per-file minimum

## Risks & Mitigations
| Risk | Mitigation |
|------|-----------|
| Flaky external APIs | MSW for consistent mocking |
| Complex auth flows | Contract tests with fixed tokens |
| WebSocket timing | Fake timers + event simulation |
| Database dependencies | In-memory stores for tests |

---

## Priority Matrix (Risk × Change Frequency)

### Tier 1: High-Risk, High-Change (Do First)
1. **Authentication & Security** ✅ (78.81% overall)
   - ✅ `auth-middleware.ts` (81% covered)
   - ✅ `rate-limit.ts` (62% covered)
   - ✅ `token-revocation.ts` (97% covered)
   - ✅ `password.ts` (100% covered)

2. **Core Business Logic**
   - ✅ `agent-control.ts` (partial coverage - singleton complexity)
   - ✅ `bridge-websocket.ts` (comprehensive tests written)
   - ✅ `project-store.ts` (95.34% covered)

3. **Critical User Flows**
   - ✅ `workspace-mode.tsx` (100% covered)
   - ✅ `workspace-layout.tsx` (100% covered)
   - ✅ `project-initializer.tsx` (100% covered)
   - ❌ `nexus-console.tsx` (0%)
   - ❌ `devkit-console.tsx` (0%)
   - ❌ `project-chooser.tsx` (0%)

### Tier 2: High-Risk, Low-Change
1. **Infrastructure**
   - ❌ `service-registry.ts` (0%)
   - ❌ `diagnostics.ts` (0%)
   - ✅ `audit-logger.ts` (100% covered)

2. **Data Persistence**
   - ❌ Telemetry routes (0%)
   - ❌ Project management routes (0%)

### Tier 3: Low-Risk, High-Change
1. **UI Components**
   - ❌ Dashboard components
   - ❌ Status monitors
   - ✅ Utility components (button, card)

### Tier 4: Low-Risk, Low-Change
1. **Static configs**
2. **Type definitions**
3. **Generated files**

---

## Sprint Plan

### Sprint 1 (Current)
- [x] Fix all TypeScript errors
- [x] Fix all failing tests
- [x] Add tests for Tier 1 security modules (78.81% coverage)
- [x] Set up MSW for API mocking
- [x] Add component test harness with RTL
- [x] Complete project-store.ts tests (95.34% coverage)
- [x] Add workspace component tests (3 components at 100%)

### Sprint 2
- [ ] Complete auth/security coverage (→ 90%)
- [ ] Add WebSocket tests with mocks
- [ ] Cover critical API routes
- [ ] Add mutation testing baseline

### Sprint 3
- [ ] Component tests for workspace
- [ ] Integration tests for console
- [ ] E2E happy path test
- [ ] Reach 60% overall coverage

### Sprint 4
- [ ] Complete remaining Tier 2 tests
- [ ] Add performance test suite
- [ ] Documentation coverage
- [ ] Achieve 80% target

---

## Team Responsibilities

| Area | Owner | Target |
|------|-------|--------|
| Security/Auth | Platform | 90% coverage |
| API Routes | Backend | 85% coverage |
| Components | Frontend | 75% coverage |
| WebSockets | Platform | 80% coverage |
| E2E Tests | QA | 5 critical paths |

---

## Success Metrics
- Coverage increases weekly
- No production bugs in tested code
- Test execution time < 2 minutes
- Zero flaky tests
- Developer confidence in refactoring

Last Updated: 2025-07-11

## Progress Summary
- ✅ Security modules: ~95% coverage (token-revocation, password, audit-logger)
- ✅ Core business logic: project-store (95.34%), bridge-websocket (tests written), agent-control (partial)
- ✅ Workspace components: 3 components at 100% coverage
- ✅ Test infrastructure: MSW setup, RTL component test harness
- 🎯 Next: Continue with remaining workspace components and API routes