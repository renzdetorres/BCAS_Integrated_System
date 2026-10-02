-- -----------------------------------------------------------------------------
-- BCAS sample data
--
-- Example records so every screen has something to show: applicants across
-- all four departments, admission and scholarship applications at every
-- stage, documents waiting on review, exam selections, reservations, and
-- one Academic Head per department. Run it AFTER schema.sql, against a
-- development database only.
--
--   * Safe to re-run: every insert is guarded, so a second run adds nothing.
--   * Easy to remove: all sample accounts use the @sample.bcas.test domain;
--     sample-data-remove.sql deletes exactly those and their records.
--   * Dates are relative to the day it runs, so "this week" and the weekly
--     trend are populated whenever you load it.
--   * Every sample account (applicants and the Academic Heads) signs in
--     with the password   BcasDemo#2026
--
-- Departments and programs follow the live rules: College applications use
-- BSBA, BSED, BSA or BSIT; Senior High School, High School and Elementary
-- carry a strand or grade level. Two older-style applications have no
-- department, to show the "Unassigned" handling.
-- -----------------------------------------------------------------------------
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRANSACTION;

DECLARE @Now           DATETIME2(3)   = SYSUTCDATETIME();
DECLARE @PasswordHash  NVARCHAR(200)  = N'$2a$12$iUIPps4Eu.PqnQHEZXv6ceF6jxYgMY62DR227h0YkiQjlho/QxXBS';
DECLARE @PdfBytes      VARBINARY(MAX) = 0x255044462D312E340A312030206F626A0A3C3C202F54797065202F436174616C6F67202F5061676573203220302052203E3E0A656E646F626A0A322030206F626A0A3C3C202F54797065202F5061676573202F4B696473205B33203020525D202F436F756E742031203E3E0A656E646F626A0A332030206F626A0A3C3C202F54797065202F50616765202F506172656E74203220302052202F4D65646961426F78205B30203020333030203134345D202F436F6E74656E7473203420302052202F5265736F7572636573203C3C202F466F6E74203C3C202F4631203520302052203E3E203E3E203E3E0A656E646F626A0A342030206F626A0A3C3C202F4C656E67746820313035203E3E0A73747265616D0A4254202F46312031342054662032302038302054642028424341532073616D706C6520646F63756D656E742920546A2030202D3232205464202F46312031302054662028506C616365686F6C6465722066696C6520666F722064656D6F20646174612920546A2045540A656E6473747265616D0A656E646F626A0A352030206F626A0A3C3C202F54797065202F466F6E74202F53756274797065202F5479706531202F42617365466F6E74202F48656C766574696361203E3E0A656E646F626A0A787265660A3020360A303030303030303030302036353533352066200A30303030303030303039203030303030206E200A30303030303030303538203030303030206E200A30303030303030313135203030303030206E200A30303030303030323431203030303030206E200A30303030303030333937203030303030206E200A747261696C65720A3C3C202F53697A652036202F526F6F74203120302052203E3E0A7374617274787265660A3436370A2525454F460A;
DECLARE @PngBytes      VARBINARY(MAX) = 0x89504E470D0A1A0A0000000D4948445200000001000000010802000000907753DE0000000C49444154789C63D0CDF2070001AE00E7CF53A5A60000000049454E44AE426082;

-- The existing staff accounts that sample records are attributed to (any
-- account of the role will do; the script stops if one of them is missing).
DECLARE @AdminId UNIQUEIDENTIFIER = (
    SELECT TOP 1 u.UserId FROM dbo.Users u JOIN dbo.Roles r ON r.RoleId = u.RoleId
    WHERE r.RoleName = N'Admin' ORDER BY u.IsSuperAdmin DESC, u.CreatedAt);
DECLARE @EvaluatorId UNIQUEIDENTIFIER = (
    SELECT TOP 1 u.UserId FROM dbo.Users u JOIN dbo.Roles r ON r.RoleId = u.RoleId
    WHERE r.RoleName = N'Evaluator' ORDER BY u.CreatedAt);
DECLARE @SupportId UNIQUEIDENTIFIER = (
    SELECT TOP 1 u.UserId FROM dbo.Users u JOIN dbo.Roles r ON r.RoleId = u.RoleId
    WHERE r.RoleName = N'SupportStaff' ORDER BY u.CreatedAt);

IF @AdminId IS NULL OR @EvaluatorId IS NULL OR @SupportId IS NULL
BEGIN
    RAISERROR(N'Sample data needs at least one Admin, Evaluator and SupportStaff account. Create them first.', 16, 1);
    ROLLBACK TRANSACTION;
    RETURN;
END

