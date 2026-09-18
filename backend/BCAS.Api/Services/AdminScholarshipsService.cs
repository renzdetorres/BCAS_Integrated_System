using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AdminScholarshipsService : IAdminScholarshipsService
{
    private readonly IScholarshipRepository _scholarshipRepository;

    public AdminScholarshipsService(IScholarshipRepository scholarshipRepository)
    {
        _scholarshipRepository = scholarshipRepository;
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
        int scholarshipId, UpdateScholarshipRequest request, CancellationToken cancellationToken = default)
    {
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

    public async Task<AdminScholarshipResponse> SetActiveStatusAsync(int scholarshipId, bool isActive, CancellationToken cancellationToken = default)
    {
        var updated = await _scholarshipRepository.SetActiveStatusAsync(scholarshipId, isActive, cancellationToken)
            ?? throw new ScholarshipNotFoundException(scholarshipId);

        return updated.ToAdminResponse();
    }
}
