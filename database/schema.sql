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
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.ExamSchedules', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ExamSchedules
    (
        ExamScheduleId  INT             NOT NULL IDENTITY(1,1) CONSTRAINT PK_ExamSchedules PRIMARY KEY,
        DayType         NVARCHAR(10)    NOT NULL,
        ExamDate        DATE            NOT NULL,
        ExamTime        TIME(0)         NOT NULL,
        IsOffered       BIT             NOT NULL CONSTRAINT DF_ExamSchedules_IsOffered DEFAULT (1),
        CreatedAt       DATETIME2(3)    NOT NULL CONSTRAINT DF_ExamSchedules_CreatedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT CK_ExamSchedules_DayType CHECK (DayType IN (N'Saturday', N'Weekday'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.ExamSchedules WHERE DayType = N'Saturday' AND ExamDate = '2026-10-03')
    INSERT INTO dbo.ExamSchedules (DayType, ExamDate, ExamTime, IsOffered) VALUES (N'Saturday', '2026-10-03', '08:00', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.ExamSchedules WHERE DayType = N'Saturday' AND ExamDate = '2026-10-10')
    INSERT INTO dbo.ExamSchedules (DayType, ExamDate, ExamTime, IsOffered) VALUES (N'Saturday', '2026-10-10', '08:00', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.ExamSchedules WHERE DayType = N'Saturday' AND ExamDate = '2026-10-17')
    INSERT INTO dbo.ExamSchedules (DayType, ExamDate, ExamTime, IsOffered) VALUES (N'Saturday', '2026-10-17', '08:00', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.ExamSchedules WHERE DayType = N'Weekday' AND ExamDate = '2026-10-06')
    INSERT INTO dbo.ExamSchedules (DayType, ExamDate, ExamTime, IsOffered) VALUES (N'Weekday', '2026-10-06', '13:00', 1);
IF NOT EXISTS (SELECT 1 FROM dbo.ExamSchedules WHERE DayType = N'Weekday' AND ExamDate = '2026-10-08')
    INSERT INTO dbo.ExamSchedules (DayType, ExamDate, ExamTime, IsOffered) VALUES (N'Weekday', '2026-10-08', '13:00', 0);
GO

-- -----------------------------------------------------------------------------
-- ExamScheduleSelections
-- One-to-one with Users (BISAASS-20) - an applicant has a single confirmed
-- entrance-exam schedule; selecting again replaces it (see
-- ExamScheduleRepository.SelectAsync), it isn't accumulated as history.
-- -----------------------------------------------------------------------------
IF OBJECT_ID(N'dbo.ExamScheduleSelections', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ExamScheduleSelections
    (
        UserId          UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_ExamScheduleSelections PRIMARY KEY,
        ExamScheduleId  INT              NOT NULL,
        SelectedAt      DATETIME2(3)     NOT NULL CONSTRAINT DF_ExamScheduleSelections_SelectedAt DEFAULT SYSUTCDATETIME(),
        CONSTRAINT FK_ExamScheduleSelections_Users FOREIGN KEY (UserId) REFERENCES dbo.Users (UserId),
        CONSTRAINT FK_ExamScheduleSelections_ExamSchedules FOREIGN KEY (ExamScheduleId) REFERENCES dbo.ExamSchedules (ExamScheduleId)
    );
END
GO
