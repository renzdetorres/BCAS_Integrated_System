using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class AdmissionApplicationMappingExtensions
{
    public static AdmissionApplicationResponse ToResponse(this AdmissionApplication application) => new()
    {
        ApplicationId = application.ApplicationId,
        ApplicationType = application.ApplicationType,
        CourseAppliedFor = application.CourseAppliedFor,
        PreviousSchool = application.PreviousSchool,
        Status = application.Status,
        SubmittedAt = application.SubmittedAt,
    };
}
