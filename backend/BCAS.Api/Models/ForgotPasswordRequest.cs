using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class ForgotPasswordRequest
{
    [Required]
    [EmailAddress]
    [StringLength(256)]
    public string Email { get; set; } = string.Empty;
}
