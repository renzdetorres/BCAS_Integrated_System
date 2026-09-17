namespace BCAS.Api.Exceptions;

public class InvalidRoleException : Exception
{
    public InvalidRoleException(string role)
        : base($"'{role}' is not a valid staff role. Allowed roles: Evaluator, SupportStaff, AcademicHead, Admin.")
    {
    }

    public InvalidRoleException(string role, IEnumerable<string> allowedRoles)
        : base($"'{role}' is not a valid role. Allowed roles: {string.Join(", ", allowedRoles)}.")
    {
    }
}
