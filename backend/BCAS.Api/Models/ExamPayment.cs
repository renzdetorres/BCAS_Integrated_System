using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

/// <summary>An applicant's entrance exam payment: the proof they uploaded and where staff review has got to.</summary>
public class ExamPayment
{
    public Guid PaymentId { get; set; }
    public Guid ApplicationId { get; set; }
    public Guid UserId { get; set; }
    public string PaymentType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string? ReferenceNumber { get; set; }
    public string ProofFileName { get; set; } = string.Empty;
    public string ProofContentType { get; set; } = string.Empty;
    public DateTime ProofUploadedAt { get; set; }

    /// <summary>Pending, Verified or Rejected.</summary>
    public string Status { get; set; } = string.Empty;

    public string? RejectionReason { get; set; }
    public string? InvoiceNumber { get; set; }
    public DateTime? VerifiedAt { get; set; }
}

/// <summary>One payment in the staff verification queue, with who paid and for what.</summary>
public class ExamPaymentQueueItem
{
    public Guid PaymentId { get; set; }
    public Guid ApplicationId { get; set; }
    public Guid UserId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string CourseAppliedFor { get; set; } = string.Empty;
    public string? Department { get; set; }
    public decimal Amount { get; set; }
    public string PaymentType { get; set; } = string.Empty;
    public string? ReferenceNumber { get; set; }
    public string Status { get; set; } = string.Empty;
    public string ProofFileName { get; set; } = string.Empty;
    public DateTime ProofUploadedAt { get; set; }
    public string? RejectionReason { get; set; }
    public string? InvoiceNumber { get; set; }
    public string? VerifiedByName { get; set; }
    public DateTime? VerifiedAt { get; set; }
}

/// <summary>What the applicant's Payment page shows.</summary>
public class ExamPaymentResponse
{
    /// <summary>False when an admin has turned the payment requirement off.</summary>
    public bool Required { get; set; }

    /// <summary>NotPaid, Pending, Verified or Rejected.</summary>
    public string Status { get; set; } = "NotPaid";

    /// <summary>The method the applicant paid with once they have uploaded proof; before that, the first method on offer.</summary>
    public string PaymentType { get; set; } = "QR Payment";
    public decimal Amount { get; set; }

    /// <summary>The first method's account name, instructions and QR code, kept so older clients keep working.</summary>
    public string AccountName { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;

    /// <summary>The school's QR code as an image data URL, or empty if none has been uploaded.</summary>
    public string QrImage { get; set; } = string.Empty;

    /// <summary>Every way the school accepts the fee, each with its own account, instructions and QR code.</summary>
    public IReadOnlyList<PaymentMethodResponse> Methods { get; set; } = Array.Empty<PaymentMethodResponse>();

    public string? ReferenceNumber { get; set; }
    public string? ProofFileName { get; set; }
    public DateTime? ProofUploadedAt { get; set; }
    public string? RejectionReason { get; set; }
    public string? InvoiceNumber { get; set; }
    public DateTime? VerifiedAt { get; set; }

    /// <summary>True when the applicant may upload (or replace) proof right now.</summary>
    public bool CanPay { get; set; }

    /// <summary>Why they can't pay yet, when they can't.</summary>
    public string? Notice { get; set; }
}

public class PaymentMethodResponse
{
    public string Name { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string Instructions { get; set; } = string.Empty;
    public string QrImage { get; set; } = string.Empty;
}

public class ExamPaymentQueueItemResponse
{
    public Guid PaymentId { get; set; }
    public Guid ApplicationId { get; set; }
    public Guid UserId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ApplicantEmail { get; set; } = string.Empty;
    public string CourseAppliedFor { get; set; } = string.Empty;
    public string? Department { get; set; }
    public decimal Amount { get; set; }
    public string PaymentType { get; set; } = string.Empty;
    public string? ReferenceNumber { get; set; }
    public string Status { get; set; } = string.Empty;
    public string ProofFileName { get; set; } = string.Empty;
    public DateTime ProofUploadedAt { get; set; }
    public string? RejectionReason { get; set; }
    public string? InvoiceNumber { get; set; }
    public string? VerifiedByName { get; set; }
    public DateTime? VerifiedAt { get; set; }
}

public class VerifyExamPaymentRequest
{
    /// <summary>The cashier's sales invoice (SI) number for this payment, if issued now.</summary>
    [StringLength(50)]
    public string? InvoiceNumber { get; set; }
}

public class SetPaymentInvoiceRequest
{
    /// <summary>The cashier's sales invoice (SI) number for a verified payment.</summary>
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string? InvoiceNumber { get; set; }
}

public class RejectExamPaymentRequest
{
    [Required]
    [StringLength(500, MinimumLength = 1)]
    public string? Reason { get; set; }
}
