namespace BCAS.Api.Constants;

public static class DepartmentConstants
{
    /// <summary>
    /// The departments an applicant applies into (AdmissionApplications.Department)
    /// and an Academic Head is assigned to (Users.Department). Both sides pick
    /// from this one list so an Academic Head's scope is an exact match, never
    /// a guess from free-typed course names. Mirrored by DEPARTMENT_OPTIONS in
    /// the frontend's adminApi.js.
    /// </summary>
    public static readonly IReadOnlyList<string> AllowedDepartments = new[]
    {
        "College",
        "Senior High School",
        "High School",
        "Elementary",
    };

    /// <summary>Returns the canonical spelling of a department, or null if it isn't one of AllowedDepartments.</summary>
    public static string? Normalize(string? department)
    {
        if (string.IsNullOrWhiteSpace(department))
        {
            return null;
        }

        var trimmed = department.Trim();
        return AllowedDepartments.FirstOrDefault(d => string.Equals(d, trimmed, StringComparison.OrdinalIgnoreCase));
    }
}
