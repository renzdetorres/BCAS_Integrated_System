using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class SupportStaffApplicantMappingExtensions
{
    public static SupportStaffApplicantListItemResponse ToResponse(this SupportStaffApplicantListItem item) => new()
    {
        UserId = item.UserId,
        FirstName = item.FirstName,
        LastName = item.LastName,
        Email = item.Email,
        CreatedAt = item.CreatedAt,
        ApplicationType = item.ApplicationType,
        CourseAppliedFor = item.CourseAppliedFor,
        ApplicationStatus = item.ApplicationStatus,
        SubmittedAt = item.SubmittedAt,
    };
}
