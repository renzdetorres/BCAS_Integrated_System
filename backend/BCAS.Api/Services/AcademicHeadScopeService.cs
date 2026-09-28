using BCAS.Api.Data;
using BCAS.Api.Exceptions;

namespace BCAS.Api.Services;

public class AcademicHeadScopeService : IAcademicHeadScopeService
{
    private readonly IUserRepository _userRepository;
    private readonly IDepartmentScopeRepository _departmentScopeRepository;

    public AcademicHeadScopeService(IUserRepository userRepository, IDepartmentScopeRepository departmentScopeRepository)
    {
        _userRepository = userRepository;
        _departmentScopeRepository = departmentScopeRepository;
    }

    public async Task<string> GetAssignedDepartmentAsync(Guid academicHeadUserId, CancellationToken cancellationToken = default)
    {
        var user = await _userRepository.GetByIdAsync(academicHeadUserId, cancellationToken)
            ?? throw new UserNotFoundException(academicHeadUserId);

        if (string.IsNullOrWhiteSpace(user.Department))
        {
            throw new AcademicHeadDepartmentNotAssignedException();
        }

        return user.Department;
    }

    public async Task EnsureScholarshipApplicationInDepartmentAsync(
        Guid applicationId, string department, CancellationToken cancellationToken = default)
    {
        var (found, applicationDepartment) = await _departmentScopeRepository
            .GetScholarshipApplicationDepartmentAsync(applicationId, cancellationToken);

        if (!found || !string.Equals(applicationDepartment, department, StringComparison.OrdinalIgnoreCase))
        {
            throw new ScholarshipApplicationNotFoundException(applicationId);
        }
    }
}
