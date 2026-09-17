using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IUserRepository
{
    Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken = default);

    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);

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
}
