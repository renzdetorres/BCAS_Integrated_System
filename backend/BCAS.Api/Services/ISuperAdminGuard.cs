namespace BCAS.Api.Services;

public interface ISuperAdminGuard
{
    /// <summary>Whether the account is an active Admin with the Super Admin flag, read fresh from the database.</summary>
    Task<bool> IsSuperAdminAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>Throws SuperAdminRequiredException unless the account is a Super Admin.</summary>
    Task EnsureAsync(Guid userId, string action, CancellationToken cancellationToken = default);
}
