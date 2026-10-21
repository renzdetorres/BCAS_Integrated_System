using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IExamPaymentService
{
    // Applicant
    Task<ExamPaymentResponse> GetMyPaymentAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<ExamPaymentResponse> SubmitProofAsync(
        Guid userId, string? paymentMethod, string? referenceNumber, string fileName, string contentType, byte[] fileBytes, CancellationToken cancellationToken = default);

    Task<DocumentFile?> GetMyProofFileAsync(Guid userId, CancellationToken cancellationToken = default);

    // Staff
    Task<IReadOnlyList<ExamPaymentQueueItemResponse>> ListAsync(string? status, CancellationToken cancellationToken = default);

    Task<DocumentFile?> GetProofFileAsync(Guid paymentId, CancellationToken cancellationToken = default);

    Task<ExamPaymentQueueItemResponse> VerifyAsync(Guid paymentId, Guid reviewerUserId, string? invoiceNumber, CancellationToken cancellationToken = default);

    Task<ExamPaymentQueueItemResponse> SetInvoiceAsync(Guid paymentId, string invoiceNumber, CancellationToken cancellationToken = default);

    Task<ExamPaymentQueueItemResponse> RejectAsync(Guid paymentId, Guid reviewerUserId, string reason, CancellationToken cancellationToken = default);

    // Gate used by exam scheduling and permit release
    /// <summary>Whether the payment requirement is on.</summary>
    Task<bool> IsRequiredAsync(CancellationToken cancellationToken = default);

    /// <summary>True when payment isn't required or the applicant's payment is Verified.</summary>
    Task<bool> IsSatisfiedAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>The verified payment for this applicant, if any.</summary>
    Task<ExamPayment?> GetVerifiedAsync(Guid userId, CancellationToken cancellationToken = default);

    /// <summary>One of ApplicationWorkflowSteps.PaymentState: where this applicant's payment stands.</summary>
    Task<string> GetPaymentStateAsync(Guid userId, CancellationToken cancellationToken = default);
}

public class ExamPaymentService : IExamPaymentService
{
    private static readonly IReadOnlySet<string> PayableStatuses = new HashSet<string>(StringComparer.Ordinal)
    {
        "DocumentsCleared",
        "ExamScheduled",
        "DidNotTakeExam",
    };

    private readonly IExamPaymentRepository _repository;
    private readonly IAdmissionApplicationRepository _applicationRepository;
    private readonly ISystemSettingsRepository _systemSettings;
    private readonly ISchoolConfigService _schoolConfig;
    private readonly IUserRepository _userRepository;
    private readonly INotificationDispatchService _notifications;
    private readonly ILogger<ExamPaymentService> _logger;

    public ExamPaymentService(
        IExamPaymentRepository repository,
        IAdmissionApplicationRepository applicationRepository,
        ISystemSettingsRepository systemSettings,
        ISchoolConfigService schoolConfig,
        IUserRepository userRepository,
        INotificationDispatchService notifications,
        ILogger<ExamPaymentService> logger)
    {
        _repository = repository;
        _applicationRepository = applicationRepository;
        _systemSettings = systemSettings;
        _schoolConfig = schoolConfig;
        _userRepository = userRepository;
        _notifications = notifications;
        _logger = logger;
    }

