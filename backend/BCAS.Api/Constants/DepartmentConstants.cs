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
    /// Mirrored by DEPARTMENT_PROGRAMS in the frontend's config/departments.js,
    /// and by CK_AdmissionApplications_CollegeProgram in database/schema.sql -
    /// change all three together.
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

    /// <summary>
    /// Course names that were typed as free text before the program list
    /// existed, and the program each one counts as in reports. Deliberately
    /// short and exact: a course with no clear match (Nursing, Criminology,
    /// Computer Science, ...) is not guessed at - it is reported as a course
    /// outside the four programs.
    /// </summary>
    private static readonly IReadOnlyDictionary<string, string> LegacyCourseNames =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["BS Business Administration"] = "BSBA",
            ["Business Administration"] = "BSBA",
            ["BS Education"] = "BSED",
            ["BS Elementary Education"] = "BSED",
            ["BS Secondary Education"] = "BSED",
            ["Education"] = "BSED",
            ["BS Accountancy"] = "BSA",
            ["Accountancy"] = "BSA",
            ["BS Information Technology"] = "BSIT",
            ["Information Technology"] = "BSIT",
        };

    /// <summary>
    /// The College program a stored course counts as, for reporting: its code
    /// or full name, or one of the legacy free-text names above. Null when it
    /// isn't one of the four. Lenient on purpose (unlike NormalizeProgram,
    /// which decides what may be submitted today).
    /// </summary>
    public static string? ProgramCodeFor(string? course)
    {
        var trimmed = course?.Trim();
        if (string.IsNullOrEmpty(trimmed))
        {
            return null;
        }

        return NormalizeProgram("College", trimmed)
            ?? (LegacyCourseNames.TryGetValue(trimmed, out var code) ? code : null);
    }

    /// <summary>True for a course that reads like a college degree (BS ..., AB ..., Bachelor ...), as opposed to a strand or grade level.</summary>
    public static bool LooksLikeCollegeCourse(string? course) =>
        !string.IsNullOrWhiteSpace(course) &&
        System.Text.RegularExpressions.Regex.IsMatch(course.Trim(), @"^(BS|AB|BA|Bachelor)\b", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
}
