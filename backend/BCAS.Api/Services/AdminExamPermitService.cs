using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AdminExamPermitService : IAdminExamPermitService
{
    private readonly IExamScheduleRepository _examScheduleRepository;
    private readonly IApplicantDocumentService _documentService;

    public AdminExamPermitService(IExamScheduleRepository examScheduleRepository, IApplicantDocumentService documentService)
    {
        _examScheduleRepository = examScheduleRepository;
        _documentService = documentService;
    }

    public async Task<IReadOnlyList<AdminExamPermitListItemResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var candidates = await _examScheduleRepository.GetAllSelectionsWithApplicantsAsync(cancellationToken);

        var results = new List<AdminExamPermitListItemResponse>(candidates.Count);
        foreach (var candidate in candidates)
        {
            var documentsVerified = await AreDocumentsVerifiedAsync(candidate.UserId, cancellationToken);
            results.Add(candidate.ToAdminListItemResponse(documentsVerified));
        }

        return results;
    }

    public async Task<AdminExamPermitListItemResponse> ReleaseAsync(Guid userId, Guid releasedByUserId, CancellationToken cancellationToken = default)
    {
        var candidate = await _examScheduleRepository.GetPermitCandidateByUserIdAsync(userId, cancellationToken)
            ?? throw new NoExamScheduleSelectedException();

        var documentsVerified = await AreDocumentsVerifiedAsync(userId, cancellationToken);
        if (!candidate.IsPermitReleased && !documentsVerified)
        {
            throw new DocumentsNotVerifiedException();
        }

        var released = await _examScheduleRepository.ReleasePermitAsync(userId, releasedByUserId, cancellationToken);
        return released!.ToAdminListItemResponse(documentsVerified);
    }

    /// <summary>
    /// Same "every required document type is Verified" bar
    /// ApplicationTrackingService uses for DocumentsVerified - no admission
    /// application on file counts as not verified rather than throwing.
    /// </summary>
    private async Task<bool> AreDocumentsVerifiedAsync(Guid userId, CancellationToken cancellationToken)
    {
        try
        {
            var checklist = await _documentService.GetMyChecklistAsync(userId, cancellationToken);
            return checklist.Requirements.All(r => r.Status == "Verified");
        }
        catch (NoAdmissionApplicationException)
        {
            return false;
        }
    }
}
