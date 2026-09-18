-- =============================================================================
-- BCAS Integrated System - Core Auth Schema
-- Target: Microsoft SQL Server
-- Covers: BISAASS-8 Applicant Self-Service Registration
-- =============================================================================

IF DB_ID(N'BCAS') IS NULL
BEGIN
    CREATE DATABASE BCAS;
END
GO

USE BCAS;
GO

-- -----------------------------------------------------------------------------
-- Roles
-- Applicant is the only role self-service registration is allowed to assign.
-- Staff roles (Evaluator, SupportStaff, AcademicHead, Admin) are provisioned
-- separately by an Admin (out of scope for this ticket).
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.Roles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Roles
    (
        RoleId      INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_Roles PRIMARY KEY,
        RoleName    NVARCHAR(50)    NOT NULL,
        CONSTRAINT UQ_Roles_RoleName UNIQUE (RoleName)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE RoleName = N'Applicant')
    INSERT INTO dbo.Roles (RoleName) VALUES (N'Applicant');
IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE RoleName = N'Evaluator')
    INSERT INTO dbo.Roles (RoleName) VALUES (N'Evaluator');
IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE RoleName = N'SupportStaff')
    INSERT INTO dbo.Roles (RoleName) VALUES (N'SupportStaff');
IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE RoleName = N'AcademicHead')
    INSERT INTO dbo.Roles (RoleName) VALUES (N'AcademicHead');
IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE RoleName = N'Admin')
    INSERT INTO dbo.Roles (RoleName) VALUES (N'Admin');
GO

-- -----------------------------------------------------------------------------
-- Users
-- Email is unique (case-insensitive, via the default CI_AS collation) so
-- duplicate registrations are rejected at the database level in addition to
-- the application-level pre-check.
-- PasswordHash stores a BCrypt hash - the API layer never stores plaintext.
--
-- BISAASS-38 Account Management (All Roles): admin create/list/edit/
-- activate-deactivate all read and write this same table (and FK into
-- dbo.Roles, which already seeds all five roles above) - no schema change
-- was needed for that ticket.
--
-- BISAASS-46 Evaluator Settings: self-service profile edit and password
-- change also read/write this same table (UserRepository.UpdateProfileAsync
-- and AuthService.ChangePasswordAsync, reused from BISAASS-46 and the
-- applicant-facing settings respectively) - again no schema change needed.
-- UpdateProfileAsync never touches RoleId, unlike the admin-only
-- UpdateAsync from BISAASS-38, so self-service can never grant a role
-- change.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users
    (
        UserId          UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Users_UserId DEFAULT NEWID(),
        FirstName       NVARCHAR(100)    NOT NULL,
        LastName        NVARCHAR(100)    NOT NULL,
        Email           NVARCHAR(256)    COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
        PasswordHash    NVARCHAR(200)    NOT NULL,
        RoleId          INT              NOT NULL,
        IsActive        BIT              NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1),
        CreatedAt       DATETIME2(3)     NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2(3)     NOT NULL CONSTRAINT DF_Users_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Users PRIMARY KEY (UserId),
        CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleId) REFERENCES dbo.Roles (RoleId),
        CONSTRAINT UQ_Users_Email UNIQUE (Email)
    );

    CREATE NONCLUSTERED INDEX IX_Users_Email ON dbo.Users (Email);
END
GO

-- -----------------------------------------------------------------------------
-- Deadlines
-- Drives the "upcoming deadlines" list on the applicant dashboard (BISAASS-14).
-- Read-only for now - no admin management UI exists yet, rows are seeded here.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.Deadlines', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Deadlines
    (
        DeadlineId      INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_Deadlines PRIMARY KEY,
        DeadlineType    NVARCHAR(50)    NOT NULL,
        Title           NVARCHAR(200)   NOT NULL,
        DeadlineDate    DATE            NOT NULL,
        CreatedAt       DATETIME2(3)    NOT NULL CONSTRAINT DF_Deadlines_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_Deadlines_DeadlineType CHECK (DeadlineType IN (N'ScholarshipDeadline', N'DocumentDeadline', N'EnrollmentPeriod'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Deadlines WHERE DeadlineType = N'ScholarshipDeadline')
    INSERT INTO dbo.Deadlines (DeadlineType, Title, DeadlineDate) VALUES (N'ScholarshipDeadline', N'Scholarship Application Deadline', '2026-10-15');
IF NOT EXISTS (SELECT 1 FROM dbo.Deadlines WHERE DeadlineType = N'DocumentDeadline')
    INSERT INTO dbo.Deadlines (DeadlineType, Title, DeadlineDate) VALUES (N'DocumentDeadline', N'Document Submission Deadline', '2026-10-31');
IF NOT EXISTS (SELECT 1 FROM dbo.Deadlines WHERE DeadlineType = N'EnrollmentPeriod')
    INSERT INTO dbo.Deadlines (DeadlineType, Title, DeadlineDate) VALUES (N'EnrollmentPeriod', N'Enrollment Period Opens', '2026-11-01');
GO

-- -----------------------------------------------------------------------------
-- ApplicantProfiles
-- One-to-one with Users (BISAASS-15). A row's existence IS "profile setup
-- complete" - every column here is required, so there's no partial/complete
-- flag to keep in sync. Name (FirstName/LastName) stays on dbo.Users as the
-- single source of truth; profile save updates it there rather than
-- duplicating it here.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.ApplicantProfiles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ApplicantProfiles
    (
        UserId          UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ApplicantProfiles PRIMARY KEY,
        BirthDate       DATE             NOT NULL,
        ContactNumber   NVARCHAR(30)     NOT NULL,
        AddressLine     NVARCHAR(200)    NOT NULL,
        City            NVARCHAR(100)    NOT NULL,
        Province        NVARCHAR(100)    NOT NULL,
        PostalCode      NVARCHAR(20)     NOT NULL,
        IsBcasian       BIT              NOT NULL CONSTRAINT DF_ApplicantProfiles_IsBcasian DEFAULT (0),
        CreatedAt       DATETIME2(3)     NOT NULL CONSTRAINT DF_ApplicantProfiles_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2(3)     NOT NULL CONSTRAINT DF_ApplicantProfiles_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_ApplicantProfiles_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId)
    );
END
GO

-- -----------------------------------------------------------------------------
-- AdmissionApplications
-- One applicant may submit more than one (e.g. different courses); nothing
-- in BISAASS-16's acceptance criteria limits it to one. Status starts and,
-- for now, stays at 'Submitted' - the wider set in the CHECK constraint
-- anticipates the evaluator workflow (a later ticket) without needing a
-- schema change when it lands.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.AdmissionApplications', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AdmissionApplications
    (
        ApplicationId       UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_AdmissionApplications_ApplicationId DEFAULT NEWID(),
        UserId              UNIQUEIDENTIFIER NOT NULL,
        ApplicationType     NVARCHAR(20)     NOT NULL,
        CourseAppliedFor    NVARCHAR(200)    NOT NULL,
        PreviousSchool      NVARCHAR(200)    NOT NULL,
        Status              NVARCHAR(30)     NOT NULL CONSTRAINT DF_AdmissionApplications_Status DEFAULT (N'Submitted'),
        SubmittedAt         DATETIME2(3)     NOT NULL CONSTRAINT DF_AdmissionApplications_SubmittedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_AdmissionApplications PRIMARY KEY (ApplicationId),
        CONSTRAINT FK_AdmissionApplications_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId),
        CONSTRAINT CK_AdmissionApplications_ApplicationType CHECK (ApplicationType IN (N'NewStudent', N'Transferee')),
        CONSTRAINT CK_AdmissionApplications_Status CHECK (Status IN (N'Submitted', N'UnderReview', N'Approved', N'Rejected'))
    );

    CREATE NONCLUSTERED INDEX IX_AdmissionApplications_UserId ON dbo.AdmissionApplications (UserId);
