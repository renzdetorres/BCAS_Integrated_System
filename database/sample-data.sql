-- -----------------------------------------------------------------------------
-- Sample data: three records in every table that holds applicant activity, so
-- the Admin, Evaluator, Support Staff and Academic Head screens have something
-- to show. Remove it again with sample-data-remove.sql.
--
-- Six sample applicants (@sample.bcas.test) are created:
--   Maria Santos, Juan Dela Cruz, Ana Reyes      - admission applications
--   Pedro Garcia, Liza Mendoza, Carlo Ramos      - scholarship applications
-- Each carries a full trail: profile, documents, exam schedule, payment,
-- exam result, interview, reservation, status history, notifications and an
-- inquiry. Sample accounts share the password of applicant@bcas.test.
--
-- Staff accounts, the scholarship catalog and exam schedules already in the
-- database are reused, not duplicated. Configuration tables (roles, settings,
-- deadlines, announcements, audit logs, ...) are left alone, and so are
-- password-reset tokens.
--
-- Safe to run once: it stops if sample accounts are already there.
-- -----------------------------------------------------------------------------
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;

IF EXISTS (SELECT 1 FROM dbo.Users WHERE Email LIKE N'%@sample.bcas.test')
BEGIN
    RAISERROR (N'Sample data is already in this database. Run sample-data-remove.sql first.', 16, 1);
    RETURN;
END

DECLARE @Admin UNIQUEIDENTIFIER = (SELECT UserId FROM dbo.Users WHERE Email = N'admin@bcas.test');
DECLARE @Eval  UNIQUEIDENTIFIER = (SELECT UserId FROM dbo.Users WHERE Email = N'evaluator@bcas.test');
DECLARE @Staff UNIQUEIDENTIFIER = (SELECT UserId FROM dbo.Users WHERE Email = N'staff@bcas.test');
DECLARE @ApplicantRole INT      = (SELECT RoleId FROM dbo.Roles WHERE RoleName = N'Applicant');
DECLARE @Hash NVARCHAR(200)     = (SELECT PasswordHash FROM dbo.Users WHERE Email = N'applicant@bcas.test');

IF @Admin IS NULL OR @Eval IS NULL OR @Staff IS NULL OR @Hash IS NULL
BEGIN
    RAISERROR (N'The staff accounts and applicant@bcas.test must exist first.', 16, 1);
    RETURN;
END

DECLARE @Now DATETIME2(3) = SYSUTCDATETIME();

-- Entrance-exam slots: the three oldest, already past.
DECLARE @Sch1 INT = (SELECT ExamScheduleId FROM dbo.ExamSchedules WHERE ExamDate = '2026-10-03' AND DayType = N'Saturday');
DECLARE @Sch2 INT = (SELECT ExamScheduleId FROM dbo.ExamSchedules WHERE ExamDate = '2026-10-06' AND DayType = N'Weekday');
DECLARE @Sch3 INT = (SELECT ExamScheduleId FROM dbo.ExamSchedules WHERE ExamDate = '2026-10-10' AND DayType = N'Saturday');

DECLARE @Sc1 INT = (SELECT TOP 1 ScholarshipId FROM dbo.Scholarships WHERE ScholarshipType = N'Academic');
DECLARE @Sc2 INT = (SELECT TOP 1 ScholarshipId FROM dbo.Scholarships WHERE ScholarshipType = N'Financial Need');
DECLARE @Sc3 INT = (SELECT TOP 1 ScholarshipId FROM dbo.Scholarships WHERE ScholarshipType = N'Athletic');

DECLARE @U1 UNIQUEIDENTIFIER = NEWID(), @U2 UNIQUEIDENTIFIER = NEWID(), @U3 UNIQUEIDENTIFIER = NEWID(),
        @U4 UNIQUEIDENTIFIER = NEWID(), @U5 UNIQUEIDENTIFIER = NEWID(), @U6 UNIQUEIDENTIFIER = NEWID();
