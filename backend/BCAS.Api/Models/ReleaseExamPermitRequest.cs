using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class ReleaseExamPermitRequest
{
    /// <summary>The cashier's sales-invoice (SI) number for the exam fee payment.</summary>
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string? InvoiceNumber { get; set; }
}
