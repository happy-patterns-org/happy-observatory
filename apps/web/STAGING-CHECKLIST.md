# Happy Observatory - Staging Deployment Checklist

## Pre-Deployment Steps

### 1. Environment Configuration
- [ ] Generate production secrets:
  ```bash
  # Generate JWT_SECRET
  openssl rand -hex 32
  
  # Generate SESSION_SECRET
  openssl rand -hex 32
  ```
- [ ] Create `.env.production`:
  ```env
  NODE_ENV=production
  JWT_SECRET=<generated-secret>
  SESSION_SECRET=<generated-secret>
  TRUST_PROXY_HEADERS=true  # Set based on your infrastructure
  NEXT_PUBLIC_BRIDGE_SERVER_URL=https://your-bridge-server.com
  NEXT_PUBLIC_USE_REAL_DATA=true
  ```

### 2. Security Review
- [ ] Verify all sensitive endpoints require authentication
- [ ] Test rate limiting with expected traffic patterns
- [ ] Confirm CSP headers don't break functionality
- [ ] Check CORS configuration for your domain
- [ ] Review audit logs are working correctly

### 3. Database/Storage Setup
- [ ] Configure Redis for production (rate limiting & token revocation)
- [ ] Set up user database with proper bcrypt hashes
- [ ] Configure session storage
- [ ] Set up log aggregation for audit logs

### 4. Build & Test
- [ ] Run production build:
  ```bash
  npm run build
  ```
- [ ] Run all tests:
  ```bash
  npm test
  npm run test:security
  npx playwright test
  ```
- [ ] Check for TypeScript errors:
  ```bash
  npx tsc --noEmit
  ```
- [ ] Run linter:
  ```bash
  npm run lint
  ```

### 5. Performance Testing
- [ ] Load test rate limiting:
  ```bash
  node scripts/hit-unique-ips.js --url https://staging.url --count 1000
  ```
- [ ] Monitor memory usage during load
- [ ] Check response times under load
- [ ] Verify rate limiter cleanup works

### 6. Integration Testing
- [ ] Test authentication flow end-to-end
- [ ] Verify project access controls work
- [ ] Test WebSocket connections with auth
- [ ] Confirm telemetry data flows correctly
- [ ] Test error handling and recovery

### 7. Monitoring Setup
- [ ] Configure alerts for:
  - Authentication failures
  - Rate limit violations
  - CSP violations
  - 5xx errors
  - High response times
- [ ] Set up dashboards for:
  - API request rates
  - Authentication metrics
  - Rate limiter statistics
  - Error rates

### 8. Documentation Updates
- [ ] Update API documentation with auth requirements
- [ ] Document rate limits for API consumers
- [ ] Create runbook for common issues
- [ ] Update client integration guides

## Deployment Steps

### 1. Pre-deployment
- [ ] Backup current production (if applicable)
- [ ] Notify users of maintenance window
- [ ] Prepare rollback plan

### 2. Deploy
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] Check all security headers
- [ ] Verify authentication works
- [ ] Test critical user flows

### 3. Production Deployment
- [ ] Deploy with zero-downtime strategy
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify security features active

### 4. Post-deployment
- [ ] Run full test suite against production
- [ ] Monitor for 24 hours
- [ ] Review security audit logs
- [ ] Update status page

## Rollback Plan

If issues arise:
1. [ ] Revert to previous deployment
2. [ ] Clear rate limiter state if needed
3. [ ] Invalidate all JWTs if auth issues
4. [ ] Review logs for root cause
5. [ ] Document lessons learned

## Security Verification

Post-deployment security checks:
- [ ] CSP headers present and correct
- [ ] Rate limiting active on all endpoints
- [ ] Authentication required where expected
- [ ] No sensitive data in logs
- [ ] HTTPS enforced
- [ ] Security headers validated

## Performance Baselines

Expected metrics:
- API response time: < 200ms p95
- Rate limiter overhead: < 5ms
- JWT verification: < 10ms
- Memory usage: < 512MB
- CPU usage: < 50% under normal load

## Contact Information

- Security Team: security@example.com
- DevOps: devops@example.com
- On-call: +1-555-0123

## Notes

- Rate limits are per-IP in production
- JWTs expire after 24 hours
- Token revocation takes effect immediately
- CSP nonces regenerate per request
- Audit logs retained for 90 days