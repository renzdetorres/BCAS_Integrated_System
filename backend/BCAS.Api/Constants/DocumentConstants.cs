namespace BCAS.Api.Constants;

public static class DocumentConstants
{
    public const string ReportCard = "ReportCard";
    public const string IdPicture = "IdPicture";
    public const string Psa = "PSA";
    public const string Tor = "TOR";
    public const string Sf10 = "SF10";

    public const long MaxFileSizeBytes = 10 * 1024 * 1024;

    /// <summary>
    /// The requirements checklist by admission ApplicationType. SF10 is
    /// submitted later, after the entrance exam, but it's still shown on
    /// the checklist from the start for both application types.
    /// </summary>
    public static readonly IReadOnlyDictionary<string, IReadOnlyList<string>> RequiredDocumentsByApplicationType =
        new Dictionary<string, IReadOnlyList<string>>(StringComparer.Ordinal)
        {
            ["NewStudent"] = new[] { ReportCard, IdPicture, Psa, Sf10 },
            ["Transferee"] = new[] { ReportCard, IdPicture, Psa, Tor, Sf10 },
        };

    public static readonly IReadOnlySet<string> AllDocumentTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        ReportCard, IdPicture, Psa, Tor, Sf10,
    };
}
