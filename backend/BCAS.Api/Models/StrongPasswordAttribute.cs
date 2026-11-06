using System.ComponentModel.DataAnnotations;
using System.Text;
using System.Text.RegularExpressions;

namespace BCAS.Api.Models;

/// <summary>
/// Rejects passwords that are among the first an attacker tries, however they are dressed up. It looks at what
/// is left of a password after the guessable parts are taken out: common words (also when spelled with
/// look-alike characters such as p@ssw0rd or split by spaces and symbols), number and letter runs (1234, abcd),
/// keyboard walks (qwerty, 1q2w3e), repeated characters (aaa), years (2026), and the person's own name or email.
/// What remains has to be enough to carry the password, so "Password123!" and "Qwerty12345" are refused while an
/// ordinary mixed password is not.
///
/// Before that, the password has to meet the school's written policy: at least one uppercase letter (A-Z), one
/// lowercase letter (a-z), one number (0-9) and one special character (! @ # $ % ^ & *, or any other ASCII symbol),
/// no spaces, and not the same as the account's email or username. The length rule (8 or more) is separate. The same rules run in the browser (frontend/src/utils/passwordStrength.js)
/// so people see them while typing; this is the one that counts.
/// </summary>
[AttributeUsage(AttributeTargets.Property)]
public sealed class StrongPasswordAttribute : ValidationAttribute
{
    /// <summary>Whole passwords that are refused outright, whatever else they contain.</summary>
    private static readonly HashSet<string> Common = new(StringComparer.OrdinalIgnoreCase)
    {
        "password", "password1", "password12", "password123", "password1234", "passw0rd", "p@ssw0rd", "p@ssword", "p@ssword1",
        "12345678", "123456789", "1234567890", "123123123", "11111111", "00000000", "87654321", "12341234", "12121212",
        "qwerty123", "qwertyui", "qwertyuiop", "qwerty12", "1q2w3e4r", "1qaz2wsx", "abc12345", "abcd1234", "abcdefgh",
        "iloveyou", "iloveyou1", "letmein1", "letmein123", "welcome1", "welcome123", "admin123", "admin1234", "administrator",
        "monkey123", "dragon123", "football1", "baseball1", "superman1", "master123", "sunshine1", "princess1", "trustno1",
        "bcas1234", "bcas12345", "bcas2026", "bcas2025", "batangas1", "batangas123", "school123", "student123",
    };

    /// <summary>Words that count as guessable wherever they appear (four letters or more, in their plain spelling).</summary>
    private static readonly string[] Words =
    {
        "password", "passwort", "pass", "admin", "administrator", "welcome", "letmein", "iloveyou", "qwerty", "qwertyuiop",
        "monkey", "dragon", "football", "baseball", "basketball", "superman", "batman", "master", "sunshine", "princess",
        "trustno", "login", "secret", "hello", "guest", "changeme", "default", "computer", "internet", "freedom",
        "student", "school", "college", "scholar", "scholarship", "admission", "applicant", "registrar", "evaluator",
        "bcas", "batangas", "philippines", "manila", "mabuhay", "pilipinas", "iloveu",
    };

    /// <summary>Rows of a keyboard; any run of four or more keys in a row (either direction) is a walk.</summary>
    private static readonly string[] KeyboardRows =
    {
        "qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890", "qazwsxedcrfvtgbyhnujmikolp", "1q2w3e4r5t6y7u8i9o0p", "!@#$%^&*()",
    };

    private static readonly Regex Year = new("(19|20)[0-9]{2}", RegexOptions.Compiled);
    private static readonly string[] DecodedWords = Words.Select(Decode).ToArray();

    private const string Message = "Choose a password that is harder to guess: this one is too common or too simple.";
    private const string NeedsUppercase = "Add at least one uppercase letter (A–Z) to your password.";
    private const string NeedsLowercase = "Add at least one lowercase letter (a–z) to your password.";
    private const string NeedsNumber = "Add at least one number (0–9) to your password.";
    private const string NeedsSpecial = "Add at least one special character (! @ # $ % ^ & *) to your password.";
    private const string NoSpaces = "Your password can't contain spaces.";
    private const string SameAsAccount = "Your password can't be the same as your email or username.";

