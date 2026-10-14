using BCAS.Api.Constants;
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
    private readonly IExamPaymentService _paymentService;
    private readonly ISchoolConfigService _schoolConfig;

    public AdminExamPermitService(
        IExamScheduleRepository examScheduleRepository,
        IApplicantDocumentService documentService,
        IUserRepository userRepository,
        INotificationDispatchService notificationDispatchService,
        IExamPaymentService paymentService,
        ISchoolConfigService schoolConfig)
    {
        _paymentService = paymentService;
        _schoolConfig = schoolConfig;
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
            var documentsVerified = await AreDocumentsVerifiedAsync(candidate.UserId, candidate.ExamType, cancellationToken);
            results.Add(candidate.ToAdminListItemResponse(documentsVerified));
        }

        return results;
    }

    public async Task<AdminExamPermitListItemResponse> ReleaseAsync(Guid userId, Guid releasedByUserId, string invoiceNumber, CancellationToken cancellationToken = default)
    {
        var candidate = await _examScheduleRepository.GetPermitCandidateByUserIdAsync(userId, cancellationToken)
            ?? throw new NoExamScheduleSelectedException();

        var isEntrance = candidate.ExamType == ExamTypes.Entrance;
        var documentsVerified = await AreDocumentsVerifiedAsync(userId, candidate.ExamType, cancellationToken);
        if (!candidate.IsPermitReleased && !documentsVerified)
        {
            throw new DocumentsNotVerifiedException();
        }

        var wasAlreadyReleased = candidate.IsPermitReleased;

        // While payment is required, a permit only goes to an applicant whose
        // payment is verified. The fee on the slip is what they actually paid;
        // the SI number is the one typed now, or the one recorded at verification.
        var verifiedPayment = await _paymentService.GetVerifiedAsync(userId, cancellationToken);
        if (isEntrance && !wasAlreadyReleased && !await _paymentService.IsSatisfiedAsync(userId, cancellationToken))
        {
            throw new PaymentNotVerifiedException();
        }

        // The entrance exam fee is paid through the school and invoiced; the scholarship exam has no fee.
        var invoice = string.IsNullOrWhiteSpace(invoiceNumber) ? verifiedPayment?.InvoiceNumber : invoiceNumber.Trim();
        if (isEntrance && string.IsNullOrWhiteSpace(invoice))
        {
            throw new InvoiceNumberRequiredException();
        }

        var examFee = !isEntrance
            ? 0m
            : verifiedPayment?.Amount ?? decimal.Parse(await _schoolConfig.GetAsync(Constants.SchoolConfigKeys.ExamFee, cancellationToken));
        var released = await _examScheduleRepository.ReleasePermitAsync(userId, releasedByUserId, examFee, string.IsNullOrWhiteSpace(invoice) ? null : invoice, cancellationToken);

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
    private async Task<bool> AreDocumentsVerifiedAsync(Guid userId, string examType, CancellationToken cancellationToken)
    {
        try
        {
            // A scholarship exam is held to the scholarship documents, not the admission ones.
            var checklist = examType == ExamTypes.Scholarship
                ? await _documentService.GetMyScholarshipChecklistAsync(userId, cancellationToken)
                : await _documentService.GetMyChecklistAsync(userId, cancellationToken);
            // SF10 is only submitted after the exam, so it can't gate the permit
            // (the status workflow leaves it out of its own document checks too).
            return checklist.Requirements.Where(r => r.DocumentType != Constants.DocumentConstants.Sf10).All(r => r.Status == "Verified");
        }
        catch (Exception ex) when (ex is NoAdmissionApplicationException or NoScholarshipApplicationException)
        {
            return false;
        }
    }
}
