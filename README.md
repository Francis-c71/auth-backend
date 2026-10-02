# Auth Backend (Node.js + Express + MongoDB)

A complete authentication API: registration, email verification, login, rotating
refresh tokens, logout, password reset/change, role-based access control, and
brute-force protection.

## Quick start

```bash
npm install
cp .env.example .env        # then set JWT_ACCESS_SECRET
docker compose up -d        # optional: local MongoDB
npm run dev
```

In development (no `SMTP_HOST`), emails are printed to the console — copy the
verification/reset token from there.

Create an admin: `npm run create-admin -- "Admin" admin@example.com 'StrongPass123'`

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | – | `{name,email,password}` → sends verification email |
| POST | `/api/auth/verify-email` | – | `{token}` |
| POST | `/api/auth/resend-verification` | – | `{email}` |
| POST | `/api/auth/login` | – | `{email,password}` → access token + refresh cookie |
| POST | `/api/auth/refresh` | cookie | Rotates refresh token, returns new access token |
| POST | `/api/auth/logout` | cookie | Revokes current refresh token |
| POST | `/api/auth/logout-all` | Bearer | Revokes every session |
| POST | `/api/auth/forgot-password` | – | `{email}` |
| POST | `/api/auth/reset-password` | – | `{token,password}` (signs out all devices) |
| POST | `/api/auth/change-password` | Bearer | `{currentPassword,newPassword}` |
| GET | `/api/users/me` | Bearer | Current user |
| PATCH | `/api/users/me` | Bearer | `{name}` |
| GET | `/api/users?page=&limit=` | Admin | List users |
| PATCH | `/api/users/:id/role` | Admin | `{role: "user"|"admin"}` |
| GET | `/health` | – | Health check |

## Try it

```bash
curl -i -c jar.txt -X POST localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com","password":"Sup3rSecret"}'

# copy the token from the server console, then:
curl -X POST localhost:4000/api/auth/verify-email -H 'Content-Type: application/json' -d '{"token":"<TOKEN>"}'

curl -c jar.txt -X POST localhost:4000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"Sup3rSecret"}'

curl localhost:4000/api/users/me -H 'Authorization: Bearer <ACCESS_TOKEN>'
curl -b jar.txt -c jar.txt -X POST localhost:4000/api/auth/refresh
```

## How sessions work

- **Access token**: JWT (HS256), 15 min, sent in the `Authorization: Bearer` header. Keep it in memory on the client.
- **Refresh token**: random opaque string, 7 days, stored **hashed** in MongoDB and delivered as an
  `httpOnly`, `SameSite=Strict` cookie scoped to `/api/auth`.
- **Rotation + reuse detection**: every refresh consumes the token and issues a new one. Replaying an
  already-used token revokes the entire token family (the user must log in again).
- Password change/reset revokes all refresh tokens, and access tokens issued before the change are rejected.

## Security features

- bcrypt (cost 12) with 72-byte limit enforced; password complexity via Zod
- Account lockout after 5 failed logins (15 min), constant-time-ish login for unknown emails
- No user enumeration on forgot-password / resend-verification
- Verification and reset tokens are random, single-use, expiring, and stored hashed
- Helmet, CORS allow-list, 10kb body limit, strict Zod schemas (reject unknown fields, also blocks NoSQL operator injection)
- Rate limiting: global, per-auth-route, and stricter for email-sending routes
- Env validated at startup; stack traces hidden in production

## Production notes

- Serve over HTTPS (cookies are `Secure` when `NODE_ENV=production`).
- Behind a proxy/load balancer, set `TRUST_PROXY` so rate limiting sees real client IPs.
- Use a real SMTP provider, and a long random `JWT_ACCESS_SECRET` from a secrets manager.
- Mobile/non-browser clients: set `RETURN_REFRESH_TOKEN_IN_BODY=true` and send `{refreshToken}` in the body.
- The rate limiter uses in-memory storage; use a Redis store if you run multiple instances.
- Registration returns 409 for existing emails (better UX, but it does reveal that the email is registered).
