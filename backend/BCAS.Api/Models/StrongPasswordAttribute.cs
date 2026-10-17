using System.ComponentModel.DataAnnotations;

namespace BCAS.Api.Models;

/// <summary>
/// Rejects passwords that are among the first an attacker tries: a short list of the most common ones, a single
/// repeated character, a plain run like 12345678, and a password that contains the account's own email name.
/// The length rule (8 or more) is separate; this only filters out the guessable ones.
/// </summary>
[AttributeUsage(AttributeTargets.Property)]
public sealed class StrongPasswordAttribute : ValidationAttribute
{
    private static readonly HashSet<string> Common = new(StringComparer.OrdinalIgnoreCase)
    {
        "password", "password1", "password12", "password123", "password1234", "passw0rd", "p@ssw0rd", "p@ssword", "p@ssword1",
        "12345678", "123456789", "1234567890", "123123123", "11111111", "00000000", "87654321", "12341234", "12121212",
        "qwerty123", "qwertyui", "qwertyuiop", "qwerty12", "1q2w3e4r", "1qaz2wsx", "abc12345", "abcd1234", "abcdefgh",
        "iloveyou", "iloveyou1", "letmein1", "letmein123", "welcome1", "welcome123", "admin123", "admin1234", "administrator",
        "monkey123", "dragon123", "football1", "baseball1", "superman1", "master123", "sunshine1", "princess1", "trustno1",
        "bcas1234", "bcas12345", "bcas2026", "bcas2025", "batangas1", "batangas123", "school123", "student123",
    };

    private const string Message = "Choose a password that is harder to guess: this one is too common or too simple.";

    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        if (value is not string password || password.Length == 0)
        {
            return ValidationResult.Success; // [Required] and the length rule report an empty or short value
        }

        if (IsGuessable(password, EmailOf(validationContext.ObjectInstance)))
        {
            return new ValidationResult(Message);
        }

        return ValidationResult.Success;
    }

    /// <summary>True for a password that is on the common list, a repeated character, a straight run, or built from the email name.</summary>
    public static bool IsGuessable(string password, string? email)
    {
        var trimmed = password.Trim();
        if (Common.Contains(trimmed))
        {
            return true;
        }

        if (trimmed.Length > 0 && trimmed.All(c => c == trimmed[0]))
        {
            return true;
        }

        if (IsStraightRun(trimmed))
        {
            return true;
        }

        var name = email?.Split('@')[0].Trim();
        return name is { Length: >= 4 } && trimmed.Contains(name, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>Digits or letters that each step up or down by one, like 12345678 or abcdefgh.</summary>
    private static bool IsStraightRun(string value)
    {
        if (value.Length < 6)
        {
            return false;
        }

        var step = value[1] - value[0];
        if (step is not (1 or -1))
        {
            return false;
        }

        for (var i = 1; i < value.Length; i++)
        {
            if (value[i] - value[i - 1] != step)
            {
                return false;
            }
        }

        return true;
    }

    private static string? EmailOf(object? instance) =>
        instance?.GetType().GetProperty("Email")?.GetValue(instance) as string;
}
