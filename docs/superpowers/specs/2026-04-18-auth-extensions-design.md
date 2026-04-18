# Auth Extensions Design

**Date:** 2026-04-18
**Status:** Approved

## Context

The app currently has basic email/password authentication via NextAuth v5 (JWT sessions) and bcrypt. Three features are needed: email verification on registration, Google OAuth sign-in, and password reset from the login page. The implementation uses Approach B — keep JWT sessions, manage tokens manually — to avoid NextAuth v5 Prisma Adapter instability and preserve the existing architecture.

## Decisions

- **Email provider:** Resend
- **Verification mode:** Soft — user can log in immediately, banner shown until verified
- **Google OAuth:** Separate accounts — Google users have no password and cannot switch to email/password
- **Expired tokens:** Cleaned lazily when a new token is requested for the same user
- **Session strategy:** JWT (unchanged)

## Schema Changes

File: `prisma/schema.prisma`

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String?   // nullable — Google users have no password
  emailVerified DateTime?
  oauthProvider String?   // "google" or null
  tasks         Task[]
  projects      Project[]
  tags          Tag[]
  createdAt     DateTime  @default(now())

  verificationTokens  EmailVerificationToken[]
}

model EmailVerificationToken {
  id        String   @id @default(cuid())
  token     String   @unique @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  token     String   @unique @default(cuid())
  email     String
  expiresAt DateTime
  createdAt DateTime @default(now())
}
```

## New Environment Variables

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=
NEXTAUTH_URL=http://localhost:3000
```

`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` come from Google Cloud Console (OAuth 2.0 credentials). The plan includes setup instructions.

## Feature 1: Email Verification

### Flow
1. `POST /api/register` — after user creation: delete any existing tokens for this user, create `EmailVerificationToken` (expires 24h), call `resend.emails.send()` with verification link `[NEXTAUTH_URL]/verify-email?token=xxx`
2. User opens link → `GET /api/verify-email?token=xxx` — check token exists and not expired → set `User.emailVerified = now()`, delete token, redirect to `/tasks`
3. If token expired → redirect to `/verify-email?error=expired` with message and resend button
4. If already verified → redirect to `/tasks` silently

### Resend endpoint
`POST /api/resend-verification` — auth required, delete all existing tokens for user, create new token, send email. Returns 200 always.

### Banner
Shown on `/tasks` (and other protected pages) when `session.user.emailVerified` is null. Orange style (background `#fff7ed`, border `#fed7aa`, text `#7c2d12`). Contains email address, "Отправить повторно" button, dismiss (×) button. Dismissing hides for the session only (not permanently — reappears on next login). Implemented with `useState` on the banner component — no localStorage needed.

Session must expose `emailVerified` — add to JWT callback and session callback in `src/auth.ts`.

## Feature 2: Google OAuth

### Flow
1. Add Google provider to `src/auth.ts`
2. In `signIn` callback:
   - If provider is "google": find user by email
   - If found with `oauthProvider !== "google"`: update `oauthProvider = "google"`, set `emailVerified = now()` (Google verifies email), return true
   - If not found: create new user with `email`, `password: null`, `oauthProvider: "google"`, `emailVerified: now()`
   - Return `{ id: user.id, email: user.email }`
3. Credentials provider authorize: check `user.password !== null` before bcrypt compare — Google users cannot log in via credentials

### UI changes
- Login page (`/login`): add "Войти через Google" button (white, border, Google G icon), separator "или"
- Register page (`/register`): add "Зарегистрироваться через Google" button, separator "или"

### Google Cloud setup (instructions in plan)
1. Create project at console.cloud.google.com
2. Enable Google+ API
3. Create OAuth 2.0 credentials (Web application)
4. Add authorized redirect URI: `[NEXTAUTH_URL]/api/auth/callback/google`
5. Copy Client ID and Secret to `.env`

## Feature 3: Password Reset

### Flow
1. Login page: add "Забыли пароль?" link (right-aligned, below password field) → navigates to `/forgot-password`
2. `/forgot-password` page: email input form → `POST /api/forgot-password`
3. `POST /api/forgot-password`:
   - Find user by email
   - If not found or `oauthProvider === "google"`: return 200 (no email sent — prevents enumeration)
   - Delete existing reset tokens for this email
   - Create `PasswordResetToken` (expires 1h)
   - Send email via Resend with link `[NEXTAUTH_URL]/reset-password?token=xxx`
   - Return 200 with success message ("Если аккаунт существует, письмо отправлено")
4. User opens link → `/reset-password?token=xxx` page: validate token server-side, show new password form if valid, error if invalid/expired
5. `POST /api/reset-password`: validate token, validate password (≥8 chars), hash with bcrypt, update `User.password`, delete token

### New pages
- `/forgot-password` — client component, email input, submit button, back link to `/login`
- `/reset-password` — client component, reads `token` from search params, new password + confirm inputs, submit button

## UI Summary

| Screen | Change |
|--------|--------|
| `/login` | Add Google button, add "Забыли пароль?" link |
| `/register` | Add Google button |
| `/tasks` (layout) | Add email verification banner (conditional) |
| `/forgot-password` | New page |
| `/reset-password` | New page |
| `/verify-email` | New page (handles token redirect) |

## Error Handling

| Case | Behavior |
|------|----------|
| Resend API error on registration | User created, no crash; banner allows resend |
| Expired verification token | Redirect to error page with resend button |
| Already verified | Silent redirect to /tasks |
| Reset email for unknown user | 200, no email (prevents enumeration) |
| Reset for Google user | 200, no email (Google users have no password) |
| Expired/invalid reset token | Show error on /reset-password |
| Password < 8 chars | Client + server validation |
| Google user tries credentials login | authorize() returns null (no password) |

## Testing

**Unit tests (Vitest, same patterns as existing tests):**
- `POST /api/register` — token created, Resend called with correct args
- `GET /api/verify-email` — valid token, expired token, already verified
- `POST /api/resend-verification` — auth required, new token replaces old
- `POST /api/forgot-password` — user exists, user not found, Google user
- `POST /api/reset-password` — valid token, expired token, weak password

**Mocks:**
- `resend.emails.send` — verify called with correct `to`, `subject`, link containing token
- Prisma — same pattern as existing API tests

**Manual E2E verification:**
1. Register → check Resend dashboard (test mode) → click link → banner disappears
2. Google sign-in → user created with `oauthProvider: "google"`, `emailVerified` set
3. Forgot password → email → new password → sign in succeeds
