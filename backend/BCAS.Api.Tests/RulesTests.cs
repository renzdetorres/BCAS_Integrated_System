using BCAS.Api.Constants;
using BCAS.Api.Exceptions;
using BCAS.Api.Services;

namespace BCAS.Api.Tests;

public class PhilippinePhoneTests
{
    [Theory]
    [InlineData("+639171234567")]
    [InlineData("+639981234567")]
    public void Accepts_plus63_followed_by_a_mobile_number(string number) => Assert.True(PhilippinePhone.IsValid(number));

    [Theory]
    [InlineData("+63917123456")]   // too short
    [InlineData("+6391712345678")] // too long
    [InlineData("09171234567")]    // local 09 form is no longer accepted
    [InlineData("639171234567")]   // missing the +
    [InlineData("+63 917 123 4567")]
    [InlineData("+638171234567")]  // not a mobile prefix
    [InlineData("+14155552671")]   // not a Philippine number
    [InlineData("")]
    [InlineData(null)]
    public void Rejects_everything_else(string? number) => Assert.False(PhilippinePhone.IsValid(number));

    [Fact]
    public void Returns_the_number_unchanged_for_sms_when_valid()
    {
        Assert.Equal("+639171234567", PhilippinePhone.ToInternational("+639171234567"));
        Assert.Null(PhilippinePhone.ToInternational("0917"));
    }
}

public class ApplicationNumberTests
{
    [Fact]
    public void Formats_year_and_five_digit_sequence() =>
        Assert.Equal("BCAS-2026-00042", ApplicationNumbers.Format(42, new DateTime(2026, 10, 14)));
}

public class AcademicStructureTests
{
    [Theory]
    [InlineData("Elementary", "Grade 4", null, null, "Grade 4")]
    [InlineData("High School", "Grade 7", "2nd Term", null, "Grade 7")]
    [InlineData("Senior High School", "Grade 11", "1st Term", "STEM", "STEM")]
    [InlineData("College", "1st Year", "1st Semester", "BSIT", "BSIT")]
    public void Accepts_a_complete_choice_and_returns_what_is_stored(string category, string level, string? term, string? strandOrProgram, string stored) =>
        Assert.Equal(stored, AcademicStructure.ValidateLevel(category, level, term, strandOrProgram));

    [Theory]
    [InlineData("Elementary", "Grade 9", null, null)]          // not an elementary grade
    [InlineData("High School", "Grade 7", null, null)]         // term missing
    [InlineData("Senior High School", "Grade 11", "1st Term", "BAKING")] // unknown strand
    [InlineData("Senior High School", "Grade 11", "1st Term", null)]     // strand missing
    [InlineData("College", "1st Year", "3rd Term", "BSIT")]    // terms are not semesters
    public void Rejects_a_choice_that_does_not_fit_the_category(string category, string level, string? term, string? strandOrProgram) =>
        Assert.Throws<InvalidEntranceFormException>(() => AcademicStructure.ValidateLevel(category, level, term, strandOrProgram));

    [Fact]
    public void Counts_age_at_the_cutoff_not_on_the_day_of_applying()
    {
        // Born 1 June 2022: 4 by December 2026, so Pre-Kinder (4) is fine and Kindergarten (5) is not.
        var born = new DateOnly(2022, 6, 1);
        AcademicStructure.ValidateAge("Pre-Kinder", born, minAge: 4, cutoffMonth: 12, cutoffYear: 2026);
        Assert.Throws<InvalidEntranceFormException>(() => AcademicStructure.ValidateAge("Kindergarten", born, 5, 12, 2026));
    }

    [Fact]
    public void A_birthday_on_the_last_day_of_the_cutoff_month_counts()
    {
        var born = new DateOnly(2021, 12, 31);
        AcademicStructure.ValidateAge("Kindergarten", born, minAge: 5, cutoffMonth: 12, cutoffYear: 2026);
        Assert.Throws<InvalidEntranceFormException>(() =>
            AcademicStructure.ValidateAge("Kindergarten", new DateOnly(2022, 1, 1), 5, 12, 2026));
    }

    [Fact]
    public void Only_pre_kinder_and_kindergarten_have_a_minimum_age()
    {
        Assert.Equal(4, AcademicStructure.MinAgeFor("Pre-Kinder", 4, 5));
        Assert.Equal(5, AcademicStructure.MinAgeFor("Kindergarten", 4, 5));
        Assert.Null(AcademicStructure.MinAgeFor("Grade 1", 4, 5));
    }

    [Theory]
    [InlineData("2026-10-14", "2026-2027")]
    [InlineData("2026-06-01", "2026-2027")]
    [InlineData("2027-03-01", "2026-2027")]
    public void Academic_year_starts_in_june(string date, string expected) =>
        Assert.Equal(expected, AcademicStructure.AcademicYearFor(DateOnly.Parse(date)));

    [Theory]
    [InlineData("2026-2027", true)]
    [InlineData("2026-2028", false)]
    [InlineData("26-27", false)]
    public void Validates_academic_year_text(string value, bool valid) => Assert.Equal(valid, AcademicStructure.IsValidAcademicYear(value));
}

