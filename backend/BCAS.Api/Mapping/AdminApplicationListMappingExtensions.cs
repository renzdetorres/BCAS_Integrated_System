using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class AdminApplicationListMappingExtensions
{
    public static AdminApplicationListItemResponse ToResponse(this AdminApplicationListItem item) => new()
    {
        ApplicationId = item.ApplicationId,
        ApplicantName = item.ApplicantName,
        ApplicantEmail = item.ApplicantEmail,
        Category = item.Category,
        Status = item.Status,
        SubmittedAt = item.SubmittedAt,
        ApplicationType = item.ApplicationType,
        CourseAppliedFor = item.CourseAppliedFor,
        PreviousSchool = item.PreviousSchool,
        ScholarshipName = item.ScholarshipName,
        ScholarshipType = item.ScholarshipType,
        GradeAverage = item.GradeAverage,
    };
}