END
GO

-- -----------------------------------------------------------------------------
-- Scholarships
-- The catalog of scholarship "slots" applicants can apply against (BISAASS-17).
-- No admin-management endpoint exists yet, so rows are seeded here, same as
-- Deadlines. RemainingSlots is decremented atomically on each accepted
-- application (see ScholarshipApplicationRepository) - the CHECK constraint
-- is a belt-and-suspenders backstop against it ever going negative or above
-- TotalSlots.
--
-- BISAASS-45 Scholarship Slots Read-Only View (Evaluator) reads TotalSlots/
-- RemainingSlots straight off this table (Occupied = TotalSlots -
-- RemainingSlots, computed in ScholarshipMappingExtensions) - no schema
-- change was needed for that ticket, and it exposes no write endpoint.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.Scholarships', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Scholarships
    (
        ScholarshipId    INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_Scholarships PRIMARY KEY,
        Name             NVARCHAR(200)   NOT NULL,
        ScholarshipType  NVARCHAR(100)   NOT NULL,
        TotalSlots       INT             NOT NULL,
        RemainingSlots   INT             NOT NULL,
        IsActive         BIT             NOT NULL CONSTRAINT DF_Scholarships_IsActive DEFAULT (1),
        CreatedAt        DATETIME2(3)    NOT NULL CONSTRAINT DF_Scholarships_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_Scholarships_RemainingSlots CHECK (RemainingSlots >= 0 AND RemainingSlots <= TotalSlots)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Scholarships WHERE Name = N'Academic Excellence Scholarship')
    INSERT INTO dbo.Scholarships (Name, ScholarshipType, TotalSlots, RemainingSlots) VALUES (N'Academic Excellence Scholarship', N'Academic', 20, 20);
IF NOT EXISTS (SELECT 1 FROM dbo.Scholarships WHERE Name = N'Financial Need Grant')
    INSERT INTO dbo.Scholarships (Name, ScholarshipType, TotalSlots, RemainingSlots) VALUES (N'Financial Need Grant', N'Financial Need', 15, 15);
IF NOT EXISTS (SELECT 1 FROM dbo.Scholarships WHERE Name = N'Athletic Scholarship')
    INSERT INTO dbo.Scholarships (Name, ScholarshipType, TotalSlots, RemainingSlots) VALUES (N'Athletic Scholarship', N'Athletic', 10, 10);
GO

-- -----------------------------------------------------------------------------
-- ScholarshipApplications
-- ScholarshipType is a snapshot of the chosen Scholarship's type at
-- submission time (not re-entered by the applicant), so a later catalog
-- edit never rewrites the history of an already-submitted application.
--
-- BISAASS-41 Evaluator Dashboard reads this table directly: Status among
-- the not-yet-Result workflow stages is the pending-evaluation queue,
-- Status IN (Result, Approved, Rejected) is "recently evaluated" (see
-- EvaluatorDashboardRepository). The workflow stages themselves, and the
-- UpdatedAt column recency there now orders by, are BISAASS-43's addition -
-- see the ScholarshipApplications workflow stages section further down this
-- file.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.ScholarshipApplications', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ScholarshipApplications
    (
        ApplicationId    UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_ScholarshipApplications_ApplicationId DEFAULT NEWID(),
        UserId           UNIQUEIDENTIFIER NOT NULL,
        ScholarshipId    INT              NOT NULL,
        ScholarshipType  NVARCHAR(100)    NOT NULL,
        GradeAverage     DECIMAL(5,2)     NOT NULL,
        Status           NVARCHAR(30)     NOT NULL CONSTRAINT DF_ScholarshipApplications_Status DEFAULT (N'Submitted'),
        SubmittedAt      DATETIME2(3)     NOT NULL CONSTRAINT DF_ScholarshipApplications_SubmittedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_ScholarshipApplications PRIMARY KEY (ApplicationId),
        CONSTRAINT FK_ScholarshipApplications_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId),
        CONSTRAINT FK_ScholarshipApplications_Scholarships FOREIGN KEY (ScholarshipId) REFERENCES dbo.Scholarships (ScholarshipId),
        CONSTRAINT CK_ScholarshipApplications_Status CHECK (Status IN (N'Submitted', N'UnderReview', N'Approved', N'Rejected'))
    );

    CREATE NONCLUSTERED INDEX IX_ScholarshipApplications_UserId ON dbo.ScholarshipApplications (UserId);
