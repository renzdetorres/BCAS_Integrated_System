using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class UpsertApplicantProfileRequest
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    public DateOnly? BirthDate { get; set; }

    [Required]
    [StringLength(30, MinimumLength = 1)]
    public string ContactNumber { get; set; } = string.Empty;

    [Required]
    [StringLength(200, MinimumLength = 1)]
    public string AddressLine { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string City { get; set; } = string.Empty;

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Province { get; set; } = string.Empty;

    [Required]
    [StringLength(20, MinimumLength = 1)]
    public string PostalCode { get; set; } = string.Empty;

    // Nullable + Required so an omitted value is rejected rather than
    // silently defaulting to false.
    [Required]
    public bool? IsBcasian { get; set; }
}
