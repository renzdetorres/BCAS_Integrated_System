using BCAS.Api.Constants;
using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class EvaluatorScholarshipApplicationMappingExtensions
{
    public static EvaluatorScholarshipApplicationDetailResponse ToResponse(
        this EvaluatorScholarshipApplicationDetail detail,
        IReadOnlyList<ApplicantDocument> documents) => new()
    {
        ApplicationId = detail.ApplicationId,
        ApplicantName = detail.ApplicantName,
        ApplicantEmail = detail.ApplicantEmail,
        IsBcasian = detail.IsBcasian,
        ScholarshipName = detail.ScholarshipName,
        ScholarshipType = detail.ScholarshipType,
        GradeAverage = detail.GradeAverage,
        MinimumGradeAverage = detail.MinimumGradeAverage,
        MeetsMinimumGrade = detail.MinimumGradeAverage.HasValue
            ? detail.GradeAverage >= detail.MinimumGradeAverage.Value
            : null,
        Status = detail.Status,
        SubmittedAt = detail.SubmittedAt,
        UpdatedAt = detail.UpdatedAt,
        Screening = detail.Screening?.ToResponse(),
        Documents = documents.Select(d => d.ToEvaluatorResponse()).ToList(),
        WorkflowStages = ScholarshipWorkflowConstants.Stages,
        CanAdvance = ScholarshipWorkflowConstants.Stages.Contains(detail.Status)
            && detail.Status != ScholarshipWorkflowConstants.Stages[^1],
        EligibilityRules = detail.EligibilityRules.ToResponse(),
    };

    public static ScholarshipScreeningResponse ToResponse(this ScholarshipEligibilityScreening screening) => new()
    {
        Verdict = screening.Verdict,
        Remarks = screening.Remarks,
        EvaluatedByName = screening.EvaluatedByName,
        EvaluatedAt = screening.EvaluatedAt,
    };

    public static EvaluatorApplicantDocumentResponse ToEvaluatorResponse(this ApplicantDocument document) => new()
    {
        DocumentType = document.DocumentType,
        FileName = document.FileName,
        Status = document.Status,
        FlaggedReason = document.FlaggedReason,
        UploadedAt = document.UploadedAt,
    };

    public static ScholarshipEligibilityRulesResponse ToResponse(this ScholarshipEligibilityRules rules) => new()
    {
        IsTopOne = rules.IsTopOne,
        EntranceExamRequired = rules.EntranceExamRequired,
        EntranceExamScheduled = rules.EntranceExamScheduled,
        TotalSlots = rules.TotalSlots,
        RemainingSlots = rules.RemainingSlots,
        IsReapplication = rules.IsReapplication,
        PreviousAttempts = rules.PreviousAttempts.Select(a => a.ToResponse()).ToList(),
    };

    public static ScholarshipReapplicationAttemptResponse ToResponse(this ScholarshipReapplicationAttempt attempt) => new()
    {
        ApplicationId = attempt.ApplicationId,
        Status = attempt.Status,
        SubmittedAt = attempt.SubmittedAt,
        ScreeningVerdict = attempt.ScreeningVerdict,
        ScreeningRemarks = attempt.ScreeningRemarks,
    };
}