DECLARE @A1 UNIQUEIDENTIFIER = NEWID(), @A2 UNIQUEIDENTIFIER = NEWID(), @A3 UNIQUEIDENTIFIER = NEWID();
DECLARE @S1 UNIQUEIDENTIFIER = NEWID(), @S2 UNIQUEIDENTIFIER = NEWID(), @S3 UNIQUEIDENTIFIER = NEWID();
DECLARE @T1 UNIQUEIDENTIFIER = NEWID(), @T2 UNIQUEIDENTIFIER = NEWID(), @T3 UNIQUEIDENTIFIER = NEWID();

BEGIN TRANSACTION;

-- ---- Users and profiles -----------------------------------------------------
INSERT INTO dbo.Users (UserId, FirstName, LastName, Email, PasswordHash, RoleId, CreatedAt, UpdatedAt) VALUES
    (@U1, N'Maria', N'Santos',  N'maria.santos@sample.bcas.test',  @Hash, @ApplicantRole, DATEADD(DAY, -46, @Now), DATEADD(DAY, -46, @Now)),
    (@U2, N'Juan',  N'Dela Cruz', N'juan.delacruz@sample.bcas.test', @Hash, @ApplicantRole, DATEADD(DAY, -40, @Now),  DATEADD(DAY, -40, @Now)),
    (@U3, N'Ana',   N'Reyes',   N'ana.reyes@sample.bcas.test',     @Hash, @ApplicantRole, DATEADD(DAY, -35, @Now),  DATEADD(DAY, -35, @Now)),
    (@U4, N'Pedro', N'Garcia',  N'pedro.garcia@sample.bcas.test',  @Hash, @ApplicantRole, DATEADD(DAY, -45, @Now),  DATEADD(DAY, -45, @Now)),
    (@U5, N'Liza',  N'Mendoza', N'liza.mendoza@sample.bcas.test',  @Hash, @ApplicantRole, DATEADD(DAY, -42, @Now),  DATEADD(DAY, -42, @Now)),
    (@U6, N'Carlo', N'Ramos',   N'carlo.ramos@sample.bcas.test',   @Hash, @ApplicantRole, DATEADD(DAY, -38, @Now),  DATEADD(DAY, -38, @Now));

INSERT INTO dbo.ApplicantProfiles (UserId, BirthDate, ContactNumber, AddressLine, City, Province, PostalCode, IsBcasian) VALUES
    (@U1, '2007-03-14', N'+639171234501', N'12 Rizal Street',        N'Baliuag',   N'Bulacan', N'3006', 1),
    (@U2, '2009-08-02', N'+639171234502', N'48 Mabini Avenue',       N'Bustos',    N'Bulacan', N'3007', 0),
    (@U3, '2011-11-21', N'+639171234503', N'5 Bonifacio Road',       N'Pulilan',   N'Bulacan', N'3005', 0),
    (@U4, '2007-01-09', N'+639171234504', N'77 Luna Street',         N'Baliuag',   N'Bulacan', N'3006', 1),
    (@U5, '2008-05-30', N'+639171234505', N'20 Aguinaldo Highway',   N'San Rafael', N'Bulacan', N'3008', 0),
    (@U6, '2012-12-12', N'+639171234506', N'3 Del Pilar Street',     N'Baliuag',   N'Bulacan', N'3006', 1);

-- ---- Admission applications -------------------------------------------------
INSERT INTO dbo.AdmissionApplications
    (ApplicationId, UserId, ApplicationType, CourseAppliedFor, PreviousSchool, Status, SubmittedAt, UpdatedAt, Remarks,
     Department, Sex, PlaceOfBirth, PreviousSchoolAddress, SpecialSkills, FatherName, FatherOccupation, FatherPhone,
     MotherName, MotherOccupation, MotherPhone, GuardianName, GuardianOccupation, GuardianPhone, Siblings,
     StudentSignature, GuardianSignature, MotherMaidenName, YearLevel, AcademicTerm, AcademicYear)
