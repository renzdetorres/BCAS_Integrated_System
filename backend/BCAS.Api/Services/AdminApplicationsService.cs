using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AdminApplicationsService : IAdminApplicationsService
{
    private readonly IAdminApplicationsRepository _applicationsRepository;
    private readonly IExamScheduleRepository _examScheduleRepository;
    private readonly IApplicantDocumentService _documentService;
    private readonly IApplicationStatusHistoryRepository _statusHistoryRepository;
    private readonly INotificationDispatchService _notificationDispatchService;

    public AdminApplicationsService(
        IAdminApplicationsRepository applicationsRepository,
        IExamScheduleRepository examScheduleRepository,
        IApplicantDocumentService documentService,
        IApplicationStatusHistoryRepository statusHistoryRepository,
        INotificationDispatchService notificationDispatchService)
    {
        _applicationsRepository = applicationsRepository;
        _examScheduleRepository = examScheduleRepository;
        _documentService = documentService;
        _statusHistoryRepository = statusHistoryRepository;
        _notificationDispatchService = notificationDispatchService;
    }

    public async Task<IReadOnlyList<AdminApplicationListItemResponse>> SearchAsync(
        string? search,
        string? status,
        string? category,
        string? program,
        bool? archived = null,
        CancellationToken cancellationToken = default)
    {
        var items = await _applicationsRepository.SearchAsync(search, status, category, program, archived, cancellationToken);

        // Cached per applicant (UserId) rather than per application, since
        // the same applicant can have more than one application and these
        // signals (documents, exam schedule) are shared across all of them.
        var documentsCache = new Dictionary<Guid, DocumentChecklistResponse?>();
        var examScheduledCache = new Dictionary<Guid, bool>();

        var responses = new List<AdminApplicationListItemResponse>(items.Count);
        foreach (var item in items)
        {
            var steps = await BuildStepsAsync(item, documentsCache, examScheduledCache, cancellationToken);
            responses.Add(item.ToResponse(steps));
        }

        return responses;
    }

    public async Task<AdminApplicationListItemResponse> UpdateStatusAsync(
        Guid applicationId,
        UpdateApplicationStatusRequest request,
        Guid changedByUserId,
        CancellationToken cancellationToken = default)
    {
        var category = request.Category!;
        var status = request.Status!;

        var allowedStatuses = category switch
        {
            "Admission" => AdmissionConstants.AllowedStatuses,
            "Scholarship" => ScholarshipWorkflowConstants.AllowedStatuses,
            _ => throw new InvalidApplicationCategoryException(category),
        };

        if (!allowedStatuses.Contains(status))
        {
            throw new InvalidApplicationStatusException(category, status);
        }

        var existing = await _applicationsRepository.GetByIdAsync(applicationId, cancellationToken);
        if (existing is null || existing.Category != category)
        {
            throw new ApplicationNotFoundException(applicationId);
        }

        // Both categories now enforce their ordered workflow on the Admin
        // override too (BISAASS-56 for Admission, BISAASS-57 for
        // Scholarship) - previously this endpoint could set either
        // category to any allowed status regardless of the current one.
        var isForwardTransition = category switch
        {
            "Admission" => AdmissionWorkflowConstants.IsForwardTransition(existing.Status, status),
            "Scholarship" => ScholarshipWorkflowConstants.IsForwardTransition(existing.Status, status),
            _ => throw new InvalidApplicationCategoryException(category),
        };

        if (!isForwardTransition)
        {
            throw new InvalidStatusTransitionException(applicationId, category, existing.Status, status);
        }

        var updated = await _applicationsRepository.UpdateStatusAsync(applicationId, category, status, request.Remarks, cancellationToken)
            ?? throw new ApplicationNotFoundException(applicationId);

        await _statusHistoryRepository.InsertAsync(
            applicationId, category, existing.Status, status, request.Remarks, changedByUserId, cancellationToken);

        // Application/Scholarship Result notification (BISAASS-59) - only
        // for an actual decision, not every intermediate status change.
        if (status is "Approved" or "Rejected")
        {
            var applicantFirstName = updated.ApplicantName.Split(' ', 2)[0];
            if (category == "Admission")
            {
                await _notificationDispatchService.NotifyApplicationResultAsync(
                    updated.UserId, updated.ApplicantEmail, applicantFirstName, status, updated.CourseAppliedFor ?? "your program", cancellationToken);
            }
            else
            {
                await _notificationDispatchService.NotifyScholarshipResultAsync(
                    updated.UserId, updated.ApplicantEmail, applicantFirstName, status, updated.ScholarshipName ?? "the scholarship", cancellationToken);
            }
        }

        var steps = await BuildStepsAsync(
            updated, new Dictionary<Guid, DocumentChecklistResponse?>(), new Dictionary<Guid, bool>(), cancellationToken);
        return updated.ToResponse(steps);
    }

    public async Task<IReadOnlyList<ApplicationStatusHistoryEntryResponse>> GetStatusHistoryAsync(
        Guid applicationId,
        string category,
        CancellationToken cancellationToken = default)
    {
        var existing = await _applicationsRepository.GetByIdAsync(applicationId, cancellationToken);
        if (existing is null || existing.Category != category)
        {
            throw new ApplicationNotFoundException(applicationId);
        }

        var entries = await _statusHistoryRepository.GetByApplicationIdAsync(applicationId, category, cancellationToken);
        return entries.Select(e => e.ToResponse()).ToList();
    }

    public async Task<AdminApplicationListItemResponse> ArchiveAsync(
        Guid applicationId,
        ArchiveApplicationRequest request,
        Guid archivedByUserId,
        CancellationToken cancellationToken = default)
    {
        var category = request.Category!;
        if (category != "Admission" && category != "Scholarship")
        {
            throw new InvalidApplicationCategoryException(category);
        }

        var existing = await _applicationsRepository.GetByIdAsync(applicationId, cancellationToken);
        if (existing is null || existing.Category != category)
        {
            throw new ApplicationNotFoundException(applicationId);
        }

        if (existing.IsArchived)
        {
            throw new ApplicationAlreadyArchivedException(applicationId);
        }

        if (!ArchiveConstants.ArchivableStatuses.Contains(existing.Status))
        {
            throw new ApplicationNotArchivableException(existing.Status);
        }

        var archived = await _applicationsRepository.ArchiveAsync(applicationId, category, request.Reason, archivedByUserId, cancellationToken)
            ?? throw new ApplicationNotFoundException(applicationId);

        if (category == "Admission")
        {
            await _documentService.ArchiveDocumentsAsync(existing.UserId, cancellationToken);
        }

        var steps = await BuildStepsAsync(
            archived, new Dictionary<Guid, DocumentChecklistResponse?>(), new Dictionary<Guid, bool>(), cancellationToken);
        return archived.ToResponse(steps);
    }

    /// <summary>
    /// Same workflow-step derivation ApplicationTrackingService uses for an
    /// applicant's own applications (BISAASS-22), reused here for any
    /// application system-wide (BISAASS-31).
    /// </summary>
    private async Task<IReadOnlyList<TrackingStepResponse>> BuildStepsAsync(
        AdminApplicationListItem item,
        Dictionary<Guid, DocumentChecklistResponse?> documentsCache,
        Dictionary<Guid, bool> examScheduledCache,
        CancellationToken cancellationToken)
    {
        if (!documentsCache.TryGetValue(item.UserId, out var documents))
        {
            documents = await GetDocumentsOrNullAsync(item.UserId, cancellationToken);
            documentsCache[item.UserId] = documents;
        }

        if (item.Category == "Admission")
        {
            if (!examScheduledCache.TryGetValue(item.UserId, out var examScheduled))
            {
                examScheduled = await _examScheduleRepository.GetSelectionByUserIdAsync(item.UserId, cancellationToken) is not null;
                examScheduledCache[item.UserId] = examScheduled;
            }

            var documentsReceived = documents is not null && documents.Requirements.All(r => r.Status != "NotSubmitted");
            return ApplicationWorkflowSteps.BuildAdmissionSteps(item.Status, documentsReceived, examScheduled);
        }

        var documentsVerified = documents is not null && documents.Requirements.All(r => r.Status == "Verified");
        return ApplicationWorkflowSteps.BuildScholarshipSteps(item.Status, documentsVerified);
    }

    private async Task<DocumentChecklistResponse?> GetDocumentsOrNullAsync(Guid userId, CancellationToken cancellationToken)
    {
        try
        {
            return await _documentService.GetMyChecklistAsync(userId, cancellationToken);
        }
        catch (NoAdmissionApplicationException)
        {
            return null;
        }
    }
}