    protected override ValidationResult? IsValid(object? value, ValidationContext validationContext)
    {
        if (value is not string password || password.Length == 0)
        {
            return ValidationResult.Success; // [Required] and the length rule report an empty or short value
        }

        var owner = validationContext.ObjectInstance;
        var problem = Check(password, Read(owner, "Email"), Read(owner, "FirstName"), Read(owner, "LastName"));
        return problem is null ? ValidationResult.Success : new ValidationResult(problem);
    }

    /// <summary>The first thing wrong with a password, in plain words, or null when it is acceptable.</summary>
    public static string? Check(string password, string? email, string? firstName = null, string? lastName = null)
    {
        if (!password.Any(c => c is >= 'A' and <= 'Z'))
        {
            return NeedsUppercase;
        }

        if (!password.Any(c => c is >= 'a' and <= 'z'))
        {
            return NeedsLowercase;
        }

        if (!password.Any(c => c is >= '0' and <= '9'))
        {
            return NeedsNumber;
        }

        if (!password.Any(IsSpecial))
        {
            return NeedsSpecial;
        }

        if (password.Any(char.IsWhiteSpace))
        {
            return NoSpaces;
        }

        if (MatchesAccount(password, email))
        {
            return SameAsAccount;
        }

        return IsGuessable(password, email, firstName, lastName) ? Message : null;
    }

    /// <summary>A printable ASCII character that is not a letter, a digit or a space: ! @ # $ % ^ & * and the rest.</summary>
    private static bool IsSpecial(char c) => c is > ' ' and <= '~' && !char.IsAsciiLetterOrDigit(c);

    /// <summary>True when the password is the account's email address or its username (the part before the @), in any letter case.</summary>
    public static bool MatchesAccount(string password, string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return false;
        }

