# Week 2 - Test Coverage Improvement Plan

**Current Coverage**: 17.78%  
**Target Coverage**: 70%  
**Gap**: 52.22%

## Coverage Analysis

### Current State
- **Statements**: 15.79%
- **Branches**: 5.37%
- **Functions**: 15.87%
- **Lines**: 17.78%

### Well-Tested Areas
- `src/lib/validation.ts` - 90.24% statements
- `src/store/project-store.ts` - 66.66% statements (needs improvement)
- Some components have basic tests

### Critical Gaps (0% Coverage)
1. **API Routes** - All API endpoints untested
2. **Security Layer** - Auth middleware, rate limiting, token revocation
3. **WebSocket Handlers** - Real-time communication
4. **MCP Integration** - Model Context Protocol tools
5. **Hooks** - Custom React hooks
6. **Utilities** - Bridge WebSocket, broadcast monitor

## Testing Strategy

### Phase 1: API Route Testing (High Priority)
These are critical for application functionality:

1. **Authentication Routes**
   - `/api/auth/login`
   - `/api/auth/logout`
   - `/api/auth/check`

2. **Project Routes**
   - `/api/projects`
   - `/api/projects/scan`
   - `/api/projects/[projectId]/*`

3. **Agent Routes**
   - `/api/agents/status`
   - `/api/agents/command`

### Phase 2: Security Layer Testing (Critical)
1. **Middleware Tests**
   - Auth middleware validation
   - Rate limiting behavior
   - Token revocation

2. **Security Utils**
   - Password hashing
   - JWT handling
   - Audit logging

### Phase 3: Component Testing (Medium Priority)
1. **Complex Components**
   - Dashboard components
   - Workspace components
   - ScopeCam integration

2. **Hooks**
   - useProjects
   - useProjectWebSocket
   - useBridgeWebSocket

### Phase 4: Integration Tests
1. **WebSocket Communication**
   - Connection establishment
   - Message handling
   - Reconnection logic

2. **MCP Integration**
   - Tool discovery
   - Command execution
   - Error handling

## Implementation Plan

### 1. Set Up Testing Infrastructure
- Configure test environment variables
- Set up test database/mocks
- Configure WebSocket test server

### 2. Write Unit Tests
- Focus on high-value, low-complexity tests first
- Aim for 80%+ coverage on critical paths
- Use TDD for new features

### 3. Add Integration Tests
- Test API endpoints end-to-end
- Test WebSocket flows
- Test authentication flows

### 4. Create E2E Tests
- User journey tests
- Critical path testing
- Performance benchmarks

## Test Examples Needed

### API Route Test Example
```typescript
// src/app/api/auth/login/route.test.ts
describe('POST /api/auth/login', () => {
  it('returns JWT token for valid credentials', async () => {
    const response = await POST({
      username: 'test@example.com',
      password: 'validPassword'
    })
    
    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('token')
    expect(response.cookies).toContain('auth-token')
  })
  
  it('returns 401 for invalid credentials', async () => {
    const response = await POST({
      username: 'test@example.com',
      password: 'wrongPassword'
    })
    
    expect(response.status).toBe(401)
  })
})
```

### Component Test Example
```typescript
// src/components/dashboard-metrics.test.tsx
describe('DashboardMetrics', () => {
  it('displays agent metrics correctly', () => {
    const metrics = {
      activeAgents: 5,
      completedTasks: 100,
      successRate: 95.5
    }
    
    render(<DashboardMetrics metrics={metrics} />)
    
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('95.5%')).toBeInTheDocument()
  })
})
```

### Hook Test Example
```typescript
// src/hooks/useProjects.test.ts
describe('useProjects', () => {
  it('fetches and returns projects', async () => {
    const { result } = renderHook(() => useProjects())
    
    await waitFor(() => {
      expect(result.current.projects).toHaveLength(2)
      expect(result.current.loading).toBe(false)
    })
  })
})
```

## Metrics to Track

1. **Coverage Metrics**
   - Overall coverage percentage
   - Coverage by directory
   - Critical path coverage

2. **Test Quality**
   - Test execution time
   - Flaky test count
   - Test maintenance burden

3. **Business Impact**
   - Bugs caught by tests
   - Regression prevention
   - Developer confidence

## Timeline

### Week 2, Day 1-2
- Set up testing infrastructure
- Write API route tests
- Achieve 40% coverage

### Week 2, Day 3-4
- Add security layer tests
- Add component tests
- Achieve 55% coverage

### Week 2, Day 5
- Add integration tests
- Final push to 70%+
- Document testing patterns

## Success Criteria

1. **70%+ overall test coverage**
2. **100% coverage on critical paths** (auth, security)
3. **All tests passing in CI**
4. **Test execution < 5 minutes**
5. **Clear testing documentation**

---

*This plan will guide the test coverage improvement effort for Week 2 of the governance implementation.*