VALUES
    (@A1, @U1, N'NewStudent', N'BSIT', N'Baliuag Senior High School', N'Approved', DATEADD(DAY, -45, @Now), DATEADD(DAY, -5, @Now), N'Admitted. Welcome to BCAS.',
     N'College', N'Female', N'Baliuag, Bulacan', N'Baliuag, Bulacan', N'Drawing, web design', N'Roberto Santos', N'Driver', N'+639171230001',
     N'Elena Santos', N'Teacher', N'+639171230002', N'Roberto Santos', N'Driver', N'+639171230001', N'[]',
     N'Maria Santos', N'Roberto Santos', N'Cruz', N'1st Year', N'1st Semester', N'2026-2027'),
    (@A2, @U2, N'NewStudent', N'STEM', N'Bustos National High School', N'Registration', DATEADD(DAY, -30, @Now), DATEADD(DAY, -3, @Now), NULL,
     N'Senior High School', N'Male', N'Bustos, Bulacan', N'Bustos, Bulacan', N'Basketball', N'Jose Dela Cruz', N'Farmer', N'+639171230003',
     N'Linda Dela Cruz', N'Vendor', N'+639171230004', N'Jose Dela Cruz', N'Farmer', N'+639171230003', N'[]',
     N'Juan Dela Cruz', N'Jose Dela Cruz', N'Bautista', N'Grade 11', N'1st Semester', N'2026-2027'),
    (@A3, @U3, N'NewStudent', N'Grade 9', N'Pulilan Elementary School', N'Rejected', DATEADD(DAY, -28, @Now), DATEADD(DAY, -5, @Now), N'Did not meet the interview requirements.',
     N'High School', N'Female', N'Pulilan, Bulacan', N'Pulilan, Bulacan', N'Singing', N'Mario Reyes', N'Mechanic', N'+639171230005',
     N'Grace Reyes', N'Nurse', N'+639171230006', N'Grace Reyes', N'Nurse', N'+639171230006', N'[]',
     N'Ana Reyes', N'Grace Reyes', N'Flores', N'Grade 9', N'1st Term', N'2026-2027');

-- ---- Scholarship applications ----------------------------------------------
INSERT INTO dbo.ScholarshipApplications
    (ApplicationId, UserId, ScholarshipId, ScholarshipType, GradeAverage, Status, SubmittedAt, UpdatedAt, Remarks,
     LevelApplied, ApplicantFullName, SchoolLastAttended, GuardianRole, GuardianName, GuardianContact, GuardianEmail,
     ConsentTerms, ConsentParticipation, ConsentCertification, ConsentedAt)
SELECT @S1, @U4, s.ScholarshipId, s.ScholarshipType, 95.50, N'Approved', DATEADD(DAY, -44, @Now), DATEADD(DAY, -10, @Now), N'Awarded.',
       N'First Year College', N'Pedro Garcia', N'Baliuag Senior High School', N'Parent', N'Luisa Garcia', N'+639171230011', N'luisa.garcia@sample.bcas.test',
       1, 1, 1, DATEADD(DAY, -44, @Now)
FROM dbo.Scholarships s WHERE s.ScholarshipId = @Sc1
UNION ALL
SELECT @S2, @U5, s.ScholarshipId, s.ScholarshipType, 88.25, N'Waitlisted', DATEADD(DAY, -41, @Now), DATEADD(DAY, -9, @Now), N'On the waiting list.',
       N'Grade 11', N'Liza Mendoza', N'San Rafael National High School', N'Official guardian', N'Rosa Mendoza', N'+639171230012', N'rosa.mendoza@sample.bcas.test',
       1, 1, 1, DATEADD(DAY, -41, @Now)
FROM dbo.Scholarships s WHERE s.ScholarshipId = @Sc2
UNION ALL
SELECT @S3, @U6, s.ScholarshipId, s.ScholarshipType, 82.00, N'Rejected', DATEADD(DAY, -37, @Now), DATEADD(DAY, -8, @Now), N'Did not pass the scholarship exam.',
       N'Grade 7', N'Carlo Ramos', N'Baliuag Elementary School', N'Parent', N'Tomas Ramos', N'+639171230013', N'tomas.ramos@sample.bcas.test',
       1, 1, 1, DATEADD(DAY, -37, @Now)
FROM dbo.Scholarships s WHERE s.ScholarshipId = @Sc3;

