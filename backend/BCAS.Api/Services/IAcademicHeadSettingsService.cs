using BCAS.Api.Models;

namespace BCAS.Api.Services;

/// <summary>Academic Head-facing self-service settings (BISAASS-50): own profile details and password.</summary>
public interface IAcademicHeadSettingsService
{
    /// <summary>Throws UserNotFoundException if the id doesn't match an account (shouldn't happen for a valid session).</summary>
    Task<UserProfileResponse> GetMyProfileAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Updates the caller's own name and email. Throws
    /// UserNotFoundException or DuplicateEmailException.
    /// </summary>
    Task<UserProfileResponse> UpdateMyProfileAsync(
        Guid userId,
        UpdateMyProfileRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>Delegates to IAuthService.ChangePasswordAsync - see there for thrown exceptions.</summary>
    Task ChangeMyPasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken cancellationToken = default);
}
