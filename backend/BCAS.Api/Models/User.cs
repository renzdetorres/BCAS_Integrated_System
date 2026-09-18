namespace BCAS.Api.Models;

public class User
{
    public Guid UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public int RoleId { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Free-text department/program name (BISAASS-49). Only meaningful for
    /// AcademicHead accounts - null for every other role until set.
    /// </summary>
    public string? Department { get; set; }
}
