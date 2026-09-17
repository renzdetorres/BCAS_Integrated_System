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
