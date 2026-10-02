namespace BCAS.Api.Services;

/// <summary>
/// Resolves the one department an Academic Head is assigned to, and checks
/// whether a given application falls inside it. Every Academic Head read or
/// write of applicant data goes through here, so the scope is enforced on
/// the server rather than by what the UI chooses to show.
/// </summary>
public interface IAcademicHeadScopeService
{
    /// <summary>
    /// The caller's assigned department, or AcademicHeadDepartmentNotAssignedException
    /// if an Admin-Registrar hasn't assigned one yet.
    /// </summary>
    Task<string> GetAssignedDepartmentAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Throws ScholarshipApplicationNotFoundException unless the application
    /// exists and its applicant is in the given department - the same
    /// response as a genuinely missing id, so another department's
    /// application ids can't be probed for.
    /// </summary>
    Task EnsureScholarshipApplicationInDepartmentAsync(
        Guid applicationId, string department, CancellationToken cancellationToken = default);
}