END
GO

-- -----------------------------------------------------------------------------
-- vw_ApplicationHistory
-- Unified read model for "My Application" history (BISAASS-18) - applicants
-- browse their admission and scholarship applications together in one list,
-- most-recent-first. Category tells the two kinds of rows apart; columns
-- that don't apply to a row's Category come back NULL. Each row already
-- carries every column that application's own detail view needs, so
-- selecting an application from the history list requires no follow-up
-- query.
--
-- BISAASS-28 Application List Management (Search & Filter) reuses this same
-- view for the Admin-Registrar's system-wide list (AdminApplicationsRepository),
-- just without the WHERE UserId = @UserId filter and joined to dbo.Users for
-- the applicant's name/email - no schema change needed for that ticket
-- either, and "selecting an application opens its full detail view" holds
-- the same way: every row already carries its own full detail.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.vw_ApplicationHistory', N'V') IS NOT NULL
    DROP VIEW dbo.vw_ApplicationHistory;
GO

CREATE VIEW dbo.vw_ApplicationHistory
AS
    SELECT
        a.ApplicationId,
        a.UserId,
        N'Admission'                   AS Category,
        a.ApplicationType,
        a.CourseAppliedFor,
        a.PreviousSchool,
        CAST(NULL AS NVARCHAR(200))    AS ScholarshipName,
        CAST(NULL AS NVARCHAR(100))    AS ScholarshipType,
        CAST(NULL AS DECIMAL(5,2))     AS GradeAverage,
        a.Status,
        a.SubmittedAt
    FROM dbo.AdmissionApplications a

    UNION ALL

    SELECT
        sa.ApplicationId,
        sa.UserId,
        N'Scholarship'                 AS Category,
        CAST(NULL AS NVARCHAR(20))     AS ApplicationType,
        CAST(NULL AS NVARCHAR(200))    AS CourseAppliedFor,
        CAST(NULL AS NVARCHAR(200))    AS PreviousSchool,
        sc.Name                        AS ScholarshipName,
        sa.ScholarshipType,
        sa.GradeAverage,
        sa.Status,
        sa.SubmittedAt
    FROM dbo.ScholarshipApplications sa
    JOIN dbo.Scholarships sc ON sc.ScholarshipId = sa.ScholarshipId;
GO

-- -----------------------------------------------------------------------------
-- ApplicantDocuments
-- One row per (applicant, document type) - a re-upload replaces the row in
-- place (see ApplicantDocumentRepository.UpsertAsync) rather than
-- accumulating history, and resets Status back to 'Pending' for
-- re-verification (BISAASS-19). FileData holds the PDF itself; the app has
-- no separate blob storage, and applicant document uploads are small
-- enough that storing them in-row is fine. FlaggedReason is only ever set
-- alongside Status = 'Flagged' - there is no evaluator UI yet to set
-- either, so both stay at their defaults until that workflow exists.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.ApplicantDocuments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ApplicantDocuments
    (
        DocumentId      UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_ApplicantDocuments_DocumentId DEFAULT NEWID(),
        UserId          UNIQUEIDENTIFIER NOT NULL,
        DocumentType    NVARCHAR(30)     NOT NULL,
        FileName        NVARCHAR(260)    NOT NULL,
        ContentType     NVARCHAR(100)    NOT NULL,
        FileSizeBytes   INT              NOT NULL,
        FileData        VARBINARY(MAX)   NOT NULL,
        Status          NVARCHAR(20)     NOT NULL CONSTRAINT DF_ApplicantDocuments_Status DEFAULT (N'Pending'),
        FlaggedReason   NVARCHAR(500)    NULL,
        UploadedAt      DATETIME2(3)     NOT NULL CONSTRAINT DF_ApplicantDocuments_UploadedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt       DATETIME2(3)     NOT NULL CONSTRAINT DF_ApplicantDocuments_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_ApplicantDocuments PRIMARY KEY (DocumentId),
        CONSTRAINT FK_ApplicantDocuments_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId),
        CONSTRAINT UQ_ApplicantDocuments_UserId_DocumentType UNIQUE (UserId, DocumentType),
        CONSTRAINT CK_ApplicantDocuments_DocumentType CHECK (DocumentType IN (N'ReportCard', N'IdPicture', N'PSA', N'TOR', N'SF10')),
        CONSTRAINT CK_ApplicantDocuments_Status CHECK (Status IN (N'Pending', N'Verified', N'Rejected', N'Flagged'))
    );

    CREATE NONCLUSTERED INDEX IX_ApplicantDocuments_UserId ON dbo.ApplicantDocuments (UserId);
END
GO

