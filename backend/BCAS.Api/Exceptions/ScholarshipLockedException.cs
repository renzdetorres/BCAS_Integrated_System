namespace BCAS.Api.Exceptions;

/// <summary>Thrown when a scholarship edit or deactivation is attempted during an ongoing semester without a Super Admin override.</summary>
public class ScholarshipLockedException : Exception
{
    public ScholarshipLockedException(string semesterName, DateOnly endDate)
        : base($"Scholarships can't be edited or deactivated during {semesterName} (ends {endDate:MMMM d, yyyy}). An Admin with full controls can force the change.")
    {
    }
}