-- -----------------------------------------------------------------------------
-- Academic Heads, one per department (the existing Elementary head, if any,
-- is left as it is).
-- -----------------------------------------------------------------------------
INSERT INTO dbo.Users (FirstName, LastName, Email, PasswordHash, RoleId, Department)
SELECT s.FirstName, s.LastName, s.Email, @PasswordHash, r.RoleId, s.Department
FROM (VALUES
    (N'Carmelita', N'Dizon',   N'head.college@sample.bcas.test',    N'College'),
    (N'Rodrigo',   N'Palma',   N'head.shs@sample.bcas.test',        N'Senior High School'),
    (N'Evelyn',    N'Cabrera', N'head.highschool@sample.bcas.test', N'High School')
) s (FirstName, LastName, Email, Department)
JOIN dbo.Roles r ON r.RoleName = N'AcademicHead'
WHERE NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.Email = s.Email);

-- -----------------------------------------------------------------------------
-- Applicants: one row per person with the admission application they filed.
-- -----------------------------------------------------------------------------
DECLARE @Sample TABLE
(
    N          INT           NOT NULL,
    Email      NVARCHAR(256) NOT NULL PRIMARY KEY,
    FirstName  NVARCHAR(100) NOT NULL,
    LastName   NVARCHAR(100) NOT NULL,
    Department NVARCHAR(100) NULL,
    Course     NVARCHAR(200) NOT NULL,
    AppType    NVARCHAR(20)  NOT NULL,
    PrevSchool NVARCHAR(200) NOT NULL,
    Status     NVARCHAR(30)  NOT NULL,
    DaysAgo    INT           NOT NULL,
    Reserved   BIT           NOT NULL,
    Birth      DATE          NOT NULL,
    City       NVARCHAR(100) NOT NULL,
    Remarks    NVARCHAR(1000) NULL
);

INSERT INTO @Sample (N, Email, FirstName, LastName, Department, Course, AppType, PrevSchool, Status, DaysAgo, Reserved, Birth, City, Remarks)
SELECT ROW_NUMBER() OVER (ORDER BY v.Ord), v.Email, v.FirstName, v.LastName, v.Department, v.Course, v.AppType, v.PrevSchool,
       v.Status, v.DaysAgo, v.Reserved, CAST(v.Birth AS DATE), v.City, v.Remarks
