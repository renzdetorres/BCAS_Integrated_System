namespace BCAS.Api.Exceptions;

public class AcademicHeadDepartmentNotAssignedException : Exception
{
    public AcademicHeadDepartmentNotAssignedException()
        : base("Your account has no department assigned yet. Ask an Admin-Registrar to assign one in Manage Accounts before viewing department-scoped reports.")
    {
    }
}