public class DocumentRuleTests
{
    [Fact]
    public void Only_a_college_transferee_submits_a_transcript()
    {
        Assert.Contains("TOR", DocumentConstants.RequiredDocumentsFor("Transferee", "College"));
        Assert.DoesNotContain("TOR", DocumentConstants.RequiredDocumentsFor("Transferee", "High School"));
        Assert.DoesNotContain("TOR", DocumentConstants.RequiredDocumentsFor("NewStudent", "College"));
        Assert.DoesNotContain("TOR", DocumentConstants.RequiredDocumentsFor("Returnee", "College"));
    }

    [Fact]
    public void The_photo_is_an_image_and_everything_else_is_a_pdf()
    {
        Assert.Equal(new[] { "JPG", "PNG" }, DocumentConstants.AcceptedFormatsFor("IdPicture"));
        Assert.Equal(new[] { "PDF" }, DocumentConstants.AcceptedFormatsFor("PSA"));
        Assert.Equal(new[] { "PDF" }, DocumentConstants.AcceptedFormatsFor("ReportCard"));
    }

    private static readonly byte[] Pdf = "%PDF-1.4 body"u8.ToArray();
    private static readonly byte[] Png = { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00 };

    [Fact]
    public void Checks_the_format_against_the_document_type_and_the_file_bytes()
    {
        Assert.True(DocumentConstants.IsAcceptedFile("PSA", "psa.pdf", "application/pdf", Pdf));
        Assert.False(DocumentConstants.IsAcceptedFile("PSA", "psa.png", "image/png", Png));
        Assert.True(DocumentConstants.IsAcceptedFile("IdPicture", "me.png", "image/png", Png));
        Assert.False(DocumentConstants.IsAcceptedFile("IdPicture", "me.pdf", "application/pdf", Pdf));
        // A renamed file: the name and type say PNG but the bytes are a PDF.
        Assert.False(DocumentConstants.IsAcceptedFile("IdPicture", "me.png", "image/png", Pdf));
    }

    [Fact]
    public void Proof_of_payment_may_be_any_of_the_three_formats() =>
        Assert.True(DocumentConstants.IsAcceptedAnyFile("receipt.png", "image/png", Png));
}

public class AdmissionStageTests
{
    [Theory]
    [InlineData("Submitted", 0)]
    [InlineData("UnderReview", 1)]
    [InlineData("PendingDocuments", 1)]
    [InlineData("DocumentsCompleted", 1)]
    [InlineData("ExamScheduled", 3)]
    [InlineData("DidNotTakeExam", 3)]
    [InlineData("ExamDone", 4)]
    [InlineData("Registration", 5)]
    [InlineData("Approved", 6)]
    public void Staff_statuses_map_onto_the_seven_tracker_stages(string status, int stage) =>
        Assert.Equal(stage, ApplicationWorkflowSteps.DescribeAdmission(status)!.StageIndex);

    [Theory]
    [InlineData(ApplicationWorkflowSteps.PaymentState.NotPaid, 2)]
    [InlineData(ApplicationWorkflowSteps.PaymentState.Pending, 2)]
    [InlineData(ApplicationWorkflowSteps.PaymentState.Rejected, 2)]
    [InlineData(ApplicationWorkflowSteps.PaymentState.Verified, 3)]
    [InlineData(ApplicationWorkflowSteps.PaymentState.NotRequired, 3)]
    public void Cleared_documents_wait_in_the_payment_stage_until_the_payment_is_verified(string paymentState, int stage) =>
        Assert.Equal(stage, ApplicationWorkflowSteps.DescribeAdmission("DocumentsCleared", paymentState)!.StageIndex);

    [Fact]
    public void The_tracker_always_has_exactly_seven_stages()
    {
        Assert.Equal(7, ApplicationTrackingConstants.AdmissionSteps.Count);
        Assert.Equal(7, ApplicationWorkflowSteps.BuildAdmissionSteps("ExamDone").Count);
    }

    [Fact]
    public void Exactly_one_stage_is_current_and_everything_before_it_is_complete()
    {
        var steps = ApplicationWorkflowSteps.BuildAdmissionSteps("ExamDone");
        Assert.Single(steps, s => s.IsCurrent);
        Assert.Equal(new[] { true, true, true, true, false, false, false }, steps.Select(s => s.IsComplete));
    }

    [Fact]
    public void An_approved_application_completes_every_stage() =>
        Assert.All(ApplicationWorkflowSteps.BuildAdmissionSteps("Approved"), s => Assert.True(s.IsComplete));

    [Theory]
    [InlineData("Rejected")]
    [InlineData("Retracted")]
    public void A_closed_application_marks_no_stage(string status) =>
        Assert.All(ApplicationWorkflowSteps.BuildAdmissionSteps(status), s => Assert.False(s.IsComplete || s.IsCurrent));