FROM (VALUES
 -- College (BSBA / BSED / BSA / BSIT)
 ( 1, N'maricel.delacruz@sample.bcas.test',   N'Maricel',  N'Dela Cruz',   N'College', N'BSIT', N'NewStudent', N'Baguio City National High School',          N'Approved',    40, 1, '2007-03-14', N'Baguio City', NULL),
 ( 2, N'joshua.villanueva@sample.bcas.test',  N'Joshua',   N'Villanueva',  N'College', N'BSBA', N'NewStudent', N'Saint Louis University Laboratory High School', N'UnderReview', 6, 0, '2007-08-02', N'Baguio City', NULL),
 ( 3, N'andrea.santos@sample.bcas.test',      N'Andrea',   N'Santos',      N'College', N'BSA',  N'Transferee', N'University of the Cordilleras',             N'Submitted',    1, 0, '2005-11-21', N'Baguio City', NULL),
 ( 4, N'paolo.reyes@sample.bcas.test',        N'Paolo',    N'Reyes',       N'College', N'BSED', N'NewStudent', N'Pines City National High School',           N'Approved',    33, 1, '2007-01-09', N'Baguio City', NULL),
 ( 5, N'kristine.bautista@sample.bcas.test',  N'Kristine', N'Bautista',    N'College', N'BSIT', N'NewStudent', N'La Trinidad National High School',         N'Submitted',    3, 0, '2007-05-30', N'La Trinidad', NULL),
 ( 6, N'renato.aquino@sample.bcas.test',      N'Renato',   N'Aquino',      N'College', N'BSBA', N'Transferee', N'Benguet State University',                N'Rejected',    25, 0, '2004-12-17', N'La Trinidad', N'Transfer credentials were incomplete and not resubmitted within the deadline.'),
 ( 7, N'liza.mendoza@sample.bcas.test',       N'Liza',     N'Mendoza',     N'College', N'BSED', N'NewStudent', N'Itogon National High School',              N'UnderReview',  9, 0, '2007-09-25', N'Itogon', NULL),
 ( 8, N'gabriel.soriano@sample.bcas.test',    N'Gabriel',  N'Soriano',     N'College', N'BSA',  N'NewStudent', N'Baguio City National High School',          N'Approved',    21, 0, '2007-02-11', N'Baguio City', NULL),
 ( 9, N'hannah.pascual@sample.bcas.test',     N'Hannah',   N'Pascual',     N'College', N'BSIT', N'Transferee', N'Saint Louis University',                    N'Submitted',    0, 0, '2006-06-04', N'Baguio City', NULL),
 (10, N'miguel.tolentino@sample.bcas.test',   N'Miguel',   N'Tolentino',   N'College', N'BSBA', N'NewStudent', N'Easter College',                            N'UnderReview', 12, 0, '2007-10-19', N'Baguio City', NULL),
 -- Senior High School (strand)
 (11, N'camille.domingo@sample.bcas.test',    N'Camille',  N'Domingo',     N'Senior High School', N'STEM',  N'NewStudent', N'Baguio City National High School',  N'Approved',    30, 1, '2009-04-12', N'Baguio City', NULL),
 (12, N'rafael.castillo@sample.bcas.test',    N'Rafael',   N'Castillo',    N'Senior High School', N'ABM',   N'NewStudent', N'Easter School',                      N'Submitted',    2, 0, '2009-07-28', N'Baguio City', NULL),
 (13, N'bianca.ramos@sample.bcas.test',       N'Bianca',   N'Ramos',       N'Senior High School', N'HUMSS', N'NewStudent', N'La Trinidad National High School',  N'UnderReview',  8, 0, '2009-01-15', N'La Trinidad', NULL),
 (14, N'elijah.navarro@sample.bcas.test',     N'Elijah',   N'Navarro',     N'Senior High School', N'GAS',   N'NewStudent', N'Tuba National High School',          N'Approved',    45, 1, '2008-11-03', N'Tuba', NULL),
 (15, N'sofia.hernandez@sample.bcas.test',    N'Sofia',    N'Hernandez',   N'Senior High School', N'STEM',  N'NewStudent', N'Pines City National High School',    N'Submitted',    5, 0, '2009-03-22', N'Baguio City', NULL),
 (16, N'dominic.cruz@sample.bcas.test',       N'Dominic',  N'Cruz',        N'Senior High School', N'TVL-ICT', N'Transferee', N'Saint Joseph School',              N'Rejected',    18, 0, '2008-09-08', N'Baguio City', N'Did not meet the general average required for the strand.'),
 -- High School (grade level)
 (17, N'patricia.flores@sample.bcas.test',    N'Patricia', N'Flores',      N'High School', N'Grade 7',  N'NewStudent', N'Irisan Elementary School',          N'Approved',    28, 1, '2013-05-06', N'Baguio City', NULL),
 (18, N'lorenzo.garcia@sample.bcas.test',     N'Lorenzo',  N'Garcia',      N'High School', N'Grade 8',  N'NewStudent', N'Pinsao Elementary School',          N'Submitted',    4, 0, '2012-12-01', N'Baguio City', NULL),
 (19, N'isabella.torres@sample.bcas.test',    N'Isabella', N'Torres',      N'High School', N'Grade 7',  N'NewStudent', N'La Trinidad Central School',        N'UnderReview',  7, 0, '2013-02-18', N'La Trinidad', NULL),
 (20, N'nathan.lim@sample.bcas.test',         N'Nathan',   N'Lim',         N'High School', N'Grade 9',  N'Transferee', N'Saint Joseph School',               N'Approved',    52, 1, '2011-08-30', N'Baguio City', NULL),
 (21, N'angelica.dizon@sample.bcas.test',     N'Angelica', N'Dizon',       N'High School', N'Grade 10', N'NewStudent', N'Easter School',                     N'Submitted',    0, 0, '2010-10-14', N'Baguio City', NULL),
 -- Elementary (grade level)
 (22, N'mateo.ocampo@sample.bcas.test',       N'Mateo',    N'Ocampo',      N'Elementary', N'Grade 1', N'NewStudent', N'Little Flower Kindergarten',           N'Approved',    35, 1, '2019-06-11', N'Baguio City', NULL),
 (23, N'chloe.rivera@sample.bcas.test',       N'Chloe',    N'Rivera',      N'Elementary', N'Grade 3', N'Transferee', N'Pinsao Elementary School',             N'Submitted',    6, 0, '2017-04-27', N'Baguio City', NULL),
 (24, N'lucas.padilla@sample.bcas.test',      N'Lucas',    N'Padilla',     N'Elementary', N'Grade 5', N'NewStudent', N'Irisan Elementary School',             N'UnderReview', 11, 0, '2015-09-09', N'Baguio City', NULL),
 (25, N'zoe.alvarez@sample.bcas.test',        N'Zoe',      N'Alvarez',     N'Elementary', N'Grade 2', N'NewStudent', N'Baguio Central Kindergarten',          N'Submitted',    2, 0, '2018-01-23', N'Baguio City', NULL),
 -- Filed before departments existed: no department yet ("Unassigned")
 (26, N'ramon.delrosario@sample.bcas.test',   N'Ramon',    N'Del Rosario', NULL, N'BS Information Technology', N'NewStudent', N'Baguio City National High School', N'Approved', 70, 0, '2006-07-16', N'Baguio City', NULL),
 (27, N'teresa.villar@sample.bcas.test',      N'Teresa',   N'Villar',      NULL, N'Grade 8',                   N'Transferee', N'Pines City National High School',  N'Submitted', 66, 0, '2012-03-05', N'Baguio City', NULL)
) v (Ord, Email, FirstName, LastName, Department, Course, AppType, PrevSchool, Status, DaysAgo, Reserved, Birth, City, Remarks);

