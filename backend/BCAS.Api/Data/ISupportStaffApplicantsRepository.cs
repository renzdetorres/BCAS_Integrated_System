using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface ISupportStaffApplicantsRepository
{
    /// <summary>
    /// Every Applicant-role account plus their latest admission
    /// application info, most recently created first, optionally narrowed
    /// by search (matches the applicant's first name, last name, or email).
    /// </summary>
    Task<IReadOnlyList<SupportStaffApplicantListItem>> SearchAsync(
        string? search, CancellationToken cancellationToken = default);
}
