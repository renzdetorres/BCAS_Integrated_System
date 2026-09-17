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
-- BISAASS-41 Evaluator Dashboard reads this table directly: Status IN
-- (Submitted, UnderReview) is the pending-evaluation queue, Status IN
-- (Approved, Rejected) is "recently evaluated" (see
-- EvaluatorDashboardRepository) - no schema change was needed for that
-- ticket. There's no separate "decided at" timestamp yet, so recency there
-- is approximated by SubmittedAt until the verdict-recording workflow
-- (BISAASS-42/43) adds one.
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
-- Saturday's IsOffered to 1. No admin-management endpoint exists yet, so
-- rows are seeded here, the same way Deadlines and Scholarships were.
-- Venue was added in BISAASS-21 - the exam permit shows it alongside the
-- date/time, so it lives on the slot rather than the selection.
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
