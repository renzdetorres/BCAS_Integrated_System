using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class ExamScheduleMappingExtensions
{
    public static ExamScheduleResponse ToResponse(this ExamSchedule schedule) => new()
    {
        ExamScheduleId = schedule.ExamScheduleId,
        DayType = schedule.DayType,
        ExamDate = schedule.ExamDate,
        ExamTime = schedule.ExamTime,
        Capacity = schedule.Capacity,
        SeatsLeft = schedule.Capacity is null ? null : Math.Max(0, schedule.Capacity.Value - schedule.Taken),
        IsFull = schedule.Capacity is not null && schedule.Taken >= schedule.Capacity.Value,
    };

    public static ExamScheduleSelectionResponse ToResponse(this ExamScheduleSelection selection) => new()
    {
        ExamScheduleId = selection.ExamScheduleId,
        DayType = selection.DayType,
        ExamDate = selection.ExamDate,
        ExamTime = selection.ExamTime,
        SelectedAt = selection.SelectedAt,
        ExamType = selection.ExamType,
    };

    public static AdminExamScheduleResponse ToAdminResponse(this AdminExamSchedule schedule) => new()
    {
        ExamScheduleId = schedule.ExamScheduleId,
        DayType = schedule.DayType,
        ExamDate = schedule.ExamDate,
        ExamTime = schedule.ExamTime,
        IsOffered = schedule.IsOffered,
        Capacity = schedule.Capacity,
        AssignedApplicants = schedule.AssignedApplicants.Select(a => a.ToResponse()).ToList(),
    };

    public static AssignedApplicantResponse ToResponse(this AssignedApplicant applicant) => new()
    {
        UserId = applicant.UserId,
        ExamStatus = applicant.ExamStatus,
        ExamType = applicant.ExamType,
        ApplicantName = applicant.ApplicantName,
        ApplicantEmail = applicant.ApplicantEmail,
        SelectedAt = applicant.SelectedAt,
    };
}
