using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class EvaluatorQueueApplicationMappingExtensions
{
    public static EvaluatorQueueApplicationResponse ToResponse(this EvaluatorQueueApplication application) => new()
    {
        ApplicationId = application.ApplicationId,
        ApplicantName = application.ApplicantName,
        ScholarshipName = application.ScholarshipName,
        ScholarshipType = application.ScholarshipType,
        GradeAverage = application.GradeAverage,
        Status = application.Status,
        SubmittedAt = application.SubmittedAt,
    };
}
