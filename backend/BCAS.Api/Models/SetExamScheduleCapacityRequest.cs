using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class SetExamScheduleCapacityRequest
{
    /// <summary>How many applicants the slot holds. Null removes the limit.</summary>
    [Range(1, 5000)]
    public int? Capacity { get; set; }
}
