-- =============================================================================
-- BCAS Integrated System - Core Auth Schema
-- Target: Microsoft SQL Server
-- Covers: BISAASS-8 Applicant Self-Service Registration
-- =============================================================================

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
END
BEGIN TRY IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Users_Email' AND object_id = OBJECT_ID(N'dbo.Users')) EXEC (N'IF EXISTS (SELECT 1 FROM sys.stats WHERE name = N''IX_Users_Email'' AND object_id = OBJECT_ID(N''dbo.Users'')) DROP STATISTICS dbo.Users.IX_Users_Email CREATE NONCLUSTERED INDEX IX_Users_Email ON dbo.Users (Email)') END TRY BEGIN CATCH IF ERROR_NUMBER() NOT IN (1902, 1913) THROW END CATCH
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
        CONSTRAINT CK_AdmissionApplications_Status CHECK (Status IN (N'Submitted', N'UnderReview', N'PendingDocuments', N'DocumentsCompleted', N'DocumentsCleared', N'ExamScheduled', N'ExamDone', N'DidNotTakeExam', N'Registration', N'Approved', N'Rejected', N'Retracted'))
    );
END
BEGIN TRY IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AdmissionApplications_UserId' AND object_id = OBJECT_ID(N'dbo.AdmissionApplications')) EXEC (N'IF EXISTS (SELECT 1 FROM sys.stats WHERE name = N''IX_AdmissionApplications_UserId'' AND object_id = OBJECT_ID(N''dbo.AdmissionApplications'')) DROP STATISTICS dbo.AdmissionApplications.IX_AdmissionApplications_UserId CREATE NONCLUSTERED INDEX IX_AdmissionApplications_UserId ON dbo.AdmissionApplications (UserId)') END TRY BEGIN CATCH IF ERROR_NUMBER() NOT IN (1902, 1913) THROW END CATCH
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
END
BEGIN TRY IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ScholarshipApplications_UserId' AND object_id = OBJECT_ID(N'dbo.ScholarshipApplications')) EXEC (N'IF EXISTS (SELECT 1 FROM sys.stats WHERE name = N''IX_ScholarshipApplications_UserId'' AND object_id = OBJECT_ID(N''dbo.ScholarshipApplications'')) DROP STATISTICS dbo.ScholarshipApplications.IX_ScholarshipApplications_UserId CREATE NONCLUSTERED INDEX IX_ScholarshipApplications_UserId ON dbo.ScholarshipApplications (UserId)') END TRY BEGIN CATCH IF ERROR_NUMBER() NOT IN (1902, 1913) THROW END CATCH
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
        CONSTRAINT CK_ApplicantDocuments_DocumentType CHECK (DocumentType IN (N'ReportCard', N'IdPicture', N'PSA', N'TOR', N'SF10', N'ScholarshipForm')),
        CONSTRAINT CK_ApplicantDocuments_Status CHECK (Status IN (N'Pending', N'Verified', N'Rejected', N'Flagged'))
    );
END
BEGIN TRY IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ApplicantDocuments_UserId' AND object_id = OBJECT_ID(N'dbo.ApplicantDocuments')) EXEC (N'IF EXISTS (SELECT 1 FROM sys.stats WHERE name = N''IX_ApplicantDocuments_UserId'' AND object_id = OBJECT_ID(N''dbo.ApplicantDocuments'')) DROP STATISTICS dbo.ApplicantDocuments.IX_ApplicantDocuments_UserId CREATE NONCLUSTERED INDEX IX_ApplicantDocuments_UserId ON dbo.ApplicantDocuments (UserId)') END TRY BEGIN CATCH IF ERROR_NUMBER() NOT IN (1902, 1913) THROW END CATCH
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

