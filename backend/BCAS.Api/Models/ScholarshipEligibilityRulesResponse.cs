namespace BCAS.Api.Models;

public class ScholarshipEligibilityRulesResponse
{
    public bool IsTopOne { get; set; }
    public bool? EntranceExamRequired { get; set; }
    public bool EntranceExamScheduled { get; set; }
    public int TotalSlots { get; set; }
    public int RemainingSlots { get; set; }
    public bool IsReapplication { get; set; }
    public IReadOnlyList<ScholarshipReapplicationAttemptResponse> PreviousAttempts { get; set; } =
        Array.Empty<ScholarshipReapplicationAttemptResponse>();
}
