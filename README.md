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

## BISAASS-16: Submit Admission Application

Adds an `AdmissionApplications` table (`database/schema.sql`): applicant,
application type, course, previous school, and a `Status` that starts at
`Submitted`. Nothing in this ticket's acceptance criteria limits an
applicant to one application, so multiple are allowed - the response lists
them most-recent-first. The `Status` `CHECK` constraint already allows
`UnderReview`/`Approved`/`Rejected` too, anticipating the evaluator
workflow (a later ticket) without a future schema change; no endpoint
transitions a status away from `Submitted` yet.

### API

Both endpoints require the `bcas_auth` cookie for the `Applicant` role and
act only on the caller's own applications.

`GET /api/admission-applications` - `200 OK` with the caller's own
applications, most recent first.

`POST /api/admission-applications`

Request body:
```json
{
  "applicationType": "NewStudent",
  "courseAppliedFor": "BS Computer Science",
  "previousSchool": "Balanga National High School"
}
```
- `201 Created` with the new application (`status: "Submitted"`).
- `400 Bad Request` if `applicationType` isn't `NewStudent` or `Transferee`,
  or if the applicant's profile isn't complete yet (reuses
  `IApplicantProfileRepository.ExistsAsync`, added in BISAASS-15 for
  exactly this check).

### Frontend

`/applications` (gated by `RequireRole(["Applicant"])`, replacing its
former `ComingSoonPage` placeholder) has the submit form plus a list of the
applicant's past applications with status badges. A profile-incomplete
error surfaces a link straight to `/profile`.

## BISAASS-17: Submit Scholarship Application

Adds two tables (`database/schema.sql`):

- `Scholarships` - the catalog of "slots" applicants apply against (name,
  type, `TotalSlots`/`RemainingSlots`, active flag). No admin-management
  endpoint exists for it yet, so it's seeded with three sample scholarships,
  the same way `Deadlines` was in BISAASS-14.
- `ScholarshipApplications` - applicant, chosen scholarship, grade average,
  and a `ScholarshipType` that's a *snapshot* of the scholarship's type at
  submission time (not re-entered by the applicant), so a later catalog
  edit never rewrites an already-submitted application's history.

Like BISAASS-16, submission is blocked until the applicant's profile is
complete - BISAASS-17's own acceptance criteria don't restate that, but
BISAASS-15's does in general terms ("application submission is blocked"),
so this keeps the rule consistent across both application types rather
than being an admission-only quirk.

The remaining-slots check has to be race-safe: two applicants submitting
for the last slot at the same moment must not both succeed. The reservation
is one atomic conditional `UPDATE ... SET RemainingSlots = RemainingSlots -
1 WHERE ScholarshipId = @Id AND IsActive = 1 AND RemainingSlots > 0`, and
only if that actually matched a row does the same transaction insert the
application - there's no separate "check, then act" read that a second
request could race between (`backend/BCAS.Api/Data/ScholarshipApplicationRepository.cs`).

### API

All three endpoints require the `bcas_auth` cookie for the `Applicant`
role.

`GET /api/scholarships` - `200 OK` with active scholarships that still have
at least one remaining slot.

`GET /api/scholarship-applications` - `200 OK` with the caller's own
scholarship applications, most recent first.

`POST /api/scholarship-applications`

Request body:
```json
{ "scholarshipId": 1, "gradeAverage": 95.5 }
```
- `201 Created` with the new application (`status: "Submitted"`).
- `400 Bad Request` if the profile is incomplete, the scholarship is
  inactive, or it has no remaining slots.
- `404 Not Found` if `scholarshipId` doesn't exist.

### Frontend

`/scholarships` (gated by `RequireRole(["Applicant"])`) lists open
scholarships with remaining-slot counts in a picker, a grade-average field,
and the applicant's own past scholarship applications with status badges.
On a successful submit it decrements the picked scholarship's remaining
count locally (and drops it from the picker at zero) rather than
re-fetching - the server-side count is the one that's actually
authoritative. Linked from the dashboard's quick links as "Scholarship
Application".

## BISAASS-20: Entrance Exam Schedule Selection

Applicant picks an entrance-exam schedule from a list of slots. Adds two
tables (`database/schema.sql`):

