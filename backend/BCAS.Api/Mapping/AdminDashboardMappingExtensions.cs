using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class AdminDashboardMappingExtensions
{
    public static ProgramCountResponse ToResponse(this ProgramApplicantCount count) => new()
    {
        Program = count.Program,
        Count = count.Count,
    };

    public static DepartmentCountResponse ToResponse(this DepartmentCount count) => new()
    {
        Department = count.Department,
        Count = count.Count,
    };

    public static RecentApplicationResponse ToResponse(this RecentAdmissionApplication application) => new()
    {
        ApplicationId = application.ApplicationId,
        ApplicantName = application.ApplicantName,
        ApplicationType = application.ApplicationType,
        CourseAppliedFor = application.CourseAppliedFor,
        Department = application.Department,
        Status = application.Status,
        SubmittedAt = application.SubmittedAt,
    };

    public static RecentScholarshipApplicationResponse ToResponse(this RecentScholarshipApplication application) => new()
    {
        ApplicationId = application.ApplicationId,
        ApplicantName = application.ApplicantName,
        ScholarshipName = application.ScholarshipName,
        Department = application.Department,
        Status = application.Status,
        SubmittedAt = application.SubmittedAt,
    };
}
