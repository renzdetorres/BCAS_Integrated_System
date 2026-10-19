namespace BCAS.Api.Models;

/// <summary>An Admin's edit of an account: the saved account plus what it was before, for the audit log.</summary>
public sealed record UserUpdateResult(UserProfileResponse User, string PreviousEmail, string PreviousRole);
