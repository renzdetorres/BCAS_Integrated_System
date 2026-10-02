using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AdminScholarshipsService : IAdminScholarshipsService
{
    private readonly IScholarshipRepository _scholarshipRepository;
    private readonly ISemesterService _semesterService;
    private readonly ISuperAdminGuard _superAdminGuard;

    public AdminScholarshipsService(
        IScholarshipRepository scholarshipRepository, ISemesterService semesterService, ISuperAdminGuard superAdminGuard)
    {
        _scholarshipRepository = scholarshipRepository;
        _semesterService = semesterService;
        _superAdminGuard = superAdminGuard;
    }

    public async Task<IReadOnlyList<AdminScholarshipResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var scholarships = await _scholarshipRepository.GetAllAsync(cancellationToken);
        return scholarships.Select(s => s.ToAdminResponse()).ToList();
    }

    public async Task<AdminScholarshipResponse> CreateAsync(CreateScholarshipRequest request, CancellationToken cancellationToken = default)
    {
        var created = await _scholarshipRepository.CreateAsync(
            request.Name.Trim(), request.ScholarshipType.Trim(), request.TotalSlots!.Value, request.MinimumGradeAverage, cancellationToken);

        return created.ToAdminResponse();
    }

    public async Task<AdminScholarshipResponse> UpdateAsync(
        int scholarshipId, UpdateScholarshipRequest request, Guid? forcedByUserId = null, CancellationToken cancellationToken = default)
    {
        await EnsureNotLockedAsync(forcedByUserId, cancellationToken);

        var existing = await _scholarshipRepository.GetByIdAsync(scholarshipId, cancellationToken)
            ?? throw new ScholarshipNotFoundException(scholarshipId);

        var occupiedSlots = existing.TotalSlots - existing.RemainingSlots;
        if (request.TotalSlots!.Value < occupiedSlots)
        {
            throw new InvalidTotalSlotsException(occupiedSlots);
        }

        var updated = await _scholarshipRepository.UpdateAsync(
            scholarshipId, request.Name.Trim(), request.ScholarshipType.Trim(), request.TotalSlots!.Value, request.MinimumGradeAverage, cancellationToken)
            ?? throw new ScholarshipNotFoundException(scholarshipId);

        return updated.ToAdminResponse();
    }

    public async Task<AdminScholarshipResponse> SetActiveStatusAsync(
        int scholarshipId, bool isActive, Guid? forcedByUserId = null, CancellationToken cancellationToken = default)
    {
        if (!isActive)
        {
            await EnsureNotLockedAsync(forcedByUserId, cancellationToken);
        }

        var updated = await _scholarshipRepository.SetActiveStatusAsync(scholarshipId, isActive, cancellationToken)
            ?? throw new ScholarshipNotFoundException(scholarshipId);

        return updated.ToAdminResponse();
    }

    /// <summary>
    /// Changing a scholarship's terms mid-semester would change them under
    /// applicants already in its pipeline, so edits and deactivation wait
    /// for the semester to end - unless a Super Admin forces them.
    /// </summary>
    private async Task EnsureNotLockedAsync(Guid? forcedByUserId, CancellationToken cancellationToken)
    {
        var ongoing = await _semesterService.GetOngoingAsync(cancellationToken);
        if (ongoing is null) return;

        if (forcedByUserId is null)
        {
            throw new ScholarshipLockedException(ongoing.Name, ongoing.EndDate);
        }

        await _superAdminGuard.EnsureAsync(forcedByUserId.Value, "force-edit a scholarship during an ongoing semester", cancellationToken);
    }
}
