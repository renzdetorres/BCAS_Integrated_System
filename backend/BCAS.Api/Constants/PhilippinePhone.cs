using System.Text.RegularExpressions;

namespace BCAS.Api.Constants;

/// <summary>
/// The one mobile-number format used everywhere in the system: +639XXXXXXXXX,
/// a Philippine mobile number with the +63 country code.
/// </summary>
public static partial class PhilippinePhone
{
    public const string Pattern = @"^\+639\d{9}$";
    public const string ErrorMessage = "Enter a Philippine mobile number starting with +63, like +639171234567.";

    [GeneratedRegex(Pattern)]
    private static partial Regex MobileRegex();

    public static bool IsValid(string? value) => value is not null && MobileRegex().IsMatch(value);

    /// <summary>The number as an external SMS service expects it (already +63); null when the number is not valid.</summary>
    public static string? ToInternational(string? value) => IsValid(value) ? value : null;
}
