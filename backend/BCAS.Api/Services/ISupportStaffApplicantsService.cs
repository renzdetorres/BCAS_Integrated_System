using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface ISupportStaffApplicantsService
{
    /// <summary>
    /// Every Applicant-role account plus their latest admission application
    /// info, most recently created first, optionally narrowed by search
    /// (matches the applicant's first name, last name, or email) - BISAASS-53.
    /// </summary>
    Task<IReadOnlyList<SupportStaffApplicantListItemResponse>> SearchApplicantsAsync(
        string? search, CancellationToken cancellationToken = default);
}