-- -----------------------------------------------------------------------------
-- ExamSchedules
-- Catalog of entrance-exam slots applicants pick from (BISAASS-20). Saturday
-- rows are always selectable regardless of IsOffered; IsOffered only gates
-- Weekday rows, toggled by Admin-Registrar based on teacher availability -
-- enforced in the query (see ExamScheduleRepository), not by ever forcing
-- Saturday's IsOffered to 1.
-- Venue was added in BISAASS-21 - the exam permit shows it alongside the
-- date/time, so it lives on the slot rather than the selection.
--
-- BISAASS-29 Exam Schedule Management (Saturday/Weekday) adds the
-- Admin-Registrar management endpoints this table was seeded without -
-- create (either DayType) and toggle IsOffered - plus a view of every
-- schedule's assigned applicants (joins dbo.ExamScheduleSelections). No
-- schema change was needed; IsOffered already modeled exactly the
-- teacher-availability toggle this ticket's AC describes.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.ExamSchedules', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ExamSchedules
    (
        ExamScheduleId  INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_ExamSchedules PRIMARY KEY,
        DayType         NVARCHAR(10)    NOT NULL,
        ExamDate        DATE            NOT NULL,
        ExamTime        TIME(0)         NOT NULL,
        Venue           NVARCHAR(200)   NOT NULL,
        IsOffered       BIT             NOT NULL CONSTRAINT DF_ExamSchedules_IsOffered DEFAULT (1),
        CreatedAt       DATETIME2(3)    NOT NULL CONSTRAINT DF_ExamSchedules_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_ExamSchedules_DayType CHECK (DayType IN (N'Saturday', N'Weekday'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.ExamSchedules WHERE DayType = N'Saturday' AND ExamDate = '2026-10-03')
    INSERT INTO dbo.ExamSchedules (DayType, ExamDate, ExamTime, Venue, IsOffered) VALUES (N'Saturday', '2026-10-03', '08:00', N'BCAS Main Campus - Gymnasium', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.ExamSchedules WHERE DayType = N'Saturday' AND ExamDate = '2026-10-10')
    INSERT INTO dbo.ExamSchedules (DayType, ExamDate, ExamTime, Venue, IsOffered) VALUES (N'Saturday', '2026-10-10', '08:00', N'BCAS Main Campus - Gymnasium', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.ExamSchedules WHERE DayType = N'Saturday' AND ExamDate = '2026-10-17')
    INSERT INTO dbo.ExamSchedules (DayType, ExamDate, ExamTime, Venue, IsOffered) VALUES (N'Saturday', '2026-10-17', '08:00', N'BCAS Main Campus - Gymnasium', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.ExamSchedules WHERE DayType = N'Weekday' AND ExamDate = '2026-10-06')
    INSERT INTO dbo.ExamSchedules (DayType, ExamDate, ExamTime, Venue, IsOffered) VALUES (N'Weekday', '2026-10-06', '13:00', N'BCAS Main Campus - Room 201', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.ExamSchedules WHERE DayType = N'Weekday' AND ExamDate = '2026-10-08')
    INSERT INTO dbo.ExamSchedules (DayType, ExamDate, ExamTime, Venue, IsOffered) VALUES (N'Weekday', '2026-10-08', '13:00', N'BCAS Main Campus - Room 201', 0);
GO

-- -----------------------------------------------------------------------------
-- ExamScheduleSelections
-- One-to-one with Users (BISAASS-20) - an applicant has a single confirmed
-- entrance-exam schedule; selecting again replaces it (see
-- ExamScheduleRepository.SelectAsync), it isn't accumulated as history.
-- ExamScheduleSelectionId (added in BISAASS-21) is a surrogate key purely so
-- the exam permit has a stable, human-readable permit number
-- ("EP-" + the id, zero-padded - see ExamPermitMappingExtensions) without a
-- separate counter table; UserId keeps the one-per-applicant rule via its
-- own UNIQUE constraint instead of being the primary key.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.ExamScheduleSelections', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ExamScheduleSelections
    (
        ExamScheduleSelectionId INT              NOT NULL IDENTITY(1,1) CONSTRAINT PK_ExamScheduleSelections PRIMARY KEY,
        UserId                  UNIQUEIDENTIFIER NOT NULL,
        ExamScheduleId          INT              NOT NULL,
        SelectedAt              DATETIME2(3)     NOT NULL CONSTRAINT DF_ExamScheduleSelections_SelectedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT UQ_ExamScheduleSelections_UserId UNIQUE (UserId),
        CONSTRAINT FK_ExamScheduleSelections_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId),
        CONSTRAINT FK_ExamScheduleSelections_ExamSchedules FOREIGN KEY (ExamScheduleId) REFERENCES dbo.ExamSchedules (ExamScheduleId)
    );
END
GO

-- -----------------------------------------------------------------------------
-- ExamScheduleSelections.IsPermitReleased / PermitReleasedAt / PermitReleasedByUserId
-- BISAASS-30 Exam Permit Generation & Release. Before this ticket, a
-- confirmed schedule selection *was* the issued permit (BISAASS-21) -
-- visible to the applicant the moment they selected one. This ticket adds
-- an explicit Admin-Registrar release step gated on document verification:
-- IsPermitReleased defaults to 0, so every selection (existing or new)
-- starts hidden from the applicant-facing GET /api/exam-permit until an
-- Admin releases it (see AdminExamPermitService.ReleaseAsync, which reuses
-- ApplicationTrackingService's "every required document type is Verified"
-- bar via IApplicantDocumentService.GetMyChecklistAsync - no schema change
-- was needed for that check either). PermitReleasedByUserId is nullable
-- since it's only ever set once, by the release action; ALTER rather than
-- a column on the CREATE TABLE above since ExamScheduleSelections already
-- exists in earlier-provisioned databases, same pattern as
-- Scholarships.MinimumGradeAverage/IsTopOne further down this file.
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.ExamScheduleSelections') AND name = N'IsPermitReleased'
)
BEGIN
    ALTER TABLE dbo.ExamScheduleSelections ADD IsPermitReleased BIT NOT NULL CONSTRAINT DF_ExamScheduleSelections_IsPermitReleased DEFAULT (0);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.ExamScheduleSelections') AND name = N'PermitReleasedAt'
)
BEGIN
    ALTER TABLE dbo.ExamScheduleSelections ADD PermitReleasedAt DATETIME2(3) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.ExamScheduleSelections') AND name = N'PermitReleasedByUserId'
)
BEGIN
    ALTER TABLE dbo.ExamScheduleSelections ADD PermitReleasedByUserId UNIQUEIDENTIFIER NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_ExamScheduleSelections_PermitReleasedByUserId'
)
BEGIN
    ALTER TABLE dbo.ExamScheduleSelections
        ADD CONSTRAINT FK_ExamScheduleSelections_PermitReleasedByUserId FOREIGN KEY (PermitReleasedByUserId) REFERENCES dbo.Users (UserId);