END
BEGIN TRY IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ExamRescheduleRequests_UserId' AND object_id = OBJECT_ID(N'dbo.ExamRescheduleRequests')) EXEC (N'IF EXISTS (SELECT 1 FROM sys.stats WHERE name = N''IX_ExamRescheduleRequests_UserId'' AND object_id = OBJECT_ID(N''dbo.ExamRescheduleRequests'')) DROP STATISTICS dbo.ExamRescheduleRequests.IX_ExamRescheduleRequests_UserId CREATE NONCLUSTERED INDEX IX_ExamRescheduleRequests_UserId ON dbo.ExamRescheduleRequests (UserId)') END TRY BEGIN CATCH IF ERROR_NUMBER() NOT IN (1902, 1913) THROW END CATCH
BEGIN TRY IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_ExamRescheduleRequests_UserId_Pending' AND object_id = OBJECT_ID(N'dbo.ExamRescheduleRequests')) EXEC (N'IF EXISTS (SELECT 1 FROM sys.stats WHERE name = N''UQ_ExamRescheduleRequests_UserId_Pending'' AND object_id = OBJECT_ID(N''dbo.ExamRescheduleRequests'')) DROP STATISTICS dbo.ExamRescheduleRequests.UQ_ExamRescheduleRequests_UserId_Pending CREATE UNIQUE NONCLUSTERED INDEX UQ_ExamRescheduleRequests_UserId_Pending ON dbo.ExamRescheduleRequests (UserId) WHERE Status = N''Pending''') END TRY BEGIN CATCH IF ERROR_NUMBER() NOT IN (1902, 1913) THROW END CATCH
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

-- -----------------------------------------------------------------------------
-- BISAASS-34 Documents Oversight View (Admin-Registrar)
-- No new table - dbo.ApplicantDocuments (defined above) already carries
-- everything the oversight view needs (Status, FlaggedReason). Admin now
-- lists/filters that table system-wide (across every applicant) instead of
-- per-user, so add the indexes that cross-applicant filtering needs:
-- IX_ApplicantDocuments_UserId (above) only serves the per-applicant lookup
-- ApplicantDocumentRepository already did.
-- -----------------------------------------------------------------------------
BEGIN TRY IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ApplicantDocuments_Status' AND object_id = OBJECT_ID(N'dbo.ApplicantDocuments')) EXEC (N'IF EXISTS (SELECT 1 FROM sys.stats WHERE name = N''IX_ApplicantDocuments_Status'' AND object_id = OBJECT_ID(N''dbo.ApplicantDocuments'')) DROP STATISTICS dbo.ApplicantDocuments.IX_ApplicantDocuments_Status CREATE NONCLUSTERED INDEX IX_ApplicantDocuments_Status ON dbo.ApplicantDocuments (Status)') END TRY BEGIN CATCH IF ERROR_NUMBER() NOT IN (1902, 1913) THROW END CATCH

BEGIN TRY IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ApplicantDocuments_DocumentType' AND object_id = OBJECT_ID(N'dbo.ApplicantDocuments')) EXEC (N'IF EXISTS (SELECT 1 FROM sys.stats WHERE name = N''IX_ApplicantDocuments_DocumentType'' AND object_id = OBJECT_ID(N''dbo.ApplicantDocuments'')) DROP STATISTICS dbo.ApplicantDocuments.IX_ApplicantDocuments_DocumentType CREATE NONCLUSTERED INDEX IX_ApplicantDocuments_DocumentType ON dbo.ApplicantDocuments (DocumentType)') END TRY BEGIN CATCH IF ERROR_NUMBER() NOT IN (1902, 1913) THROW END CATCH
GO

-- -----------------------------------------------------------------------------
-- BISAASS-35 Records Archive (5-Year Retention)
-- Archiving flags a completed/inactive (Approved or Rejected -
-- AdminApplicationsService/ArchiveConstants) application in place; nothing
-- is ever deleted, so archived records stay fully retrievable, supporting
-- the school's 5-year retention practice, while the archived flag lets the
-- school's document disposal process tell "done with, can be physically
-- disposed of later" apart from "still active" without erasing the
-- electronic record. ArchivedByUserId/ArchivedAt/ArchiveReason mirror the
-- Remarks/UpdatedAt audit columns BISAASS-31 already added. Documents have
-- no ApplicationId of their own (ApplicantDocuments is keyed by
-- (UserId, DocumentType) - BISAASS-19), so archiving an Admission
-- application cascades a matching IsArchived flag onto that applicant's
-- whole document set (see ApplicantDocumentRepository.ArchiveByUserIdAsync)
-- rather than trying to scope it per-application.
-- AdminApplicationsRepository.SearchAsync treats archived as just another
-- optional filter alongside status/category/program (ignored when
-- omitted), so this never changes BISAASS-28's original "every
-- application" list behavior - the new Admin-Registrar "Records Archive"
-- view is the same endpoint called with archived=true.
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.AdmissionApplications') AND name = N'IsArchived'
)
BEGIN
    ALTER TABLE dbo.AdmissionApplications ADD
        IsArchived       BIT              NOT NULL CONSTRAINT DF_AdmissionApplications_IsArchived DEFAULT (0),
        ArchivedAt       DATETIME2(3)     NULL,
        ArchivedByUserId UNIQUEIDENTIFIER NULL,
        ArchiveReason    NVARCHAR(500)    NULL,
        CONSTRAINT FK_AdmissionApplications_ArchivedBy FOREIGN KEY (ArchivedByUserId) REFERENCES dbo.Users (UserId);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.ScholarshipApplications') AND name = N'IsArchived'
)
BEGIN
    ALTER TABLE dbo.ScholarshipApplications ADD
        IsArchived       BIT              NOT NULL CONSTRAINT DF_ScholarshipApplications_IsArchived DEFAULT (0),
        ArchivedAt       DATETIME2(3)     NULL,
        ArchivedByUserId UNIQUEIDENTIFIER NULL,
        ArchiveReason    NVARCHAR(500)    NULL,
        CONSTRAINT FK_ScholarshipApplications_ArchivedBy FOREIGN KEY (ArchivedByUserId) REFERENCES dbo.Users (UserId);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.ApplicantDocuments') AND name = N'IsArchived'
)
BEGIN
    ALTER TABLE dbo.ApplicantDocuments ADD IsArchived BIT NOT NULL CONSTRAINT DF_ApplicantDocuments_IsArchived DEFAULT (0);
END
GO

BEGIN TRY IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AdmissionApplications_IsArchived' AND object_id = OBJECT_ID(N'dbo.AdmissionApplications')) EXEC (N'IF EXISTS (SELECT 1 FROM sys.stats WHERE name = N''IX_AdmissionApplications_IsArchived'' AND object_id = OBJECT_ID(N''dbo.AdmissionApplications'')) DROP STATISTICS dbo.AdmissionApplications.IX_AdmissionApplications_IsArchived CREATE NONCLUSTERED INDEX IX_AdmissionApplications_IsArchived ON dbo.AdmissionApplications (IsArchived)') END TRY BEGIN CATCH IF ERROR_NUMBER() NOT IN (1902, 1913) THROW END CATCH

BEGIN TRY IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ScholarshipApplications_IsArchived' AND object_id = OBJECT_ID(N'dbo.ScholarshipApplications')) EXEC (N'IF EXISTS (SELECT 1 FROM sys.stats WHERE name = N''IX_ScholarshipApplications_IsArchived'' AND object_id = OBJECT_ID(N''dbo.ScholarshipApplications'')) DROP STATISTICS dbo.ScholarshipApplications.IX_ScholarshipApplications_IsArchived CREATE NONCLUSTERED INDEX IX_ScholarshipApplications_IsArchived ON dbo.ScholarshipApplications (IsArchived)') END TRY BEGIN CATCH IF ERROR_NUMBER() NOT IN (1902, 1913) THROW END CATCH
GO

-- Re-create vw_ApplicationHistory (defined earlier in this file) to surface
-- the new archive columns for both categories - AdminApplicationsRepository
-- (BISAASS-28/31/35) reads them all through it, same as every other column here.
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
        a.UpdatedAt,
        a.IsArchived,
        a.ArchivedAt,
        a.ArchivedByUserId,
        a.ArchiveReason
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
        sa.UpdatedAt,
        sa.IsArchived,
        sa.ArchivedAt,
        sa.ArchivedByUserId,
        sa.ArchiveReason
    FROM dbo.ScholarshipApplications sa
    JOIN dbo.Scholarships sc ON sc.ScholarshipId = sa.ScholarshipId;
GO

-- -----------------------------------------------------------------------------
-- BISAASS-36 Announcements Management (Create/Post/Deactivate)
-- No schema change - dbo.Announcements (defined above) already has every
-- column this ticket needs (Category, Title, Body, IsActive, PostedAt).
-- AdminAnnouncementService.CreateAsync now fills that table directly
-- instead of the seed-data-only inserts above, inserting a new row with
-- IsActive = 0 (a draft, not yet visible to applicants) rather than
-- relying on DF_Announcements_IsActive's default of 1 - Create and Post
-- are deliberately separate actions, matching this ticket's title.
-- AdminAnnouncementService.SetActiveStatusAsync then flips IsActive to
-- post (activate) or deactivate it. IAnnouncementRepository.GetActiveAsync
-- (BISAASS-23) already filters on IsActive = 1, so a deactivated
-- announcement stops appearing to applicants immediately - no further
-- change was needed for that.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BISAASS-37 Reports (Admission & Scholarship, Excel Export)
-- No schema change - every report reads existing tables:
--   Admission (Enrollment List / Summary of Enrollment / File per Section):
--     dbo.AdmissionApplications (Status = 'Approved') joined to
--     dbo.AdmissionReservations (IsReserved = 1, BISAASS-33) - "enrolled"
--     means approved AND reservation-confirmed, not Approved alone. File
--     per Section groups this same set by CourseAppliedFor - there is no
--     separate class-section entity in this system, so the applied-for
--     course stands in for "section" (see SectionFileResponse).
--   Scholarship (Applicant List / Qualified-Not Qualified / Results / Slot
--     Report): dbo.ScholarshipApplications, dbo.ScholarshipEligibilityScreenings
--     (BISAASS-44), dbo.ScholarshipFinalDecisions (BISAASS-47), and
--     dbo.Scholarships (BISAASS-17/BISAASS-32) respectively - the Slot
--     Report reuses IScholarshipRepository.GetAllAsync verbatim, the same
--     query AdminScholarshipsController (BISAASS-32) already serves.
-- AdminReportsService generates the three Admission reports' Excel exports
-- itself (XlsxWriter - a minimal hand-rolled .xlsx writer, not a new NuGet
-- dependency) and a printable Scholarship Contract (rendered by the
-- frontend as a print-ready page, not a server-generated PDF) for any
-- Approved scholarship application - no new column was needed for either.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- BISAASS-48 Scholarship Slot & Announcement Management (Academic Head, if
-- Authorized)
-- No new table - reuses dbo.SystemSettings (BISAASS-40) as the
-- authorization toggle, the same mechanism AdmissionApplicationService and
-- ScholarshipApplicationService already gate submissions on. Two new
-- rows, each defaulting OFF (0): unlike AdmissionsApplicationsOpen and
-- ScholarshipApplicationsOpen above, granting an entire role write access
-- to slot/announcement management must fail closed, not open, so (like
-- ReservationOnlinePaymentRequired) both rows are inserted explicitly
-- rather than relying on ISystemSettingsRepository's fail-open "missing
-- row = enabled" behavior. An Admin-Registrar turns either on via the
-- existing SystemSettingsController (BISAASS-40); AcademicHeadScholarshipsService
-- and AcademicHeadAnnouncementService then read the corresponding row on
-- every call before delegating to the same IAdminScholarshipsService
-- (BISAASS-32) / IAdminAnnouncementService (BISAASS-36) an Admin-Registrar
-- uses, so once authorized, Academic Head functionality matches those
-- tickets exactly.
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM dbo.SystemSettings WHERE SettingKey = N'AcademicHeadScholarshipSlotManagementAuthorized')
    INSERT INTO dbo.SystemSettings (SettingKey, DisplayName, Description, IsEnabled) VALUES
        (N'AcademicHeadScholarshipSlotManagementAuthorized', N'Academic Head: Scholarship Slot Management',
         N'When on, the Academic Head role can create, update, and deactivate scholarship slots (the same management screen an Admin-Registrar uses). Off by default.', 0);
IF NOT EXISTS (SELECT 1 FROM dbo.SystemSettings WHERE SettingKey = N'AcademicHeadAnnouncementManagementAuthorized')
    INSERT INTO dbo.SystemSettings (SettingKey, DisplayName, Description, IsEnabled) VALUES
        (N'AcademicHeadAnnouncementManagementAuthorized', N'Academic Head: Announcement Management',
         N'When on, the Academic Head role can create, post, and deactivate Admission/Scholarship announcements (the same management screen an Admin-Registrar uses). Off by default.', 0);
GO

-- -----------------------------------------------------------------------------
-- BISAASS-49 Department-Scoped Reports (Academic Head)
-- Adds a free-text Department column to dbo.Users, nullable - it's only
-- meaningful for an AcademicHead account, and every other role leaves it
-- null. Deliberately free text rather than a new Departments lookup table:
-- dbo.AdmissionApplications.CourseAppliedFor is already stored as free
-- text (BISAASS-8), and an Academic Head's Department is expected to be
-- set to the same course/program name used there, so
-- AcademicHeadReportsService can reuse AdminReportsRepository's existing
-- @Program LIKE filter (BISAASS-37) to scope the three Admission reports
-- (Enrollment List, Summary of Enrollment, File per Section) to it.
-- Set via ProvisionStaffRequest.Department at staff creation or
-- UpdateUserRequest.Department via Manage Accounts (both Admin-only).
-- Scholarships/ScholarshipApplications have no department dimension of
-- their own (scholarships are school-wide, not tied to any course or
-- department), so the four Scholarship reports stay unscoped for an
-- Academic Head, same as an Admin-Registrar sees them.
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.Users') AND name = N'Department'
)
BEGIN
    ALTER TABLE dbo.Users ADD Department NVARCHAR(100) NULL;
END
GO

-- -----------------------------------------------------------------------------
-- BISAASS-52 Document Verification (Approve/Reject/Flag)
-- Adds reviewer tracking to dbo.ApplicantDocuments, nullable since most
-- rows (everything still Pending, and every row before this ticket) have
-- never been reviewed - same nullable-FK-plus-timestamp idiom already used
-- for ArchivedByUserId/ArchivedAt on AdmissionApplications/
-- ScholarshipApplications above. No new table: Status already covers
-- Verified/Rejected/Flagged (BISAASS-19) and FlaggedReason already covers
-- the required reason for a Flagged document - this ticket's addition is
-- reusing FlaggedReason for a Rejected document's reason too (both require
-- one; only Verified doesn't) and reviewer identity/timestamp.
-- ApplicantDocumentRepository.UpsertAsync (BISAASS-19) already resets
-- Status to Pending and clears FlaggedReason on re-upload - it now also
-- clears ReviewedByUserId/ReviewedAt, so a corrected re-upload always
-- starts a fresh, unreviewed record.
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.ApplicantDocuments') AND name = N'ReviewedByUserId'
)
BEGIN
    ALTER TABLE dbo.ApplicantDocuments ADD
        ReviewedByUserId UNIQUEIDENTIFIER NULL,
        ReviewedAt       DATETIME2(3)     NULL,
        CONSTRAINT FK_ApplicantDocuments_ReviewedBy FOREIGN KEY (ReviewedByUserId) REFERENCES dbo.Users (UserId);
END
GO

-- -----------------------------------------------------------------------------
-- BISAASS-56 Admission Status Workflow Engine
-- Until now, an application's Status changes (BISAASS-31) only ever
-- overwrote AdmissionApplications.Remarks/UpdatedAt in place - the previous
-- status and who made the change were never kept. This table is the
-- missing audit trail: one row per status change, oldest first, shared by
-- both categories (Category same convention as vw_ApplicationHistory)
-- since Admin-Registrar updates both through the same
-- AdminApplicationsService.UpdateStatusAsync endpoint. ChangedByUserId is
-- nullable to also record an application's initial Submitted row, logged
-- by the applicant themselves at creation (AdmissionApplicationService.
-- SubmitAsync) rather than by staff. FromStatus is nullable for that same
-- initial row (nothing to transition from). AdminApplicationsService
-- additionally enforces that a Status change for an Admission application
-- can only move forward through Submitted -> UnderReview -> Approved|
-- Rejected, and never once Approved/Rejected is reached (see
-- AdmissionWorkflowConstants) - the ordered-workflow half of this
-- ticket's acceptance criteria; this table is the auditable half.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.ApplicationStatusHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ApplicationStatusHistory
    (
        HistoryId       UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_ApplicationStatusHistory_HistoryId DEFAULT NEWID(),
        ApplicationId   UNIQUEIDENTIFIER NOT NULL,
        Category        NVARCHAR(20)     NOT NULL,
        FromStatus      NVARCHAR(30)     NULL,
        ToStatus        NVARCHAR(30)     NOT NULL,
        Remarks         NVARCHAR(1000)   NULL,
        ChangedByUserId UNIQUEIDENTIFIER NULL,
        ChangedAt       DATETIME2(3)     NOT NULL CONSTRAINT DF_ApplicationStatusHistory_ChangedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_ApplicationStatusHistory PRIMARY KEY (HistoryId),
        CONSTRAINT FK_ApplicationStatusHistory_ChangedBy FOREIGN KEY (ChangedByUserId) REFERENCES dbo.Users (UserId),
        CONSTRAINT CK_ApplicationStatusHistory_Category CHECK (Category IN (N'Admission', N'Scholarship'))
    );
END
BEGIN TRY IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ApplicationStatusHistory_Application' AND object_id = OBJECT_ID(N'dbo.ApplicationStatusHistory')) EXEC (N'IF EXISTS (SELECT 1 FROM sys.stats WHERE name = N''IX_ApplicationStatusHistory_Application'' AND object_id = OBJECT_ID(N''dbo.ApplicationStatusHistory'')) DROP STATISTICS dbo.ApplicationStatusHistory.IX_ApplicationStatusHistory_Application CREATE NONCLUSTERED INDEX IX_ApplicationStatusHistory_Application ON dbo.ApplicationStatusHistory (ApplicationId, Category, ChangedAt)') END TRY BEGIN CATCH IF ERROR_NUMBER() NOT IN (1902, 1913) THROW END CATCH
GO

-- -----------------------------------------------------------------------------
-- BISAASS-24 Notification Preferences (Opt In/Out per Type)
-- Per-applicant email opt-in/out, one row per (UserId, NotificationType) an
-- applicant has ever changed from the default. A missing row means "still
-- enabled" (the default for every type) - NotificationPreferenceRepository.
-- IsEnabledAsync treats no row as enabled, so this table only ever needs to
-- hold the types someone actually opted out of (or back into), not a full
-- row per applicant per type. NotificationType is one of
-- NotificationEventTypes' seven keys (BISAASS-59): ApplicationReceived,
-- DocumentFlagged, ExamSchedule, ExamPermitAvailable, ApplicationResult,
-- ScholarshipResult, Announcement - a broader set than
-- NotificationTriggerConfigs' three admin-level keys above, since this is
-- the applicant's own per-type control, not the Admin's system-wide kill
-- switch; NotificationDispatchService checks both where both apply.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.NotificationPreferences', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.NotificationPreferences
    (
        UserId           UNIQUEIDENTIFIER NOT NULL,
        NotificationType NVARCHAR(30)     NOT NULL,
        IsEnabled        BIT              NOT NULL,
        UpdatedAt        DATETIME2(3)     NOT NULL CONSTRAINT DF_NotificationPreferences_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_NotificationPreferences PRIMARY KEY (UserId, NotificationType),
        CONSTRAINT FK_NotificationPreferences_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId)
    );
END
GO

-- -----------------------------------------------------------------------------
-- BISAASS-59 Email Notification Dispatch (All Event Types)
-- No schema change of its own - NotificationDispatchService reads
-- applicant emails/names straight off dbo.Users and every other event's
-- detail (application, document, exam schedule, announcement) off the
-- tables those tickets already added; NotificationPreferences above is
-- this ticket's only new storage, and it exists to satisfy BISAASS-24
-- (marked Done but never actually implemented in code until this ticket
-- needed it as a hard prerequisite).
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- System-wide activity log: every login, and the administrative changes
-- AuditLogService is wired into (see its summary comment for exact
-- coverage). UserEmail is stored directly, not just UserId, so a row still
-- reads correctly if the account is later renamed or removed; UserId is kept
-- too for exact joins where the account still exists.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.AuditLogs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditLogs
    (
        AuditLogId  UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_AuditLogs_AuditLogId DEFAULT NEWID(),
        UserId      UNIQUEIDENTIFIER NULL,
        UserEmail   NVARCHAR(256)    NOT NULL,
        Action      NVARCHAR(50)     NOT NULL,
        Details     NVARCHAR(1000)   NULL,
        CreatedAt   DATETIME2(3)     NOT NULL CONSTRAINT DF_AuditLogs_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_AuditLogs PRIMARY KEY (AuditLogId),
        CONSTRAINT FK_AuditLogs_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId)
    );
END
GO

BEGIN TRY IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AuditLogs_CreatedAt' AND object_id = OBJECT_ID(N'dbo.AuditLogs')) EXEC (N'IF EXISTS (SELECT 1 FROM sys.stats WHERE name = N''IX_AuditLogs_CreatedAt'' AND object_id = OBJECT_ID(N''dbo.AuditLogs'')) DROP STATISTICS dbo.AuditLogs.IX_AuditLogs_CreatedAt CREATE NONCLUSTERED INDEX IX_AuditLogs_CreatedAt ON dbo.AuditLogs (CreatedAt DESC)') END TRY BEGIN CATCH IF ERROR_NUMBER() NOT IN (1902, 1913) THROW END CATCH
GO

BEGIN TRY IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AuditLogs_UserEmail' AND object_id = OBJECT_ID(N'dbo.AuditLogs')) EXEC (N'IF EXISTS (SELECT 1 FROM sys.stats WHERE name = N''IX_AuditLogs_UserEmail'' AND object_id = OBJECT_ID(N''dbo.AuditLogs'')) DROP STATISTICS dbo.AuditLogs.IX_AuditLogs_UserEmail CREATE NONCLUSTERED INDEX IX_AuditLogs_UserEmail ON dbo.AuditLogs (UserEmail)') END TRY BEGIN CATCH IF ERROR_NUMBER() NOT IN (1902, 1913) THROW END CATCH
GO

-- -----------------------------------------------------------------------------
-- Forgot-password reset tokens. TokenHash is a SHA-256 hex digest of the raw
-- token that goes out in the email link - the raw value is never stored, same
-- defense-in-depth reasoning as PasswordHash on dbo.Users. Requesting a new
-- reset invalidates any still-outstanding token for that user (UsedAt set on
-- the old row) so only the most recently requested link ever works.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.PasswordResetTokens', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.PasswordResetTokens
    (
        TokenId    UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_PasswordResetTokens_TokenId DEFAULT NEWID(),
        UserId     UNIQUEIDENTIFIER NOT NULL,
        TokenHash  NVARCHAR(64)     NOT NULL,
        ExpiresAt  DATETIME2(3)     NOT NULL,
        UsedAt     DATETIME2(3)     NULL,
        CreatedAt  DATETIME2(3)     NOT NULL CONSTRAINT DF_PasswordResetTokens_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_PasswordResetTokens PRIMARY KEY (TokenId),
        CONSTRAINT FK_PasswordResetTokens_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId),
        CONSTRAINT UQ_PasswordResetTokens_TokenHash UNIQUE (TokenHash)
    );
END
GO

-- Filtered index: requires QUOTED_IDENTIFIER ON for this session/connection.
SET QUOTED_IDENTIFIER ON;
GO

BEGIN TRY IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_PasswordResetTokens_UserId' AND object_id = OBJECT_ID(N'dbo.PasswordResetTokens')) EXEC (N'IF EXISTS (SELECT 1 FROM sys.stats WHERE name = N''IX_PasswordResetTokens_UserId'' AND object_id = OBJECT_ID(N''dbo.PasswordResetTokens'')) DROP STATISTICS dbo.PasswordResetTokens.IX_PasswordResetTokens_UserId CREATE NONCLUSTERED INDEX IX_PasswordResetTokens_UserId ON dbo.PasswordResetTokens (UserId) WHERE UsedAt IS NULL') END TRY BEGIN CATCH IF ERROR_NUMBER() NOT IN (1902, 1913) THROW END CATCH
GO

-- -----------------------------------------------------------------------------
-- Scholarship waitlist. Two behavior changes, no new table:
--
-- 1. Submitting into a scholarship with zero RemainingSlots no longer
--    throws - the application is created with Status = 'Waitlisted' instead
--    (see ScholarshipApplicationRepository.CreateAsync). 'Waitlisted' is
--    deliberately left OUT of ScholarshipWorkflowConstants.StageRank, so
--    IsForwardTransition never treats it as part of the ordered
--    Submitted->...->Result workflow - the only way out of it is the
--    dedicated PromoteFromWaitlistAsync path (atomic slot-reserve +
--    status flip), never the generic Admin status-override endpoint.
-- 2. A slot is now released back (RemainingSlots + 1, capped at TotalSlots)
--    when an application that had reserved one is Rejected - both via the
--    Admin override (AdminApplicationsService.UpdateStatusAsync) and the
--    Academic Head's final-decision flow
--    (EvaluatorScholarshipApplicationService.RecordFinalDecisionAsync).
--    Previously a slot taken at submission was never freed by anything in
--    the codebase, so a full scholarship's slots only ever went down - a
--    waitlist promoting into a slot that can never reopen would be
--    pointless without this half of the fix.
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
        N'Waitlisted', N'Submitted', N'DocumentsVerified', N'EligibilityScreening', N'Evaluation', N'Result', N'Approved', N'Rejected'
    ));
GO

-- -----------------------------------------------------------------------------
-- Deadline reminders.
--
-- Notification Settings already had the Admin-level trigger toggle
-- infrastructure (NotificationTriggerConfigs) and, for applicant-facing
-- event types, the per-applicant opt-in one (NotificationPreferences) - but
-- nothing proactively reminded anyone of anything. DeadlineReminderBackgroundService
-- now runs periodically and covers three reminders, none of which needed a
-- new applicant-facing endpoint, just a background check and the existing
-- toggle UI picking up the new rows below automatically:
--
-- 1. ExamReminder (applicant, NotificationEventTypes.ExamReminder): an
--    applicant with a confirmed exam exactly 3 days away.
-- 2. MissingDocumentReminder (applicant, NotificationEventTypes.
--    MissingDocumentReminder): a required document type still not uploaded
--    5+ days after the applicant's admission application was submitted.
-- 3. DocumentBacklogDigest (Support Staff/Admin only - not an applicant
--    preference, since it's not about the applicant's own notifications):
--    a digest sent once daily to active Support Staff/Admin accounts
--    whenever any document has sat in ApplicantDocuments.Status = 'Pending'
--    for 5+ days without being reviewed.
--
-- SentReminders is a plain send-once ledger keyed by (ReminderType,
-- SubjectKey) so the background job's periodic re-checks never re-send the
-- same reminder - SubjectKey means something different per ReminderType
-- (an applicant+exam-schedule pair for ExamReminder, an applicant+document
-- type pair for MissingDocumentReminder, a calendar date for
-- DocumentBacklogDigest, which is allowed to re-fire once per day while the
-- backlog persists). See DeadlineReminderService for exactly how each key
-- is built.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.SentReminders', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SentReminders
    (
        ReminderType    NVARCHAR(50)  NOT NULL,
        SubjectKey      NVARCHAR(200) NOT NULL,
        SentAt          DATETIME2(3)  NOT NULL CONSTRAINT DF_SentReminders_SentAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_SentReminders PRIMARY KEY (ReminderType, SubjectKey)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.NotificationTriggerConfigs WHERE TriggerKey = N'ExamReminder')
    INSERT INTO dbo.NotificationTriggerConfigs (TriggerKey, DisplayName, Description, IsEnabled) VALUES
        (N'ExamReminder', N'Upcoming Exam Reminders', N'Notifies an applicant by email 3 days before their scheduled entrance exam.', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.NotificationTriggerConfigs WHERE TriggerKey = N'MissingDocumentReminder')
    INSERT INTO dbo.NotificationTriggerConfigs (TriggerKey, DisplayName, Description, IsEnabled) VALUES
        (N'MissingDocumentReminder', N'Missing Document Reminders', N'Notifies an applicant by email when a required document is still missing 5+ days after they applied.', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.NotificationTriggerConfigs WHERE TriggerKey = N'DocumentBacklogDigest')
    INSERT INTO dbo.NotificationTriggerConfigs (TriggerKey, DisplayName, Description, IsEnabled) VALUES
        (N'DocumentBacklogDigest', N'Document Review Backlog Digest (Staff)', N'Notifies Support Staff/Admin by email when documents have been awaiting review for 5+ days.', 1);
GO

-- -----------------------------------------------------------------------------
-- Two-way applicant inquiries.
--
-- Announcements only ever broadcasts one-way (staff -> every applicant).
-- Nothing let an applicant ask a follow-up question - e.g. about why a
-- document was flagged - without phoning the office. InquiryThreads/
-- InquiryMessages is a lightweight ticket/thread per applicant: the
-- applicant opens a thread with an initial message, and either side can
-- keep replying. IsFromStaff on each message is recorded at post time
-- (rather than derived later from the sender's role, which could
-- theoretically change) so a thread's read-back never has to re-resolve
-- "was this person staff when they wrote this."
--
-- HasUnreadForApplicant/HasUnreadForStaff are simple two-state flags, not a
-- per-message read receipt - "the other side posted since I last opened
-- this thread" is all the staff queue and the applicant's own list need to
-- surface, and both are cleared by the read side's own GetDetailAsync call.
-- Status flips to 'Closed' only via a deliberate staff action
-- (CloseAsync); an applicant replying to a Closed thread reopens it
-- automatically (PostMessageAsync), so closing never traps an applicant
-- who still has something to say.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.InquiryThreads', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.InquiryThreads
    (
        ThreadId                UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_InquiryThreads_ThreadId DEFAULT NEWID(),
        UserId                  UNIQUEIDENTIFIER NOT NULL,
        Subject                 NVARCHAR(200)    NOT NULL,
        Status                  NVARCHAR(20)     NOT NULL CONSTRAINT DF_InquiryThreads_Status DEFAULT (N'Open'),
        HasUnreadForApplicant   BIT              NOT NULL CONSTRAINT DF_InquiryThreads_HasUnreadForApplicant DEFAULT (0),
        HasUnreadForStaff       BIT              NOT NULL CONSTRAINT DF_InquiryThreads_HasUnreadForStaff DEFAULT (1),
        CreatedAt               DATETIME2(3)     NOT NULL CONSTRAINT DF_InquiryThreads_CreatedAt DEFAULT SYSUTCDATETIME(),
        UpdatedAt                DATETIME2(3)    NOT NULL CONSTRAINT DF_InquiryThreads_UpdatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_InquiryThreads PRIMARY KEY (ThreadId),
        CONSTRAINT FK_InquiryThreads_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId),
        CONSTRAINT CK_InquiryThreads_Status CHECK (Status IN (N'Open', N'Closed'))
    );
END
BEGIN TRY IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_InquiryThreads_UserId' AND object_id = OBJECT_ID(N'dbo.InquiryThreads')) EXEC (N'IF EXISTS (SELECT 1 FROM sys.stats WHERE name = N''IX_InquiryThreads_UserId'' AND object_id = OBJECT_ID(N''dbo.InquiryThreads'')) DROP STATISTICS dbo.InquiryThreads.IX_InquiryThreads_UserId CREATE NONCLUSTERED INDEX IX_InquiryThreads_UserId ON dbo.InquiryThreads (UserId)') END TRY BEGIN CATCH IF ERROR_NUMBER() NOT IN (1902, 1913) THROW END CATCH
BEGIN TRY IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_InquiryThreads_Status_UpdatedAt' AND object_id = OBJECT_ID(N'dbo.InquiryThreads')) EXEC (N'IF EXISTS (SELECT 1 FROM sys.stats WHERE name = N''IX_InquiryThreads_Status_UpdatedAt'' AND object_id = OBJECT_ID(N''dbo.InquiryThreads'')) DROP STATISTICS dbo.InquiryThreads.IX_InquiryThreads_Status_UpdatedAt CREATE NONCLUSTERED INDEX IX_InquiryThreads_Status_UpdatedAt ON dbo.InquiryThreads (Status, UpdatedAt DESC)') END TRY BEGIN CATCH IF ERROR_NUMBER() NOT IN (1902, 1913) THROW END CATCH
GO

IF OBJECT_ID(N'dbo.InquiryMessages', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.InquiryMessages
    (
        MessageId       UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_InquiryMessages_MessageId DEFAULT NEWID(),
        ThreadId        UNIQUEIDENTIFIER NOT NULL,
        SenderUserId    UNIQUEIDENTIFIER NOT NULL,
        IsFromStaff     BIT              NOT NULL,
        Body            NVARCHAR(2000)   NOT NULL,
        CreatedAt       DATETIME2(3)     NOT NULL CONSTRAINT DF_InquiryMessages_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_InquiryMessages PRIMARY KEY (MessageId),
        CONSTRAINT FK_InquiryMessages_Threads FOREIGN KEY (ThreadId) REFERENCES dbo.InquiryThreads (ThreadId),
        CONSTRAINT FK_InquiryMessages_Users FOREIGN KEY (SenderUserId) REFERENCES dbo.Users (UserId)
    );
END
BEGIN TRY IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_InquiryMessages_ThreadId' AND object_id = OBJECT_ID(N'dbo.InquiryMessages')) EXEC (N'IF EXISTS (SELECT 1 FROM sys.stats WHERE name = N''IX_InquiryMessages_ThreadId'' AND object_id = OBJECT_ID(N''dbo.InquiryMessages'')) DROP STATISTICS dbo.InquiryMessages.IX_InquiryMessages_ThreadId CREATE NONCLUSTERED INDEX IX_InquiryMessages_ThreadId ON dbo.InquiryMessages (ThreadId, CreatedAt ASC)') END TRY BEGIN CATCH IF ERROR_NUMBER() NOT IN (1902, 1913) THROW END CATCH
GO

IF NOT EXISTS (SELECT 1 FROM dbo.NotificationTriggerConfigs WHERE TriggerKey = N'InquiryReply')
    INSERT INTO dbo.NotificationTriggerConfigs (TriggerKey, DisplayName, Description, IsEnabled) VALUES
        (N'InquiryReply', N'Inquiry Reply Alerts', N'Notifies an applicant by email when Support Staff/Admin reply to their inquiry thread.', 1);
GO

-- -----------------------------------------------------------------------------
-- Department-Scoped Academic Head Access
-- BISAASS-49 gave dbo.Users a free-text Department for Academic Heads and
-- matched it against AdmissionApplications.CourseAppliedFor with a LIKE -
-- but Admins assign departments from a fixed list (College, Senior High
-- School, High School, Elementary) while applicants type their course
-- freely, so the two almost never matched. This ties applicants to a
-- department explicitly instead:
--   * AdmissionApplications.Department - chosen by the applicant from the
--     same fixed list on the admission form (DepartmentConstants), and
--     correctable by an Admin-Registrar. Nullable: every application
--     submitted before this change stays NULL ("Unassigned") until an
--     Admin sets it, and is visible to no Academic Head until then.
--   * vw_ApplicantDepartments - one row per applicant who has a department
--     on any admission application, carrying the department from their
--     most recent one. Scholarship applications have no department of
--     their own (a scholarship is school-wide), so an applicant's
--     scholarship applications belong to whichever department their
--     latest admission application is in.
-- An Academic Head then sees only applicants whose department equals
-- their own Users.Department - their decision queue, application detail,
-- final decisions, dashboard, and every report (enforced server-side).
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.AdmissionApplications') AND name = N'Department'
)
BEGIN
    ALTER TABLE dbo.AdmissionApplications ADD Department NVARCHAR(100) NULL;
END
GO

-- Safe to re-run in every state: the index exists, nothing exists, or a stray
-- statistics object already holds the name (SQL Server shares one name space
-- for indexes and statistics on a table, and CREATE INDEX then fails with
-- Msg 1913 "an index or statistics with name ... already exists" even though
-- the index itself is missing). A leftover statistics object is dropped - they
-- are rebuilt automatically - and the index created in its place.
BEGIN TRY IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_AdmissionApplications_Department' AND object_id = OBJECT_ID(N'dbo.AdmissionApplications')) EXEC (N'IF EXISTS (SELECT 1 FROM sys.stats WHERE name = N''IX_AdmissionApplications_Department'' AND object_id = OBJECT_ID(N''dbo.AdmissionApplications'')) DROP STATISTICS dbo.AdmissionApplications.IX_AdmissionApplications_Department CREATE NONCLUSTERED INDEX IX_AdmissionApplications_Department ON dbo.AdmissionApplications (Department, UserId)') END TRY BEGIN CATCH IF ERROR_NUMBER() NOT IN (1902, 1913) THROW END CATCH
GO

-- -----------------------------------------------------------------------------
-- Scholarship application form (School Year 2026-2027 Academic Scholarship
-- Application and Consent Form)
-- The online form collects more than a grade average: the level applied for
-- (Grade 7, Grade 11 or First Year College), the applicant's full name and last
-- school, the parent / official guardian's details, and three Data Privacy
-- consents (terms, participation, certification) recorded with a timestamp.
-- All columns are NULL so applications filed before this change stay valid.
-- A scholarship application with a LevelApplied now also places its applicant
-- in a department (Grade 7 = High School, Grade 11 = Senior High School,
-- First Year College = College) - see vw_ApplicantDepartments below.
-- -----------------------------------------------------------------------------
IF COL_LENGTH(N'dbo.ScholarshipApplications', N'LevelApplied') IS NULL
    ALTER TABLE dbo.ScholarshipApplications ADD LevelApplied NVARCHAR(30) NULL;
GO

IF COL_LENGTH(N'dbo.ScholarshipApplications', N'ApplicantFullName') IS NULL
    ALTER TABLE dbo.ScholarshipApplications ADD ApplicantFullName NVARCHAR(200) NULL;
GO

IF COL_LENGTH(N'dbo.ScholarshipApplications', N'SchoolLastAttended') IS NULL
    ALTER TABLE dbo.ScholarshipApplications ADD SchoolLastAttended NVARCHAR(200) NULL;
GO

IF COL_LENGTH(N'dbo.ScholarshipApplications', N'GuardianRole') IS NULL
    ALTER TABLE dbo.ScholarshipApplications ADD GuardianRole NVARCHAR(20) NULL;
GO

IF COL_LENGTH(N'dbo.ScholarshipApplications', N'GuardianName') IS NULL
    ALTER TABLE dbo.ScholarshipApplications ADD GuardianName NVARCHAR(200) NULL;
GO

IF COL_LENGTH(N'dbo.ScholarshipApplications', N'GuardianContact') IS NULL
    ALTER TABLE dbo.ScholarshipApplications ADD GuardianContact NVARCHAR(50) NULL;
GO

IF COL_LENGTH(N'dbo.ScholarshipApplications', N'GuardianEmail') IS NULL
    ALTER TABLE dbo.ScholarshipApplications ADD GuardianEmail NVARCHAR(256) NULL;
GO

IF COL_LENGTH(N'dbo.ScholarshipApplications', N'ConsentTerms') IS NULL
    ALTER TABLE dbo.ScholarshipApplications ADD ConsentTerms BIT NULL;
GO

IF COL_LENGTH(N'dbo.ScholarshipApplications', N'ConsentParticipation') IS NULL
    ALTER TABLE dbo.ScholarshipApplications ADD ConsentParticipation BIT NULL;
GO

IF COL_LENGTH(N'dbo.ScholarshipApplications', N'ConsentCertification') IS NULL
    ALTER TABLE dbo.ScholarshipApplications ADD ConsentCertification BIT NULL;
GO

IF COL_LENGTH(N'dbo.ScholarshipApplications', N'ConsentedAt') IS NULL
    ALTER TABLE dbo.ScholarshipApplications ADD ConsentedAt DATETIME2(3) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_ScholarshipApplications_LevelApplied')
    ALTER TABLE dbo.ScholarshipApplications WITH NOCHECK
        ADD CONSTRAINT CK_ScholarshipApplications_LevelApplied
        CHECK (LevelApplied IS NULL OR LevelApplied IN (N'Grade 7', N'Grade 11', N'First Year College'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_ScholarshipApplications_GuardianRole')
    ALTER TABLE dbo.ScholarshipApplications WITH NOCHECK
        ADD CONSTRAINT CK_ScholarshipApplications_GuardianRole
        CHECK (GuardianRole IS NULL OR GuardianRole IN (N'Parent', N'Official guardian'));
GO

-- The signed scholarship application form is a new document type.
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_ApplicantDocuments_DocumentType' AND definition NOT LIKE N'%ScholarshipForm%')
BEGIN
    ALTER TABLE dbo.ApplicantDocuments DROP CONSTRAINT CK_ApplicantDocuments_DocumentType;
    ALTER TABLE dbo.ApplicantDocuments ADD CONSTRAINT CK_ApplicantDocuments_DocumentType
        CHECK (DocumentType IN (N'ReportCard', N'IdPicture', N'PSA', N'TOR', N'SF10', N'ScholarshipForm'));
END
GO

CREATE OR ALTER VIEW dbo.vw_ApplicantDepartments
AS
    -- The department of the applicant's most recent application that names
    -- one: an admission application's Department, or a scholarship
    -- application's level (Grade 7 / Grade 11 / First Year College).
    SELECT latest.UserId, latest.Department
    FROM (
        SELECT
            x.UserId,
            x.Department,
            ROW_NUMBER() OVER (PARTITION BY x.UserId ORDER BY x.SubmittedAt DESC) AS rn
        FROM (
            SELECT a.UserId, a.Department, a.SubmittedAt
            FROM dbo.AdmissionApplications a
            WHERE a.Department IS NOT NULL
            UNION ALL
            SELECT sa.UserId,
                   CASE sa.LevelApplied
                       WHEN N'Grade 7' THEN N'High School'
                       WHEN N'Grade 11' THEN N'Senior High School'
                       WHEN N'First Year College' THEN N'College'
                   END,
                   sa.SubmittedAt
            FROM dbo.ScholarshipApplications sa
            WHERE sa.LevelApplied IS NOT NULL
        ) x
    ) latest
    WHERE latest.rn = 1;
GO

-- -----------------------------------------------------------------------------
-- Semester lock + Super Admin
-- Scholarships can't be edited or deactivated while a semester is ongoing
-- (today, Philippine time, falls between a semester's StartDate and EndDate
-- inclusive) - changing a scholarship's terms mid-semester would change
-- them under applicants already in its pipeline. A Super Admin can force
-- an edit through the lock; every forced edit is written to the audit log.
--   * Users.IsSuperAdmin - an Admin who may override locks and manage
--     semesters. Granted by another Super Admin in Manage Accounts. So the
--     system is never left without one, the earliest-created active Admin
--     becomes Super Admin when no active Super Admin exists.
--   * Semesters - the school calendar the lock reads. Managed by a Super
--     Admin in System Settings.
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.Users') AND name = N'IsSuperAdmin'
)
BEGIN
    ALTER TABLE dbo.Users ADD IsSuperAdmin BIT NOT NULL CONSTRAINT DF_Users_IsSuperAdmin DEFAULT (0);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM dbo.Users u JOIN dbo.Roles r ON r.RoleId = u.RoleId
    WHERE u.IsSuperAdmin = 1 AND u.IsActive = 1 AND r.RoleName = N'Admin'
)
BEGIN
    UPDATE dbo.Users SET IsSuperAdmin = 1
    WHERE UserId = (
        SELECT TOP 1 u.UserId FROM dbo.Users u JOIN dbo.Roles r ON r.RoleId = u.RoleId
        WHERE r.RoleName = N'Admin' AND u.IsActive = 1
        ORDER BY u.CreatedAt ASC
    );
END
GO

IF OBJECT_ID(N'dbo.Semesters', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Semesters
    (
        SemesterId       INT IDENTITY(1,1) NOT NULL,
        Name             NVARCHAR(100)     NOT NULL,
        StartDate        DATE              NOT NULL,
        EndDate          DATE              NOT NULL,
        CreatedByUserId  UNIQUEIDENTIFIER  NULL,
        CreatedAt        DATETIME2(3)      NOT NULL CONSTRAINT DF_Semesters_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT PK_Semesters PRIMARY KEY (SemesterId),
        CONSTRAINT FK_Semesters_CreatedBy FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users (UserId),
        CONSTRAINT CK_Semesters_Dates CHECK (EndDate >= StartDate)
    );
END
GO

-- -----------------------------------------------------------------------------
-- College programs
-- The College department offers four programs: BSBA, BSED, BSA and BSIT. An
-- admission application filed under College must name one of them, stored by
-- code. The API already enforces this (DepartmentConstants.FixedPrograms);
-- this constraint keeps the database itself honest for anything that writes
-- to it directly. Other departments (Senior High School, High School,
-- Elementary) carry a strand or grade level, so they are not restricted.
--
-- Applications with no department (filed before departments existed) are
-- unaffected. If rows already filed under College hold some other course,
-- the constraint is still added - it then applies to new and changed rows
-- only - and a warning lists how many to correct.
-- -----------------------------------------------------------------------------
IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE name = N'CK_AdmissionApplications_CollegeProgram'
      AND parent_object_id = OBJECT_ID(N'dbo.AdmissionApplications')
)
BEGIN
    DECLARE @CollegeOutsideList INT = (
        SELECT COUNT(*) FROM dbo.AdmissionApplications
        WHERE Department = N'College' AND CourseAppliedFor NOT IN (N'BSBA', N'BSED', N'BSA', N'BSIT')
    );

    IF @CollegeOutsideList = 0
        ALTER TABLE dbo.AdmissionApplications WITH CHECK
            ADD CONSTRAINT CK_AdmissionApplications_CollegeProgram
            CHECK (Department IS NULL OR Department <> N'College' OR CourseAppliedFor IN (N'BSBA', N'BSED', N'BSA', N'BSIT'));
    ELSE
    BEGIN
        ALTER TABLE dbo.AdmissionApplications WITH NOCHECK
            ADD CONSTRAINT CK_AdmissionApplications_CollegeProgram
            CHECK (Department IS NULL OR Department <> N'College' OR CourseAppliedFor IN (N'BSBA', N'BSED', N'BSA', N'BSIT'));

        PRINT CONCAT(N'WARNING: ', @CollegeOutsideList, N' College application(s) have a course outside BSBA, BSED, BSA, BSIT. ',
                     N'The rule applies to new and changed rows; correct these with: ',
                     N'SELECT ApplicationId, CourseAppliedFor FROM dbo.AdmissionApplications ',
                     N'WHERE Department = N''College'' AND CourseAppliedFor NOT IN (N''BSBA'', N''BSED'', N''BSA'', N''BSIT'').');
    END
END
GO

-- -----------------------------------------------------------------------------
-- ExamScheduleSelections.ExamType / ExamFee / InvoiceNumber
-- The printed exam slip shows the type of exam, the fee paid and the cashier's
-- invoice (SI) number. ExamType is chosen by the applicant when they pick a
-- schedule; ExamFee is a snapshot of the fixed fee (Exam:Fee setting) taken
-- when the registrar releases the permit, so later fee changes never alter an
-- issued slip; InvoiceNumber is typed in by the registrar at release.
-- -----------------------------------------------------------------------------
IF COL_LENGTH(N'dbo.ExamScheduleSelections', N'ExamType') IS NULL
    ALTER TABLE dbo.ExamScheduleSelections ADD ExamType NVARCHAR(40) NOT NULL CONSTRAINT DF_ExamScheduleSelections_ExamType DEFAULT (N'Entrance Exam');
GO

IF COL_LENGTH(N'dbo.ExamScheduleSelections', N'ExamFee') IS NULL
    ALTER TABLE dbo.ExamScheduleSelections ADD ExamFee DECIMAL(10,2) NULL;
GO

IF COL_LENGTH(N'dbo.ExamScheduleSelections', N'InvoiceNumber') IS NULL
    ALTER TABLE dbo.ExamScheduleSelections ADD InvoiceNumber NVARCHAR(50) NULL;
GO

-- -----------------------------------------------------------------------------
-- Admission status workflow
-- Submitted -> UnderReview -> PendingDocuments -> DocumentsCompleted ->
-- DocumentsCleared -> ExamScheduled -> ExamDone -> Registration -> Approved,
-- with Rejected / Retracted possible from any step that is not yet final, and
-- DidNotTakeExam as a side branch off ExamScheduled that can return to it. The
-- order is enforced by the API (AdmissionWorkflowConstants); this constraint
-- only lists the values the column may hold. Older rows (Submitted,
-- UnderReview, Approved, Rejected) stay valid as they are.
-- -----------------------------------------------------------------------------
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_AdmissionApplications_Status' AND definition NOT LIKE N'%PendingDocuments%')
BEGIN
    ALTER TABLE dbo.AdmissionApplications DROP CONSTRAINT CK_AdmissionApplications_Status;
    ALTER TABLE dbo.AdmissionApplications ADD CONSTRAINT CK_AdmissionApplications_Status
        CHECK (Status IN (N'Submitted', N'UnderReview', N'PendingDocuments', N'DocumentsCompleted', N'DocumentsCleared', N'ExamScheduled', N'ExamDone', N'DidNotTakeExam', N'Registration', N'Approved', N'Rejected', N'Retracted'));
END
GO

-- -----------------------------------------------------------------------------
-- ExamScheduleSelections.ExamStatus
-- What happened to the applicant after they were scheduled: Scheduled (the
-- default, and what a fresh selection resets to), ExamDone, Rescheduled or
-- DidNotTakeExam. Staff set it on the Exam Schedules page.
-- -----------------------------------------------------------------------------
IF COL_LENGTH(N'dbo.ExamScheduleSelections', N'ExamStatus') IS NULL
    ALTER TABLE dbo.ExamScheduleSelections ADD ExamStatus NVARCHAR(30) NOT NULL CONSTRAINT DF_ExamScheduleSelections_ExamStatus DEFAULT (N'Scheduled');
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_ExamScheduleSelections_ExamStatus')
    ALTER TABLE dbo.ExamScheduleSelections ADD CONSTRAINT CK_ExamScheduleSelections_ExamStatus
        CHECK (ExamStatus IN (N'Scheduled', N'ExamDone', N'Rescheduled', N'DidNotTakeExam'));
GO

-- -----------------------------------------------------------------------------
-- dbo.RoleBlockedFeatures
-- Pages the Super Admin (the principal) has switched off for a whole role. A
-- row means "blocked"; no row means available, so a page added later is open
-- until someone turns it off. FeatureKey is the page's route (see
-- FeatureCatalog in the API). The Super Admin is never affected.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.RoleBlockedFeatures', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RoleBlockedFeatures
    (
        RoleName        NVARCHAR(30)     NOT NULL,
        FeatureKey      NVARCHAR(100)    NOT NULL,
        BlockedAt       DATETIME2(3)     NOT NULL CONSTRAINT DF_RoleBlockedFeatures_BlockedAt DEFAULT (SYSUTCDATETIME()),
        BlockedByUserId UNIQUEIDENTIFIER NULL,
        CONSTRAINT PK_RoleBlockedFeatures PRIMARY KEY (RoleName, FeatureKey)
    );
END
GO
