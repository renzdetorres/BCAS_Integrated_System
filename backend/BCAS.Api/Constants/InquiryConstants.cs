namespace BCAS.Api.Constants;

public static class InquiryConstants
{
    public const int MaxSubjectLength = 200;
    public const int MaxBodyLength = 2000;

    public static readonly IReadOnlySet<string> AllowedStatuses = new HashSet<string>(StringComparer.Ordinal) { "Open", "Closed" };
}
