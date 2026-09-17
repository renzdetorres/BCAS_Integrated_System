using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IAuthService
{
    Task<UserProfileResponse> RegisterApplicantAsync(RegisterRequest request, CancellationToken cancellationToken = default);

    Task<LoginResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
}
