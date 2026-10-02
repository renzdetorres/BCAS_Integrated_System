using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

public class SetSuperAdminRequest
{
    [Required]
    public bool? IsSuperAdmin { get; set; }
}
