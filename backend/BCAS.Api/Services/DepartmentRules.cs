using BCAS.Api.Constants;
using BCAS.Api.Exceptions;

namespace BCAS.Api.Services;

/// <summary>
/// Which department (if any) a staff account carries, shared by staff
/// provisioning and Manage Accounts so both enforce the same rule.
/// </summary>
public static class DepartmentRules
{
    /// <summary>
    /// An Academic Head must be assigned exactly one department from
    /// DepartmentConstants - it's what scopes everything they can see.
    /// Every other role carries none, so a stale value can't linger on an
    /// account whose role was changed away from Academic Head.
    /// </summary>
    public static string? ForRole(string role, string? department)
    {
        if (!string.Equals(role, "AcademicHead", StringComparison.Ordinal))
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(department))
        {
            throw InvalidDepartmentException.RequiredForAcademicHead();
        }

        return DepartmentConstants.Normalize(department) ?? throw new InvalidDepartmentException(department);
    }
}
