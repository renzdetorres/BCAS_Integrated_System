using BCAS.Api.Data;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class EvaluatorScholarshipSlotsService : IEvaluatorScholarshipSlotsService
{
    private readonly IScholarshipRepository _scholarshipRepository;

    public EvaluatorScholarshipSlotsService(IScholarshipRepository scholarshipRepository)
    {
        _scholarshipRepository = scholarshipRepository;
    }

    public async Task<IReadOnlyList<EvaluatorScholarshipSlotsResponse>> GetSlotsAsync(CancellationToken cancellationToken = default)
    {
        var scholarships = await _scholarshipRepository.GetAllAsync(cancellationToken);
        return scholarships.Select(s => s.ToEvaluatorSlotsResponse()).ToList();
    }
}
