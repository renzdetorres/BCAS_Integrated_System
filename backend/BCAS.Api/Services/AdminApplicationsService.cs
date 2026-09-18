using BCAS.Api.Data;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AdminApplicationsService : IAdminApplicationsService
{
    private readonly IAdminApplicationsRepository _applicationsRepository;

    public AdminApplicationsService(IAdminApplicationsRepository applicationsRepository)
    {
        _applicationsRepository = applicationsRepository;
    }

    public async Task<IReadOnlyList<AdminApplicationListItemResponse>> SearchAsync(
        string? search,
        string? status,
        string? category,
        string? program,
        CancellationToken cancellationToken = default)
    {
        var items = await _applicationsRepository.SearchAsync(search, status, category, program, cancellationToken);
        return items.Select(i => i.ToResponse()).ToList();
    }
}
