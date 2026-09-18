using BCAS.Api.Data;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class SupportStaffDocumentsService : ISupportStaffDocumentsService
{
    private readonly ISupportStaffDocumentsRepository _documentsRepository;

    public SupportStaffDocumentsService(ISupportStaffDocumentsRepository documentsRepository)
    {
        _documentsRepository = documentsRepository;
    }

    public async Task<IReadOnlyList<AdminDocumentListItemResponse>> GetPendingAndFlaggedAsync(CancellationToken cancellationToken = default)
    {
        var items = await _documentsRepository.GetPendingAndFlaggedAsync(cancellationToken);
        return items.Select(item => item.ToResponse()).ToList();
    }
}