-- ---- Documents --------------------------------------------------------------
-- A one-page placeholder file; the real uploads are not needed to browse the lists.
DECLARE @Pdf VARBINARY(MAX) = 0x255044462D312E340A25EFBBBF0A252520454F460A;
INSERT INTO dbo.ApplicantDocuments
    (UserId, DocumentType, FileName, ContentType, FileSizeBytes, FileData, Status, FlaggedReason, UploadedAt, UpdatedAt, ReviewedByUserId, ReviewedAt)
VALUES
    (@U1, N'ReportCard', N'santos-report-card.pdf', N'application/pdf', DATALENGTH(@Pdf), @Pdf, N'Verified', NULL,
        DATEADD(DAY, -44, @Now), DATEADD(DAY, -41, @Now), @Staff, DATEADD(DAY, -41, @Now)),
    (@U2, N'PSA', N'delacruz-psa.pdf', N'application/pdf', DATALENGTH(@Pdf), @Pdf, N'Pending', NULL,
        DATEADD(DAY, -29, @Now), DATEADD(DAY, -29, @Now), NULL, NULL),
    (@U3, N'IdPicture', N'reyes-id-picture.pdf', N'application/pdf', DATALENGTH(@Pdf), @Pdf, N'Flagged', N'The photo is blurred. Please upload a clearer one.',
        DATEADD(DAY, -27, @Now), DATEADD(DAY, -26, @Now), @Staff, DATEADD(DAY, -26, @Now));

-- ---- Entrance exam: schedule, reschedule request, payment, result ---------
INSERT INTO dbo.ExamScheduleSelections
    (UserId, ExamScheduleId, SelectedAt, IsPermitReleased, PermitReleasedAt, PermitReleasedByUserId, ExamType, ExamFee, InvoiceNumber, ExamStatus)
VALUES
    (@U1, @Sch1, DATEADD(DAY, -35, @Now), 1, DATEADD(DAY, -33, @Now), @Admin, N'Entrance Exam', 500.00, N'INV-SAMPLE-0001', N'ExamDone'),
    (@U2, @Sch2, DATEADD(DAY, -25, @Now),  1, DATEADD(DAY, -23, @Now),  @Admin, N'Entrance Exam', 500.00, N'INV-SAMPLE-0002', N'ExamDone'),
    (@U3, @Sch3, DATEADD(DAY, -22, @Now),  1, DATEADD(DAY, -20, @Now),  @Admin, N'Entrance Exam', 500.00, N'INV-SAMPLE-0003', N'ExamDone');

INSERT INTO dbo.ExamRescheduleRequests (UserId, Reason, Status, SubmittedAt) VALUES
    (@U1, N'I have a family event on the chosen date.',                N'Approved', DATEADD(DAY, -37, @Now)),
    (@U2, N'I will be travelling that week and would like another slot.', N'Pending',  DATEADD(DAY, -2, @Now)),
    (@U3, N'I am sick and cannot take the exam on that day.',          N'Rejected', DATEADD(DAY, -24, @Now));

DECLARE @Proof VARBINARY(MAX) = 0x89504E470D0A1A0A;
INSERT INTO dbo.ExamPayments
    (ApplicationId, UserId, Amount, ReferenceNumber, ProofFileName, ProofContentType, ProofFileData, ProofUploadedAt,
     Status, RejectionReason, InvoiceNumber, VerifiedByUserId, VerifiedAt, CreatedAt, UpdatedAt)
VALUES
    (@A1, @U1, 500.00, N'GC-20250001', N'santos-proof.png', N'image/png', @Proof, DATEADD(DAY, -36, @Now),
        N'Verified', NULL, N'INV-SAMPLE-0001', @Admin, DATEADD(DAY, -35, @Now), DATEADD(DAY, -36, @Now), DATEADD(DAY, -35, @Now)),
    (@A2, @U2, 500.00, N'GC-20260002', N'delacruz-proof.png', N'image/png', @Proof, DATEADD(DAY, -26, @Now),
        N'Verified', NULL, N'INV-SAMPLE-0002', @Admin, DATEADD(DAY, -25, @Now), DATEADD(DAY, -26, @Now), DATEADD(DAY, -25, @Now)),
    (@A3, @U3, 500.00, N'GC-20260003', N'reyes-proof.png', N'image/png', @Proof, DATEADD(DAY, -23, @Now),
        N'Pending', NULL, NULL, NULL, NULL, DATEADD(DAY, -23, @Now), DATEADD(DAY, -23, @Now));

