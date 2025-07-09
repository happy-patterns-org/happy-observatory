# API Authentication Matrix

## Overview
This document defines the authentication requirements for all API endpoints in Happy Observatory.

## Authentication Modes
- **Public**: No authentication required
- **Required**: Valid JWT token required
- **Optional**: JWT token optional, provides additional features when present
- **Admin**: Valid JWT token with admin permissions required

## API Endpoints

### Public Endpoints (No Auth)
| Endpoint | Method | Description |
|----------|---------|-------------|
| `/api/health` | GET | Health check endpoint |
| `/api/auth/login` | POST | User login |

### Protected Endpoints (Auth Required)
| Endpoint | Method | Auth Mode | Permissions | Description |
|----------|---------|-----------|-------------|-------------|
| `/api/projects` | GET | Required | read | List all projects |
| `/api/projects/[projectId]` | GET | Required | read, project access | Get project details |
| `/api/projects/[projectId]/agents/status` | GET | Required | read, project access | Get agent status |
| `/api/projects/[projectId]/agents/command` | POST | Required | write, project access | Send agent command |
| `/api/projects/[projectId]/console/execute` | POST | Required | write, project access | Execute console command |
| `/api/projects/[projectId]/telemetry/metrics` | GET | Required | read, project access | Get telemetry metrics |
| `/api/projects/[projectId]/scan` | POST | Required | write, project access | Scan project |
| `/api/projects/[projectId]/check-scopecam` | GET | Required | read, project access | Check ScopeCam |
| `/api/projects/[projectId]/check-submodules` | GET | Required | read, project access | Check submodules |
| `/api/telemetry/metrics` | GET | Required | read | Get global telemetry |
| `/api/agents/[agentId]/control` | POST | Required | write | Control agent |
| `/api/agents/[agentId]/status` | GET | Required | read | Get agent status |

### Admin Endpoints
| Endpoint | Method | Auth Mode | Permissions | Description |
|----------|---------|-----------|-------------|-------------|
| `/api/admin/users` | GET | Required | admin | List all users |
| `/api/admin/tokens/revoke` | POST | Required | admin | Revoke JWT tokens |

## Implementation Status

### Correctly Implemented ✅
- `/api/auth/login` - Public endpoint with rate limiting
- `/api/projects` - Protected with auth middleware
- `/api/projects/[projectId]/agents/status` - Protected with auth and project validation

### Needs Implementation 🔧
- `/api/health` - Currently has rate limiting but no auth (correct)
- `/api/telemetry/metrics` - Needs auth middleware
- `/api/agents/[agentId]/control` - Needs auth middleware
- `/api/agents/[agentId]/status` - Needs auth middleware
- Admin endpoints - Need to be created

## Test Coverage

### Unit Tests
- [ ] Auth middleware tests
- [ ] Project validation tests
- [ ] Permission checks

### Integration Tests (Playwright)
- [x] Authentication required test
- [x] Invalid JWT rejected test
- [x] Rate limit headers test
- [ ] Permission denied test (403)
- [ ] Admin endpoint tests

## Security Considerations

1. **JWT Expiration**: Tokens expire after 24 hours
2. **Revocation**: JTI-based revocation supported
3. **Rate Limiting**: Applied to all endpoints with different limits
4. **CORS**: Only same-origin requests allowed
5. **Project Access**: Users can only access assigned projects (except admin)

## Example Auth Flow

```typescript
// 1. Login
POST /api/auth/login
{
  "username": "developer",
  "password": "dev123"
}

// Response
{
  "token": "eyJ...",
  "user": {
    "userId": "developer",
    "permissions": ["read", "write"],
    "projectIds": ["devkit", "scopecam"]
  }
}

// 2. Use token in subsequent requests
GET /api/projects
Authorization: Bearer eyJ...

// 3. Access project-specific endpoint
GET /api/projects/devkit/agents/status
Authorization: Bearer eyJ...
```