END
GO

-- -----------------------------------------------------------------------------
-- ExamRescheduleRequests
-- An applicant's request to move off their confirmed exam schedule
-- (BISAASS-21). The filtered unique index keeps at most one Pending request
-- per applicant at the database level, backing up the same check in
-- ExamRescheduleRequestRepository. Approving/rejecting a request - and, on
-- approval, moving the applicant's ExamScheduleSelections row to a new
-- schedule - is an Admin-Registrar action with no UI yet (a later ticket);
-- the wider Status CHECK anticipates it without needing a schema change,
-- the same way AdmissionApplications/ScholarshipApplications did for their
-- own future workflows. Until then a request only ever reaches Pending.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.ExamRescheduleRequests', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ExamRescheduleRequests
    (
        RequestId       UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_ExamRescheduleRequests_RequestId DEFAULT NEWID(),
        UserId          UNIQUEIDENTIFIER NOT NULL,
        Reason          NVARCHAR(500)    NOT NULL,
        Status          NVARCHAR(20)     NOT NULL CONSTRAINT DF_ExamRescheduleRequests_Status DEFAULT (N'Pending'),
        SubmittedAt     DATETIME2(3)     NOT NULL CONSTRAINT DF_ExamRescheduleRequests_SubmittedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_ExamRescheduleRequests PRIMARY KEY (RequestId),
        CONSTRAINT FK_ExamRescheduleRequests_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId),
        CONSTRAINT CK_ExamRescheduleRequests_Status CHECK (Status IN (N'Pending', N'Approved', N'Rejected'))
    );

    CREATE NONCLUSTERED INDEX IX_ExamRescheduleRequests_UserId ON dbo.ExamRescheduleRequests (UserId);

    CREATE UNIQUE NONCLUSTERED INDEX UQ_ExamRescheduleRequests_UserId_Pending
        ON dbo.ExamRescheduleRequests (UserId)
        WHERE Status = N'Pending';
END
GO

