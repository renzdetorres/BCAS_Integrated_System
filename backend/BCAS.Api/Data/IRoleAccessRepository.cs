namespace BCAS.Api.Data;

public interface IRoleAccessRepository
{
    /// <summary>Every blocked (role, feature key) pair.</summary>
    Task<IReadOnlyList<(string RoleName, string FeatureKey)>> GetBlockedAsync(CancellationToken cancellationToken = default);

    Task SetBlockedAsync(string roleName, string featureKey, bool blocked, Guid changedByUserId, CancellationToken cancellationToken = default);
}
