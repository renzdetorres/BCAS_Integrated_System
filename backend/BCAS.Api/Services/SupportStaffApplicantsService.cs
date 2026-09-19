using BCAS.Api.Data;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class SupportStaffApplicantsService : ISupportStaffApplicantsService
{
    private readonly ISupportStaffApplicantsRepository _applicantsRepository;

    public SupportStaffApplicantsService(ISupportStaffApplicantsRepository applicantsRepository)
    {
        _applicantsRepository = applicantsRepository;
    }

    public async Task<IReadOnlyList<SupportStaffApplicantListItemResponse>> SearchApplicantsAsync(
        string? search, CancellationToken cancellationToken = default)
    {
        var items = await _applicantsRepository.SearchAsync(search, cancellationToken);
        return items.Select(item => item.ToResponse()).ToList();
    }
}
