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
    private readonly IScholarshipApplicationRepository _scholarshipApplicationRepository;
    private readonly IDepartmentScopeRepository _departmentScopeRepository;

    public AdminApplicationsService(
        IAdminApplicationsRepository applicationsRepository,
        IExamScheduleRepository examScheduleRepository,
        IApplicantDocumentService documentService,
        IApplicationStatusHistoryRepository statusHistoryRepository,
        INotificationDispatchService notificationDispatchService,
        IScholarshipApplicationRepository scholarshipApplicationRepository,
        IDepartmentScopeRepository departmentScopeRepository)
    {
        _departmentScopeRepository = departmentScopeRepository;
        _applicationsRepository = applicationsRepository;
        _examScheduleRepository = examScheduleRepository;
        _documentService = documentService;
        _statusHistoryRepository = statusHistoryRepository;
        _notificationDispatchService = notificationDispatchService;
        _scholarshipApplicationRepository = scholarshipApplicationRepository;
    }

    public async Task<IReadOnlyList<AdminApplicationListItemResponse>> SearchAsync(
        string? search,
        string? status,
        string? category,
        string? program,
        bool? archived = null,
        string? department = null,
        CancellationToken cancellationToken = default)
    {
        var items = await _applicationsRepository.SearchAsync(search, status, category, program, archived, department, cancellationToken);

        // Cached per applicant (UserId): the same applicant can have more than
        // one application and the document signal is shared across them.
        var documentsCache = new Dictionary<Guid, DocumentChecklistResponse?>();

        var responses = new List<AdminApplicationListItemResponse>(items.Count);
        foreach (var item in items)
        {
            var steps = await BuildStepsAsync(item, documentsCache, cancellationToken);
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

        if (category == "Admission")
        {
            await EnsureAdmissionStatusPreconditionsAsync(existing, status, cancellationToken);
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

        // Scholarship waitlist: release the slot this application had
        // reserved back to the scholarship on rejection (a no-op if it was
        // Waitlisted and never held one) - the Admin override is one of two
        // paths a scholarship application can reach "Rejected" through, see
        // EvaluatorScholarshipApplicationService.RecordFinalDecisionAsync
        // for the other (Academic Head's dedicated decision flow).
        if (category == "Scholarship" && status == "Rejected")
        {
            await _scholarshipApplicationRepository.ReleaseSlotByApplicationIdAsync(applicationId, cancellationToken);
        }

        var steps = await BuildStepsAsync(
            updated, new Dictionary<Guid, DocumentChecklistResponse?>(), cancellationToken);
        return updated.ToResponse(steps);
    }

    /// <summary>
    /// A few admission steps mean something real, so they need it to be true:
    /// documents can only be marked complete once every required one is in,
    /// cleared once every required one is verified, and the exam can only be
    /// scheduled once the applicant has picked a schedule. SF10 is left out
    /// because it is only submitted after the exam.
    /// </summary>
    private async Task EnsureAdmissionStatusPreconditionsAsync(
        AdminApplicationListItem existing, string status, CancellationToken cancellationToken)
    {
        if (status is "DocumentsCompleted" or "DocumentsCleared")
        {
            var checklist = await GetDocumentsOrNullAsync(existing.UserId, cancellationToken);
            var required = checklist?.Requirements.Where(r => r.DocumentType != DocumentConstants.Sf10).ToList() ?? new();

            if (status == "DocumentsCompleted" && (required.Count == 0 || required.Any(r => r.Status == "NotSubmitted")))
            {
                throw new StatusPreconditionNotMetException("Every required document must be uploaded before the documents can be marked complete.");
            }

            if (status == "DocumentsCleared" && (required.Count == 0 || required.Any(r => r.Status != "Verified")))
            {
                throw new StatusPreconditionNotMetException("Every required document must be verified before the documents can be cleared.");
            }
        }

        if (status == "ExamScheduled" && existing.Status != AdmissionWorkflowConstants.DidNotTakeExam
            && await _examScheduleRepository.GetSelectionByUserIdAsync(existing.UserId, cancellationToken) is null)
        {
            throw new StatusPreconditionNotMetException("The applicant has not picked an exam schedule yet.");
        }
    }

    public async Task<AdminApplicationListItemResponse> SetDepartmentAsync(
        Guid applicationId,
        string department,
        string? program = null,
        CancellationToken cancellationToken = default)
    {
        var normalized = DepartmentConstants.Normalize(department)
            ?? throw new InvalidDepartmentException(department);

        var existing = await _applicationsRepository.GetByIdAsync(applicationId, cancellationToken)
            ?? throw new ApplicationNotFoundException(applicationId);

        if (existing.Category != "Admission")
        {
            throw InvalidDepartmentException.NotSettableOnScholarship();
        }

        // The course is kept unless the department needs a program the
        // application doesn't already have; then one must be supplied.
        var course = DepartmentConstants.NormalizeProgram(normalized, program ?? existing.CourseAppliedFor)
            ?? throw new InvalidCourseProgramException(normalized, program ?? existing.CourseAppliedFor);
        var newCourse = string.Equals(course, existing.CourseAppliedFor, StringComparison.Ordinal) ? null : course;

        if (!await _departmentScopeRepository.SetAdmissionApplicationDepartmentAsync(applicationId, normalized, newCourse, cancellationToken))
        {
            throw new ApplicationNotFoundException(applicationId);
        }

        var updated = await _applicationsRepository.GetByIdAsync(applicationId, cancellationToken)
            ?? throw new ApplicationNotFoundException(applicationId);

        var steps = await BuildStepsAsync(
            updated, new Dictionary<Guid, DocumentChecklistResponse?>(), cancellationToken);
        return updated.ToResponse(steps);
    }

    public async Task<AdminEntranceFormResponse> GetEntranceFormAsync(Guid applicationId, CancellationToken cancellationToken = default) =>
        await _applicationsRepository.GetEntranceFormAsync(applicationId, cancellationToken)
            ?? throw new ApplicationNotFoundException(applicationId);

    public async Task<IReadOnlyList<ApplicationLogEntryResponse>> GetLogAsync(
        Guid applicationId,
        string category,
        CancellationToken cancellationToken = default)
    {
        var existing = await _applicationsRepository.GetByIdAsync(applicationId, cancellationToken);
        if (existing is null || existing.Category != category)
        {
            throw new ApplicationNotFoundException(applicationId);
        }

        var entries = new List<ApplicationLogEntry>();

        foreach (var h in await _statusHistoryRepository.GetByApplicationIdAsync(applicationId, category, cancellationToken))
        {
            entries.Add(new ApplicationLogEntry
            {
                At = h.ChangedAt,
                Action = h.FromStatus is null ? "Application submitted" : LogActionFor(h.ToStatus),
                Details = h.FromStatus is null ? null : $"{StatusText(h.FromStatus)} to {StatusText(h.ToStatus)}" + (string.IsNullOrWhiteSpace(h.Remarks) ? "" : $": {h.Remarks}"),
                ActorName = h.ChangedByName,
            });
        }

        entries.AddRange(await _applicationsRepository.GetActivityLogAsync(existing.UserId, cancellationToken));

        return entries
            .OrderByDescending(e => e.At)
            .Select(e => new ApplicationLogEntryResponse { At = e.At, Action = e.Action, Details = e.Details, ActorName = e.ActorName })
            .ToList();
    }

    private static string LogActionFor(string toStatus) => toStatus switch
    {
        "Approved" => "Application approved",
        "Rejected" => "Application rejected",
        "Retracted" => "Application retracted",
        "UnderReview" => "Application reviewed",
        "DocumentsCleared" => "Documents cleared",
        _ => "Status changed",
    };

    /// <summary>"UnderReview" -> "Under Review".</summary>
    private static string StatusText(string status) =>
        System.Text.RegularExpressions.Regex.Replace(status, "(?<=[a-z])(?=[A-Z])", " ");

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
            archived, new Dictionary<Guid, DocumentChecklistResponse?>(), cancellationToken);
        return archived.ToResponse(steps);
    }

    public async Task<AdminApplicationListItemResponse> PromoteFromWaitlistAsync(
        Guid applicationId,
        Guid promotedByUserId,
        CancellationToken cancellationToken = default)
    {
        var existing = await _applicationsRepository.GetByIdAsync(applicationId, cancellationToken);
        if (existing is null || existing.Category != "Scholarship")
        {
            throw new ApplicationNotFoundException(applicationId);
        }

        // PromoteFromWaitlistAsync itself is the authority on whether the
        // application is actually Waitlisted right now (it re-checks inside
        // the same transaction as the slot reservation, so a stale read of
        // `existing` above can't cause a wrong promotion) - a null result
        // here means it wasn't, using the status this read still saw for
        // the exception message.
        var promoted = await _scholarshipApplicationRepository.PromoteFromWaitlistAsync(applicationId, cancellationToken)
            ?? throw new ScholarshipApplicationNotWaitlistedException(applicationId, existing.Status);

        await _statusHistoryRepository.InsertAsync(
            applicationId, "Scholarship", "Waitlisted", "Submitted", remarks: null, promotedByUserId, cancellationToken);

        var applicantFirstName = existing.ApplicantName.Split(' ', 2)[0];
        await _notificationDispatchService.NotifyScholarshipWaitlistPromotedAsync(
            existing.UserId, existing.ApplicantEmail, applicantFirstName, promoted.ScholarshipName, cancellationToken);

        var updated = await _applicationsRepository.GetByIdAsync(applicationId, cancellationToken)
            ?? throw new ApplicationNotFoundException(applicationId);
        var steps = await BuildStepsAsync(
            updated, new Dictionary<Guid, DocumentChecklistResponse?>(), cancellationToken);
        return updated.ToResponse(steps);
    }

    public async Task<BulkOperationResultResponse> BulkArchiveAsync(
        BulkArchiveRequest request,
        Guid archivedByUserId,
        CancellationToken cancellationToken = default)
    {
        var failures = new List<BulkOperationFailure>();
        var succeededCount = 0;

        foreach (var item in request.Items)
        {
            try
            {
                await ArchiveAsync(
                    item.ApplicationId,
                    new ArchiveApplicationRequest { Category = item.Category, Reason = request.Reason },
                    archivedByUserId,
                    cancellationToken);
                succeededCount++;
            }
            catch (Exception ex) when (
                ex is InvalidApplicationCategoryException
                or ApplicationNotFoundException
                or ApplicationAlreadyArchivedException
                or ApplicationNotArchivableException)
            {
                failures.Add(new BulkOperationFailure { Id = item.ApplicationId, Reason = ex.Message });
            }
        }

        return new BulkOperationResultResponse { SucceededCount = succeededCount, Failures = failures };
    }

    /// <summary>
    /// Same workflow-step derivation ApplicationTrackingService uses for an
    /// applicant's own applications (BISAASS-22), reused here for any
    /// application system-wide (BISAASS-31).
    /// </summary>
    private async Task<IReadOnlyList<TrackingStepResponse>> BuildStepsAsync(
        AdminApplicationListItem item,
        Dictionary<Guid, DocumentChecklistResponse?> documentsCache,
        CancellationToken cancellationToken)
    {
        // Admission steps follow the status alone; only scholarship steps
        // look at the documents.
        if (item.Category == "Admission")
        {
            return ApplicationWorkflowSteps.BuildAdmissionSteps(item.Status);
        }

        if (!documentsCache.TryGetValue(item.UserId, out var documents))
        {
            documents = await GetDocumentsOrNullAsync(item.UserId, cancellationToken);
            documentsCache[item.UserId] = documents;
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
