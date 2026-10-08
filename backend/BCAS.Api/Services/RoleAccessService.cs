using BCAS.Api.Constants;
using BCAS.Api.Data;
using Microsoft.Extensions.Caching.Memory;

namespace BCAS.Api.Services;

public class RoleAccessService : IRoleAccessService
{
    private const string CacheKey = "role-blocked-features";
    private static readonly TimeSpan CacheLifetime = TimeSpan.FromSeconds(30);

    private readonly IRoleAccessRepository _repository;
    private readonly ISuperAdminGuard _superAdminGuard;
    private readonly IMemoryCache _cache;

    public RoleAccessService(IRoleAccessRepository repository, ISuperAdminGuard superAdminGuard, IMemoryCache cache)
    {
        _repository = repository;
        _superAdminGuard = superAdminGuard;
        _cache = cache;
    }

    public async Task<IReadOnlySet<string>> GetBlockedForRoleAsync(string role, CancellationToken cancellationToken = default)
    {
        var all = await GetAllBlockedAsync(cancellationToken);
        return all.TryGetValue(role, out var keys) ? keys : new HashSet<string>();
    }

    public async Task<IReadOnlySet<string>> GetBlockedForUserAsync(Guid userId, string role, CancellationToken cancellationToken = default)
    {
        var blocked = await GetBlockedForRoleAsync(role, cancellationToken);
        if (blocked.Count == 0) return blocked;

        // A Super Admin can never be locked out of what they manage.
        return role == "Admin" && await _superAdminGuard.IsSuperAdminAsync(userId, cancellationToken)
            ? new HashSet<string>()
            : blocked;
    }

    public async Task<bool> SetBlockedAsync(Guid actorUserId, string role, string featureKey, bool blocked, CancellationToken cancellationToken = default)
    {
        await _superAdminGuard.EnsureAsync(actorUserId, "change what a role can access", cancellationToken);

        if (!FeatureCatalog.IsKnown(role, featureKey)) return false;

        await _repository.SetBlockedAsync(role, featureKey, blocked, actorUserId, cancellationToken);
        _cache.Remove(CacheKey);
        return true;
    }

    private async Task<Dictionary<string, HashSet<string>>> GetAllBlockedAsync(CancellationToken cancellationToken)
    {
        if (_cache.TryGetValue(CacheKey, out Dictionary<string, HashSet<string>>? cached) && cached is not null)
        {
            return cached;
        }

        var rows = await _repository.GetBlockedAsync(cancellationToken);
        var grouped = rows
            .GroupBy(row => row.RoleName)
            .ToDictionary(group => group.Key, group => group.Select(row => row.FeatureKey).ToHashSet());

        _cache.Set(CacheKey, grouped, CacheLifetime);
        return grouped;
    }
}
