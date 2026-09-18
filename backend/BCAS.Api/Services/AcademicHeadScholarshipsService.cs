using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AcademicHeadScholarshipsService : IAcademicHeadScholarshipsService
{
    private const string ManagementArea = "scholarship slots";

    private readonly IAdminScholarshipsService _scholarshipsService;
    private readonly ISystemSettingsRepository _systemSettingsRepository;

    public AcademicHeadScholarshipsService(
        IAdminScholarshipsService scholarshipsService,
        ISystemSettingsRepository systemSettingsRepository)
    {
        _scholarshipsService = scholarshipsService;
        _systemSettingsRepository = systemSettingsRepository;
    }

    public async Task<IReadOnlyList<AdminScholarshipResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        await EnsureAuthorizedAsync(cancellationToken);
        return await _scholarshipsService.GetAllAsync(cancellationToken);
    }

    public async Task<AdminScholarshipResponse> CreateAsync(CreateScholarshipRequest request, CancellationToken cancellationToken = default)
    {
        await EnsureAuthorizedAsync(cancellationToken);
        return await _scholarshipsService.CreateAsync(request, cancellationToken);
    }

    public async Task<AdminScholarshipResponse> UpdateAsync(
        int scholarshipId, UpdateScholarshipRequest request, CancellationToken cancellationToken = default)
    {
        await EnsureAuthorizedAsync(cancellationToken);
        return await _scholarshipsService.UpdateAsync(scholarshipId, request, cancellationToken);
    }

    public async Task<AdminScholarshipResponse> SetActiveStatusAsync(int scholarshipId, bool isActive, CancellationToken cancellationToken = default)
    {
        await EnsureAuthorizedAsync(cancellationToken);
        return await _scholarshipsService.SetActiveStatusAsync(scholarshipId, isActive, cancellationToken);
    }

    private async Task EnsureAuthorizedAsync(CancellationToken cancellationToken)
    {
        var isAuthorized = await _systemSettingsRepository.IsEnabledAsync(
            SystemSettingKeys.AcademicHeadScholarshipSlotManagementAuthorized, cancellationToken);

        if (!isAuthorized)
        {
            throw new AcademicHeadNotAuthorizedException(ManagementArea);
        }
    }
}