-- -----------------------------------------------------------------------------
-- Announcements
-- Admission/Scholarship announcements applicants browse (BISAASS-23). No
-- admin-management endpoint exists yet, so rows are seeded here, the same
-- way Deadlines and Scholarships were - IsActive is what "currently-active"
-- filters on, toggled directly in the data until that endpoint exists.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.Announcements', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Announcements
    (
        AnnouncementId  INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_Announcements PRIMARY KEY,
        Category        NVARCHAR(20)    NOT NULL,
        Title           NVARCHAR(200)   NOT NULL,
        Body            NVARCHAR(2000)  NOT NULL,
        IsActive        BIT             NOT NULL CONSTRAINT DF_Announcements_IsActive DEFAULT (1),
        PostedAt        DATETIME2(3)    NOT NULL CONSTRAINT DF_Announcements_PostedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_Announcements_Category CHECK (Category IN (N'Admission', N'Scholarship'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Announcements WHERE Title = N'Admission Exam Season Now Open')
    INSERT INTO dbo.Announcements (Category, Title, Body, IsActive) VALUES
        (N'Admission', N'Admission Exam Season Now Open', N'Entrance exam schedules for the upcoming term are now open for selection. Pick a Saturday or an offered weekday slot under Entrance Exam Schedule.', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Announcements WHERE Title = N'Reminder: Submit Requirements Early')
    INSERT INTO dbo.Announcements (Category, Title, Body, IsActive) VALUES
        (N'Admission', N'Reminder: Submit Requirements Early', N'Upload your Report Card, ID picture, and PSA as soon as possible so verification can start before the document deadline.', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Announcements WHERE Title = N'Scholarship Slots Filling Up')
    INSERT INTO dbo.Announcements (Category, Title, Body, IsActive) VALUES
        (N'Scholarship', N'Scholarship Slots Filling Up', N'Several scholarship programs have limited remaining slots. Applicants are encouraged to apply before the scholarship deadline.', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Announcements WHERE Title = N'New Athletic Scholarship Category')
    INSERT INTO dbo.Announcements (Category, Title, Body, IsActive) VALUES
        (N'Scholarship', N'New Athletic Scholarship Category', N'An Athletic Scholarship track has been added to this term''s offerings. Check the Scholarship Application page for details.', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.Announcements WHERE Title = N'Last Term''s Enrollment Notice')
    INSERT INTO dbo.Announcements (Category, Title, Body, IsActive) VALUES
        (N'Admission', N'Last Term''s Enrollment Notice', N'This notice was for a previous enrollment period and is kept only to demonstrate that inactive announcements are filtered out.', 0);
GO

-- -----------------------------------------------------------------------------
-- NotificationTriggerConfigs
-- BISAASS-39 Notification Management (System-Triggered Email Config). One row
-- per system-triggered email an Admin can turn on or off: status change
-- alerts, document flags, and permit release. TriggerKey is the stable code
-- the API and any future notification-sending code key off of; IsEnabled is
-- read fresh on every check (no caching layer), so a toggle here takes
-- effect for the very next notification event of that kind.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.NotificationTriggerConfigs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.NotificationTriggerConfigs
    (
        TriggerKey      NVARCHAR(50)    NOT NULL CONSTRAINT PK_NotificationTriggerConfigs PRIMARY KEY,
        DisplayName     NVARCHAR(100)   NOT NULL,
        Description     NVARCHAR(300)   NOT NULL,
        IsEnabled       BIT             NOT NULL CONSTRAINT DF_NotificationTriggerConfigs_IsEnabled DEFAULT (1),
        UpdatedAt       DATETIME2(3)    NOT NULL CONSTRAINT DF_NotificationTriggerConfigs_UpdatedAt DEFAULT SYSUTCDATETIME()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.NotificationTriggerConfigs WHERE TriggerKey = N'StatusChange')
    INSERT INTO dbo.NotificationTriggerConfigs (TriggerKey, DisplayName, Description, IsEnabled) VALUES
        (N'StatusChange', N'Application Status Change Alerts', N'Notifies an applicant by email whenever their admission or scholarship application status changes.', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.NotificationTriggerConfigs WHERE TriggerKey = N'DocumentFlag')
    INSERT INTO dbo.NotificationTriggerConfigs (TriggerKey, DisplayName, Description, IsEnabled) VALUES
        (N'DocumentFlag', N'Document Flag Alerts', N'Notifies an applicant by email when a submitted document is flagged during verification.', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.NotificationTriggerConfigs WHERE TriggerKey = N'PermitRelease')
    INSERT INTO dbo.NotificationTriggerConfigs (TriggerKey, DisplayName, Description, IsEnabled) VALUES
        (N'PermitRelease', N'Exam Permit Release Alerts', N'Notifies an applicant by email when their exam permit is released and ready to download.', 1);
GO

-- -----------------------------------------------------------------------------
-- SystemSettings
-- BISAASS-40 Admin Settings (System-Level Configuration). One row per
-- system-level admissions/scholarships setting an Admin can turn on or off.
-- SettingKey is the stable code application code checks against (see
-- AdmissionApplicationService and ScholarshipApplicationService, which gate
-- new submissions on these). A missing row is treated as enabled (fail
-- open) by the reading code, so this table only ever needs rows for
-- settings that default to on.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.SystemSettings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SystemSettings
    (
        SettingKey      NVARCHAR(50)    NOT NULL CONSTRAINT PK_SystemSettings PRIMARY KEY,
        DisplayName     NVARCHAR(100)   NOT NULL,
        Description     NVARCHAR(300)   NOT NULL,
        IsEnabled       BIT             NOT NULL CONSTRAINT DF_SystemSettings_IsEnabled DEFAULT (1),
        UpdatedAt       DATETIME2(3)    NOT NULL CONSTRAINT DF_SystemSettings_UpdatedAt DEFAULT SYSUTCDATETIME()
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.SystemSettings WHERE SettingKey = N'AdmissionsApplicationsOpen')
    INSERT INTO dbo.SystemSettings (SettingKey, DisplayName, Description, IsEnabled) VALUES
        (N'AdmissionsApplicationsOpen', N'Admission Applications Open', N'When off, applicants cannot submit new admission applications. Existing applications already in the workflow are unaffected.', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.SystemSettings WHERE SettingKey = N'ScholarshipApplicationsOpen')
    INSERT INTO dbo.SystemSettings (SettingKey, DisplayName, Description, IsEnabled) VALUES
        (N'ScholarshipApplicationsOpen', N'Scholarship Applications Open', N'When off, applicants cannot submit new scholarship applications. Existing applications already in the workflow are unaffected.', 1);
GO

-- -----------------------------------------------------------------------------
-- Scholarships.MinimumGradeAverage
-- BISAASS-42 Scholarship Screening. The "scholarship requirement" an
-- Evaluator checks an applicant's GradeAverage against before recording a
-- Qualified/Not Qualified verdict. Nullable - a scholarship with no minimum
-- set simply has nothing to compare against (see
-- EvaluatorScholarshipApplicationRepository, which reports
-- MeetsMinimumGrade as unknown rather than false in that case). Scholarships
-- already exists in earlier-provisioned databases, so this is an ALTER
-- rather than a column on the CREATE TABLE above; the backfill only touches
-- rows that haven't already been given a value, so it's safe to re-run.
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.Scholarships') AND name = N'MinimumGradeAverage'
)
BEGIN
    ALTER TABLE dbo.Scholarships ADD MinimumGradeAverage DECIMAL(5,2) NULL;
END
GO

UPDATE dbo.Scholarships SET MinimumGradeAverage = 90.00 WHERE Name = N'Academic Excellence Scholarship' AND MinimumGradeAverage IS NULL;
UPDATE dbo.Scholarships SET MinimumGradeAverage = 80.00 WHERE Name = N'Financial Need Grant' AND MinimumGradeAverage IS NULL;
UPDATE dbo.Scholarships SET MinimumGradeAverage = 75.00 WHERE Name = N'Athletic Scholarship' AND MinimumGradeAverage IS NULL;
GO

-- -----------------------------------------------------------------------------
-- ScholarshipEligibilityScreenings
-- BISAASS-42 Scholarship Screening. One row per application - a re-screening
-- (the Evaluator changes their mind) replaces the row in place via MERGE
-- (see EvaluatorScholarshipApplicationRepository.UpsertScreeningAsync), the
-- same "latest state, no history" convention ApplicantDocuments already
-- uses for re-uploads. This is a screening-stage verdict distinct from
-- ScholarshipApplications.Status, which the guided workflow (BISAASS-43)
-- still owns.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.ScholarshipEligibilityScreenings', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ScholarshipEligibilityScreenings
    (
        ApplicationId       UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ScholarshipEligibilityScreenings PRIMARY KEY,
        Verdict             NVARCHAR(20)     NOT NULL,
        Remarks             NVARCHAR(1000)   NULL,
        EvaluatedByUserId   UNIQUEIDENTIFIER NOT NULL,
        EvaluatedAt         DATETIME2(3)     NOT NULL CONSTRAINT DF_ScholarshipEligibilityScreenings_EvaluatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_ScholarshipEligibilityScreenings_Applications FOREIGN KEY (ApplicationId) REFERENCES dbo.ScholarshipApplications (ApplicationId),
        CONSTRAINT FK_ScholarshipEligibilityScreenings_Evaluator FOREIGN KEY (EvaluatedByUserId) REFERENCES dbo.Users (UserId),
        CONSTRAINT CK_ScholarshipEligibilityScreenings_Verdict CHECK (Verdict IN (N'Qualified', N'NotQualified'))
    );
END
GO

-- -----------------------------------------------------------------------------
-- ScholarshipApplications workflow stages
-- BISAASS-43 Scholarship Application Evaluation & Workflow Progression. An
-- Evaluator moves an application through Submitted -> DocumentsVerified ->
-- EligibilityScreening -> Evaluation -> Result (see
-- ScholarshipWorkflowConstants.Stages and
-- EvaluatorScholarshipApplicationRepository.AdvanceStatusAsync); Approved/
-- Rejected stay in the allowed set for the final decision a later ticket
-- (BISAASS-47, Academic Head approval) records. UnderReview is dropped -
-- nothing ever set it, and the granular stages above supersede it as "the
-- wider set anticipating the evaluator workflow" the original comment on
-- this table's sibling (AdmissionApplications) described.
-- UpdatedAt tracks the last workflow move, which is what "recently
-- evaluated" on the Evaluator Dashboard (BISAASS-41) now orders by instead
-- of approximating with SubmittedAt.
-- -----------------------------------------------------------------------------
IF EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = N'CK_ScholarshipApplications_Status' AND parent_object_id = OBJECT_ID(N'dbo.ScholarshipApplications')
)
BEGIN
    ALTER TABLE dbo.ScholarshipApplications DROP CONSTRAINT CK_ScholarshipApplications_Status;
