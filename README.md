# PhysioDesk

A full-stack clinic management system for physiotherapy practices. Built with **FastAPI** (backend) and **Next.js ** (frontend), backed by **PostgreSQL**.


## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| Backend | Python 3.11+, FastAPI, SQLModel (built on SQLAlchemy) |
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS |
| Database | PostgreSQL |
| ORM / Migrations | SQLModel for models + Alembic for migrations (configured to use SQLModel metadata) |
| Auth | PyJWT , bcrypt  |

---

##  Authentication & Authorization

### Requirements Coverage (Section 3.1)

| Requirement | Status | Implementation |
|---|---|---|
| Email + password login with hashed passwords | ✅ | bcrypt with per-password salt |
| Token-based sessions (JWT) | ✅ | Dual access + refresh tokens, HS256 signed |
| 2+ roles enforced (not just UI-hidden) | ✅ | `require_admin` + `get_current_user` dependencies |
| All non-login routes require auth | ✅ | FastAPI dependency injection on every protected route |
| Frontend redirects to login when unauthenticated | ✅ | `ClientAppShell` guard + Axios interceptor logout |
| Frontend hides/disables role-restricted UI | ✅ | Conditional rendering based on `user.role` from `/auth/me` |
|  Refresh-token rotation | ✅ | `RefreshTokenBlock` table + replay detection |
|  Logout-everywhere | ✅ | `/auth/logout-all` via `token_version` increment |

### Password Hashing
Passwords are hashed using **bcrypt** directly (`bcrypt.gensalt()` + `bcrypt.hashpw()`). Each password gets its own cryptographically-secure random salt, stored alongside the hash. On login, `bcrypt.checkpw()` recomputes the hash and performs a constant-time comparison to prevent timing attacks.

### Dual-Token JWT Sessions
- **Access token**: short-lived (configurable, default 15 min), sent as `Authorization: Bearer <token>` on every request.
- **Refresh token**: long-lived (7 days), used only to call `/auth/refresh`.
- Both tokens signed with **HS256** using a server-side secret.
- Refresh tokens carry a unique `jti` generated via `secrets.token_hex(16)`.
- Both tokens embed the user's current `token_version` in the payload.

### Role-Based Access Control (RBAC)
Roles are enforced **at the API dependency layer**, not just the UI:
- `get_current_user` — validates the JWT, checks `token_version`, returns the `User`. Any authenticated user (admin or staff) can access routes using this dependency.
- `require_admin` — builds on `get_current_user` and additionally checks `user.role == "admin"`. Routes using this dependency reject non-admins with `403 Forbidden` **before the route logic ever runs**.

A receptionist with a perfectly valid token still gets `403` on admin-only endpoints like `/auth/signup` or therapist management — even via Postman. The UI just hides the buttons as UX polish; the real security is in the dependency.

### Global Logout (`/auth/logout-all`)
Each `User` has a `token_version` integer (default `1`), embedded in every JWT they receive. The logout endpoint increments this version in the database. The `get_current_user` dependency then rejects any incoming token whose embedded version doesn't match the current DB version — instantly invalidating every active session across every device, without needing an access-token blacklist.

### Refresh Token Rotation & Replay Prevention
Every refresh token has a unique `jti`. On `/auth/refresh`:
1. Backend decodes the token and extracts `jti`, `version`, and `sub`.
2. Checks that the token's `version` matches the user's current `token_version` (mismatch = session revoked globally).
3. Looks up the `jti` in the `RefreshTokenBlock` table:
   - **Not found** → legitimate. The `jti` is inserted into the blocklist, and a fresh access+refresh pair is issued. The old refresh token is now dead.
   - **Already found** → replay attack (someone is reusing a stolen token). Backend immediately increments `user.token_version` (triggering a global logout) and returns `400 Security breach detected`.

### Frontend Silent Refresh Queue
When the access token expires, multiple concurrent API calls can fail with `401` simultaneously. The Axios interceptor uses an `isRefreshing` flag and a `waitingRequests` queue:
- First `401` → sets `isRefreshing = true`, calls `/auth/refresh`.
- Subsequent `401`s → pushed into the queue (no duplicate refresh calls).
- Refresh succeeds → all queued requests are resolved with the new token and retried automatically.
- Refresh fails → `localStorage` is cleared and the user is redirected to `/login`.

---

# Coming Soon Modules

## Patients


## Scheduling


## Billing


## Therapists 

---

## Setup & Running

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+

### Backend
```bash
cd fastapi_backend
source .venv/bin/activate    # windows venv\Scripts\activate
uv sync
uv run alembic upgrade head
uv run seed.py

# Set environment variables (or create a .env file)
export DATABASE_URL="postgresql://user:pass@localhost:5432/physiodesk"
export JWT_SECRET_KEY="your-secret-key"
export ALGORITHM="HS256"
export ACCESS_TOKEN_EXPIRE_MINUTES=15

```


### Frontend
```bash
cd nextjs_frontend
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

npm run dev
```

