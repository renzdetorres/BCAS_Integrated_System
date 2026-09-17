using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class EvaluatorScholarshipApplicationMappingExtensions
{
    public static EvaluatorScholarshipApplicationDetailResponse ToResponse(this EvaluatorScholarshipApplicationDetail detail) => new()
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
        Screening = detail.Screening?.ToResponse(),
    };

    public static ScholarshipScreeningResponse ToResponse(this ScholarshipEligibilityScreening screening) => new()
    {
        Verdict = screening.Verdict,
        Remarks = screening.Remarks,
        EvaluatedByName = screening.EvaluatedByName,
        EvaluatedAt = screening.EvaluatedAt,
    };
}