END
GO

ALTER TABLE dbo.ScholarshipApplications
    ADD CONSTRAINT CK_ScholarshipApplications_Status CHECK (Status IN (
        N'Submitted', N'DocumentsVerified', N'EligibilityScreening', N'Evaluation', N'Result', N'Approved', N'Rejected'
    ));
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.ScholarshipApplications') AND name = N'UpdatedAt'
)
BEGIN
    ALTER TABLE dbo.ScholarshipApplications
        ADD UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_ScholarshipApplications_UpdatedAt DEFAULT SYSUTCDATETIME();
END
GO

-- -----------------------------------------------------------------------------
-- Scholarships.IsTopOne + Top 1 Scholarship seed row
-- BISAASS-44 Scholarship Eligibility Rules Engine. IsTopOne marks the "Top
-- 1: free all, no entrance exam, no interview" tier (see
-- EvaluatorScholarshipApplicationRepository, which folds this into the
-- eligibility rules it computes for the Evaluator). The other three rules
-- in this ticket don't need new schema:
--   * Non-BCASian: entrance exam required - reads ApplicantProfiles.IsBcasian
--     (already exists) and dbo.ExamScheduleSelections (already exists,
--     BISAASS-20) for whether the applicant has one scheduled.
--   * Academic/Entrance Scholarship: limited slots - already
--     TotalSlots/RemainingSlots (BISAASS-17), already enforced at
--     submission by ScholarshipApplicationRepository.CreateAsync.
--   * Reapplication - already unrestricted (nothing ever blocked a second
--     application for the same scholarship); the rules engine surfaces the
--     applicant's prior attempts for this same scholarship, by querying
--     ScholarshipApplications/ScholarshipEligibilityScreenings, so an
--     Evaluator has that context per "subject to school rules" - no new
--     table needed to track that a given attempt is a reapplication.
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.Scholarships') AND name = N'IsTopOne'
)
BEGIN
    ALTER TABLE dbo.Scholarships ADD IsTopOne BIT NOT NULL CONSTRAINT DF_Scholarships_IsTopOne DEFAULT (0);
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Scholarships WHERE Name = N'Top 1 Scholarship')
    INSERT INTO dbo.Scholarships (Name, ScholarshipType, TotalSlots, RemainingSlots, MinimumGradeAverage, IsTopOne) VALUES
        (N'Top 1 Scholarship', N'TopOne', 3, 3, 95.00, 1);
GO

-- -----------------------------------------------------------------------------
-- ScholarshipFinalDecisions
-- BISAASS-47 Scholarship Evaluation, Approval & Records Review (Academic
-- Head). One row per application - the Academic Head's Approved/Rejected
-- decision plus optional remarks, parallel to (but distinct from) the
-- Evaluator's Qualified/NotQualified screening verdict in
-- ScholarshipEligibilityScreenings. Recording a decision also moves
-- ScholarshipApplications.Status to that same Approved/Rejected value -
-- both already allowed by its CHECK constraint since BISAASS-43 - but only
-- from Status = 'Result' (see
-- EvaluatorScholarshipApplicationRepository.RecordFinalDecisionAsync,
-- which does both writes in one transaction), so a decision can't be
-- confirmed before the guided workflow has actually reached its last
-- stage.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.ScholarshipFinalDecisions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ScholarshipFinalDecisions
    (
        ApplicationId   UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ScholarshipFinalDecisions PRIMARY KEY,
        Decision        NVARCHAR(20)     NOT NULL,
        Remarks         NVARCHAR(1000)   NULL,
        DecidedByUserId UNIQUEIDENTIFIER NOT NULL,
        DecidedAt       DATETIME2(3)     NOT NULL CONSTRAINT DF_ScholarshipFinalDecisions_DecidedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_ScholarshipFinalDecisions_Applications FOREIGN KEY (ApplicationId) REFERENCES dbo.ScholarshipApplications (ApplicationId),
        CONSTRAINT FK_ScholarshipFinalDecisions_DecidedBy FOREIGN KEY (DecidedByUserId) REFERENCES dbo.Users (UserId),
        CONSTRAINT CK_ScholarshipFinalDecisions_Decision CHECK (Decision IN (N'Approved', N'Rejected'))
    );
END
GO