INSERT INTO dbo.ExamResults (ApplicationId, UserId, Attempt, Result, Score, Remarks, ExamDate, RecordedByUserId, RecordedAt) VALUES
    (@A1, @U1, 1, N'Passed', 88.00, N'Strong in mathematics.', '2026-10-03', @Eval, DATEADD(DAY, -12, @Now)),
    (@A2, @U2, 1, N'Passed', 79.50, NULL,                       '2026-10-06', @Eval, DATEADD(DAY, -9, @Now)),
    (@A3, @U3, 1, N'Passed', 71.00, N'Passed with the minimum score.', '2026-10-10', @Eval, DATEADD(DAY, -5, @Now));

-- ---- Interview and reservation ---------------------------------------------
INSERT INTO dbo.InterviewSchedules
    (ApplicationId, UserId, InterviewDate, InterviewTime, Location, Instructions, Status, Evaluation, EvaluationNotes,
     ScheduledByUserId, ScheduledAt, EvaluatedByUserId, EvaluatedAt)
VALUES
    (@A1, @U1, '2026-10-08', '09:00', N'BCAS Admissions Office', N'Bring a valid ID and the original report card.', N'Completed', N'Passed', N'Confident and well prepared.',
        @Staff, DATEADD(DAY, -11, @Now), @Eval, DATEADD(DAY, -8, @Now)),
    (@A2, @U2, '2026-10-20', '10:30', N'BCAS Admissions Office', N'Bring a parent or guardian.', N'Scheduled', NULL, NULL,
        @Staff, DATEADD(DAY, -5, @Now), NULL, NULL),
    (@A3, @U3, '2026-10-12', '14:00', N'BCAS Guidance Office',   N'Bring a parent or guardian.', N'Completed', N'Failed', N'Did not meet the interview requirements.',
        @Staff, DATEADD(DAY, -8, @Now), @Eval, DATEADD(DAY, -3, @Now));

INSERT INTO dbo.AdmissionReservations (ApplicationId, IsReserved, ReservationFee, Remarks, RecordedByUserId, RecordedAt) VALUES
    (@A1, 1, 2500.00, N'Reservation fee paid in full.',      @Staff, DATEADD(DAY, -4, @Now)),
    (@A2, 1, 2500.00, N'Reservation fee paid at the cashier.', @Staff, DATEADD(DAY, -3, @Now)),
    (@A3, 0, 0.00,    N'Application was not approved.',      @Staff, DATEADD(DAY, -2, @Now));

-- ---- Scholarship screening, exam, interview and decision -------------------
INSERT INTO dbo.ScholarshipEligibilityScreenings (ApplicationId, Verdict, Remarks, EvaluatedByUserId, EvaluatedAt) VALUES
    (@S1, N'Qualified', N'Meets the grade requirement.', @Eval, DATEADD(DAY, -40, @Now)),
    (@S2, N'Qualified', N'Meets the household income requirement.', @Eval, DATEADD(DAY, -38, @Now)),
    (@S3, N'Qualified', N'Meets the grade requirement.', @Eval, DATEADD(DAY, -34, @Now));

INSERT INTO dbo.ScholarshipExamResults (ApplicationId, Result, Score, Remarks, RecordedByUserId, RecordedAt) VALUES
    (@S1, N'Passed', 93.00, NULL, @Eval, DATEADD(DAY, -30, @Now)),
    (@S2, N'Passed', 84.00, NULL, @Eval, DATEADD(DAY, -28, @Now)),
    (@S3, N'Failed', 52.00, N'Below the passing score.', @Eval, DATEADD(DAY, -25, @Now));

INSERT INTO dbo.ScholarshipInterviewEvaluations (ApplicationId, InterviewScore, EssayScore, Notes, EvaluatedByUserId, EvaluatedAt) VALUES
    (@S1, 94.00, 92.00, N'Clear goals and a well-written essay.', @Eval, DATEADD(DAY, -20, @Now)),
    (@S2, 85.00, 80.00, N'Good answers; the essay needs more detail.', @Eval, DATEADD(DAY, -18, @Now)),
    (@S3, 60.00, 55.00, NULL, @Eval, DATEADD(DAY, -15, @Now));

