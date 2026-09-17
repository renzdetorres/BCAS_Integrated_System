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
