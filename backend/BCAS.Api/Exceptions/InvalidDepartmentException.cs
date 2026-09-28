using BCAS.Api.Constants;

namespace BCAS.Api.Exceptions;

public class InvalidDepartmentException : Exception
{
    public InvalidDepartmentException(string? department)
        : base($"'{department}' is not a valid department. Allowed values: {string.Join(", ", DepartmentConstants.AllowedDepartments)}.")
    {
    }

    private InvalidDepartmentException(string message, bool _)
        : base(message)
    {
    }

    /// <summary>An Academic Head account without a department would see nothing at all, so one is required.</summary>
    public static InvalidDepartmentException RequiredForAcademicHead() =>
        new($"An Academic Head must be assigned a department. Allowed values: {string.Join(", ", DepartmentConstants.AllowedDepartments)}.", true);

    /// <summary>A scholarship application's department is derived from its applicant's admission application, never set on its own.</summary>
    public static InvalidDepartmentException NotSettableOnScholarship() =>
        new("A scholarship application follows its applicant's admission application department. Set the department on that admission application instead.", true);

    public static InvalidDepartmentException RequiredForApplication() =>
        new($"Choose the department you are applying to. Allowed values: {string.Join(", ", DepartmentConstants.AllowedDepartments)}.", true);
}