INSERT INTO dbo.ScholarshipFinalDecisions (ApplicationId, Decision, Remarks, DecidedByUserId, DecidedAt) VALUES
    (@S1, N'Approved', N'Awarded the scholarship.', @Admin, DATEADD(DAY, -10, @Now)),
    (@S2, N'Approved', N'Approved, but no slot is open yet.', @Admin, DATEADD(DAY, -9, @Now)),
    (@S3, N'Rejected', N'Did not pass the scholarship exam.', @Admin, DATEADD(DAY, -8, @Now));

-- A slot is held by every application except Waitlisted and Rejected ones.
UPDATE s
SET RemainingSlots = CASE WHEN s.TotalSlots - h.Held < 0 THEN 0 ELSE s.TotalSlots - h.Held END
FROM dbo.Scholarships s
CROSS APPLY (
    SELECT COUNT(*) AS Held FROM dbo.ScholarshipApplications a
    WHERE a.ScholarshipId = s.ScholarshipId AND a.Status NOT IN (N'Waitlisted', N'Rejected')
) h
WHERE s.ScholarshipId IN (@Sc1, @Sc2, @Sc3);

-- ---- Status history ---------------------------------------------------------
INSERT INTO dbo.ApplicationStatusHistory (ApplicationId, Category, FromStatus, ToStatus, Remarks, ChangedByUserId, ChangedAt) VALUES
    (@A1, N'Admission', NULL,               N'Submitted',        NULL,                                 @U1,    DATEADD(DAY, -45, @Now)),
    (@A1, N'Admission', N'Submitted',       N'DocumentsCleared', N'All documents verified.',           @Staff, DATEADD(DAY, -41, @Now)),
    (@A1, N'Admission', N'DocumentsCleared', N'Approved',        N'Admitted. Welcome to BCAS.',        @Admin, DATEADD(DAY, -5, @Now)),
    (@A2, N'Admission', NULL,               N'Submitted',        NULL,                                 @U2,    DATEADD(DAY, -30, @Now)),
    (@A2, N'Admission', N'Submitted',       N'ExamDone',         N'Exam taken.',                       @Eval,  DATEADD(DAY, -9, @Now)),
    (@A2, N'Admission', N'ExamDone',        N'Registration',     N'Passed the exam; registration open.', @Admin, DATEADD(DAY, -3, @Now)),
    (@A3, N'Admission', NULL,               N'Submitted',        NULL,                                 @U3,    DATEADD(DAY, -28, @Now)),
    (@A3, N'Admission', N'Submitted',       N'ExamDone',         N'Exam taken.',                       @Eval,  DATEADD(DAY, -5, @Now)),
    (@A3, N'Admission', N'ExamDone',        N'Rejected',         N'Did not meet the interview requirements.', @Admin, DATEADD(DAY, -2, @Now)),
    (@S1, N'Scholarship', NULL,             N'Submitted',        NULL,                                 @U4,    DATEADD(DAY, -44, @Now)),
    (@S1, N'Scholarship', N'Submitted',     N'Approved',         N'Awarded.',                          @Admin, DATEADD(DAY, -10, @Now)),
    (@S2, N'Scholarship', NULL,             N'Submitted',        NULL,                                 @U5,    DATEADD(DAY, -41, @Now)),
    (@S2, N'Scholarship', N'Submitted',     N'Waitlisted',       N'On the waiting list.',              @Admin, DATEADD(DAY, -9, @Now)),
    (@S3, N'Scholarship', NULL,             N'Submitted',        NULL,                                 @U6,    DATEADD(DAY, -37, @Now)),
    (@S3, N'Scholarship', N'Submitted',     N'Rejected',         N'Did not pass the scholarship exam.', @Admin, DATEADD(DAY, -8, @Now));

