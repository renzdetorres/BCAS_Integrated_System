namespace BCAS.Api.Constants;

public static class DepartmentConstants
{
    /// <summary>
    /// The departments an applicant applies into (AdmissionApplications.Department)
    /// and an Academic Head is assigned to (Users.Department). Both sides pick
    /// from this one list so an Academic Head's scope is an exact match, never
    /// a guess from free-typed course names. Mirrored by DEPARTMENT_OPTIONS in
    /// the frontend's config/departments.js.
    /// </summary>
    public static readonly IReadOnlyList<string> AllowedDepartments = new[]
    {
        "College",
        "Senior High School",
        "High School",
        "Elementary",
    };

    public sealed record Program(string Code, string Name);

    /// <summary>
    /// Departments that offer a fixed set of programs. An admission
    /// application to one of these must name one of its programs (stored by
    /// code, e.g. "BSIT"). A department not listed here (Senior High School,
    /// High School, Elementary) takes the strand or grade level as typed.
    /// Mirrored by DEPARTMENT_PROGRAMS in the frontend's config/departments.js.
    /// </summary>
    public static readonly IReadOnlyDictionary<string, IReadOnlyList<Program>> FixedPrograms =
        new Dictionary<string, IReadOnlyList<Program>>(StringComparer.Ordinal)
        {
            ["College"] = new[]
            {
                new Program("BSBA", "Bachelor of Science in Business Administration"),
                new Program("BSED", "Bachelor of Science in Education"),
                new Program("BSA", "Bachelor of Science in Accountancy"),
                new Program("BSIT", "Bachelor of Science in Information Technology"),
            },
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

    /// <summary>
    /// The course to store for an application to the given (already
    /// normalized) department. For a department with a fixed program list,
    /// accepts a program's code or full name in any letter case and returns
    /// the code, or null if it isn't one of that department's programs. For
    /// any other department, returns the trimmed text as given (null if empty).
    /// </summary>
    public static string? NormalizeProgram(string department, string? course)
    {
        var trimmed = course?.Trim() ?? string.Empty;

        if (!FixedPrograms.TryGetValue(department, out var programs))
        {
            return trimmed.Length == 0 ? null : trimmed;
        }

        return programs.FirstOrDefault(p =>
            string.Equals(p.Code, trimmed, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(p.Name, trimmed, StringComparison.OrdinalIgnoreCase))?.Code;
    }
}
