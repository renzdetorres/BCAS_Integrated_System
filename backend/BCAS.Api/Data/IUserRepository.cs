using BCAS.Api.Models;

namespace BCAS.Api.Data;

public enum AccountDeleteOutcome
{
    Deleted,
    NotFound,
    HasRecordedActivity,
}

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
        string? department,
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
        string? department,
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

    /// <summary>Grants or revokes Super Admin; returns the updated account, or null if it doesn't exist.</summary>
    Task<User?> SetSuperAdminAsync(Guid userId, bool isSuperAdmin, CancellationToken cancellationToken = default);

    /// <summary>Active Admin accounts that are Super Admins.</summary>
    Task<int> CountActiveSuperAdminsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Permanently deletes an account and everything it owns (profile,
    /// applications and their history, documents, exam records, inquiries) in
    /// one transaction. References to it as an actor on someone else's
    /// records (archived-by, reviewed-by, audit entries) are cleared, not
    /// deleted. Returns HasRecordedActivity when it recorded decisions,
    /// screenings, reservations or inquiry replies on other people's
    /// applications - that history must not disappear, so such an account can
    /// only be deactivated.
    /// </summary>
    Task<AccountDeleteOutcome> DeleteAccountAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>If no active Admin is a Super Admin, makes the earliest-created active Admin one.</summary>
    Task EnsureSuperAdminExistsAsync(CancellationToken cancellationToken = default);
}
