namespace BCAS.Api.Services;

public interface IRoleAccessService
{
    /// <summary>Feature keys blocked for this user (empty for a Super Admin).</summary>
    Task<IReadOnlySet<string>> GetBlockedForUserAsync(Guid userId, string role, CancellationToken cancellationToken = default);

    Task<IReadOnlySet<string>> GetBlockedForRoleAsync(string role, CancellationToken cancellationToken = default);

    /// <summary>Super Admin only. Returns false when the role/feature isn't in the catalog.</summary>
    Task<bool> SetBlockedAsync(Guid actorUserId, string role, string featureKey, bool blocked, CancellationToken cancellationToken = default);
}
