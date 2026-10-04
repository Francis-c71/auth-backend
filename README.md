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


## Use Cases

### `POST /api/auth/register`
**When to call it:** A new visitor fills out a sign-up form (name, email, password).
**What happens:** An account is created in an unverified state and a verification email is sent.
**Example scenario:** Someone signs up for your app for the first time. They won't be able to log in yet — they need to verify their email first (unless `REQUIRE_EMAIL_VERIFICATION=false`).

### `POST /api/auth/verify-email`
**When to call it:** The user clicks the verification link in their email, which opens your frontend at `/verify-email?token=...`. The frontend reads the token from the URL and posts it here.
**What happens:** The account is marked verified and the token is destroyed (single-use).
**Example scenario:** Confirming the person owns the email address before letting them log in — prevents fake/typo'd emails from being used to create accounts.

### `POST /api/auth/resend-verification`
**When to call it:** The user says "I didn't get the email" or the original verification link expired (24h).
**What happens:** If the account exists and isn't already verified, a new token is generated and emailed. Otherwise, nothing happens — but the response looks identical either way.
**Example scenario:** A "Resend verification email" button on a "please verify your email" screen.

### `POST /api/auth/login`
**When to call it:** A returning, verified user enters their email and password.
**What happens:** Credentials are checked, failed attempts are tracked (lockout after 5), and on success an access token + refresh cookie are issued.
**Example scenario:** Standard sign-in form. Also the first call a mobile app makes before storing tokens locally.

### `POST /api/auth/refresh`
**When to call it:** Automatically, by your frontend, whenever an API call returns 401 because the access token expired (every 15 min) — or proactively on app load to restore a session.
**What happens:** The refresh token is rotated (old one destroyed, new one issued) and a new access token is returned.
**Example scenario:** A user has the app open for hours. Instead of forcing re-login every 15 minutes, the frontend silently refreshes in the background.

### `POST /api/auth/logout`
**When to call it:** User clicks "Log out" on their current device/browser.
**What happens:** Only the current session's refresh token is revoked; other devices stay logged in.
**Example scenario:** Logging out of your laptop while staying logged in on your phone.

### `POST /api/auth/logout-all`
**When to call it:** User clicks "Log out of all devices" (often shown after a "where you're logged in" security page).
**What happens:** Every refresh token for that user is revoked.
**Example scenario:** The user suspects someone else has access to their account, or they just want a clean slate across all sessions.

### `POST /api/auth/forgot-password`
**When to call it:** User clicks "Forgot password?" on the login screen and submits their email.
**What happens:** If the account exists, a reset link is emailed. The response is identical whether or not the account exists (prevents email enumeration).
**Example scenario:** User can't remember their password and needs a reset link sent to their inbox.

### `POST /api/auth/reset-password` 
**When to call it:** User clicks the link from the forgot-password email (`/reset-password?token=...`) and submits a new password.
**What happens:** Password is updated, the account is marked verified, lockouts are cleared, and **every device is signed out** (forces re-login everywhere with the new password).
**Example scenario:** Completing a password reset after being locked out of an old password.

### `POST /api/auth/change-password`
**When to call it:** A logged-in user updates their password from an account/security settings page (requires entering their current password).
**What happens:** Password is updated, all other sessions are revoked, but the current device gets a fresh session so the user isn't logged out of the device they're using.
**Example scenario:** Routine password change as a security best practice, or after suspecting their password was compromised.

### `GET /api/users/me`
**When to call it:** Right after login, or whenever the frontend needs the current user's profile (e.g., loading a dashboard, showing the user's name/avatar in a navbar).
**What happens:** Returns the logged-in user's profile from their access token — no extra lookup needed on the client side.
**Example scenario:** Populating "Welcome back, Ada" on page load.

### `PATCH /api/users/me`
**When to call it:** User edits their profile (currently just their name) in an account settings page.
**What happens:** Updates the name field on their own account only — they can't touch anything else (email, password, role) through this route.
**Example scenario:** User changes how their name displays after getting married, a typo fix, etc.

### `GET /api/users?page=&limit=`
**When to call it:** An admin opens a "Manage users" dashboard.
**What happens:** Returns a paginated list of all users. Requires the `admin` role — a regular user gets a 403.
**Example scenario:** Admin wants to see how many users signed up, search through accounts, or review activity.

