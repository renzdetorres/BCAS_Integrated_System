using System.Text.RegularExpressions;
using BCAS.Api.Exceptions;

namespace BCAS.Api.Constants;

/// <summary>
/// The shape of each academic category an applicant picks from: which year
/// levels it has, and whether a strand and a term/semester apply. The
/// frontend mirrors this in config/academicStructure.js - change both together.
/// </summary>
public static partial class AcademicStructure
{
    public const string Elementary = "Elementary";
    public const string HighSchool = "High School";
    public const string SeniorHigh = "Senior High School";
    public const string College = "College";

    public const string PreKinder = "Pre-Kinder";
    public const string Kindergarten = "Kindergarten";

    public static IReadOnlyList<string> Terms => AcademicCatalog.Current.Terms;
    public static IReadOnlyList<string> Semesters => AcademicCatalog.Current.Semesters;

    /// <summary>The standard Senior High School strands.</summary>
    public static IReadOnlyList<string> Strands => AcademicCatalog.Current.Strands;

    public sealed record Category(IReadOnlyList<string> YearLevels, IReadOnlyList<string> TermOptions, bool HasStrand);

    // Read from the live catalog each time, so a change in Settings applies to the next application.
    private static IReadOnlyDictionary<string, Category> Categories
    {
        get
        {
            var catalog = AcademicCatalog.Current;
            return new Dictionary<string, Category>(StringComparer.Ordinal)
            {
                [Elementary] = new(catalog.YearLevels[Elementary], Array.Empty<string>(), false),
                [HighSchool] = new(catalog.YearLevels[HighSchool], catalog.Terms, false),
                [SeniorHigh] = new(catalog.YearLevels[SeniorHigh], catalog.Terms, true),
                [College] = new(catalog.YearLevels[College], catalog.Semesters, false),
            };
        }
    }

    public static bool IsKnownCategory(string category) => Categories.ContainsKey(category);

    /// <summary>
    /// Checks the year level, term and strand against the category and returns
    /// the value to store as the course applied for: the program code for
    /// College, the strand for Senior High School, the grade level otherwise.
    /// Throws InvalidEntranceFormException with a message the applicant can act on.
    /// </summary>
    public static string ValidateLevel(string category, string? yearLevel, string? term, string? strandOrProgram)
    {
        if (!Categories.TryGetValue(category, out var shape))
        {
            throw new InvalidEntranceFormException("Choose an academic category.");
        }

        var level = shape.YearLevels.FirstOrDefault(l => string.Equals(l, yearLevel?.Trim(), StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidEntranceFormException($"Choose a valid {(category == College ? "year level" : "grade level")} for {category}.");

        if (shape.TermOptions.Count > 0)
        {
            var wanted = category == College ? "semester" : "term";
            if (!shape.TermOptions.Any(t => string.Equals(t, term?.Trim(), StringComparison.OrdinalIgnoreCase)))
            {
                throw new InvalidEntranceFormException($"Choose a {wanted} for {category}.");
            }
        }

        if (category == SeniorHigh)
        {
            return Strands.FirstOrDefault(s => string.Equals(s, strandOrProgram?.Trim(), StringComparison.OrdinalIgnoreCase))
                ?? throw new InvalidEntranceFormException("Choose a Senior High School strand.");
        }

        // College programs are validated and stored by DepartmentConstants.NormalizeProgram; every other category stores its grade level.
        return category == College ? strandOrProgram?.Trim() ?? string.Empty : level;
    }

    /// <summary>The canonical spelling of the chosen term or semester (empty for categories without one).</summary>
    public static string NormalizeTerm(string category, string? term) =>
        Categories.TryGetValue(category, out var shape)
            ? shape.TermOptions.FirstOrDefault(t => string.Equals(t, term?.Trim(), StringComparison.OrdinalIgnoreCase)) ?? string.Empty
            : string.Empty;

    public static string NormalizeYearLevel(string category, string? yearLevel) =>
        Categories.TryGetValue(category, out var shape)
            ? shape.YearLevels.FirstOrDefault(l => string.Equals(l, yearLevel?.Trim(), StringComparison.OrdinalIgnoreCase)) ?? string.Empty
            : string.Empty;

    /// <summary>
    /// Pre-Kinder and Kindergarten applicants must have reached the minimum
    /// age by the end of the cutoff month of the admission year - not simply
    /// be that age on the day they apply. Other levels are not age-checked.
    /// </summary>
    public static void ValidateAge(string yearLevel, DateOnly birthDate, int minAge, int cutoffMonth, int cutoffYear)
    {
        var cutoff = new DateOnly(cutoffYear, cutoffMonth, DateTime.DaysInMonth(cutoffYear, cutoffMonth));
        var age = cutoff.Year - birthDate.Year - (cutoff < birthDate.AddYears(cutoff.Year - birthDate.Year) ? 1 : 0);
        if (age < minAge)
        {
            var monthName = System.Globalization.CultureInfo.InvariantCulture.DateTimeFormat.GetMonthName(cutoffMonth);
            throw new InvalidEntranceFormException(
                $"{yearLevel} applicants must be at least {minAge} years old by the end of {monthName} {cutoffYear}. The applicant will be {Math.Max(age, 0)} by then.");
        }
    }

    /// <summary>The minimum age for a level that has one (Pre-Kinder, Kindergarten), or null.</summary>
    public static int? MinAgeFor(string yearLevel, int preKinderMinAge, int kinderMinAge) => yearLevel switch
    {
        PreKinder => preKinderMinAge,
        Kindergarten => kinderMinAge,
        _ => null,
    };

    /// <summary>The academic year (e.g. "2026-2027") a school year starting in June contains the given date in.</summary>
    public static string AcademicYearFor(DateOnly today)
    {
        var start = today.Month >= 6 ? today.Year : today.Year - 1;
        return $"{start}-{start + 1}";
    }

    public static bool IsValidAcademicYear(string value)
    {
        var match = AcademicYearRegex().Match(value);
        return match.Success && int.Parse(match.Groups[2].Value) == int.Parse(match.Groups[1].Value) + 1;
    }

    [GeneratedRegex(@"^(\d{4})-(\d{4})$")]
    private static partial Regex AcademicYearRegex();
}
