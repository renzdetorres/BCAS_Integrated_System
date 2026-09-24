namespace BCAS.Api.Data;

public interface IPasswordResetTokenRepository
{
    /// <summary>Invalidates any outstanding tokens for the user, then stores the new one.</summary>
    Task InsertAsync(Guid userId, string tokenHash, DateTime expiresAtUtc, CancellationToken cancellationToken = default);

    /// <summary>The owning UserId if tokenHash matches an unused, unexpired token - otherwise null.</summary>
    Task<Guid?> GetValidUserIdAsync(string tokenHash, CancellationToken cancellationToken = default);

    Task MarkUsedAsync(string tokenHash, CancellationToken cancellationToken = default);
}
