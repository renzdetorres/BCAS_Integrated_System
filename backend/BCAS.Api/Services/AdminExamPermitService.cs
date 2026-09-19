using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AdminExamPermitService : IAdminExamPermitService
{
    private readonly IExamScheduleRepository _examScheduleRepository;
    private readonly IApplicantDocumentService _documentService;
    private readonly IUserRepository _userRepository;
    private readonly INotificationDispatchService _notificationDispatchService;

    public AdminExamPermitService(
        IExamScheduleRepository examScheduleRepository,
        IApplicantDocumentService documentService,
        IUserRepository userRepository,
        INotificationDispatchService notificationDispatchService)
    {
        _examScheduleRepository = examScheduleRepository;
        _documentService = documentService;
        _userRepository = userRepository;
        _notificationDispatchService = notificationDispatchService;
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

        var wasAlreadyReleased = candidate.IsPermitReleased;
        var released = await _examScheduleRepository.ReleasePermitAsync(userId, releasedByUserId, cancellationToken);

        // Exam Permit Available notification (BISAASS-59) - only for an
        // actual release, not a repeat call on an already-released permit
        // (ReleasePermitAsync's UPDATE is a no-op in that case).
        if (!wasAlreadyReleased)
        {
            var applicant = await _userRepository.GetByIdAsync(userId, cancellationToken);
            if (applicant is not null)
            {
                await _notificationDispatchService.NotifyExamPermitAvailableAsync(
                    userId, applicant.Email, applicant.FirstName, cancellationToken);
            }
        }

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