INSERT INTO dbo.Users (FirstName, LastName, Email, PasswordHash, RoleId)
SELECT s.FirstName, s.LastName, s.Email, @PasswordHash, r.RoleId
FROM @Sample s
JOIN dbo.Roles r ON r.RoleName = N'Applicant'
WHERE NOT EXISTS (SELECT 1 FROM dbo.Users u WHERE u.Email = s.Email);

INSERT INTO dbo.ApplicantProfiles (UserId, BirthDate, ContactNumber, AddressLine, City, Province, PostalCode, IsBcasian)
SELECT u.UserId, s.Birth,
       N'0917' + RIGHT(N'0000000' + CAST(1234000 + s.N * 7919 AS NVARCHAR(10)), 7),
       CAST(10 + s.N * 3 AS NVARCHAR(10)) + N' ' + CHOOSE(s.N % 5 + 1, N'Session Road', N'Governor Pack Road', N'Magsaysay Avenue', N'Naguilian Road', N'Asin Road'),
       s.City, N'Benguet',
       CASE s.City WHEN N'Baguio City' THEN N'2600' WHEN N'La Trinidad' THEN N'2601' WHEN N'Tuba' THEN N'2603' ELSE N'2604' END,
       CASE WHEN s.N % 4 = 0 THEN 1 ELSE 0 END
FROM @Sample s
JOIN dbo.Users u ON u.Email = s.Email
WHERE NOT EXISTS (SELECT 1 FROM dbo.ApplicantProfiles p WHERE p.UserId = u.UserId);

-- -----------------------------------------------------------------------------
-- Admission applications, their status history, and slot reservations.
-- Submitted -> UnderReview -> Approved / Rejected, each step a day or two
-- after the last and never later than "now".
-- -----------------------------------------------------------------------------
INSERT INTO dbo.AdmissionApplications
    (UserId, ApplicationType, CourseAppliedFor, PreviousSchool, Status, SubmittedAt, UpdatedAt, Remarks, Department)
SELECT u.UserId, s.AppType, s.Course, s.PrevSchool, s.Status,
       t.SubmittedAt,
       CASE s.Status WHEN N'Submitted' THEN t.SubmittedAt WHEN N'UnderReview' THEN t.Step1 ELSE t.Step2 END,
       s.Remarks, s.Department
FROM @Sample s
JOIN dbo.Users u ON u.Email = s.Email
CROSS APPLY (
    SELECT DATEADD(MINUTE, -(s.DaysAgo * 1440 + (s.N * 29) % 600 + 20), @Now) AS SubmittedAt
) base
CROSS APPLY (
    SELECT base.SubmittedAt,
           CASE WHEN DATEADD(DAY, 1, base.SubmittedAt) > @Now THEN @Now ELSE DATEADD(DAY, 1, base.SubmittedAt) END AS Step1,
           CASE WHEN DATEADD(DAY, 3, base.SubmittedAt) > @Now THEN @Now ELSE DATEADD(DAY, 3, base.SubmittedAt) END AS Step2
) t
WHERE NOT EXISTS (SELECT 1 FROM dbo.AdmissionApplications a WHERE a.UserId = u.UserId);

INSERT INTO dbo.ApplicationStatusHistory (ApplicationId, Category, FromStatus, ToStatus, Remarks, ChangedByUserId, ChangedAt)
SELECT a.ApplicationId, N'Admission', st.FromStatus, st.ToStatus,
       CASE WHEN st.Ord = 2 THEN s.Remarks END,
       CASE WHEN st.Ord = 0 THEN NULL ELSE @AdminId END,
       CASE st.Ord WHEN 0 THEN a.SubmittedAt
                   WHEN 1 THEN CASE WHEN DATEADD(DAY, 1, a.SubmittedAt) > @Now THEN @Now ELSE DATEADD(DAY, 1, a.SubmittedAt) END
                   ELSE        CASE WHEN DATEADD(DAY, 3, a.SubmittedAt) > @Now THEN @Now ELSE DATEADD(DAY, 3, a.SubmittedAt) END END
FROM @Sample s
JOIN dbo.Users u ON u.Email = s.Email
JOIN dbo.AdmissionApplications a ON a.UserId = u.UserId
JOIN (VALUES (0, CAST(NULL AS NVARCHAR(30)), N'Submitted'),
             (1, N'Submitted',   N'UnderReview'),
             (2, N'UnderReview', N'Approved'),
             (2, N'UnderReview', N'Rejected')) st (Ord, FromStatus, ToStatus)
  ON st.Ord <= CASE s.Status WHEN N'Submitted' THEN 0 WHEN N'UnderReview' THEN 1 ELSE 2 END
 AND (st.Ord < 2 OR st.ToStatus = s.Status)
