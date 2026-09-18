using BCAS.Api.Models;

namespace BCAS.Api.Services;

/// <summary>Admin-Registrar reservation management (BISAASS-33).</summary>
public interface IAdminReservationsService
{
    /// <summary>Every Approved admission application, with its reservation status, most recently submitted first.</summary>
    Task<IReadOnlyList<AdminReservationResponse>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Records (or replaces) the reservation for an admission application.
    /// Throws ApplicationNotFoundException if no admission application
    /// with that id exists, ReservationRequiresApprovedApplicationException
    /// if it isn't Approved, or OnlinePaymentRequiredException if the
    /// ReservationOnlinePaymentRequired system setting is on.
    /// </summary>
    Task<AdminReservationResponse> RecordAsync(
        Guid applicationId,
        RecordReservationRequest request,
        Guid recordedByUserId,
        CancellationToken cancellationToken = default);
}