- `ExamSchedules` - the catalog of selectable slots (`DayType` of
  `Saturday`/`Weekday`, `ExamDate`, `ExamTime`, `Venue`, `IsOffered`). No
  admin-management endpoint exists for it yet, so it's seeded the same way
  `Deadlines` and `Scholarships` were. `Saturday` rows are always
  selectable regardless of `IsOffered` - that flag only gates `Weekday`
  rows, standing in for the "set by Admin-Registrar based on teacher
  availability" rule from this ticket's acceptance criteria until an admin
  UI for it exists. (`Venue` was added in BISAASS-21 for the exam permit.)
- `ExamScheduleSelections` - one-to-one with `Users` (like
  `ApplicantProfiles`, enforced via a `UNIQUE` constraint on `UserId`): an
  applicant has a single confirmed exam schedule, and selecting again
  replaces it rather than accumulating history. Its own surrogate
  `ExamScheduleSelectionId` (added in BISAASS-21) is what the exam permit's
  permit number is derived from.

### API

All endpoints require the `bcas_auth` cookie for the `Applicant` role.

`GET /api/exam-schedules` - `200 OK` with selectable schedules (every
Saturday row, plus Weekday rows with `isOffered: true`), soonest first.

`GET /api/exam-schedules/selection` - `200 OK` with the caller's confirmed
schedule, or `404 Not Found` if none has been selected yet.

`PUT /api/exam-schedules/selection`

Request body:
```json
{ "examScheduleId": 1 }
```
- `200 OK` with the confirmed schedule (`examScheduleId`, `dayType`,
  `examDate`, `examTime`, `selectedAt`). Calling this again with a
  different id replaces the previous selection.
- `400 Bad Request` if the id is a Weekday slot that isn't currently
  offered.
- `404 Not Found` if `examScheduleId` doesn't exist.

### Frontend

`/exam-schedule` (gated by `RequireRole(["Applicant"])`) shows the
applicant's confirmed date and time (once one is selected) above a picker
of the currently available schedules. Linked from the dashboard's quick
links as "Entrance Exam Schedule".

## BISAASS-21: Exam Permit View, Download & Rescheduling Request

Applicant views/downloads the permit for their confirmed entrance exam,
and can request to be rescheduled off it. Builds directly on
BISAASS-20's `ExamScheduleSelections` row - there's no separate "issue the
permit" step; a confirmed schedule *is* an issued permit, identified by a
permit number derived from the selection's own id
(`EP-` + `ExamScheduleSelectionId` zero-padded to 6 digits, e.g.
`EP-000001` - see `ExamPermitMappingExtensions`), so there's no separate
counter to keep in sync.

Adds one table (`database/schema.sql`):

- `ExamRescheduleRequests` - an applicant's request to move off their
  confirmed schedule (`Reason`, `Status`). A filtered unique index allows
  at most one `Pending` request per applicant at the database level,
  backing up the same check in `ExamRescheduleRequestRepository`. The
  `Status` `CHECK` constraint already allows `Approved`/`Rejected` too,
  anticipating the Admin-Registrar approval workflow (a later ticket, no
  UI yet) the same way `AdmissionApplications`/`ScholarshipApplications`
  anticipated their own future workflows - so once that ticket lands and
  approves a request by updating the applicant's `ExamScheduleSelections`
  row to a new schedule, `GET /api/exam-permit` picks it up automatically
  without further changes here, since it always reads the current
  selection live. Until then a request only ever reaches `Pending`.