        var trimmed = email.Trim();
        var username = trimmed.Split('@')[0];
        return string.Equals(password, trimmed, StringComparison.OrdinalIgnoreCase)
            || (username.Length > 0 && string.Equals(password, username, StringComparison.OrdinalIgnoreCase));
    }

    public static bool IsGuessable(string password, string? email) => IsGuessable(password, email, null, null);

    /// <summary>True for a password that is on the common list, or whose own content is mostly guessable parts.</summary>
    public static bool IsGuessable(string password, string? email, string? firstName, string? lastName)
    {
        var trimmed = password.Trim();
        if (trimmed.Length == 0)
        {
            return false;
        }

        if (Common.Contains(trimmed) || trimmed.All(c => c == trimmed[0]))
        {
            return true;
        }

        var lower = trimmed.ToLowerInvariant();
        var covered = new bool[lower.Length];
        MarkRepeats(lower, covered);
        MarkRuns(lower, covered);
        MarkKeyboardWalks(lower, covered);
        MarkYears(lower, covered);
        MarkWords(lower, covered, DecodedWords.Concat(PersonalWords(email, firstName, lastName)));

        var left = new List<char>();
        for (var i = 0; i < lower.Length; i++)
        {
            if (!covered[i] && char.IsLetterOrDigit(lower[i]))
            {
                left.Add(lower[i]);
            }
        }

        // What is left has to be enough to carry a password: five characters, four of them different.
        return left.Count < 5 || left.Distinct().Count() < 4;
    }

    /// <summary>The same characters with look-alikes turned back into letters: p@ssw0rd becomes password.</summary>
    private static string Decode(string value)
    {
        var sb = new StringBuilder(value.Length);
        foreach (var c in value.ToLowerInvariant())
        {
            sb.Append(c switch { '@' => 'a', '$' => 's', '!' => 'i', '0' => 'o', '1' => 'i', '3' => 'e', '4' => 'a', '5' => 's', '7' => 't', _ => c });
        }

        return sb.ToString();
    }

    /// <summary>Three or more of the same character in a row.</summary>
    private static void MarkRepeats(string s, bool[] covered)
    {
        for (var start = 0; start < s.Length;)
        {
            var end = start;
            while (end + 1 < s.Length && s[end + 1] == s[start])
            {
                end++;
            }

            if (end - start + 1 >= 3)
            {
                Mark(covered, start, end);
            }

            start = end + 1;
        }
    }

    /// <summary>Digits that step by one (123, 987) or letters that do (abcd, wxyz), at least three digits or four letters.</summary>
    private static void MarkRuns(string s, bool[] covered)
    {
        for (var start = 0; start < s.Length - 1; start++)
        {
            var step = s[start + 1] - s[start];
            if (step is not (1 or -1) || !SameKind(s[start], s[start + 1]))
            {
                continue;
            }

            var end = start + 1;
            while (end + 1 < s.Length && s[end + 1] - s[end] == step && SameKind(s[end], s[end + 1]))
            {
                end++;
            }

            var length = end - start + 1;
            if (length >= (char.IsDigit(s[start]) ? 3 : 4))
            {
                Mark(covered, start, end);
            }

            start = end - 1;
        }
    }

    private static bool SameKind(char a, char b) => (char.IsDigit(a) && char.IsDigit(b)) || (char.IsLetter(a) && char.IsLetter(b));

    /// <summary>Four or more neighbouring keys in a row of the keyboard, read either way.</summary>
    private static void MarkKeyboardWalks(string s, bool[] covered)
    {
        foreach (var row in KeyboardRows)
        {
            foreach (var line in new[] { row, new string(row.Reverse().ToArray()) })
            {
                for (var i = 0; i + 4 <= line.Length; i++)
                {
                    var fragment = line.Substring(i, 4);
                    var at = s.IndexOf(fragment, StringComparison.Ordinal);
                    while (at >= 0)
                    {
                        Mark(covered, at, at + 3);
                        at = s.IndexOf(fragment, at + 1, StringComparison.Ordinal);
                    }
                }
            }
        }
    }

    private static void MarkYears(string s, bool[] covered)
    {
        foreach (Match match in Year.Matches(s))
        {
            Mark(covered, match.Index, match.Index + match.Length - 1);
        }
    }

    /// <summary>
    /// Finds each word after look-alikes are decoded and with spaces and symbols ignored, so "p a s s w o r d" and
    /// "P@ssw0rd!" are both "password". The letters between its first and last character are marked.
    /// </summary>
    private static void MarkWords(string lower, bool[] covered, IEnumerable<string> words)
    {
        var decoded = Decode(lower);
        var compact = new StringBuilder();
        var origin = new List<int>();
        for (var i = 0; i < decoded.Length; i++)
        {
            if (char.IsLetter(decoded[i]))
            {
                compact.Append(decoded[i]);
                origin.Add(i);
            }
        }

        var text = compact.ToString();
        foreach (var word in words)
        {
            if (word.Length < 3)
            {
                continue;
            }

            var at = text.IndexOf(word, StringComparison.Ordinal);
            while (at >= 0)
            {
                Mark(covered, origin[at], origin[at + word.Length - 1]);
                at = text.IndexOf(word, at + 1, StringComparison.Ordinal);
            }
        }
    }

    /// <summary>The person's own name and the pieces of their email name, three letters or more.</summary>
    private static IEnumerable<string> PersonalWords(string? email, string? firstName, string? lastName)
    {
        var words = new List<string>();
        foreach (var name in new[] { firstName, lastName })
        {
            AddLetters(words, name);
        }

        var local = email?.Split('@')[0] ?? string.Empty;
        AddLetters(words, local);
        foreach (var piece in Regex.Split(local, "[^A-Za-z]+"))
        {
            AddLetters(words, piece);
        }

        return words;

        static void AddLetters(List<string> into, string? text)
        {
            if (text is null)
            {
                return;
            }

            var letters = Decode(new string(text.Where(char.IsLetter).ToArray()));
            if (letters.Length >= 3)
            {
                into.Add(letters);
            }
        }
    }

    private static void Mark(bool[] covered, int from, int to)
    {
        for (var i = from; i <= to; i++)
        {
            covered[i] = true;
        }
    }

    private static string? Read(object? instance, string property) =>
        instance?.GetType().GetProperty(property)?.GetValue(instance) as string;
}
