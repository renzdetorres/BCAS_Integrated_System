namespace BCAS.Api.Data;

/// <summary>Reads which department an application belongs to, for scoping an Academic Head's access.</summary>
public interface IDepartmentScopeRepository
{
    /// <summary>
    /// The department of the applicant behind a scholarship application
    /// (their latest admission application's department, via
    /// vw_ApplicantDepartments). Found is false when no such application
    /// exists; Department is null when it exists but its applicant has no
    /// department yet.
    /// </summary>
    Task<(bool Found, string? Department)> GetScholarshipApplicationDepartmentAsync(
        Guid applicationId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sets the department on one admission application, and its course too
    /// when courseAppliedFor is given (filing a legacy application under a
    /// department with a fixed program list needs a valid program). Returns
    /// false if no admission application has that id.
    /// </summary>
    Task<bool> SetAdmissionApplicationDepartmentAsync(
        Guid applicationId, string department, string? courseAppliedFor = null, CancellationToken cancellationToken = default);
}
