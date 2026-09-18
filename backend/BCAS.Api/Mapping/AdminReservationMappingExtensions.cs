using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class AdminReservationMappingExtensions
{
    public static AdminReservationResponse ToResponse(this AdminReservationCandidate candidate) => new()
    {
        ApplicationId = candidate.ApplicationId,
        ApplicantName = candidate.ApplicantName,
        ApplicantEmail = candidate.ApplicantEmail,
        ApplicationType = candidate.ApplicationType,
        CourseAppliedFor = candidate.CourseAppliedFor,
        SubmittedAt = candidate.SubmittedAt,
        IsReserved = candidate.IsReserved,
        ReservationFee = candidate.ReservationFee,
        Remarks = candidate.Remarks,
        RecordedAt = candidate.RecordedAt,
        RecordedByName = candidate.RecordedByName,
    };
}
