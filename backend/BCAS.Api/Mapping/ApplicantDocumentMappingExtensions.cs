using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class ApplicantDocumentMappingExtensions
{
    public static DocumentChecklistItemResponse ToResponse(this ApplicantDocument document) => new()
    {
        DocumentType = document.DocumentType,
        Status = document.Status,
        FileName = document.FileName,
        UploadedAt = document.UploadedAt,
        FlaggedReason = document.FlaggedReason,
    };
}
