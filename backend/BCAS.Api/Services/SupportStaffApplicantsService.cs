using BCAS.Api.Data;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class SupportStaffApplicantsService : ISupportStaffApplicantsService
{
    private const string ApplicantRoleName = "Applicant";

    private readonly IUserRepository _userRepository;

    public SupportStaffApplicantsService(IUserRepository userRepository)
    {
        _userRepository = userRepository;
    }

    public async Task<IReadOnlyList<SupportStaffApplicantListItemResponse>> GetApplicantsAsync(CancellationToken cancellationToken = default)
    {
        var users = await _userRepository.GetAllAsync(cancellationToken);
        return users
            .Where(u => u.RoleName == ApplicantRoleName)
            .Select(u => u.ToSupportStaffApplicantResponse())
            .ToList();
    }
}
