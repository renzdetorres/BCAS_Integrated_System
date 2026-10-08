using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class ExamPermitMappingExtensions
{
    public static ExamPermitResponse ToPermitResponse(this ExamScheduleSelection selection) => new()
    {
        // Derived from the surrogate id rather than stored, so there's no
        // separate counter to keep in sync with ExamScheduleSelections.
        PermitNumber = $"EP-{selection.ExamScheduleSelectionId:D6}",
        ExamScheduleId = selection.ExamScheduleId,
        DayType = selection.DayType,
        ExamDate = selection.ExamDate,
        ExamTime = selection.ExamTime,
        Venue = selection.Venue,
        // Guaranteed non-null - the caller only reaches this once the permit is released.
        IssuedAt = selection.PermitReleasedAt!.Value,
        ApplicantName = selection.ApplicantName,
        ExamType = selection.ExamType,
        ExamFee = selection.ExamFee,
        InvoiceNumber = selection.InvoiceNumber,
        SchoolLastAttended = selection.SchoolLastAttended,
        LevelApplying = selection.LevelApplying,
        Program = selection.Program,
    };

    public static ExamRescheduleRequestResponse ToResponse(this ExamRescheduleRequest request) => new()
    {
        RequestId = request.RequestId,
        Reason = request.Reason,
        Status = request.Status,
        SubmittedAt = request.SubmittedAt,
    };
}
