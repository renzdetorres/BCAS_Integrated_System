namespace BCAS.Api.Constants;

/// <summary>
/// SettingKey values in dbo.SystemSettings that application code gates
/// behavior on, kept as constants so a typo doesn't silently no-op a check.
/// </summary>
public static class SystemSettingKeys
{
    public const string AdmissionsApplicationsOpen = "AdmissionsApplicationsOpen";
    public const string ScholarshipApplicationsOpen = "ScholarshipApplicationsOpen";
}
