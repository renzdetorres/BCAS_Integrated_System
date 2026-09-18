using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class AdminApplicationListMappingExtensions
{
    public static AdminApplicationListItemResponse ToResponse(
        this AdminApplicationListItem item, IReadOnlyList<TrackingStepResponse> steps) => new()
    {
        ApplicationId = item.ApplicationId,
        ApplicantName = item.ApplicantName,
        ApplicantEmail = item.ApplicantEmail,
        Category = item.Category,
        Status = item.Status,
        Remarks = item.Remarks,
        SubmittedAt = item.SubmittedAt,
        UpdatedAt = item.UpdatedAt,
        Steps = steps,
        ApplicationType = item.ApplicationType,
        CourseAppliedFor = item.CourseAppliedFor,
        PreviousSchool = item.PreviousSchool,
        ScholarshipName = item.ScholarshipName,
        ScholarshipType = item.ScholarshipType,
        GradeAverage = item.GradeAverage,
    };
}