WHERE NOT EXISTS (SELECT 1 FROM dbo.ApplicationStatusHistory h WHERE h.ApplicationId = a.ApplicationId);

INSERT INTO dbo.AdmissionReservations (ApplicationId, IsReserved, ReservationFee, Remarks, RecordedByUserId, RecordedAt)
SELECT a.ApplicationId, 1,
       CASE s.Department WHEN N'College' THEN 3000.00 WHEN N'Senior High School' THEN 2000.00 WHEN N'High School' THEN 1500.00 ELSE 1000.00 END,
       N'Reservation fee received at the registrar.', @AdminId,
       CASE WHEN DATEADD(DAY, 4, a.SubmittedAt) > @Now THEN @Now ELSE DATEADD(DAY, 4, a.SubmittedAt) END
FROM @Sample s
JOIN dbo.Users u ON u.Email = s.Email
JOIN dbo.AdmissionApplications a ON a.UserId = u.UserId
WHERE s.Status = N'Approved' AND s.Reserved = 1
  AND NOT EXISTS (SELECT 1 FROM dbo.AdmissionReservations r WHERE r.ApplicationId = a.ApplicationId);

-- -----------------------------------------------------------------------------
-- Scholarship applications at every stage, with eligibility screenings and
-- final decisions where the stage has reached them. Decisions are recorded
-- by the Academic Head of the applicant's department.
-- Stages: Submitted(0) DocumentsVerified(1) EligibilityScreening(2)
--         Evaluation(3) Result(4) Approved/Rejected(5)
-- -----------------------------------------------------------------------------
DECLARE @SchSample TABLE
(
    Email         NVARCHAR(256)  NOT NULL PRIMARY KEY,
    ScholarshipId INT            NOT NULL,
    Grade         DECIMAL(5,2)   NOT NULL,
    Status        NVARCHAR(30)   NOT NULL,
    DaysAgo       INT            NOT NULL,
    Remarks       NVARCHAR(500)  NULL
);

INSERT INTO @SchSample (Email, ScholarshipId, Grade, Status, DaysAgo, Remarks)
VALUES
 (N'maricel.delacruz@sample.bcas.test',  1, 94.50, N'Approved',             34, N'Outstanding academic record. Recommended for the full grant.'),
 (N'gabriel.soriano@sample.bcas.test',   1, 92.00, N'Result',               14, NULL),
 (N'joshua.villanueva@sample.bcas.test', 2, 86.50, N'Evaluation',            9, NULL),
 (N'kristine.bautista@sample.bcas.test', 1, 91.20, N'DocumentsVerified',     4, NULL),
 (N'paolo.reyes@sample.bcas.test',       3, 88.00, N'Result',               16, NULL),
 (N'hannah.pascual@sample.bcas.test',    1, 90.80, N'Submitted',             1, NULL),
 (N'camille.domingo@sample.bcas.test',   1, 95.80, N'Result',               20, NULL),
 (N'elijah.navarro@sample.bcas.test',    2, 83.00, N'Approved',             40, N'Verified financial need. Approved.'),
 (N'bianca.ramos@sample.bcas.test',      1, 90.50, N'EligibilityScreening',  8, NULL),
 (N'sofia.hernandez@sample.bcas.test',   1, 91.50, N'Submitted',             3, NULL),
 (N'patricia.flores@sample.bcas.test',   4, 96.50, N'Result',               19, NULL),
 (N'nathan.lim@sample.bcas.test',        3, 79.00, N'Rejected',             44, N'Athletic slots went to applicants with stronger competition records this term.'),
 (N'mateo.ocampo@sample.bcas.test',      2, 85.00, N'Result',               22, NULL),
 (N'ramon.delrosario@sample.bcas.test',  1, 90.50, N'Submitted',            60, NULL);

INSERT INTO dbo.ScholarshipApplications
    (UserId, ScholarshipId, ScholarshipType, GradeAverage, Status, SubmittedAt, UpdatedAt)
SELECT u.UserId, sc.ScholarshipId, sc.ScholarshipType, x.Grade, x.Status,
       t.SubmittedAt,
       CASE WHEN DATEADD(HOUR, 20 * x.Stage, t.SubmittedAt) > @Now THEN @Now ELSE DATEADD(HOUR, 20 * x.Stage, t.SubmittedAt) END
FROM (SELECT s.*, CASE s.Status WHEN N'Submitted' THEN 0 WHEN N'DocumentsVerified' THEN 1 WHEN N'EligibilityScreening' THEN 2
                                 WHEN N'Evaluation' THEN 3 WHEN N'Result' THEN 4 ELSE 5 END AS Stage
      FROM @SchSample s) x