### `PATCH /api/users/:id/role`
**When to call it:** An admin promotes a user to admin, or demotes an admin back to a regular user.
**What happens:** Updates the target user's role and force-logs them out everywhere (so the role change takes effect immediately, cleanly). Admins can't change their own role this way (prevents accidental self-demotion/lockout).
**Example scenario:** Promoting a trusted team member to admin so they can manage the user list too.

### `GET /health`
**When to call it:** Not called by end users — used by uptime monitors, load balancers, or deployment tools (Docker, Kubernetes, Render, etc.) to check if the server is alive.
**What happens:** Returns `{ "status": "ok" }` immediately, no auth, no DB check.
**Example scenario:** Your hosting platform pings this every few seconds to decide whether to restart the container or route traffic to it.

## Try it

All commands use `-c jar.txt -b jar.txt` to save/send the refresh-token cookie, so run them from the same folder in order. Replace `<...>` placeholders with real values as you go.

### 1. Health check
```bash
curl localhost:4000/health
```

### 2. Register
```bash
curl -i -c jar.txt -X POST localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com","password":"Sup3rSecret1"}'
```
Check your server console for the printed verification email (dev mode with no SMTP configured) and copy the token.

### 3. Verify email
```bash
curl -X POST localhost:4000/api/auth/verify-email \
  -H 'Content-Type: application/json' \
  -d '{"token":"<VERIFY_TOKEN>"}'
```

### 4. Resend verification (if the link expired or didn't arrive)
```bash
curl -X POST localhost:4000/api/auth/resend-verification \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com"}'
```

### 5. Login
```bash
curl -i -c jar.txt -X POST localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"Sup3rSecret1"}'
```
Copy the `accessToken` from the JSON response. The refresh token is saved automatically in `jar.txt` as a cookie.

### 6. Get current user (protected route)
```bash
curl localhost:4000/api/users/me \
  -H 'Authorization: Bearer <ACCESS_TOKEN>'
```

### 7. Update current user's name
```bash
curl -X PATCH localhost:4000/api/users/me \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace"}'
```

### 8. Refresh the access token
```bash
curl -i -b jar.txt -c jar.txt -X POST localhost:4000/api/auth/refresh
```
This rotates the refresh cookie in `jar.txt` and returns a new `accessToken` — use that for subsequent requests.

### 9. Change password (while logged in)
```bash
curl -i -b jar.txt -c jar.txt -X POST localhost:4000/api/auth/change-password \
  -H 'Authorization: Bearer <ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"currentPassword":"Sup3rSecret1","newPassword":"EvenSecurer2"}'
```
This logs out every other device and returns a fresh access token + refresh cookie for this one.

### 10. Forgot password (simulate losing access)
```bash
curl -X POST localhost:4000/api/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com"}'
```
Copy the reset token printed in the server console.

### 11. Reset password
```bash
curl -i -X POST localhost:4000/api/auth/reset-password \
  -H 'Content-Type: application/json' \
  -d '{"token":"<RESET_TOKEN>","password":"BrandNewPass3"}'
```
This signs out every device, so you'll need to log in again after this.

### 12. Log in again with the new password
```bash
curl -i -c jar.txt -X POST localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ada@example.com","password":"BrandNewPass3"}'
```

### 13. Log out (current device only)
```bash
curl -i -b jar.txt -c jar.txt -X POST localhost:4000/api/auth/logout
```

### 14. Log out of all devices
```bash
curl -i -b jar.txt -X POST localhost:4000/api/auth/logout-all \
  -H 'Authorization: Bearer <ACCESS_TOKEN>'
```

### 15. Admin: list users
First promote your account to admin from the server (not via the API):
```bash
npm run create-admin -- "Ada Lovelace" ada@example.com 'BrandNewPass3'
```
Then log in again to get a fresh access token with the `admin` role, and:
```bash
curl "localhost:4000/api/users?page=1&limit=20" \
  -H 'Authorization: Bearer <ADMIN_ACCESS_TOKEN>'
```

### 16. Admin: change a user's role
```bash
curl -i -X PATCH localhost:4000/api/users/<USER_ID>/role \
  -H 'Authorization: Bearer <ADMIN_ACCESS_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"role":"admin"}'
```
`<USER_ID>` is the `id` field from a user object returned by step 15. You'll get a 400 if you try this on your own account.


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
