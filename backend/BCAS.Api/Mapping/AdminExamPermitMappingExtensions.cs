using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class AdminExamPermitMappingExtensions
{
    public static AdminExamPermitListItemResponse ToAdminListItemResponse(this AdminExamPermitCandidate candidate, bool documentsVerified) => new()
    {
        UserId = candidate.UserId,
        ApplicantName = candidate.ApplicantName,
        ApplicantEmail = candidate.ApplicantEmail,
        // Derived from the surrogate id, same convention as the applicant-facing permit.
        PermitNumber = $"EP-{candidate.ExamScheduleSelectionId:D6}",
        DayType = candidate.DayType,
        ExamDate = candidate.ExamDate,
        ExamTime = candidate.ExamTime,
        Venue = candidate.Venue,
        DocumentsVerified = documentsVerified,
        IsReleased = candidate.IsPermitReleased,
        ReleasedAt = candidate.PermitReleasedAt,
    };
}
