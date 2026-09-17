using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class ScholarshipMappingExtensions
{
    public static ScholarshipResponse ToResponse(this Scholarship scholarship) => new()
    {
        ScholarshipId = scholarship.ScholarshipId,
        Name = scholarship.Name,
        ScholarshipType = scholarship.ScholarshipType,
        RemainingSlots = scholarship.RemainingSlots,
    };

    public static EvaluatorScholarshipSlotsResponse ToEvaluatorSlotsResponse(this Scholarship scholarship) => new()
    {
        ScholarshipId = scholarship.ScholarshipId,
        Name = scholarship.Name,
        ScholarshipType = scholarship.ScholarshipType,
        TotalSlots = scholarship.TotalSlots,
        RemainingSlots = scholarship.RemainingSlots,
        OccupiedSlots = scholarship.TotalSlots - scholarship.RemainingSlots,
        IsActive = scholarship.IsActive,
    };

    public static ScholarshipApplicationResponse ToResponse(this ScholarshipApplication application) => new()
    {
        ApplicationId = application.ApplicationId,
        ScholarshipName = application.ScholarshipName,
        ScholarshipType = application.ScholarshipType,
        GradeAverage = application.GradeAverage,
        Status = application.Status,
        SubmittedAt = application.SubmittedAt,
    };
}
