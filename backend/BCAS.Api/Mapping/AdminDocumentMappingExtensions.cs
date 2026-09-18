using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class AdminDocumentMappingExtensions
{
    public static AdminDocumentListItemResponse ToResponse(this AdminDocumentListItem item) => new()
    {
        DocumentId = item.DocumentId,
        UserId = item.UserId,
        ApplicantName = item.ApplicantName,
        ApplicantEmail = item.ApplicantEmail,
        DocumentType = item.DocumentType,
        FileName = item.FileName,
        Status = item.Status,
        FlaggedReason = item.FlaggedReason,
        UploadedAt = item.UploadedAt,
        UpdatedAt = item.UpdatedAt,
        ReviewedByName = item.ReviewedByName,
        ReviewedAt = item.ReviewedAt,
    };
}
