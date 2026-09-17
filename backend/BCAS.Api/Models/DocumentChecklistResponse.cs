namespace BCAS.Api.Models;

public class DocumentChecklistResponse
{
    public string ApplicationType { get; set; } = string.Empty;
    public IReadOnlyList<DocumentChecklistItemResponse> Requirements { get; set; } = Array.Empty<DocumentChecklistItemResponse>();
}
