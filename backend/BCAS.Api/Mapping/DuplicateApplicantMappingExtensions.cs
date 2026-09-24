using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class DuplicateApplicantMappingExtensions
{
    public static DuplicateApplicantFlagResponse ToResponse(this PotentialDuplicateApplicant flag) => new()
    {
        FlagId = flag.FlagId,
        NewUserId = flag.NewUserId,
        NewUserName = flag.NewUserName,
        NewUserEmail = flag.NewUserEmail,
        MatchedUserId = flag.MatchedUserId,
        MatchedUserName = flag.MatchedUserName,
        MatchedUserEmail = flag.MatchedUserEmail,
        MatchReason = flag.MatchReason,
        Status = flag.Status,
        DetectedAt = flag.DetectedAt,
        ReviewedByName = flag.ReviewedByName,
        ReviewedAt = flag.ReviewedAt,
        ReviewNotes = flag.ReviewNotes,
    };
}
