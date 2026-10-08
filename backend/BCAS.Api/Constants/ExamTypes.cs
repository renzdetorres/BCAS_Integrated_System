namespace BCAS.Api.Constants;

public static class ExamTypes
{
    public const string Entrance = "Entrance Exam";
    public const string Scholarship = "Scholarship Exam";

    public static readonly string[] All = { Entrance, Scholarship };

    /// <summary>Case-insensitive match to a known type (null or blank means the default); null if unknown.</summary>
    public static string? Normalize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return Entrance;
        return All.FirstOrDefault(t => string.Equals(t, value.Trim(), StringComparison.OrdinalIgnoreCase));
    }
}
