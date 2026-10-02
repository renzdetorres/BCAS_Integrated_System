namespace BCAS.Api.Services;

/// <summary>
/// The school's calendar day. The Philippines is UTC+8 with no daylight
/// saving, so a fixed offset is exact, and it doesn't depend on the server's
/// own time zone or time zone database.
/// </summary>
public static class PhilippineTime
{
    public static DateOnly Today => DateOnly.FromDateTime(DateTime.UtcNow.AddHours(8));
}
