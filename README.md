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

## BISAASS-13: Account Activation / Deactivation Toggle

Admin can deactivate or reactivate any account without deleting it. No SQL
changes were needed: `Users.IsActive` already existed (from BISAASS-8), and
`AuthService.LoginAsync` already rejects `!user.IsActive` (from BISAASS-9) -
so a deactivated account already couldn't log in before this ticket. What
was missing was a way for an Admin to actually flip that flag, and to see
the accounts to flip it on.

Toggling is a plain `UPDATE ... SET IsActive = @IsActive`, never a delete,
so no row and nothing that might later reference it (applications,
documents, evaluations, etc., once those tables exist) is ever removed or
orphaned.

### API

Both endpoints require the `bcas_auth` cookie for a user with the `Admin`
role.

`GET /api/admin/users` - `200 OK` with every account (id, name, email,
role, `isActive`).

`PATCH /api/admin/users/{userId}/status`

Request body:
```json
{ "isActive": false }
```
- `200 OK` with the updated account.
- `400 Bad Request` if `isActive` is omitted (it's required precisely so a
  malformed request can't silently deactivate an account by defaulting to
  `false`).
- `404 Not Found` if no account has that id.

`RegisterResponse`/`LoginResponse`'s replacement, `UserProfileResponse`,
now also carries `isActive`. The `User` &rarr; `UserProfileResponse`
mapping, which by this point was duplicated in four places, was pulled into
one `ToProfileResponse()` extension
(`backend/BCAS.Api/Mapping/UserMappingExtensions.cs`).

### Frontend

`/admin/users` (also gated by `RequireRole`) lists every account in a table
with an Activate/Deactivate button per row, calling the endpoints above.
The signed-in Admin's own row has its button disabled client-side, purely
as a footgun guard against accidental self-lockout - the API itself doesn't
forbid it.

## BISAASS-14: Applicant Dashboard

Landing dashboard for logged-in applicants: a personalized greeting,
upcoming deadlines, and quick links to My Application, Documents, and
Announcements.

Added a `Deadlines` table (`database/schema.sql`) seeded with one row each
for `ScholarshipDeadline`, `DocumentDeadline`, and `EnrollmentPeriod` - it's
read-only for now since there's no admin-management ticket for it yet.

### API

`GET /api/dashboard/deadlines` - requires the `bcas_auth` cookie for any
authenticated role (deadline info isn't role-sensitive; the dashboard
*page* is what's Applicant-only, enforced client-side).

`200 OK`:
```json
[
  { "type": "ScholarshipDeadline", "title": "Scholarship Application Deadline", "date": "2026-10-15" },
  { "type": "DocumentDeadline", "title": "Document Submission Deadline", "date": "2026-10-31" },
  { "type": "EnrollmentPeriod", "title": "Enrollment Period Opens", "date": "2026-11-01" }
]
```
Only deadlines on or after today are returned, ordered soonest first.

### Frontend

`/portal` now renders through `PortalRouter`
(`frontend/src/pages/PortalRouter.jsx`): an `Applicant` gets
`ApplicantDashboardPage`, every other role keeps seeing the existing
generic `PortalPage` (which doesn't have a dedicated view yet). The
greeting reuses `session.firstName` already held by `SessionContext` -
no extra request needed for that part. The three quick links point to
`/applications`, `/documents`, `/announcements`, which for now render a
shared `ComingSoonPage` placeholder - those are separate, not-yet-built
tickets (BISAASS-16 covers admission applications).

The logout handler, until now copy-pasted between `LoginPage` and
`PortalPage`, was pulled into a `useLogout()` hook
(`frontend/src/hooks/useLogout.js`) since the dashboard needed it too.

## BISAASS-15: Applicant Profile Setup & Management

One-time profile setup, viewable/editable any time afterward. Adds an
`ApplicantProfiles` table (`database/schema.sql`), one-to-one with `Users`.
Every column is required to save, so a row's mere existence *is* "profile
setup complete" - no separate flag to keep in sync. `FirstName`/`LastName`
stay on `Users` as the single source of truth; saving the profile updates
them there instead of duplicating them.

### API

Both endpoints require the `bcas_auth` cookie for the `Applicant` role, and
always act on the caller's own id (from the JWT's `sub` claim, never a
request parameter) - one applicant can't read or write another's profile.

`GET /api/applicant/profile` - `200 OK` with the profile, or `404 Not
Found` if setup hasn't been completed yet.

`PUT /api/applicant/profile`

Request body:
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "birthDate": "2005-03-12",
  "contactNumber": "09171234567",
  "addressLine": "123 Sampaguita St., Brgy. San Roque",
  "city": "Balanga",
  "province": "Bataan",
  "postalCode": "2100",
  "isBcasian": false
}
```
- `200 OK` with the saved profile (create or update - same endpoint).
- `400 Bad Request` for missing fields or a `birthDate` in the future.

Updating both `Users` (name) and `ApplicantProfiles` (everything else) is
wrapped in one SQL transaction so the two never disagree.

Extracted a `ClaimsPrincipal.GetUserId()` extension
(`backend/BCAS.Api/Extensions/ClaimsPrincipalExtensions.cs`) for reading
the JWT `sub` claim, replacing the inline version in `AuthController.Me()`
now that a second controller needs the same thing.

### Frontend

`/profile` (gated by `RequireRole(["Applicant"])`) shows a form seeded from
the existing profile, or blank (with the name pre-filled from the session)
if none exists yet. Linked from the dashboard's quick links as "My
Profile".
