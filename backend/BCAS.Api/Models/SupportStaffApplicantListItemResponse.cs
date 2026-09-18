namespace BCAS.Api.Models;

/// <summary>
/// An Applicant account, for Support Staff's Applicant Records screen
/// (BISAASS-51 quick link stub; full search/detail lands with BISAASS-53).
/// </summary>
public class SupportStaffApplicantListItemResponse
{
    public Guid UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
