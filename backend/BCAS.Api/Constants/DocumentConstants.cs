namespace BCAS.Api.Constants;

public static class DocumentConstants
{
    public const string ReportCard = "ReportCard";
    public const string IdPicture = "IdPicture";
    public const string Psa = "PSA";
    public const string Tor = "TOR";
    public const string Sf10 = "SF10";
    public const string ScholarshipForm = "ScholarshipForm";

    public const long MaxFileSizeBytes = 10 * 1024 * 1024;

    /// <summary>
    /// A file is accepted only if its extension, declared content type and
    /// first bytes all agree on one of these types, so a renamed file of the
    /// wrong kind is rejected.
    /// </summary>
    private static readonly (string[] Extensions, string ContentType, byte[] Signature)[] AcceptedFileTypes =
    {
        (new[] { ".pdf" }, "application/pdf", new byte[] { 0x25, 0x50, 0x44, 0x46, 0x2D }), // "%PDF-"
        (new[] { ".jpg", ".jpeg" }, "image/jpeg", new byte[] { 0xFF, 0xD8, 0xFF }),
        (new[] { ".png" }, "image/png", new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
    };

    public static bool IsAcceptedFile(string fileName, string contentType, byte[] fileBytes) =>
        AcceptedFileTypes.Any(t =>
            t.Extensions.Any(e => fileName.EndsWith(e, StringComparison.OrdinalIgnoreCase))
            && string.Equals(contentType, t.ContentType, StringComparison.OrdinalIgnoreCase)
            && fileBytes.Length >= t.Signature.Length
            && fileBytes.AsSpan(0, t.Signature.Length).SequenceEqual(t.Signature));

    /// <summary>The content type to serve a stored file with inline, or null if it should only be downloaded.</summary>
    public static string? InlineContentType(string storedContentType) =>
        AcceptedFileTypes.FirstOrDefault(t => string.Equals(t.ContentType, storedContentType, StringComparison.OrdinalIgnoreCase)).ContentType;

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

    /// <summary>
    /// The scholarship application's documentary requirements (the signed
    /// application form, the certified report card and the 2x2 photo). The
    /// report card and photo are the same uploads the admission checklist
    /// uses, so one upload satisfies both.
    /// </summary>
    public static readonly IReadOnlyList<string> RequiredDocumentsForScholarship =
        new[] { ScholarshipForm, ReportCard, IdPicture };

    public static readonly IReadOnlySet<string> AllDocumentTypes = new HashSet<string>(StringComparer.Ordinal)
    {
        ReportCard, IdPicture, Psa, Tor, Sf10, ScholarshipForm,
    };
}
