using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class UserMappingExtensions
{
    public static UserProfileResponse ToProfileResponse(this User user) => new()
    {
        UserId = user.UserId,
        FirstName = user.FirstName,
        LastName = user.LastName,
        Email = user.Email,
        Role = user.RoleName,
        IsActive = user.IsActive,
        Department = user.Department,
    };
}
