namespace BCAS.Api.Constants;

public static class AuthConstants
{
    public const string AuthCookieName = "bcas_auth";

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
