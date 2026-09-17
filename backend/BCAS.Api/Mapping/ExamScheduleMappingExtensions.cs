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
    };

    public static ExamScheduleSelectionResponse ToResponse(this ExamScheduleSelection selection) => new()
    {
        ExamScheduleId = selection.ExamScheduleId,
        DayType = selection.DayType,
        ExamDate = selection.ExamDate,
        ExamTime = selection.ExamTime,
        SelectedAt = selection.SelectedAt,
    };
}
