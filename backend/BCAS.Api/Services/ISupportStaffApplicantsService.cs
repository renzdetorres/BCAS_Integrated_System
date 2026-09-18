using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface ISupportStaffApplicantsService
{
    /// <summary>Read-only stub (BISAASS-51) - every Applicant-role account, most recently created first. Search/detail land with BISAASS-53.</summary>
    Task<IReadOnlyList<SupportStaffApplicantListItemResponse>> GetApplicantsAsync(CancellationToken cancellationToken = default);
}
