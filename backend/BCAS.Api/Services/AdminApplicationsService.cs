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

    public AdminApplicationsService(
        IAdminApplicationsRepository applicationsRepository,
        IExamScheduleRepository examScheduleRepository,
        IApplicantDocumentService documentService)
    {
        _applicationsRepository = applicationsRepository;
        _examScheduleRepository = examScheduleRepository;
        _documentService = documentService;
    }

    public async Task<IReadOnlyList<AdminApplicationListItemResponse>> SearchAsync(
        string? search,
        string? status,
        string? category,
        string? program,
        CancellationToken cancellationToken = default)
    {
        var items = await _applicationsRepository.SearchAsync(search, status, category, program, cancellationToken);

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

        var updated = await _applicationsRepository.UpdateStatusAsync(applicationId, category, status, request.Remarks, cancellationToken)
            ?? throw new ApplicationNotFoundException(applicationId);

        var steps = await BuildStepsAsync(
            updated, new Dictionary<Guid, DocumentChecklistResponse?>(), new Dictionary<Guid, bool>(), cancellationToken);
        return updated.ToResponse(steps);
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
