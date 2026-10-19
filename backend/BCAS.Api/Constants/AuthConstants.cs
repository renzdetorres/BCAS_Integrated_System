namespace BCAS.Api.Constants;

public static class AuthConstants
{
    public const string AuthCookieName = "bcas_auth";

    /// <summary>Where the per-request account check keeps its short-lived copy of an account; evicted on a password change.</summary>
    public static string SessionCacheKey(Guid userId) => $"session:{userId}";

    /// <summary>Marks a login (by its token id) as signed out, until the moment the token would have expired anyway.</summary>
    public static string RevokedTokenKey(string tokenId) => $"revoked:{tokenId}";

    /// <summary>
    /// Roles an Admin may provision via staff provisioning. Applicant is
    /// deliberately excluded - it's only ever created via self-service
    /// registration.
    /// </summary>
    public static readonly IReadOnlySet<string> AllowedStaffRoles = new HashSet<string>(StringComparer.Ordinal)
    {
        "Evaluator",
        "SupportStaff",
        "AcademicHead",
        "Admin",
    };

    /// <summary>
    /// Every role in the system. Used when an Admin edits an account that
    /// already exists (any role, Applicant included), as opposed to staff
    /// provisioning which only ever creates new staff accounts.
    /// </summary>
    public static readonly IReadOnlySet<string> AllRoles = new HashSet<string>(AllowedStaffRoles, StringComparer.Ordinal)
    {
        "Applicant",
    };
}
