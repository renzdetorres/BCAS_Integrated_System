namespace BCAS.Api.Constants;

public static class ArchiveConstants
{
    /// <summary>
    /// "Completed/inactive" per BISAASS-35's acceptance criteria - the
    /// terminal statuses shared by both AdmissionApplications and
    /// ScholarshipApplications, regardless of category. Anything still
    /// mid-workflow cannot be archived.
    /// </summary>
    public static readonly IReadOnlySet<string> ArchivableStatuses = new HashSet<string>(StringComparer.Ordinal)
    {
        "Approved",
        "Rejected",
    };
}