    [Fact]
    public void A_scheduled_interview_changes_the_wording_of_the_interview_stage()
    {
        var interview = new ApplicationWorkflowSteps.InterviewSummary(new DateOnly(2026, 12, 10), new TimeOnly(9, 30), "Admissions Office");
        var stage = ApplicationWorkflowSteps.DescribeAdmission("Registration", interview: interview)!;
        Assert.Equal("Interview", stage.SubProcess);
        Assert.Contains("December 10, 2026", stage.NextAction);
        Assert.Contains("original copies", stage.NextAction);
    }
}

public class AdmissionWorkflowTests
{
    [Fact]
    public void The_main_path_moves_one_step_at_a_time()
    {
        Assert.True(AdmissionWorkflowConstants.IsAllowedTransition("Submitted", "UnderReview"));
        Assert.False(AdmissionWorkflowConstants.IsAllowedTransition("Submitted", "ExamDone"));
        Assert.False(AdmissionWorkflowConstants.IsAllowedTransition("UnderReview", "Submitted"));
    }

    [Fact]
    public void A_retake_goes_back_to_choosing_a_new_exam_schedule() =>
        Assert.True(AdmissionWorkflowConstants.IsAllowedTransition("ExamDone", "DocumentsCleared"));

    [Fact]
    public void A_pass_goes_to_the_interview_and_a_fail_closes_the_application()
    {
        Assert.True(AdmissionWorkflowConstants.IsAllowedTransition("ExamDone", "Registration"));
        Assert.True(AdmissionWorkflowConstants.IsAllowedTransition("ExamDone", "Rejected"));
    }

    [Theory]
    [InlineData("Approved")]
    [InlineData("Rejected")]
    [InlineData("Retracted")]
    public void Final_statuses_never_move_again(string status) => Assert.Empty(AdmissionWorkflowConstants.NextStatuses(status));
}

public class ScholarshipTrackerTests
{
    private static ScholarshipPipelineRow Row(string status, Action<ScholarshipPipelineRow>? tweak = null)
    {
        var row = new ScholarshipPipelineRow { Status = status, SubmittedAt = new DateTime(2026, 10, 14) };
        tweak?.Invoke(row);
        return row;
    }

    [Fact]
    public void There_are_six_stages() => Assert.Equal(6, ScholarshipTracker.Build(Row("Submitted")).Steps.Count);

    [Theory]
    [InlineData("Submitted", 0)]
    [InlineData("Waitlisted", 0)]
    [InlineData("DocumentsVerified", 1)]
    [InlineData("EligibilityScreening", 1)]
    [InlineData("Result", 5)]
    [InlineData("Approved", 5)]
    public void Workflow_statuses_map_onto_stages(string status, int stage) =>
        Assert.Equal(stage, ScholarshipTracker.Build(Row(status)).StageIndex);

    [Fact]
    public void After_screening_the_applicant_waits_for_an_exam_schedule()
    {
        var progress = ScholarshipTracker.Build(Row("Evaluation"));
        Assert.Equal(2, progress.StageIndex);
        Assert.Equal("/exam-schedule", progress.NextActionPath);
    }

    [Fact]
    public void A_booked_exam_points_to_the_permit() =>
        Assert.Equal("/exam-permit", ScholarshipTracker.Build(Row("Evaluation", r => r.ExamScheduled = true)).NextActionPath);

    [Fact]
    public void Passing_the_exam_qualifies_the_applicant_for_the_interview_and_essay()
    {
        var progress = ScholarshipTracker.Build(Row("Evaluation", r => r.ExamResult = "Passed"));
        Assert.Equal(4, progress.StageIndex);
        Assert.Contains("interview", progress.SubProcess, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Failing_the_exam_points_to_regular_admission()
    {
        var progress = ScholarshipTracker.Build(Row("Rejected", r => r.ExamResult = "Failed"));
        Assert.Equal(3, progress.StageIndex);
        Assert.Contains("regular admission", progress.NextAction, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("/applications", progress.NextActionPath);
    }

    [Fact]
    public void A_grantee_completes_every_stage_and_is_told_to_enroll()
    {
        var progress = ScholarshipTracker.Build(Row("Approved"));
        Assert.All(progress.Steps, s => Assert.True(s.IsComplete));
        Assert.Contains("enrollment", progress.NextAction, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void The_total_score_averages_whichever_scores_exist()
    {
        Assert.Equal(91.67m, ScholarshipTracker.TotalScore(Row("Result", r => { r.ExamScore = 88; r.InterviewScore = 92; r.EssayScore = 95; })));
        Assert.Equal(90m, ScholarshipTracker.TotalScore(Row("Result", r => { r.ExamScore = 88; r.InterviewScore = 92; })));
        Assert.Null(ScholarshipTracker.TotalScore(Row("Result")));
    }

    [Fact]
    public void Academic_year_follows_the_submission_date()
    {
        Assert.Equal("2026-2027", ScholarshipTracker.AcademicYearOf(new DateTime(2026, 10, 1)));
        Assert.Equal("2025-2026", ScholarshipTracker.AcademicYearOf(new DateTime(2026, 5, 31)));
    }
}
