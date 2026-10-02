using BCAS.Api.Data;
using BCAS.Api.Exceptions;

namespace BCAS.Api.Services;

public class SuperAdminGuard : ISuperAdminGuard
{
    private readonly IUserRepository _userRepository;

    public SuperAdminGuard(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    // Checked against the database on every call rather than a login-time
    // claim, so revoking Super Admin takes effect immediately.
    public async Task<bool> IsSuperAdminAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await _userRepository.EnsureSuperAdminExistsAsync(cancellationToken);
        var user = await _userRepository.GetByIdAsync(userId, cancellationToken);
        return user is { IsActive: true, IsSuperAdmin: true, RoleName: "Admin" };
    }

    public async Task EnsureAsync(Guid userId, string action, CancellationToken cancellationToken = default)
    {
        if (!await IsSuperAdminAsync(userId, cancellationToken))
        {
            throw new SuperAdminRequiredException(action);
        }
    }
}
