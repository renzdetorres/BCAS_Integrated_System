-- -----------------------------------------------------------------------------
-- Removes everything sample-data.sql added, and nothing else.
--
-- "Sample" means an account whose email ends in @sample.bcas.test, plus the
-- two semesters named "... (sample)". Each such account's records go with
-- it: profile, admission and scholarship applications, status history,
-- reservations, screenings and decisions, documents, exam selections, and
-- anything created by signing in as them (audit entries, preferences,
-- inquiries, password-reset tokens). Real accounts are not touched.
--
-- Scholarship slot counts are recalculated at the end.
-- -----------------------------------------------------------------------------
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;

BEGIN TRANSACTION;

DECLARE @SampleUsers TABLE (UserId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY);
INSERT INTO @SampleUsers (UserId)
SELECT UserId FROM dbo.Users WHERE Email LIKE N'%@sample.bcas.test';

DECLARE @SampleApps TABLE (ApplicationId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY);
INSERT INTO @SampleApps (ApplicationId)
SELECT ApplicationId FROM dbo.AdmissionApplications WHERE UserId IN (SELECT UserId FROM @SampleUsers)
UNION
SELECT ApplicationId FROM dbo.ScholarshipApplications WHERE UserId IN (SELECT UserId FROM @SampleUsers);

DELETE FROM dbo.ApplicationStatusHistory           WHERE ApplicationId IN (SELECT ApplicationId FROM @SampleApps);
DELETE FROM dbo.ScholarshipFinalDecisions          WHERE ApplicationId IN (SELECT ApplicationId FROM @SampleApps);
DELETE FROM dbo.ScholarshipEligibilityScreenings   WHERE ApplicationId IN (SELECT ApplicationId FROM @SampleApps);
DELETE FROM dbo.AdmissionReservations              WHERE ApplicationId IN (SELECT ApplicationId FROM @SampleApps);
DELETE FROM dbo.ScholarshipApplications            WHERE UserId IN (SELECT UserId FROM @SampleUsers);
DELETE FROM dbo.AdmissionApplications              WHERE UserId IN (SELECT UserId FROM @SampleUsers);

DELETE FROM dbo.ExamScheduleSelections             WHERE UserId IN (SELECT UserId FROM @SampleUsers);
DELETE FROM dbo.ExamRescheduleRequests             WHERE UserId IN (SELECT UserId FROM @SampleUsers);
DELETE FROM dbo.ApplicantDocuments                 WHERE UserId IN (SELECT UserId FROM @SampleUsers);
DELETE FROM dbo.ApplicantProfiles                  WHERE UserId IN (SELECT UserId FROM @SampleUsers);

-- Left behind by signing in as, or messaging from, a sample account.
DELETE FROM dbo.InquiryMessages                    WHERE SenderUserId IN (SELECT UserId FROM @SampleUsers)
                                                      OR ThreadId IN (SELECT ThreadId FROM dbo.InquiryThreads WHERE UserId IN (SELECT UserId FROM @SampleUsers));
DELETE FROM dbo.InquiryThreads                     WHERE UserId IN (SELECT UserId FROM @SampleUsers);
DELETE FROM dbo.NotificationPreferences            WHERE UserId IN (SELECT UserId FROM @SampleUsers);
DELETE FROM dbo.PasswordResetTokens                WHERE UserId IN (SELECT UserId FROM @SampleUsers);
DELETE FROM dbo.AuditLogs                          WHERE UserId IN (SELECT UserId FROM @SampleUsers);
DELETE FROM dbo.PotentialDuplicateApplicants       WHERE NewUserId IN (SELECT UserId FROM @SampleUsers)
                                                      OR MatchedUserId IN (SELECT UserId FROM @SampleUsers)
                                                      OR ReviewedByUserId IN (SELECT UserId FROM @SampleUsers);

DELETE FROM dbo.Semesters WHERE Name LIKE N'% (sample)'
                             OR CreatedByUserId IN (SELECT UserId FROM @SampleUsers);

DELETE FROM dbo.Users WHERE UserId IN (SELECT UserId FROM @SampleUsers);

-- A slot is held by every application except Waitlisted and Rejected ones.
UPDATE s
SET RemainingSlots = CASE WHEN s.TotalSlots - h.Held < 0 THEN 0 ELSE s.TotalSlots - h.Held END
FROM dbo.Scholarships s
CROSS APPLY (
    SELECT COUNT(*) AS Held FROM dbo.ScholarshipApplications a
    WHERE a.ScholarshipId = s.ScholarshipId AND a.Status NOT IN (N'Waitlisted', N'Rejected')
) h;

COMMIT TRANSACTION;

SELECT N'Sample accounts remaining' AS [What], COUNT(*) AS [Count] FROM dbo.Users WHERE Email LIKE N'%@sample.bcas.test'
UNION ALL SELECT N'Admission applications', COUNT(*) FROM dbo.AdmissionApplications
UNION ALL SELECT N'Scholarship applications', COUNT(*) FROM dbo.ScholarshipApplications;
