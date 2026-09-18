using BCAS.Api.Data;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AdminDocumentsService : IAdminDocumentsService
{
    private readonly IAdminDocumentsRepository _documentsRepository;

    public AdminDocumentsService(IAdminDocumentsRepository documentsRepository)
    {
        _documentsRepository = documentsRepository;
    }

    public async Task<IReadOnlyList<AdminDocumentListItemResponse>> SearchAsync(
        string? search,
        string? status,
        string? documentType,
        CancellationToken cancellationToken = default)
    {
        var items = await _documentsRepository.SearchAsync(search, status, documentType, cancellationToken);
        return items.Select(item => item.ToResponse()).ToList();
    }
}
