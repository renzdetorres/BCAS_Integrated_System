using BCAS.Api.Models;

namespace BCAS.Api.Data;

/// <summary>Admin-Registrar reservation management (BISAASS-33).</summary>
public interface IAdminReservationRepository
{
    /// <summary>Every Approved admission application, with its reservation status if any has been recorded, most recently submitted first.</summary>
    Task<IReadOnlyList<AdminReservationCandidate>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>A single admission application (any status) with its reservation status, or null if no application with that id exists.</summary>
    Task<AdminReservationCandidate?> GetByApplicationIdAsync(Guid applicationId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Records (or replaces) the reservation for an admission application.
    /// The caller is responsible for confirming the application is
    /// Approved and that online payment isn't required before calling this
    /// (see AdminReservationsService.RecordAsync).
    /// </summary>
    Task<AdminReservationCandidate> UpsertReservationAsync(
        Guid applicationId,
        bool isReserved,
        decimal reservationFee,
        string? remarks,
        Guid recordedByUserId,
        CancellationToken cancellationToken = default);
}
