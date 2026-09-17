using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class AdminDashboardMappingExtensions
{
    public static ProgramCountResponse ToResponse(this ProgramApplicantCount count) => new()
    {
        Program = count.Program,
        Count = count.Count,
    };

    public static RecentApplicationResponse ToResponse(this RecentAdmissionApplication application) => new()
    {
        ApplicationId = application.ApplicationId,
        ApplicantName = application.ApplicantName,
        ApplicationType = application.ApplicationType,
        CourseAppliedFor = application.CourseAppliedFor,
        Status = application.Status,
        SubmittedAt = application.SubmittedAt,
    };
}
