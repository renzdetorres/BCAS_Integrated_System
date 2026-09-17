using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IApplicationTrackingService
{
    /// <summary>
    /// The signed-in applicant's admission and scholarship applications,
    /// each paired with its current workflow step, plus their document
    /// checklist (verification status and flagged/rejected reasons).
    /// </summary>
    Task<ApplicationTrackingResponse> GetMyTrackingAsync(Guid userId, CancellationToken cancellationToken = default);
}