JOIN dbo.Users u ON u.Email = x.Email
JOIN dbo.Scholarships sc ON sc.ScholarshipId = x.ScholarshipId
CROSS APPLY (SELECT DATEADD(MINUTE, -(x.DaysAgo * 1440 + 45), @Now) AS SubmittedAt) t
WHERE NOT EXISTS (SELECT 1 FROM dbo.ScholarshipApplications a WHERE a.UserId = u.UserId AND a.ScholarshipId = x.ScholarshipId);

DECLARE @SchStages TABLE (Ord INT NOT NULL, FromStatus NVARCHAR(30) NULL, ToStatus NVARCHAR(30) NOT NULL);
INSERT INTO @SchStages VALUES
 (0, NULL,                   N'Submitted'),
 (1, N'Submitted',           N'DocumentsVerified'),
 (2, N'DocumentsVerified',   N'EligibilityScreening'),
 (3, N'EligibilityScreening',N'Evaluation'),
 (4, N'Evaluation',          N'Result'),
 (5, N'Result',              N'Approved'),
 (5, N'Result',              N'Rejected');

-- One helper view of the sample scholarship rows, joined to their rows and
-- the applicant's department head, used by the three inserts below.
DECLARE @SchRows TABLE
(
    ApplicationId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    Status        NVARCHAR(30)     NOT NULL,
    Stage          INT              NOT NULL,
    SubmittedAt   DATETIME2(3)     NOT NULL,
    Remarks       NVARCHAR(500)    NULL,
    HeadId        UNIQUEIDENTIFIER NULL
);

INSERT INTO @SchRows (ApplicationId, Status, Stage, SubmittedAt, Remarks, HeadId)
SELECT a.ApplicationId, x.Status,
       CASE x.Status WHEN N'Submitted' THEN 0 WHEN N'DocumentsVerified' THEN 1 WHEN N'EligibilityScreening' THEN 2
                     WHEN N'Evaluation' THEN 3 WHEN N'Result' THEN 4 ELSE 5 END,
       a.SubmittedAt, x.Remarks,
       (SELECT TOP 1 h.UserId FROM dbo.Users h JOIN dbo.Roles hr ON hr.RoleId = h.RoleId
        WHERE hr.RoleName = N'AcademicHead' AND h.Department = s.Department ORDER BY h.CreatedAt)
FROM @SchSample x
JOIN @Sample s ON s.Email = x.Email
JOIN dbo.Users u ON u.Email = x.Email
JOIN dbo.ScholarshipApplications a ON a.UserId = u.UserId AND a.ScholarshipId = x.ScholarshipId;

INSERT INTO dbo.ApplicationStatusHistory (ApplicationId, Category, FromStatus, ToStatus, Remarks, ChangedByUserId, ChangedAt)
SELECT r.ApplicationId, N'Scholarship', st.FromStatus, st.ToStatus,
       CASE WHEN st.Ord = 5 THEN r.Remarks END,
       CASE st.Ord WHEN 0 THEN NULL WHEN 1 THEN @SupportId WHEN 5 THEN COALESCE(r.HeadId, @AdminId) ELSE @EvaluatorId END,
       CASE WHEN DATEADD(HOUR, 20 * st.Ord, r.SubmittedAt) > @Now THEN @Now ELSE DATEADD(HOUR, 20 * st.Ord, r.SubmittedAt) END
FROM @SchRows r
JOIN @SchStages st ON st.Ord <= r.Stage AND (st.Ord < 5 OR st.ToStatus = r.Status)
WHERE NOT EXISTS (SELECT 1 FROM dbo.ApplicationStatusHistory h WHERE h.ApplicationId = r.ApplicationId);

INSERT INTO dbo.ScholarshipEligibilityScreenings (ApplicationId, Verdict, Remarks, EvaluatedByUserId, EvaluatedAt)
SELECT r.ApplicationId, N'Qualified', N'Meets the grade average and documentary requirements.', @EvaluatorId,
       CASE WHEN DATEADD(HOUR, 60, r.SubmittedAt) > @Now THEN @Now ELSE DATEADD(HOUR, 60, r.SubmittedAt) END
FROM @SchRows r
WHERE r.Stage >= 3
  AND NOT EXISTS (SELECT 1 FROM dbo.ScholarshipEligibilityScreenings e WHERE e.ApplicationId = r.ApplicationId);

INSERT INTO dbo.ScholarshipFinalDecisions (ApplicationId, Decision, Remarks, DecidedByUserId, DecidedAt)
SELECT r.ApplicationId, r.Status, r.Remarks, COALESCE(r.HeadId, @AdminId),
       CASE WHEN DATEADD(HOUR, 100, r.SubmittedAt) > @Now THEN @Now ELSE DATEADD(HOUR, 100, r.SubmittedAt) END
FROM @SchRows r
WHERE r.Stage = 5
  AND NOT EXISTS (SELECT 1 FROM dbo.ScholarshipFinalDecisions d WHERE d.ApplicationId = r.ApplicationId);

