using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class ReleaseExamPermitRequest
{
    /// <summary>
    /// The cashier's sales-invoice (SI) number for the exam fee payment. Can be left
    /// blank when it was already recorded while verifying the payment.
    /// </summary>
    [StringLength(50)]
    public string? InvoiceNumber { get; set; }
}
