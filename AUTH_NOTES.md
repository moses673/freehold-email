# Authentication Implementation for Freehold Email

## Overview

A complete multi-user authentication system has been added to Freehold Email. Users must now sign in with email and password to access the application. All API endpoints (except webhooks and public unsubscribe) are protected.

## What Was Added

### 1. Database Changes

**New Table: `users`**
- `id` (INTEGER PRIMARY KEY)
- `email` (TEXT UNIQUE NOT NULL)
- `password_hash` (TEXT NOT NULL)
- `name` (TEXT)
- `created_at` (TEXT, auto-generated)

**Migration Script**
- `scripts/migrate-add-users.js` — Creates the users table if it doesn't exist (for existing installations)

### 2. Backend Changes

#### Dependencies Added
- `bcryptjs@^2.4.3` — Password hashing and verification
- `jsonwebtoken@^9.1.2` — JWT token generation and verification

#### Middleware
**File: `server/middleware/auth.js`**
- `requireAuth(req, res, next)` — Validates Bearer token and attaches user to request

#### Auth Routes
**File: `server/routes/auth.js`**
Implements four endpoints:

1. **POST `/api/auth/register`**
   - Body: `{ email, password, name }`
   - Validation: Email required, password min 8 chars
   - Returns JWT token and user object

2. **POST `/api/auth/login`**
   - Body: `{ email, password }`
   - Returns JWT token (expires in 7 days) and user object
   - Returns 401 on invalid credentials (generic error message)

3. **GET `/api/auth/me`**
   - Protected route
   - Returns current authenticated user

4. **POST `/api/auth/logout`**
   - Client-side token clearing endpoint
   - Returns `{ success: true }`

#### Route Protection
**File: `server/index.js`**
The following routes now require authentication:
- `/api/contacts` — POST, PUT, DELETE, GET (paginated)
- `/api/lists` — All operations
- `/api/templates` — All operations
- `/api/campaigns` — All operations
- `/api/analytics` — All operations

Public routes (no auth required):
- `/api/auth/*` — All auth endpoints
- `/api/webhooks` — Postmark webhooks
- `/unsubscribe` — Public unsubscribe link

#### JWT Configuration
- **Secret**: `process.env.JWT_SECRET` (defaults to `'freehold-dev-secret-change-in-production'`)
- **Expiry**: 7 days
- **Payload**: `{ userId, email, name }`

#### Default Admin User
**Seeding** (`scripts/seed-db.js`)
- Email: `admin@freehold.local`
- Password: `freehold2026`
- **IMPORTANT**: Change this password immediately in production

### 3. Frontend Changes

#### Dependencies
No new frontend dependencies were added (uses native `fetch` API).

#### Login Page
**File: `client/src/pages/LoginPage.jsx`**
- Clean, centered login form
- Email and password inputs
- Error display
- Demo credentials shown
- Stores JWT in `localStorage` as `freehold_token`
- User data stored as `freehold_user` (JSON)

#### Auth Hook
**File: `client/src/hooks/useAuth.js`**
- Manages authentication state
- Validates token on app load via `GET /api/auth/me`
- Provides `login()` and `logout()` functions
- Returns: `{ token, user, loading, isAuthenticated, login, logout }`

#### App.jsx Updates
**File: `client/src/App.jsx`**
- Shows `<LoginPage />` when not authenticated
- Shows loading spinner while checking auth status
- Passes user and logout callback to `<Navbar />`

#### Navbar Updates
**File: `client/src/components/Navbar.jsx`**
- Displays current user's name or email
- Shows logout button
- Button calls `onLogout()` to clear token and refresh app

#### API Hook Updates
**File: `client/src/hooks/useApi.js`**
- All API requests now include `Authorization: Bearer ${token}` header
- Token fetched from `localStorage` on each request

### 4. Environment Configuration

**File: `.env.example`**
Already includes:
```
JWT_SECRET=change-this-to-a-random-string
```

For production, generate a strong random secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Getting Started

### For Development

1. Install dependencies (at deploy time):
   ```bash
   npm install
   ```

2. Initialize and seed the database:
   ```bash
   npm run db:init
   npm run db:seed
   ```

3. Run the app:
   ```bash
   npm run dev
   ```

4. Login with:
   - Email: `admin@freehold.local`
   - Password: `freehold2026`

### For Existing Installations

Run the migration to add the users table:
```bash
npm run migrate
```

Then seed the default admin user (or create users via the API):
```bash
npm run db:seed
```

## Security Notes

### Development vs Production

**Development**
- Default JWT secret is used
- Default admin credentials are in seed data
- Demo mode shows credentials on login page

**Production**
1. Set `JWT_SECRET` to a strong random value in `.env`
2. Remove or change the default admin user password
3. Consider adding user registration endpoint (currently not exposed)
4. Use HTTPS for all communication
5. Set `NODE_ENV=production`

### Password Hashing

- Uses `bcryptjs` with 10 salt rounds
- Passwords are never stored in plain text
- Comparison is timing-attack resistant

### Token Security

- JWT tokens expire after 7 days
- Tokens are stored in `localStorage` (not HttpOnly due to SPA architecture)
- Consider adding token refresh mechanism for longer sessions
- On logout, token is cleared from `localStorage`

## API Integration

### Making Protected API Calls

The `useApi` hook automatically adds the Authorization header:

```js
const { request } = useApi();

// Token is automatically included
const contacts = await request('/api/contacts');
```

### Manual Fetch Calls

If using `fetch` directly:
```js
const token = localStorage.getItem('freehold_token');

fetch('/api/contacts', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
```

### Token Refresh

If a request fails with 401, the user is logged out. Consider implementing:
- Token refresh endpoint for longer sessions
- Refresh token rotation
- Silent token refresh before expiry

## Testing

### Login Test
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@freehold.local","password":"freehold2026"}'
```

### Protected Route Test
```bash
curl -X GET http://localhost:5000/api/contacts \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Future Enhancements

Potential features to add:
- User registration endpoint (for inviting team members)
- Multi-factor authentication (MFA)
- OAuth/SSO integration (Google, GitHub)
- Session management (user activity, concurrent sessions)
- Rate limiting on auth endpoints
- Password reset flow
- User roles and permissions (admin, user, viewer)
- Audit logging for auth events

## Files Changed/Created

### Created
- `server/middleware/auth.js`
- `server/routes/auth.js`
- `client/src/pages/LoginPage.jsx`
- `client/src/hooks/useAuth.js`
- `scripts/migrate-add-users.js`

### Modified
- `scripts/init-db.js` — Added users table
- `scripts/seed-db.js` — Added default admin user
- `server/index.js` — Added auth routes and protection
- `client/src/App.jsx` — Added auth flow
- `client/src/components/Navbar.jsx` — Added user menu
- `client/src/hooks/useApi.js` — Added Authorization header
- `package.json` — Added bcryptjs and jsonwebtoken dependencies

---

**Status**: Ready for deployment
**Last Updated**: April 2026