-- A slot is held by every application except Waitlisted and Rejected ones.
UPDATE s
SET RemainingSlots = CASE WHEN s.TotalSlots - h.Held < 0 THEN 0 ELSE s.TotalSlots - h.Held END
FROM dbo.Scholarships s
CROSS APPLY (
    SELECT COUNT(*) AS Held FROM dbo.ScholarshipApplications a
    WHERE a.ScholarshipId = s.ScholarshipId AND a.Status NOT IN (N'Waitlisted', N'Rejected')
) h;

-- -----------------------------------------------------------------------------
-- Documents: a mix of verified, waiting on review, flagged and rejected.
-- The files are small placeholders (a one-page PDF and a 1x1 PNG).
-- -----------------------------------------------------------------------------
INSERT INTO dbo.ApplicantDocuments
    (UserId, DocumentType, FileName, ContentType, FileSizeBytes, FileData, Status, FlaggedReason, UploadedAt, UpdatedAt, ReviewedByUserId, ReviewedAt)
SELECT u.UserId, d.DocType,
       LOWER(s.FirstName) + N'-' + LOWER(REPLACE(s.LastName, N' ', N'')) + N'-' + LOWER(d.DocType) + CASE d.DocType WHEN N'IdPicture' THEN N'.png' ELSE N'.pdf' END,
       CASE d.DocType WHEN N'IdPicture' THEN N'image/png' ELSE N'application/pdf' END,
       CAST(DATALENGTH(CASE d.DocType WHEN N'IdPicture' THEN @PngBytes ELSE @PdfBytes END) AS INT),
       CASE d.DocType WHEN N'IdPicture' THEN @PngBytes ELSE @PdfBytes END,
       d.Status, d.Reason,
       DATEADD(MINUTE, -(d.DaysAgo * 1440 + 30), @Now),
       CASE WHEN d.Status = N'Pending' THEN DATEADD(MINUTE, -(d.DaysAgo * 1440 + 30), @Now)
            WHEN DATEADD(DAY, 1, DATEADD(MINUTE, -(d.DaysAgo * 1440 + 30), @Now)) > @Now THEN @Now
            ELSE DATEADD(DAY, 1, DATEADD(MINUTE, -(d.DaysAgo * 1440 + 30), @Now)) END,
       CASE WHEN d.Status = N'Pending' THEN NULL ELSE @SupportId END,
       CASE WHEN d.Status = N'Pending' THEN NULL
            WHEN DATEADD(DAY, 1, DATEADD(MINUTE, -(d.DaysAgo * 1440 + 30), @Now)) > @Now THEN @Now
            ELSE DATEADD(DAY, 1, DATEADD(MINUTE, -(d.DaysAgo * 1440 + 30), @Now)) END
FROM (VALUES
 (N'maricel.delacruz@sample.bcas.test',   N'ReportCard', N'Verified', NULL, 39),
 (N'maricel.delacruz@sample.bcas.test',   N'IdPicture',  N'Verified', NULL, 39),
 (N'maricel.delacruz@sample.bcas.test',   N'PSA',        N'Verified', NULL, 39),
 (N'joshua.villanueva@sample.bcas.test',  N'ReportCard', N'Pending',  NULL, 5),
 (N'joshua.villanueva@sample.bcas.test',  N'IdPicture',  N'Pending',  NULL, 5),
 (N'andrea.santos@sample.bcas.test',      N'TOR',        N'Pending',  NULL, 1),
 (N'andrea.santos@sample.bcas.test',      N'PSA',        N'Flagged',  N'The PSA copy is blurred. Please upload a clearer scan.', 1),
 (N'paolo.reyes@sample.bcas.test',        N'ReportCard', N'Verified', NULL, 32),
 (N'paolo.reyes@sample.bcas.test',        N'IdPicture',  N'Verified', NULL, 32),
 (N'kristine.bautista@sample.bcas.test',  N'ReportCard', N'Pending',  NULL, 3),
 (N'renato.aquino@sample.bcas.test',      N'TOR',        N'Rejected', N'The transcript is missing the registrar''s seal.', 24),
 (N'camille.domingo@sample.bcas.test',    N'ReportCard', N'Verified', NULL, 29),
 (N'camille.domingo@sample.bcas.test',    N'IdPicture',  N'Verified', NULL, 29),
 (N'rafael.castillo@sample.bcas.test',    N'ReportCard', N'Pending',  NULL, 2),
 (N'bianca.ramos@sample.bcas.test',       N'ReportCard', N'Verified', NULL, 7),
 (N'bianca.ramos@sample.bcas.test',       N'PSA',        N'Pending',  NULL, 7),
 (N'elijah.navarro@sample.bcas.test',     N'ReportCard', N'Verified', NULL, 44),
 (N'patricia.flores@sample.bcas.test',    N'SF10',       N'Verified', NULL, 27),
 (N'patricia.flores@sample.bcas.test',    N'IdPicture',  N'Verified', NULL, 27),
 (N'lorenzo.garcia@sample.bcas.test',     N'SF10',       N'Pending',  NULL, 4),
 (N'isabella.torres@sample.bcas.test',    N'SF10',       N'Verified', NULL, 6),
 (N'mateo.ocampo@sample.bcas.test',       N'SF10',       N'Verified', NULL, 34),
 (N'mateo.ocampo@sample.bcas.test',       N'PSA',        N'Verified', NULL, 34),
 (N'chloe.rivera@sample.bcas.test',       N'SF10',       N'Pending',  NULL, 5)
) d (Email, DocType, Status, Reason, DaysAgo)
JOIN dbo.Users u ON u.Email = d.Email
JOIN @Sample s ON s.Email = d.Email
WHERE NOT EXISTS (SELECT 1 FROM dbo.ApplicantDocuments x WHERE x.UserId = u.UserId AND x.DocumentType = d.DocType);

