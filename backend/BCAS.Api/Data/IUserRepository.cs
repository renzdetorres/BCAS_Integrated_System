using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IUserRepository
{
    Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken = default);

    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);

    Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<User> CreateApplicantAsync(
        string firstName,
        string lastName,
        string email,
        string passwordHash,
        CancellationToken cancellationToken = default);

    Task<User> CreateStaffAsync(
        string firstName,
        string lastName,
        string email,
        string passwordHash,
        string roleName,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<User>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>Returns the updated account, or null if no account has that id.</summary>
    Task<User?> SetActiveStatusAsync(Guid userId, bool isActive, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates profile fields and role for an existing account. Returns the
    /// updated account, or null if no account has that id.
    /// </summary>
    Task<User?> UpdateAsync(
        Guid userId,
        string firstName,
        string lastName,
        string email,
        string roleName,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Self-service update of name and email only - unlike UpdateAsync,
    /// never touches RoleId, so a user can never grant themselves a
    /// different role. Returns the updated account, or null if no account
    /// has that id.
    /// </summary>
    Task<User?> UpdateProfileAsync(
        Guid userId,
        string firstName,
        string lastName,
        string email,
        CancellationToken cancellationToken = default);

    Task UpdatePasswordHashAsync(Guid userId, string passwordHash, CancellationToken cancellationToken = default);
}
