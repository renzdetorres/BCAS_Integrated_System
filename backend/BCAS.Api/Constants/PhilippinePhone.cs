using System.Text.RegularExpressions;

namespace BCAS.Api.Constants;

/// <summary>
/// The one mobile-number format used everywhere in the system: 09XXXXXXXXX,
/// exactly 11 digits starting with 09.
/// </summary>
public static partial class PhilippinePhone
{
    public const string Pattern = @"^09\d{9}$";
    public const string ErrorMessage = "Enter a Philippine mobile number with 11 digits starting with 09, like 09171234567.";

    [GeneratedRegex(Pattern)]
    private static partial Regex MobileRegex();

    public static bool IsValid(string? value) => value is not null && MobileRegex().IsMatch(value);

    /// <summary>+63 form (+639XXXXXXXXX) for external SMS services; null when the number is not valid.</summary>
    public static string? ToInternational(string? value) => IsValid(value) ? "+63" + value![1..] : null;
}
