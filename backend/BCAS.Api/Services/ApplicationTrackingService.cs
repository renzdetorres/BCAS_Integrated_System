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
                    Steps = ApplicationWorkflowSteps.BuildAdmissionSteps(a.Status, documentsReceived, examSelection is not null),
                    SubmittedAt = a.SubmittedAt,
                })
                .ToList(),
            ScholarshipApplications = scholarshipApplications
                .Select(s => new ScholarshipApplicationTrackingResponse
                {
                    ApplicationId = s.ApplicationId,
                    ScholarshipName = s.ScholarshipName,
                    Status = s.Status,
                    Steps = ApplicationWorkflowSteps.BuildScholarshipSteps(s.Status, documentsVerified),
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
