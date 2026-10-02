using BCAS.Api.Constants;

namespace BCAS.Api.Exceptions;

public class InvalidCourseProgramException : Exception
{
    public InvalidCourseProgramException(string department, string? course)
        : base(BuildMessage(department, course))
    {
    }

    private static string BuildMessage(string department, string? course)
    {
        var codes = DepartmentConstants.FixedPrograms.TryGetValue(department, out var programs)
            ? string.Join(", ", programs.Select(p => p.Code))
            : string.Empty;

        if (codes.Length == 0)
        {
            return $"Enter the course, strand or grade level for the {department} department.";
        }

        return string.IsNullOrWhiteSpace(course)
            ? $"Choose a program for the {department} department. Allowed values: {codes}."
            : $"'{course}' is not a program offered by the {department} department. Allowed values: {codes}.";
    }
}