-- -----------------------------------------------------------------------------
-- Entrance exam: some applicants have picked a date, some already hold a
-- released permit. (An applicant can hold one selection.)
-- -----------------------------------------------------------------------------
INSERT INTO dbo.ExamScheduleSelections (UserId, ExamScheduleId, SelectedAt, IsPermitReleased, PermitReleasedAt, PermitReleasedByUserId)
SELECT u.UserId, e.ExamScheduleId,
       CASE WHEN DATEADD(HOUR, 2, a.SubmittedAt) > @Now THEN @Now ELSE DATEADD(HOUR, 2, a.SubmittedAt) END,
       e.Released,
       CASE WHEN e.Released = 1 THEN CASE WHEN DATEADD(DAY, 2, a.SubmittedAt) > @Now THEN @Now ELSE DATEADD(DAY, 2, a.SubmittedAt) END END,
       CASE WHEN e.Released = 1 THEN @AdminId END
FROM (VALUES
 (N'maricel.delacruz@sample.bcas.test', 1, 1), (N'paolo.reyes@sample.bcas.test', 1, 1),
 (N'camille.domingo@sample.bcas.test',  1, 1), (N'gabriel.soriano@sample.bcas.test', 2, 1),
 (N'joshua.villanueva@sample.bcas.test', 2, 0), (N'andrea.santos@sample.bcas.test', 3, 0),
 (N'kristine.bautista@sample.bcas.test', 4, 0), (N'rafael.castillo@sample.bcas.test', 3, 0),
 (N'bianca.ramos@sample.bcas.test',      4, 0), (N'hannah.pascual@sample.bcas.test', 3, 0)
) e (Email, ExamScheduleId, Released)
JOIN dbo.Users u ON u.Email = e.Email
JOIN dbo.AdmissionApplications a ON a.UserId = u.UserId
WHERE EXISTS (SELECT 1 FROM dbo.ExamSchedules es WHERE es.ExamScheduleId = e.ExamScheduleId)
  AND NOT EXISTS (SELECT 1 FROM dbo.ExamScheduleSelections x WHERE x.UserId = u.UserId);

-- -----------------------------------------------------------------------------
-- School calendar. Both semesters are outside today's date on purpose: an
-- ongoing semester locks scholarship edits (see the semester lock), which
-- would get in the way of trying things out.
-- -----------------------------------------------------------------------------
INSERT INTO dbo.Semesters (Name, StartDate, EndDate, CreatedByUserId)
SELECT s.Name, s.StartDate, s.EndDate, @AdminId
FROM (VALUES
    (N'Summer AY 2025-2026 (sample)',        CAST('2026-04-06' AS DATE), CAST('2026-06-12' AS DATE)),
    (N'2nd Semester AY 2026-2027 (sample)',  CAST('2027-01-11' AS DATE), CAST('2027-05-28' AS DATE))
) s (Name, StartDate, EndDate)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Semesters x WHERE x.Name = s.Name);

COMMIT TRANSACTION;

-- -----------------------------------------------------------------------------
-- What is in the database now.
-- -----------------------------------------------------------------------------
SELECT N'Sample applicants'              AS [What], COUNT(*) AS [Count] FROM dbo.Users WHERE Email LIKE N'%@sample.bcas.test' AND Email NOT LIKE N'head.%'
UNION ALL SELECT N'Sample Academic Heads',          COUNT(*) FROM dbo.Users WHERE Email LIKE N'head.%@sample.bcas.test'
UNION ALL SELECT N'Admission applications',         COUNT(*) FROM dbo.AdmissionApplications
UNION ALL SELECT N'Scholarship applications',       COUNT(*) FROM dbo.ScholarshipApplications
UNION ALL SELECT N'Documents (pending review)',     COUNT(*) FROM dbo.ApplicantDocuments WHERE Status = N'Pending'
UNION ALL SELECT N'Reservations recorded',          COUNT(*) FROM dbo.AdmissionReservations;
