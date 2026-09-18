using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class AdminReportMappingExtensions
{
    public static EnrollmentListItemResponse ToResponse(this EnrollmentListItem item) => new()
    {
        ApplicationId = item.ApplicationId,
        ApplicantName = item.ApplicantName,
        ApplicantEmail = item.ApplicantEmail,
        ApplicationType = item.ApplicationType,
        CourseAppliedFor = item.CourseAppliedFor,
        PreviousSchool = item.PreviousSchool,
        SubmittedAt = item.SubmittedAt,
        ReservationFee = item.ReservationFee,
        ReservedAt = item.ReservedAt,
    };

    public static ScholarshipApplicantListItemResponse ToResponse(this ScholarshipApplicantListItem item) => new()
    {
        ApplicationId = item.ApplicationId,
        ApplicantName = item.ApplicantName,
        ApplicantEmail = item.ApplicantEmail,
        ScholarshipName = item.ScholarshipName,
        ScholarshipType = item.ScholarshipType,
        GradeAverage = item.GradeAverage,
        Status = item.Status,
        SubmittedAt = item.SubmittedAt,
    };

    public static ScholarshipQualificationListItemResponse ToResponse(this ScholarshipQualificationListItem item) => new()
    {
        ApplicationId = item.ApplicationId,
        ApplicantName = item.ApplicantName,
        ApplicantEmail = item.ApplicantEmail,
        ScholarshipName = item.ScholarshipName,
        Verdict = item.Verdict,
        Remarks = item.Remarks,
        EvaluatedByName = item.EvaluatedByName,
        EvaluatedAt = item.EvaluatedAt,
    };

    public static ScholarshipResultListItemResponse ToResponse(this ScholarshipResultListItem item) => new()
    {
        ApplicationId = item.ApplicationId,
        ApplicantName = item.ApplicantName,
        ApplicantEmail = item.ApplicantEmail,
        ScholarshipName = item.ScholarshipName,
        ScholarshipType = item.ScholarshipType,
        GradeAverage = item.GradeAverage,
        Status = item.Status,
        Decision = item.Decision,
        DecisionRemarks = item.DecisionRemarks,
        DecidedByName = item.DecidedByName,
        DecidedAt = item.DecidedAt,
        SubmittedAt = item.SubmittedAt,
    };

    public static ScholarshipContractResponse ToContractResponse(this ScholarshipResultListItem item) => new()
    {
        ApplicationId = item.ApplicationId,
        ApplicantName = item.ApplicantName,
        ApplicantEmail = item.ApplicantEmail,
        ScholarshipName = item.ScholarshipName,
        ScholarshipType = item.ScholarshipType,
        GradeAverage = item.GradeAverage,
        DecidedByName = item.DecidedByName ?? string.Empty,
        DecidedAt = item.DecidedAt ?? item.SubmittedAt,
        Remarks = item.DecisionRemarks,
        SubmittedAt = item.SubmittedAt,
    };
}