-- ---- Inquiries, notifications, preferences ---------------------------------
INSERT INTO dbo.InquiryThreads (ThreadId, UserId, Subject, Status, HasUnreadForApplicant, HasUnreadForStaff, CreatedAt, UpdatedAt) VALUES
    (@T1, @U2, N'Which documents do I still need to upload?', N'Open',   1, 0, DATEADD(DAY, -6, @Now), DATEADD(DAY, -5, @Now)),
    (@T2, @U3, N'Can I appeal the decision on my application?', N'Closed', 0, 0, DATEADD(DAY, -4, @Now), DATEADD(DAY, -3, @Now)),
    (@T3, @U5, N'Is there a slot open for the Financial Need Grant?', N'Open', 0, 1, DATEADD(DAY, -2, @Now), DATEADD(DAY, -2, @Now));

INSERT INTO dbo.InquiryMessages (ThreadId, SenderUserId, IsFromStaff, Body, CreatedAt) VALUES
    (@T1, @U2,    0, N'Hello, which documents do I still need to upload for my application?', DATEADD(DAY, -6, @Now)),
    (@T1, @Staff, 1, N'Hi Juan, please upload your PSA birth certificate and a clear ID picture.', DATEADD(DAY, -5, @Now)),
    (@T2, @U3,    0, N'Good day. Can I appeal the decision on my application?', DATEADD(DAY, -4, @Now)),
    (@T2, @Staff, 1, N'Hello Ana. Appeals are handled in person at the Admissions Office.', DATEADD(DAY, -3, @Now)),
    (@T3, @U5,    0, N'Is there a slot open for the Financial Need Grant?', DATEADD(DAY, -2, @Now));

INSERT INTO dbo.Notifications (UserId, EventType, Title, Body, IsRead, CreatedAt) VALUES
    (@U1, N'ApplicationResult',   N'Your application was approved',     N'Hi Maria, congratulations! Your admission application has been approved.', 1, DATEADD(DAY, -5, @Now)),
    (@U2, N'ExamPermitAvailable', N'Your exam permit is ready',         N'Hi Juan, your exam permit is now available. Please print it and bring it on exam day.', 1, DATEADD(DAY, -23, @Now)),
    (@U2, N'InterviewSchedule',   N'Your interview is scheduled',       N'Hi Juan, your interview is on 20 October at 10:30 AM at the BCAS Admissions Office.', 0, DATEADD(DAY, -5, @Now)),
    (@U3, N'DocumentFlagged',     N'A document needs your attention',   N'Hi Ana, your ID picture was flagged: the photo is blurred. Please upload a clearer one.', 0, DATEADD(DAY, -26, @Now)),
    (@U4, N'ScholarshipResult',   N'Your scholarship was approved',     N'Hi Pedro, congratulations! You have been awarded the Academic Excellence Scholarship.', 1, DATEADD(DAY, -10, @Now)),
    (@U6, N'ScholarshipResult',   N'Update on your scholarship',        N'Hi Carlo, your scholarship application was not approved this time.', 0, DATEADD(DAY, -8, @Now));

INSERT INTO dbo.NotificationPreferences (UserId, NotificationType, IsEnabled) VALUES
    (@U1, N'ApplicationResult', 1),
    (@U2, N'ExamSchedule',      1),
    (@U3, N'Announcement',      0);

-- ---- Semesters --------------------------------------------------------------
INSERT INTO dbo.Semesters (Name, StartDate, EndDate, CreatedByUserId) VALUES
    (N'1st Semester AY 2025-2026 (sample)', '2025-08-04', '2025-12-19', @Admin),
    (N'2nd Semester AY 2025-2026 (sample)', '2026-01-12', '2026-05-29', @Admin),
    (N'1st Semester AY 2026-2027 (sample)', '2026-08-03', '2026-12-18', @Admin);

COMMIT TRANSACTION;

SELECT N'Sample accounts' AS [What], COUNT(*) AS [Count] FROM dbo.Users WHERE Email LIKE N'%@sample.bcas.test'
UNION ALL SELECT N'Admission applications',   COUNT(*) FROM dbo.AdmissionApplications   WHERE UserId IN (SELECT UserId FROM dbo.Users WHERE Email LIKE N'%@sample.bcas.test')
UNION ALL SELECT N'Scholarship applications', COUNT(*) FROM dbo.ScholarshipApplications WHERE UserId IN (SELECT UserId FROM dbo.Users WHERE Email LIKE N'%@sample.bcas.test');