    public async Task<ExamPaymentResponse> GetMyPaymentAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var application = await GetApplicationAsync(userId, cancellationToken);
        return await BuildResponseAsync(application, await _repository.GetByApplicationAsync(application.ApplicationId, cancellationToken), cancellationToken);
    }

    public async Task<ExamPaymentResponse> SubmitProofAsync(
        Guid userId, string? paymentMethod, string? referenceNumber, string fileName, string contentType, byte[] fileBytes, CancellationToken cancellationToken = default)
    {
        var application = await GetApplicationAsync(userId, cancellationToken);
        var existing = await _repository.GetByApplicationAsync(application.ApplicationId, cancellationToken);
        var current = await BuildResponseAsync(application, existing, cancellationToken);

        if (!current.CanPay)
        {
            throw new ExamPaymentException(current.Notice ?? "You can't submit a payment right now.");
        }

        // The applicant says how they paid; it has to be one of the methods the school offers.
        var methods = PaymentMethods.Resolve(await _schoolConfig.GetAllAsync(cancellationToken));
        var method = PaymentMethods.Choose(methods, paymentMethod)
            ?? throw new ExamPaymentException(string.IsNullOrWhiteSpace(paymentMethod)
                ? "Choose how you paid."
                : $"'{paymentMethod.Trim()}' isn't a payment method the school accepts. Choose one from the list.");

        if (fileBytes.Length == 0)
        {
            throw new ExamPaymentException("The uploaded file is empty.");
        }

        if (fileBytes.Length > DocumentConstants.MaxFileSizeBytes)
        {
            throw new ExamPaymentException($"Files must be {DocumentConstants.MaxFileSizeBytes / (1024 * 1024)} MB or smaller.");
        }

        if (!DocumentConstants.IsAcceptedAnyFile(fileName, contentType, fileBytes))
        {
            throw new ExamPaymentException("Proof of payment must be a PDF, JPG or PNG file.");
        }

        var reference = string.IsNullOrWhiteSpace(referenceNumber) ? null : referenceNumber.Trim();
        if (reference is { Length: > 60 })
        {
            throw new ExamPaymentException("The reference number is too long.");
        }

        // The amount is taken from the school's current fee, never from the request.
        var amount = existing?.Amount ?? decimal.Parse(await _schoolConfig.GetAsync(SchoolConfigKeys.ExamFee, cancellationToken));
        var saved = await _repository.UpsertProofAsync(application.ApplicationId, userId, amount, method.Name, reference, fileName, contentType, fileBytes, cancellationToken)
            ?? throw new ExamPaymentException("Your payment is already verified.");

        _logger.LogInformation("Exam payment proof uploaded for application {ApplicationId} by {UserId}", application.ApplicationId, userId);
        return await BuildResponseAsync(application, saved, cancellationToken);
    }

    public async Task<DocumentFile?> GetMyProofFileAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var payment = await _repository.GetByUserIdAsync(userId, cancellationToken);
        return payment is null ? null : await _repository.GetProofFileAsync(payment.PaymentId, cancellationToken);
    }

    public async Task<IReadOnlyList<ExamPaymentQueueItemResponse>> ListAsync(string? status, CancellationToken cancellationToken = default)
    {
        if (status is not null && status is not ("Pending" or "Verified" or "Rejected"))
        {
            throw new ExamPaymentException("Status must be Pending, Verified or Rejected.");
        }

        var items = await _repository.GetQueueAsync(status, cancellationToken);
        return items.Select(ToResponse).ToList();
    }

    public Task<DocumentFile?> GetProofFileAsync(Guid paymentId, CancellationToken cancellationToken = default) =>
        _repository.GetProofFileAsync(paymentId, cancellationToken);

    public async Task<ExamPaymentQueueItemResponse> VerifyAsync(
        Guid paymentId, Guid reviewerUserId, string? invoiceNumber, CancellationToken cancellationToken = default)
    {
        var invoice = string.IsNullOrWhiteSpace(invoiceNumber) ? null : invoiceNumber.Trim();
        return await ReviewAsync(paymentId, reviewerUserId, "Verified", null, invoice, cancellationToken);
    }

    public async Task<ExamPaymentQueueItemResponse> SetInvoiceAsync(Guid paymentId, string invoiceNumber, CancellationToken cancellationToken = default)
    {
        var invoice = invoiceNumber?.Trim();
        if (string.IsNullOrEmpty(invoice))
        {
            throw new ExamPaymentException("Enter the sales invoice (SI) number.");
        }

        if (await _repository.GetQueueItemAsync(paymentId, cancellationToken) is null)
        {
            throw new ExamPaymentNotFoundException(paymentId);
        }

        if (!await _repository.SetInvoiceAsync(paymentId, invoice, cancellationToken))
        {
            throw new ExamPaymentException("A sales invoice number can only be set on a verified payment.");
        }

        _logger.LogInformation("Sales invoice {Invoice} set on payment {PaymentId}", invoice, paymentId);
        return ToResponse((await _repository.GetQueueItemAsync(paymentId, cancellationToken))!);
    }

    public async Task<ExamPaymentQueueItemResponse> RejectAsync(
        Guid paymentId, Guid reviewerUserId, string reason, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(reason))
        {
            throw new ExamPaymentException("Give the applicant a reason for rejecting the payment.");
        }

        return await ReviewAsync(paymentId, reviewerUserId, "Rejected", reason.Trim(), null, cancellationToken);
    }

    public Task<bool> IsRequiredAsync(CancellationToken cancellationToken = default) =>
        _systemSettings.IsEnabledAsync(SystemSettingKeys.ExamPaymentRequired, cancellationToken);

    public async Task<bool> IsSatisfiedAsync(Guid userId, CancellationToken cancellationToken = default) =>
        !await IsRequiredAsync(cancellationToken) || await GetVerifiedAsync(userId, cancellationToken) is not null;

    public async Task<ExamPayment?> GetVerifiedAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var payment = await _repository.GetByUserIdAsync(userId, cancellationToken);
        return payment is { Status: "Verified" } ? payment : null;
    }

    public async Task<string> GetPaymentStateAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        if (!await IsRequiredAsync(cancellationToken))
        {
            return ApplicationWorkflowSteps.PaymentState.NotRequired;
        }

        var payment = await _repository.GetByUserIdAsync(userId, cancellationToken);
        return payment?.Status switch
        {
            "Verified" => ApplicationWorkflowSteps.PaymentState.Verified,
            "Pending" => ApplicationWorkflowSteps.PaymentState.Pending,
            "Rejected" => ApplicationWorkflowSteps.PaymentState.Rejected,
            _ => ApplicationWorkflowSteps.PaymentState.NotPaid,
        };
    }

    private async Task<ExamPaymentQueueItemResponse> ReviewAsync(
        Guid paymentId, Guid reviewerUserId, string status, string? reason, string? invoice, CancellationToken cancellationToken)
    {
        var item = await _repository.GetQueueItemAsync(paymentId, cancellationToken)
            ?? throw new ExamPaymentNotFoundException(paymentId);

        if (!await _repository.ReviewAsync(paymentId, reviewerUserId, status, reason, invoice, cancellationToken))
        {
            throw new ExamPaymentException("This payment has already been reviewed.");
        }

        var applicant = await _userRepository.GetByIdAsync(item.UserId, cancellationToken);
        if (applicant is not null)
        {
            await _notifications.NotifyPaymentReviewedAsync(item.UserId, applicant.Email, applicant.FirstName, status, reason, cancellationToken);
        }

        _logger.LogInformation("Exam payment {PaymentId} {Status} by {ReviewerUserId}", paymentId, status, reviewerUserId);
        return ToResponse((await _repository.GetQueueItemAsync(paymentId, cancellationToken))!);
    }

    private async Task<AdmissionApplication> GetApplicationAsync(Guid userId, CancellationToken cancellationToken) =>
        (await _applicationRepository.GetByUserIdAsync(userId, cancellationToken)).FirstOrDefault()
            ?? throw new NoAdmissionApplicationException();

    private async Task<ExamPaymentResponse> BuildResponseAsync(AdmissionApplication application, ExamPayment? payment, CancellationToken cancellationToken)
    {
        var required = await IsRequiredAsync(cancellationToken);
        var config = await _schoolConfig.GetAllAsync(cancellationToken);
        var status = payment?.Status ?? "NotPaid";

        string? notice = null;
        var canPay = false;
        if (!required)
        {
            notice = "The school isn't asking for an online entrance exam payment right now.";
        }
        else if (status == "Verified")
        {
            notice = "Your payment is verified.";
        }
        else if (!PayableStatuses.Contains(application.Status))
        {
            notice = AdmissionWorkflowConstants.IsFinal(application.Status)
                ? "This application is closed, so no payment is needed."
                : AdmissionWorkflowConstants.Steps.ToList().IndexOf(application.Status) < AdmissionWorkflowConstants.Steps.ToList().IndexOf("DocumentsCleared")
                    ? "Your documents need to be verified before you can pay the entrance exam fee."
                    : "Payment is no longer needed for this application.";
        }
        else
        {
            canPay = true;
        }

        var methods = PaymentMethods.Resolve(config);
        return new ExamPaymentResponse
        {
            Required = required,
            Status = status,
            PaymentType = payment?.PaymentType ?? methods[0].Name,
            Amount = payment?.Amount ?? decimal.Parse(config[SchoolConfigKeys.ExamFee]),
            AccountName = methods[0].AccountName,
            Instructions = methods[0].Instructions,
            QrImage = methods[0].QrImage,
            Methods = methods
                .Select(m => new PaymentMethodResponse { Name = m.Name, AccountName = m.AccountName, AccountNumber = m.AccountNumber, Instructions = m.Instructions, QrImage = m.QrImage })
                .ToList(),
            ReferenceNumber = payment?.ReferenceNumber,
            ProofFileName = payment?.ProofFileName,
            ProofUploadedAt = payment?.ProofUploadedAt,
            RejectionReason = payment?.RejectionReason,
            InvoiceNumber = payment?.InvoiceNumber,
            VerifiedAt = payment?.VerifiedAt,
            CanPay = canPay,
            Notice = notice,
        };
    }

    private static ExamPaymentQueueItemResponse ToResponse(ExamPaymentQueueItem item) => new()
    {
        PaymentId = item.PaymentId,
        ApplicationId = item.ApplicationId,
        UserId = item.UserId,
        ApplicantName = item.ApplicantName,
        ApplicantEmail = item.ApplicantEmail,
        CourseAppliedFor = item.CourseAppliedFor,
        Department = item.Department,
        Amount = item.Amount,
        PaymentType = item.PaymentType,
        ReferenceNumber = item.ReferenceNumber,
        Status = item.Status,
        ProofFileName = item.ProofFileName,
        ProofUploadedAt = item.ProofUploadedAt,
        RejectionReason = item.RejectionReason,
        InvoiceNumber = item.InvoiceNumber,
        VerifiedByName = item.VerifiedByName,
        VerifiedAt = item.VerifiedAt,
    };
}
