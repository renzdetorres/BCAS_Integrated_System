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
    private readonly IAdmissionApplicationRepository _admissionApplicationRepository;
    private readonly IScholarshipApplicationRepository _scholarshipApplicationRepository;
    private readonly IExamScheduleRepository _examScheduleRepository;
    private readonly IApplicantDocumentService _documentService;
    private readonly IExamPaymentService _paymentService;
    private readonly IInterviewRepository _interviewRepository;
    private readonly IScholarshipPipelineService _scholarshipPipeline;

    public ApplicationTrackingService(
        IAdmissionApplicationRepository admissionApplicationRepository,
        IScholarshipApplicationRepository scholarshipApplicationRepository,
        IExamScheduleRepository examScheduleRepository,
        IApplicantDocumentService documentService,
        IExamPaymentService paymentService,
        IInterviewRepository interviewRepository,
        IScholarshipPipelineService scholarshipPipeline)
    {
        _scholarshipPipeline = scholarshipPipeline;
        _paymentService = paymentService;
        _interviewRepository = interviewRepository;
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

        var documentsVerified = documents is not null && documents.Requirements.All(r => r.Status == "Verified");
        var paymentState = admissionApplications.Any(a => a.Status == "DocumentsCleared")
            ? await _paymentService.GetPaymentStateAsync(userId, cancellationToken)
            : ApplicationWorkflowSteps.PaymentState.NotRequired;

        var scholarshipProgress = (await _scholarshipPipeline.GetMyProgressAsync(userId, cancellationToken))
            .ToDictionary(p => p.Row.ApplicationId, p => p.Progress);

        ApplicationWorkflowSteps.InterviewSummary? interview = null;
        if (admissionApplications.Any(a => a.Status == "Registration"))
        {
            var booked = await _interviewRepository.GetByUserIdAsync(userId, cancellationToken);
            if (booked is not null)
            {
                interview = new ApplicationWorkflowSteps.InterviewSummary(booked.InterviewDate, booked.InterviewTime, booked.Location);
            }
        }

        return new ApplicationTrackingResponse
        {
            AdmissionApplications = admissionApplications
                .Select(a => new AdmissionApplicationTrackingResponse
                {
                    ApplicationId = a.ApplicationId,
                    ApplicationType = a.ApplicationType,
                    CourseAppliedFor = a.CourseAppliedFor,
                    Status = a.Status,
                    Steps = ApplicationWorkflowSteps.BuildAdmissionSteps(a.Status, paymentState, interview),
                    SubProcess = ApplicationWorkflowSteps.DescribeAdmission(a.Status, paymentState, interview)?.SubProcess,
                    NextAction = ApplicationWorkflowSteps.DescribeAdmission(a.Status, paymentState, interview)?.NextAction,
                    NextActionPath = ApplicationWorkflowSteps.DescribeAdmission(a.Status, paymentState, interview)?.NextActionPath,
                    SubmittedAt = a.SubmittedAt,
                })
                .ToList(),
            ScholarshipApplications = scholarshipApplications
                .Select(s => new ScholarshipApplicationTrackingResponse
                {
                    ApplicationId = s.ApplicationId,
                    ScholarshipName = s.ScholarshipName,
                    Status = s.Status,
                    Steps = scholarshipProgress.TryGetValue(s.ApplicationId, out var progress)
                        ? progress.Steps
                        : ApplicationWorkflowSteps.BuildScholarshipSteps(s.Status, documentsVerified),
                    SubProcess = scholarshipProgress.GetValueOrDefault(s.ApplicationId)?.SubProcess,
                    NextAction = scholarshipProgress.GetValueOrDefault(s.ApplicationId)?.NextAction,
                    NextActionPath = scholarshipProgress.GetValueOrDefault(s.ApplicationId)?.NextActionPath,
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
}
