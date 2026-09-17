using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class ApplicantProfileMappingExtensions
{
    public static ApplicantProfileResponse ToResponse(this ApplicantProfile profile) => new()
    {
        FirstName = profile.FirstName,
        LastName = profile.LastName,
        BirthDate = profile.BirthDate,
        ContactNumber = profile.ContactNumber,
        AddressLine = profile.AddressLine,
        City = profile.City,
        Province = profile.Province,
        PostalCode = profile.PostalCode,
        IsBcasian = profile.IsBcasian,
        UpdatedAt = profile.UpdatedAt,
    };
}