-- -----------------------------------------------------------------------------
-- AdmissionApplications.Remarks / UpdatedAt, ScholarshipApplications.Remarks
-- BISAASS-31 Application Status Workflow Oversight & Update. Gives
-- authorized staff (Admin-Registrar) a general override on top of the
-- Evaluator's own forward-only scholarship workflow (BISAASS-43) and the
-- Academic Head's final decision (BISAASS-47): AdminApplicationsService
-- can set either application's Status to any value already allowed by its
-- own CHECK constraint (AdmissionApplications' was widened up front by
-- BISAASS-16 in anticipation of exactly this; ScholarshipApplications' by
-- BISAASS-43/47), with an optional remark. Remarks holds only the latest
-- remark, not a history, the same "latest state, no history" convention
-- ScholarshipEligibilityScreenings/ScholarshipFinalDecisions already use.
-- AdmissionApplications.UpdatedAt is new (ScholarshipApplications already
-- has one from BISAASS-43) so both categories can show "last updated" the
-- same way; ALTER rather than a column on the CREATE TABLE above since
-- both tables already exist in earlier-provisioned databases.
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.AdmissionApplications') AND name = N'Remarks'
)
BEGIN
    ALTER TABLE dbo.AdmissionApplications ADD Remarks NVARCHAR(1000) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.AdmissionApplications') AND name = N'UpdatedAt'
)
BEGIN
    ALTER TABLE dbo.AdmissionApplications
        ADD UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_AdmissionApplications_UpdatedAt DEFAULT SYSUTCDATETIME();
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.ScholarshipApplications') AND name = N'Remarks'
)
BEGIN
    ALTER TABLE dbo.ScholarshipApplications ADD Remarks NVARCHAR(1000) NULL;
END
GO

-- Re-create vw_ApplicationHistory (defined earlier in this file) to surface
-- Remarks/UpdatedAt for both categories - AdminApplicationsRepository
-- (BISAASS-28/31) reads both through it, same as every other column here.
DROP VIEW dbo.vw_ApplicationHistory;
GO

CREATE VIEW dbo.vw_ApplicationHistory
AS
    SELECT
        a.ApplicationId,
        a.UserId,
        N'Admission'                   AS Category,
        a.ApplicationType,
        a.CourseAppliedFor,
        a.PreviousSchool,
        CAST(NULL AS NVARCHAR(200))    AS ScholarshipName,
        CAST(NULL AS NVARCHAR(100))    AS ScholarshipType,
        CAST(NULL AS DECIMAL(5,2))     AS GradeAverage,
        a.Status,
        a.Remarks,
        a.SubmittedAt,
        a.UpdatedAt
    FROM dbo.AdmissionApplications a

    UNION ALL

    SELECT
        sa.ApplicationId,
        sa.UserId,
        N'Scholarship'                 AS Category,
        CAST(NULL AS NVARCHAR(20))     AS ApplicationType,
        CAST(NULL AS NVARCHAR(200))    AS CourseAppliedFor,
        CAST(NULL AS NVARCHAR(200))    AS PreviousSchool,
        sc.Name                        AS ScholarshipName,
        sa.ScholarshipType,
        sa.GradeAverage,
        sa.Status,
        sa.Remarks,
        sa.SubmittedAt,
        sa.UpdatedAt
    FROM dbo.ScholarshipApplications sa
    JOIN dbo.Scholarships sc ON sc.ScholarshipId = sa.ScholarshipId;
GO

-- -----------------------------------------------------------------------------
-- AdmissionReservations
-- BISAASS-33 Reservation Management. Records whether an Approved admission
-- applicant has reserved their slot (the school's cash/bank-deposited
-- ₱2,500 reservation fee is recorded here, not collected by this system -
-- see SystemSettings.ReservationOnlinePaymentRequired below). One row per
-- application - re-recording (staff corrects a mistake, or an applicant
-- who reserved later cancels) replaces the row in place via MERGE, the
-- same "latest state, no history" convention ScholarshipEligibilityScreenings
-- already uses, rather than accumulating a payment history this system has
-- no other use for. ReservationFee is stored per row (not just assumed to
-- always be the current standard fee) so a past reservation's recorded
-- amount stays accurate even if the standard fee changes later.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.AdmissionReservations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AdmissionReservations
    (
        ApplicationId       UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_AdmissionReservations PRIMARY KEY,
        IsReserved          BIT              NOT NULL,
        ReservationFee      DECIMAL(10,2)    NOT NULL CONSTRAINT DF_AdmissionReservations_ReservationFee DEFAULT (2500.00),
        Remarks             NVARCHAR(500)    NULL,
        RecordedByUserId    UNIQUEIDENTIFIER NOT NULL,
        RecordedAt          DATETIME2(3)     NOT NULL CONSTRAINT DF_AdmissionReservations_RecordedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_AdmissionReservations_Applications FOREIGN KEY (ApplicationId) REFERENCES dbo.AdmissionApplications (ApplicationId),
        CONSTRAINT FK_AdmissionReservations_RecordedBy FOREIGN KEY (RecordedByUserId) REFERENCES dbo.Users (UserId)
    );
END
GO

-- -----------------------------------------------------------------------------
-- SystemSettings.ReservationOnlinePaymentRequired
-- BISAASS-33's own acceptance criteria: "the system does not process the
-- ₱2,500 payment unless online payment is specifically required/enabled."
-- This system has no online payment gateway anywhere, so there is nothing
-- for this flag to actually turn on yet - it exists so that guarantee is
-- an explicit, auditable, toggle-able setting rather than an unstated
-- assumption. While off (the default - unlike AdmissionsApplicationsOpen/
-- ScholarshipApplicationsOpen above, this setting defaults OFF, so unlike
-- those it needs an explicit row rather than relying on
-- ISystemSettingsRepository's fail-open "missing row = enabled" behavior),
-- AdminReservationsService lets staff record a reservation manually with
-- no payment step. If ever turned on, recording is blocked
-- (OnlinePaymentRequiredException) until an actual online-payment
-- integration exists to satisfy it - this ticket deliberately does not
-- build one.
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM dbo.SystemSettings WHERE SettingKey = N'ReservationOnlinePaymentRequired')
    INSERT INTO dbo.SystemSettings (SettingKey, DisplayName, Description, IsEnabled) VALUES
        (N'ReservationOnlinePaymentRequired', N'Require Online Payment for Reservations',
         N'When on, the ₱2,500 reservation fee must be paid online and staff cannot record a reservation manually. When off (default), staff record reservation status directly after receiving payment through the school''s existing (offline) process.', 0);
GO
