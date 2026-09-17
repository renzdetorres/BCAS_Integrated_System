using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class ApplicationHistoryMappingExtensions
{
    public static ApplicationHistoryItemResponse ToResponse(this ApplicationHistoryItem item) => new()
    {
        ApplicationId = item.ApplicationId,
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
