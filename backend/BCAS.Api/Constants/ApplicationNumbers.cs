namespace BCAS.Api.Constants;

/// <summary>The human-readable number shown for an admission application: BCAS-2026-00042.</summary>
public static class ApplicationNumbers
{
    public static string Format(int sequence, DateTime submittedAt) => $"BCAS-{submittedAt.Year}-{sequence:D5}";
}
