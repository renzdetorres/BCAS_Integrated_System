using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AdminReservationsService : IAdminReservationsService
{
    private readonly IAdminReservationRepository _reservationRepository;
    private readonly ISystemSettingsRepository _systemSettingsRepository;

    public AdminReservationsService(
        IAdminReservationRepository reservationRepository,
        ISystemSettingsRepository systemSettingsRepository)
    {
        _reservationRepository = reservationRepository;
        _systemSettingsRepository = systemSettingsRepository;
    }

    public async Task<IReadOnlyList<AdminReservationResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var candidates = await _reservationRepository.GetAllAsync(cancellationToken);
        return candidates.Select(c => c.ToResponse()).ToList();
    }

    public async Task<AdminReservationResponse> RecordAsync(
        Guid applicationId,
        RecordReservationRequest request,
        Guid recordedByUserId,
        CancellationToken cancellationToken = default)
    {
        var candidate = await _reservationRepository.GetByApplicationIdAsync(applicationId, cancellationToken)
            ?? throw new ApplicationNotFoundException(applicationId);

        if (candidate.Status != "Approved")
        {
            throw new ReservationRequiresApprovedApplicationException();
        }

        if (await _systemSettingsRepository.IsEnabledAsync(SystemSettingKeys.ReservationOnlinePaymentRequired, cancellationToken))
        {
            throw new OnlinePaymentRequiredException();
        }

        var updated = await _reservationRepository.UpsertReservationAsync(
            applicationId,
            request.IsReserved!.Value,
            ReservationConstants.StandardReservationFee,
            request.Remarks,
            recordedByUserId,
            cancellationToken);

        return updated.ToResponse();
    }
}
