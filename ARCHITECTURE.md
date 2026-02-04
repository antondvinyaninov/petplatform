# Main Service Architecture

> **Quick Reference Guide**  
> **Last Updated:** 03.02.2026

## 🎯 Quick Links

- 📋 [Full Specification](.kiro/specs/auth-cors-architecture/README.md)
- 🏗️ [Architecture Design](.kiro/specs/auth-cors-architecture/design.md)
- 🔧 [Troubleshooting Guide](.kiro/specs/auth-cors-architecture/troubleshooting.md)
- 🚀 [Deployment Guide](DEPLOYMENT.md)
- 🌐 [Gateway Documentation](gateway.md)

---

## Architecture Overview

### Development Mode

```
Frontend (3000) → Backend (8000) → PostgreSQL
                  ↑ DevAuthMiddleware validates JWT
```

### Production Mode

```
Frontend → Gateway → Backend → PostgreSQL
           ↑ Validates JWT
           ↑ Adds X-User-* headers
           ↑ Manages CORS
```

---

## Key Principles

### 1. Always Use apiClient

```typescript
// ✅ Correct
import { apiClient } from '@/lib/api';
const response = await apiClient.get('/api/posts');

// ❌ Wrong
const response = await fetch('http://localhost:8000/api/posts');
```

### 2. Gateway Manages CORS

- ✅ Gateway sets all CORS headers
- ❌ Backend does NOT set CORS headers
- ✅ Gateway filters CORS headers from backend

### 3. Different Auth for Dev/Prod

**Development:**
- Backend validates JWT locally (DevAuthMiddleware)
- Token from Authorization header or cookie

**Production:**
- Gateway validates JWT
- Gateway adds X-User-* headers
- Backend reads headers (AuthMiddleware)

### 4. Same JWT_SECRET Everywhere

```bash
# CRITICAL: Must match!
Gateway: JWT_SECRET=your-secret
Backend: JWT_SECRET=your-secret  # Same!
```

---

## Quick Commands

### Check Services

```bash
# Gateway
curl http://localhost/health

# Backend
curl http://localhost:8000/api/health

# Frontend
curl http://localhost:3000
```

### Test Authentication

```bash
# Login
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}' \
  -c cookies.txt

# Test protected route
curl http://localhost/api/posts -b cookies.txt
```

### Test CORS

```bash
# Preflight
curl -X OPTIONS http://localhost/api/posts \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -v

# Should return 200 OK with CORS headers
```

### Check Logs

```bash
# Backend
tail -f /tmp/main-backend.log

# Gateway
tail -f gateway/logs/gateway.log
```

---

## Common Issues

### 401 Unauthorized

**Causes:**
- Token expired (7 days)
- JWT_SECRET mismatch
- Token not sent (missing credentials)

**Solutions:**
1. Login again
2. Check JWT_SECRET matches
3. Use apiClient (handles credentials)

### CORS Errors

**Causes:**
- Backend also sets CORS (duplicate headers)
- Origin not in allowedOrigins
- Preflight blocked

**Solutions:**
1. Remove CORS from Backend
2. Add origin to Gateway allowedOrigins
3. Return 200 OK for OPTIONS

### Failed to Fetch

**Causes:**
- Service not running
- Wrong URL
- Network error

**Solutions:**
1. Start services: `./run`
2. Use apiClient (correct URLs)
3. Check network connectivity

---

## Environment Configuration

### Development

```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000

# backend/.env
JWT_SECRET=your-secret
ENVIRONMENT=development
```

### Production

```env
# frontend/.env.production
NEXT_PUBLIC_API_URL=  # Empty = relative paths

# backend/.env
JWT_SECRET=your-secret  # Same as Gateway!
ENVIRONMENT=production
```

---

## File Structure

```
main/
├── frontend/
│   ├── lib/
│   │   └── api.ts              # ✅ apiClient implementation
│   ├── .env.local              # Development config
│   └── .env.production         # Production config
│
├── backend/
│   ├── middleware/
│   │   ├── dev_auth.go         # ✅ Development auth
│   │   └── auth.go             # ✅ Production auth
│   ├── handlers/
│   │   └── *.go                # Use userID from context
│   └── .env                    # Backend config
│
└── .kiro/
    └── specs/
        └── auth-cors-architecture/
            ├── README.md       # 📋 Overview
            ├── design.md       # 🏗️ Detailed design
            ├── troubleshooting.md  # 🔧 Solutions
            └── tasks.md        # ✅ Implementation
```

---

## Best Practices

### Frontend

1. **Always use apiClient** - never direct fetch
2. **Handle 401 errors** - redirect to login
3. **Use relative paths in production** - NEXT_PUBLIC_API_URL=
4. **Check response.success** - before using data

### Backend

1. **Use correct middleware** - DevAuthMiddleware (dev), AuthMiddleware (prod)
2. **Read userID from context** - r.Context().Value("userID")
3. **Don't set CORS** - Gateway manages it
4. **Log authentication** - for debugging

### Gateway

1. **Validate JWT** - before proxying
2. **Add X-User-* headers** - for backend
3. **Manage CORS** - single source of truth
4. **Filter backend CORS** - prevent duplication

---

## Checklist

### Before Deploying

- [ ] JWT_SECRET matches everywhere
- [ ] NEXT_PUBLIC_API_URL configured correctly
- [ ] Backend uses AuthMiddleware (not DevAuthMiddleware)
- [ ] Backend doesn't set CORS headers
- [ ] Gateway allowedOrigins includes production URL
- [ ] All tests pass
- [ ] Logs show no errors

### After Deploying

- [ ] Login works
- [ ] Protected routes work
- [ ] No CORS errors
- [ ] No 401 errors
- [ ] Logs show successful authentication
- [ ] Performance acceptable

---

## Getting Help

1. **Check Troubleshooting Guide:** [troubleshooting.md](.kiro/specs/auth-cors-architecture/troubleshooting.md)
2. **Check Design Document:** [design.md](.kiro/specs/auth-cors-architecture/design.md)
3. **Check Logs:** `tail -f /tmp/main-backend.log`
4. **Run Diagnostics:** See commands above

---

## Related Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - How to deploy
- [STARTUP.md](STARTUP.md) - How to start locally
- [gateway.md](gateway.md) - Gateway documentation
- [README_API.md](README_API.md) - API documentation

---

**For detailed information, see the [full specification](.kiro/specs/auth-cors-architecture/README.md).**
