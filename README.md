# BCAS_Integrated_System

BCAS Integrated Scholarship and Admissions Application and Screening System.

## Structure

- `database/` - SQL Server schema (`schema.sql`)
- `backend/BCAS.Api/` - ASP.NET Core (C#) Web API
- `frontend/` - React (Vite) app

## BISAASS-8: Applicant Self-Service Registration

Public signup flow that always creates an Applicant account. Staff roles
(Evaluator, SupportStaff, AcademicHead, Admin) are never self-served and must
be provisioned separately by an Admin.

### Setup

1. **Database**: run `database/schema.sql` against a SQL Server instance.
   It creates the `BCAS` database, the `Roles` table (seeded with
   `Applicant`, `Evaluator`, `SupportStaff`, `AcademicHead`, `Admin`), and the
   `Users` table with a unique constraint on `Email`.

2. **Backend**:
   ```
   cd backend/BCAS.Api
   dotnet restore
   dotnet run
   ```
   Update the `ConnectionStrings:BcasDb` value in `appsettings.json` (or via
   an environment variable / `dotnet user-secrets`) to point at your SQL
   Server instance. Swagger UI is available at `/swagger` in Development.

3. **Frontend**:
   ```
   cd frontend
   npm install
   npm run dev
   ```
   Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to the backend's
   URL if it differs from the default.

### API

`POST /api/auth/register`

Request body:
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane.doe@example.com",
  "password": "at-least-8-characters"
}
```

- `201 Created` with the new account (id, name, email, role = `Applicant`).
- `400 Bad Request` for invalid/missing fields.
- `409 Conflict` if the email is already registered.

Passwords are hashed with BCrypt before being stored; the role is always
forced to `Applicant` server-side regardless of any input.

## BISAASS-9: Secure Login (BCrypt + JWT HttpOnly Cookie)

Login endpoint verifies email/password against the stored BCrypt hash and, on
success, issues a JWT stored in an HttpOnly cookie.

Set a real `Jwt:SigningKey` (32+ random bytes) via configuration or an
environment variable before deploying anywhere beyond local dev - the
placeholder in `appsettings.json` is not a secret.

### API

`POST /api/auth/login`

Request body:
```json
{
  "email": "jane.doe@example.com",
  "password": "at-least-8-characters"
}
```

- `200 OK` with the user's profile (id, name, email, role) and a JWT set on
  an HttpOnly, Secure, SameSite cookie (`bcas_auth`). The JWT encodes the
  user's id, email and role as claims for downstream authorization.
- `400 Bad Request` for invalid/missing fields.
- `401 Unauthorized` with the same generic message for an unknown email, a
  wrong password, or an inactive account - the response never reveals which
  case occurred, and the unknown-email path runs a dummy BCrypt check so it
  isn't distinguishable by timing either.

`GET /api/auth/me` (requires the `bcas_auth` cookie) returns the signed-in
user's profile, or `401 Unauthorized` without one. It exists to demonstrate
that requests are authenticated via the cookie, and is what BISAASS-10 uses
to prove logout works.

## BISAASS-10: Logout (Server-Side Cookie Clear)

`POST /api/auth/logout` clears the `bcas_auth` cookie server-side (an
expired, empty replacement) and always returns `204 No Content` - it's safe
to call whether or not a cookie is present.

This is a stateless-JWT logout: it stops the *browser* from sending the
token on future requests, which is what "subsequent requests are treated as
unauthenticated" means for a normal client. It does not maintain a
server-side revocation list, so a copy of the raw JWT taken before logout
would still validate until it naturally expires (`Jwt:ExpiryMinutes`) if
replayed directly - the ticket scopes this to clearing the cookie, not
token revocation.

Manual verification with `curl`:
```sh
curl -c cookies.txt -b cookies.txt -k https://localhost:7100/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane.doe@example.com","password":"at-least-8-characters"}'

curl -b cookies.txt -k https://localhost:7100/api/auth/me   # 200 OK

curl -c cookies.txt -b cookies.txt -k -X POST https://localhost:7100/api/auth/logout

curl -b cookies.txt -k https://localhost:7100/api/auth/me   # 401 Unauthorized
```

## BISAASS-11: Session Check Endpoint (Current User Email & Role)

Backend-wise this ticket is already satisfied by `GET /api/auth/me` (added
while building BISAASS-10): it returns `401` with no valid `bcas_auth`
cookie, and the signed-in user's email + role when there is one. No new
backend or SQL work was needed.

The new work is on the frontend: on app load, `SessionProvider`
(`frontend/src/context/SessionContext.jsx`) calls `GET /api/auth/me` once
and holds the result (or `null`) in React context. `RequireAuth`
(`frontend/src/components/RequireAuth.jsx`) guards the `/portal` route,
redirecting to `/login` while unauthenticated. `PortalPage` reads the
session's `role` and renders the matching portal label (Applicant,
Evaluator, Support Staff, Academic Head, or Admin-Registrar) - the "route to
the correct portal" behavior the ticket asks for. `LoginPage` writes the
logged-in user into the same context and navigates to `/portal` on success,
and redirects there immediately if a valid session already exists (e.g. the
user reloads `/login` while still signed in).

## BISAASS-12: Admin Staff Provisioning (Evaluator / SupportStaff / AcademicHead / Admin)

Admin-only capability to create staff accounts. These roles are never
self-served via public registration (`POST /api/auth/register` always
creates an `Applicant`).

No SQL changes were needed - the `Roles` table already has all five roles
seeded, and `Users` was already role-agnostic.

### API

`POST /api/admin/staff` - requires the `bcas_auth` cookie for a user with
the `Admin` role (`[Authorize(Roles = "Admin")]`).

Request body:
```json
{
  "firstName": "Jane",
  "lastName": "Evaluator",
  "email": "jane.evaluator@example.com",
  "password": "at-least-8-characters",
  "role": "Evaluator"
}
```

- `201 Created` with the new account (id, name, email, role). The account's
  password is BCrypt-hashed the same way as self-service registration, and
  it's immediately usable for login.
- `400 Bad Request` if `role` isn't one of `Evaluator`, `SupportStaff`,
  `AcademicHead`, `Admin` (`Applicant` included - that's registration-only).
- `401 Unauthorized` with no valid cookie; `403 Forbidden` with a valid
  cookie for a non-Admin role.
- `409 Conflict` if the email is already registered.

`RegisterResponse` and `LoginResponse` were consolidated into a single
`UserProfileResponse` (same shape, used by register/login/me/provision) to
avoid a third near-identical DTO.

### Frontend

`/admin/staff` is nested under both `RequireAuth` and a new `RequireRole`
guard (`frontend/src/components/RequireRole.jsx`), so a signed-in non-Admin
is bounced back to `/portal` - the server-side `[Authorize(Roles=...)]`
check is what actually enforces this, the client-side guard just avoids
showing the form to someone who can't use it. `PortalPage` links to it only
when `session.role === "Admin"`.
