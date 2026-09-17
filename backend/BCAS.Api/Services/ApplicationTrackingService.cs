using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

/// <summary>
/// Derives each application's current workflow step (BISAASS-22) entirely
/// from existing signals - there's no separate staff-managed step column.
/// "UnderReview"/"ExamCompleted"/"EligibilityScreening"/"Evaluation" can
/// only ever be inferred (via AdmissionApplications/ScholarshipApplications
/// Status, ExamScheduleSelections, and the document checklist) since no
/// Admin-Registrar/Evaluator workflow exists yet to set them explicitly -
/// same as the "no endpoint transitions a status away from Submitted yet"
/// gap called out for BISAASS-16/17. Once that workflow lands, these
/// applications' Status values will start moving and the steps below will
/// reflect it automatically, with no change needed here.
/// </summary>
public class ApplicationTrackingService : IApplicationTrackingService
{
    private static readonly IReadOnlySet<string> DecidedStatuses = new HashSet<string>(StringComparer.Ordinal) { "Approved", "Rejected" };
    private static readonly IReadOnlySet<string> ReviewingOrDecidedStatuses = new HashSet<string>(StringComparer.Ordinal) { "UnderReview", "Approved", "Rejected" };

    private readonly IAdmissionApplicationRepository _admissionApplicationRepository;
    private readonly IScholarshipApplicationRepository _scholarshipApplicationRepository;
    private readonly IExamScheduleRepository _examScheduleRepository;
    private readonly IApplicantDocumentService _documentService;

    public ApplicationTrackingService(
        IAdmissionApplicationRepository admissionApplicationRepository,
        IScholarshipApplicationRepository scholarshipApplicationRepository,
        IExamScheduleRepository examScheduleRepository,
        IApplicantDocumentService documentService)
    {
        _admissionApplicationRepository = admissionApplicationRepository;
        _scholarshipApplicationRepository = scholarshipApplicationRepository;
        _examScheduleRepository = examScheduleRepository;
        _documentService = documentService;
    }

    public async Task<ApplicationTrackingResponse> GetMyTrackingAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var admissionApplications = await _admissionApplicationRepository.GetByUserIdAsync(userId, cancellationToken);
        var scholarshipApplications = await _scholarshipApplicationRepository.GetByUserIdAsync(userId, cancellationToken);
        var examSelection = await _examScheduleRepository.GetSelectionByUserIdAsync(userId, cancellationToken);
        var documents = await GetDocumentsOrNullAsync(userId, cancellationToken);

        var documentsReceived = documents is not null && documents.Requirements.All(r => r.Status != "NotSubmitted");
        var documentsVerified = documents is not null && documents.Requirements.All(r => r.Status == "Verified");

        return new ApplicationTrackingResponse
        {
            AdmissionApplications = admissionApplications
                .Select(a => new AdmissionApplicationTrackingResponse
                {
                    ApplicationId = a.ApplicationId,
                    ApplicationType = a.ApplicationType,
                    CourseAppliedFor = a.CourseAppliedFor,
                    Status = a.Status,
                    Steps = BuildAdmissionSteps(a.Status, documentsReceived, examSelection is not null),
                    SubmittedAt = a.SubmittedAt,
                })
                .ToList(),
            ScholarshipApplications = scholarshipApplications
                .Select(s => new ScholarshipApplicationTrackingResponse
                {
                    ApplicationId = s.ApplicationId,
                    ScholarshipName = s.ScholarshipName,
                    Status = s.Status,
                    Steps = BuildScholarshipSteps(s.Status, documentsVerified),
                    SubmittedAt = s.SubmittedAt,
                })
                .ToList(),
            Documents = documents,
        };
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

    private static IReadOnlyList<TrackingStepResponse> BuildAdmissionSteps(
        string status, bool documentsReceived, bool examScheduled)
    {
        var decided = DecidedStatuses.Contains(status);
        var underReview = ReviewingOrDecidedStatuses.Contains(status);

        // Highest-indexed signal that's true wins - see the class remarks
        // for why some of these (UnderReview, ExamCompleted) currently
        // never fire on real data.
        var currentIndex = 0;
        if (documentsReceived) currentIndex = 1;
        if (underReview) currentIndex = 2;
        if (examScheduled) currentIndex = 3;
        if (decided) currentIndex = 5; // ExamCompleted (4) and DecisionReleased (5) both follow from a decision being out.

        return BuildSteps(ApplicationTrackingConstants.AdmissionSteps, currentIndex);
    }

    private static IReadOnlyList<TrackingStepResponse> BuildScholarshipSteps(string status, bool documentsVerified)
    {
        var decided = DecidedStatuses.Contains(status);
        var underReview = ReviewingOrDecidedStatuses.Contains(status);

        var currentIndex = 0;
        if (documentsVerified) currentIndex = 1;
        if (underReview) currentIndex = 2;
        if (decided) currentIndex = 4; // Evaluation (3) and Result (4) both follow from a decision being out.

        return BuildSteps(ApplicationTrackingConstants.ScholarshipSteps, currentIndex);
    }

    private static IReadOnlyList<TrackingStepResponse> BuildSteps(IReadOnlyList<string> steps, int currentIndex) =>
        steps
            .Select((step, index) => new TrackingStepResponse
            {
                Step = step,
                IsComplete = index < currentIndex || index == steps.Count - 1 && index == currentIndex,
                IsCurrent = index == currentIndex,
            })
            .ToList();
}