"Downloadable/printable" is handled entirely client-side (`window.print()`
plus a `@media print` stylesheet that hides everything but the permit
card) rather than generating a PDF server-side - consistent with the
project having no PDF-generation dependency anywhere else (`ApplicantDocuments`
stores PDFs applicants upload, it doesn't produce them).

### API

All endpoints require the `bcas_auth` cookie for the `Applicant` role.

`GET /api/exam-permit` - `200 OK` with the caller's permit
(`permitNumber`, `examScheduleId`, `dayType`, `examDate`, `examTime`,
`venue`, `issuedAt`), or `400 Bad Request` if no schedule has been
selected yet (reuses BISAASS-20's `ExamScheduleSelections` lookup).

`GET /api/exam-permit/reschedule-request` - `200 OK` with the caller's
most recently submitted reschedule request (`requestId`, `reason`,
`status`, `submittedAt`), or `404 Not Found` if they've never submitted
one.

`POST /api/exam-permit/reschedule-request`

Request body:
```json
{ "reason": "I have a scheduling conflict on that date." }
```
- `201 Created` with the new request (`status: "Pending"`).
- `400 Bad Request` if no schedule has been selected yet, or if the caller
  already has a request awaiting a decision.

### Frontend

`/exam-permit` (gated by `RequireRole(["Applicant"])`) shows the permit
card (permit number, schedule, date, time, venue) with a "Print / Save as
PDF" button, and below it a reschedule section: a reason form when there's
no request pending, or a status badge (Pending/Approved/Rejected) with the
submitted reason otherwise. Prompts to pick a schedule first
(linking to `/exam-schedule`) if the applicant hasn't selected one.
Linked from the dashboard's quick links as "Exam Permit", and from
`/exam-schedule`'s confirmation banner once a schedule is selected.

## BISAASS-22: Application Tracking (Status & Document Reasons)

Applicant sees each application's current step in its workflow, plus the
per-document verification status and flagged/rejected reasons already
built for BISAASS-19. No schema changes were needed - every step is
derived on read from existing tables (`AdmissionApplications.Status`,
`ScholarshipApplications.Status`, `ExamScheduleSelections`, and the
document checklist), the same way BISAASS-11/13 needed no new SQL either.

`ApplicationTrackingService` (`backend/BCAS.Api/Services/ApplicationTrackingService.cs`)
maps each application onto its named workflow:

- Admission: `Submitted` → `DocumentsReceived` → `UnderReview` →
  `ExamScheduled` → `ExamCompleted` → `DecisionReleased`.
- Scholarship: `Submitted` → `DocumentsVerified` → `EligibilityScreening`
  → `Evaluation` → `Result`.

`UnderReview`/`ExamCompleted`/`EligibilityScreening`/`Evaluation` can only
be *inferred* right now - `UnderReview`/`EligibilityScreening` fire once
`Status` reaches `UnderReview`, and `ExamCompleted`/`Evaluation` fire
together with `DecisionReleased`/`Result` once `Status` reaches
`Approved`/`Rejected` - because no Admin-Registrar/Evaluator workflow
exists yet to set anything finer-grained (the same gap called out for
BISAASS-16/17's `Status` values). Once that workflow lands and starts
moving `Status` through its fuller range, these steps reflect it
automatically with no change needed here. `DocumentsReceived` means every
required document has been uploaded (any status but `NotSubmitted`);
`DocumentsVerified` is the stricter bar of every one being `Verified` -
both reuse `IApplicantDocumentService.GetMyChecklistAsync`, since
`ApplicantDocuments` is one checklist per applicant, not per application.

### API

`GET /api/application-tracking` - requires the `bcas_auth` cookie for the
`Applicant` role. `200 OK` with:

```json
{
  "admissionApplications": [
    {
      "applicationId": "...",
      "applicationType": "NewStudent",
      "courseAppliedFor": "BS Computer Science",
      "status": "Submitted",
      "steps": [
        { "step": "Submitted", "isComplete": true, "isCurrent": false },
        { "step": "DocumentsReceived", "isComplete": false, "isCurrent": true },
        { "step": "UnderReview", "isComplete": false, "isCurrent": false },
        { "step": "ExamScheduled", "isComplete": false, "isCurrent": false },
        { "step": "ExamCompleted", "isComplete": false, "isCurrent": false },
        { "step": "DecisionReleased", "isComplete": false, "isCurrent": false }
      ],
      "submittedAt": "2026-09-10T02:14:00Z"
    }
  ],
  "scholarshipApplications": [ /* same shape, with scholarshipName and the Scholarship steps */ ],
  "documents": { "applicationType": "NewStudent", "requirements": [ /* BISAASS-19's checklist shape */ ] }
}
```

`documents` is `null` if the applicant has no admission application yet
(there's no checklist to compute without one).

### Frontend

`/application-tracking` (gated by `RequireRole(["Applicant"])`) lists
every admission and scholarship application with a step "pill" tracker
(completed steps in green, the current step in blue), followed by the
document checklist with status badges and flagged reasons - reusing the
same status vocabulary and labels as `/documents`. Linked from the
dashboard's quick links as "Application Tracking".

## BISAASS-23: View Active Announcements (Applicant)

Applicant browses Admission/Scholarship announcements posted by staff.
Adds one table (`database/schema.sql`):

- `Announcements` - `Category` (`Admission`/`Scholarship`), `Title`,
  `Body`, and `IsActive`, which is what "currently-active" filters on.
  No admin-management endpoint exists for it yet, so it's seeded the same
  way `Deadlines` and `Scholarships` were - including one seeded row with
  `IsActive = 0`, kept specifically to demonstrate that inactive
  announcements are filtered out.

### API

`GET /api/announcements` - requires the `bcas_auth` cookie for the
`Applicant` role. `200 OK` with active announcements
(`announcementId`, `category`, `title`, `body`, `postedAt`), most
recently posted first.

### Frontend

The `/announcements` route (previously a shared `ComingSoonPage`
placeholder for every role) now branches by role through a new
`AnnouncementsRouter`, the same pattern `PortalRouter` uses for `/portal`:
an `Applicant` gets the real `AnnouncementsPage` (a list of announcements
with a category badge and posted date), every other role still sees the
placeholder until their own view exists. Already linked from the
dashboard's quick links as "Announcements" (added in BISAASS-14, pointing
at the placeholder until now).

## BISAASS-25: Application Confirmation Receipt (Download/Print)

Printable/downloadable receipt shown immediately after a successful
admission or scholarship application submission, and retrievable later
from application history. No backend or SQL changes were needed -
BISAASS-18's `GET /api/applications/history` already returns every field
the receipt needs (`applicationId`, `applicationType`/`scholarshipName`,
`status`, `submittedAt`) for both application categories in one response,
so the receipt is built entirely on the frontend from that existing
endpoint, the same way BISAASS-11/13 needed no backend work either.
"Downloadable/printable" is handled the same way BISAASS-21's exam permit
was: `window.print()` plus a `@media print` stylesheet, no server-side
PDF generation.

### Frontend

`/applications/receipt/:applicationId` (gated by
`RequireRole(["Applicant"])`) fetches the applicant's full application
history and renders the matching item as a receipt (application id,
category, type-specific detail, status, and a full date+time submission
timestamp) with a "Print / Save as PDF" button. Because it's a real,
directly-loadable route rather than transient state, it works the same
whether reached right after submitting, from a saved link, or after a
page refresh.

`AdmissionApplicationPage` and `ScholarshipApplicationPage` now navigate
straight to this route on a successful submit instead of updating their
own local list, satisfying "immediately after submission." `/applications/history`
(BISAASS-18) gained a "View / Print Receipt" link in its detail panel,
satisfying "retrievable later from application history."

## BISAASS-26: Applicant Settings (Profile & Password Management)

Profile field updates were already fully built in BISAASS-15 - this
ticket's new work is password changing plus folding both under a single
"Settings" screen. No new tables were needed: `Users.PasswordHash`
(BISAASS-8) is what a change overwrites.

`IUserRepository` gained `GetByIdAsync` (profile lookups so far only ever
went by email, for login) and `UpdatePasswordHashAsync`.
`IAuthService.ChangePasswordAsync` verifies `CurrentPassword` against the
stored BCrypt hash with `BCrypt.Verify` - the same check `LoginAsync`
already does - before hashing and storing `NewPassword` with
`BCrypt.HashPassword(..., workFactor: 12)`, identical to registration's
hashing. It lives on `IAuthService` rather than
`IApplicantProfileService` since it's password/`IUserRepository` logic,
colocated with `RegisterApplicantAsync`/`LoginAsync` which already do the
same hashing and verification; `ApplicantController` takes a second
`IAuthService` dependency to call it.

Changing the password does not revoke the caller's current session - the
existing JWT stays valid until it naturally expires, the same
stateless-JWT tradeoff BISAASS-10's logout already has.

### API

`PUT /api/applicant/password` - requires the `bcas_auth` cookie for the
`Applicant` role.

Request body:
```json
{ "currentPassword": "old-password-here", "newPassword": "at-least-8-characters" }
```
- `204 No Content` on success.
- `400 Bad Request` if `newPassword` is under 8 characters, or if
  `currentPassword` doesn't match the account's stored hash.

### Frontend

`/profile` (still gated by `RequireRole(["Applicant"])`, its route
unchanged since other pages link to it directly for "complete your
profile") is now a "Settings" page with two sections: the existing
Profile form unchanged, and a new Change Password form (current password,
new password, confirm new password - client-side checked for a match and
8-character minimum before the request is even sent, mirroring
`RegisterPage`'s validation). The dashboard's quick link label changed
from "My Profile" to "Settings" to match.
