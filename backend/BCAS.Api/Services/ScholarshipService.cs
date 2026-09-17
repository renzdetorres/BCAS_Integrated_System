using BCAS.Api.Data;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class ScholarshipService : IScholarshipService
{
    private readonly IScholarshipRepository _scholarshipRepository;

    public ScholarshipService(IScholarshipRepository scholarshipRepository)
    {
        _scholarshipRepository = scholarshipRepository;
    }

    public async Task<IReadOnlyList<ScholarshipResponse>> GetAvailableAsync(CancellationToken cancellationToken = default)
    {
        var scholarships = await _scholarshipRepository.GetAvailableAsync(cancellationToken);
        return scholarships.Select(s => s.ToResponse()).ToList();
    }
}
