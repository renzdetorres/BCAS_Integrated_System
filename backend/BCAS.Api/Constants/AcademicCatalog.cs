using System.Text.Json;
using BCAS.Api.Exceptions;

namespace BCAS.Api.Constants;

/// <summary>One College program: its short code (stored on applications) and full name.</summary>
public sealed record CatalogProgram(string Code, string Name);

/// <summary>
/// The admin-editable academic lists: Senior High strands, the term and
/// semester choices, each category's year levels and the College programs.
/// Stored as JSON in dbo.SchoolConfig (see SchoolConfigKeys) and read through
/// <see cref="AcademicCatalog.Current"/>, a snapshot that is refreshed at start-up,
/// periodically and right after an admin saves. AcademicStructure and
/// DepartmentConstants validate against it, so a change takes effect without a deploy.
/// </summary>
public sealed record AcademicCatalogData(
    IReadOnlyList<string> Strands,
    IReadOnlyList<string> Terms,
    IReadOnlyList<string> Semesters,
    IReadOnlyDictionary<string, IReadOnlyList<string>> YearLevels,
    IReadOnlyList<CatalogProgram> CollegePrograms);

public static class AcademicCatalog
{
    /// <summary>
    /// Levels other rules depend on: Pre-Kinder and Kindergarten carry the age
    /// policy, and Grade 7, Grade 11 and 1st Year are the scholarship levels.
    /// They can't be removed, so those rules can't be broken from Settings.
    /// </summary>
    public static readonly IReadOnlyList<string> ProtectedLevels =
        new[] { AcademicStructure.PreKinder, AcademicStructure.Kindergarten, "Grade 7", "Grade 11", "1st Year" };

    // camelCase out, any casing in: the same JSON the admin screen reads and writes.
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private const int MaxItems = 40;
    private const int MaxLength = 80;

    public static readonly AcademicCatalogData Defaults = new(
        Strands: new[] { "STEM", "ABM", "HUMSS", "GAS", "TVL" },
        Terms: new[] { "1st Term", "2nd Term", "3rd Term" },
        Semesters: new[] { "1st Semester", "2nd Semester", "Summer" },
        YearLevels: new Dictionary<string, IReadOnlyList<string>>(StringComparer.Ordinal)
        {
            [AcademicStructure.Elementary] = new[] { AcademicStructure.PreKinder, AcademicStructure.Kindergarten, "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6" },
            [AcademicStructure.HighSchool] = new[] { "Grade 7", "Grade 8", "Grade 9", "Grade 10" },
            [AcademicStructure.SeniorHigh] = new[] { "Grade 11", "Grade 12" },
            [AcademicStructure.College] = new[] { "1st Year", "2nd Year", "3rd Year", "4th Year" },
        },
        CollegePrograms: new[]
        {
            new CatalogProgram("BSBA", "Bachelor of Science in Business Administration"),
            new CatalogProgram("BSED", "Bachelor of Science in Education"),
            new CatalogProgram("BSA", "Bachelor of Science in Accountancy"),
            new CatalogProgram("BSIT", "Bachelor of Science in Information Technology"),
        });

    private static volatile AcademicCatalogData _current = Defaults;

    public static AcademicCatalogData Current => _current;

    /// <summary>Builds the catalog from the stored config values; a missing or unreadable value keeps its default.</summary>
    public static void Apply(IReadOnlyDictionary<string, string> config) => _current = FromConfig(config);

    public static AcademicCatalogData FromConfig(IReadOnlyDictionary<string, string> config)
    {
        static T Read<T>(IReadOnlyDictionary<string, string> source, string key, T fallback) where T : class
        {
            if (!source.TryGetValue(key, out var json) || string.IsNullOrWhiteSpace(json)) return fallback;
            try
            {
                return JsonSerializer.Deserialize<T>(json, Json) ?? fallback;
            }
            catch (JsonException)
            {
                return fallback;
            }
        }

        var levels = Read<Dictionary<string, string[]>>(config, SchoolConfigKeys.AcademicYearLevels, new());
        var merged = Defaults.YearLevels.ToDictionary(
            d => d.Key,
            d => levels.TryGetValue(d.Key, out var custom) && custom.Length > 0 ? (IReadOnlyList<string>)custom : d.Value,
            StringComparer.Ordinal);

        var programs = Read<CatalogProgram[]>(config, SchoolConfigKeys.AcademicPrograms, Array.Empty<CatalogProgram>());

        return new AcademicCatalogData(
            Read<string[]>(config, SchoolConfigKeys.AcademicStrands, Array.Empty<string>()) is { Length: > 0 } strands ? strands : Defaults.Strands,
            Read<string[]>(config, SchoolConfigKeys.AcademicTerms, Array.Empty<string>()) is { Length: > 0 } terms ? terms : Defaults.Terms,
            Read<string[]>(config, SchoolConfigKeys.AcademicSemesters, Array.Empty<string>()) is { Length: > 0 } semesters ? semesters : Defaults.Semesters,
            merged,
            programs.Length > 0 ? programs : Defaults.CollegePrograms);
    }

    /// <summary>The catalog as the JSON strings stored under each Academic.* key.</summary>
    public static IReadOnlyDictionary<string, string> ToConfig(AcademicCatalogData data) => new Dictionary<string, string>(StringComparer.Ordinal)
    {
        [SchoolConfigKeys.AcademicStrands] = JsonSerializer.Serialize(data.Strands, Json),
        [SchoolConfigKeys.AcademicTerms] = JsonSerializer.Serialize(data.Terms, Json),
        [SchoolConfigKeys.AcademicSemesters] = JsonSerializer.Serialize(data.Semesters, Json),
        [SchoolConfigKeys.AcademicYearLevels] = JsonSerializer.Serialize(data.YearLevels, Json),
        [SchoolConfigKeys.AcademicPrograms] = JsonSerializer.Serialize(data.CollegePrograms, Json),
    };

    // ---- Validation of what an admin saves ---------------------------------

    public static string ValidateList(string label, string json, bool allowEmpty = false)
    {
        var items = ParseStrings(label, json);
        if (items.Count == 0 && !allowEmpty) throw new InvalidSchoolConfigException($"Add at least one {label}.");
        return JsonSerializer.Serialize(items, Json);
    }

    public static string ValidateYearLevels(string json)
    {
        Dictionary<string, string[]>? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<Dictionary<string, string[]>>(json, Json);
        }
        catch (JsonException)
        {
            throw new InvalidSchoolConfigException("The year levels could not be read.");
        }

        parsed ??= new();
        var clean = new Dictionary<string, List<string>>(StringComparer.Ordinal);
        foreach (var (category, levels) in parsed)
        {
            if (!AcademicStructure.IsKnownCategory(category))
            {
                throw new InvalidSchoolConfigException($"'{category}' is not an academic category.");
            }

            var items = Clean($"{category} level", levels);
            if (items.Count == 0) throw new InvalidSchoolConfigException($"{category} needs at least one level.");
            clean[category] = items;
        }

        // A protected level may not leave the category that owns it.
        foreach (var protectedLevel in ProtectedLevels)
        {
            var owner = Defaults.YearLevels.First(d => d.Value.Contains(protectedLevel)).Key;
            if (clean.TryGetValue(owner, out var kept) && !kept.Contains(protectedLevel, StringComparer.OrdinalIgnoreCase))
            {
                throw new InvalidSchoolConfigException($"'{protectedLevel}' can't be removed from {owner}: the age policy and scholarship rules depend on it.");
            }
        }

        return JsonSerializer.Serialize(clean, Json);
    }

    public static string ValidatePrograms(string json)
    {
        CatalogProgram[]? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<CatalogProgram[]>(json, Json);
        }
        catch (JsonException)
        {
            throw new InvalidSchoolConfigException("The programs could not be read.");
        }

        var clean = new List<CatalogProgram>();
        foreach (var program in parsed ?? Array.Empty<CatalogProgram>())
        {
            var code = (program.Code ?? string.Empty).Trim().ToUpperInvariant();
            var name = (program.Name ?? string.Empty).Trim();
            if (code.Length is 0 or > 20 || !code.All(char.IsLetterOrDigit))
            {
                throw new InvalidSchoolConfigException("A program code is 1 to 20 letters or digits, like BSIT.");
            }

            if (name.Length is 0 or > 150)
            {
                throw new InvalidSchoolConfigException($"Give {code} a name (150 characters at most).");
            }

            if (clean.Any(p => p.Code == code)) throw new InvalidSchoolConfigException($"The program code {code} is listed twice.");
            clean.Add(new CatalogProgram(code, name));
        }

        if (clean.Count == 0) throw new InvalidSchoolConfigException("Add at least one College program.");
        if (clean.Count > MaxItems) throw new InvalidSchoolConfigException($"At most {MaxItems} programs.");
        return JsonSerializer.Serialize(clean, Json);
    }

    private static List<string> ParseStrings(string label, string json)
    {
        string[]? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<string[]>(json, Json);
        }
        catch (JsonException)
        {
            throw new InvalidSchoolConfigException($"The {label} list could not be read.");
        }

        return Clean(label, parsed ?? Array.Empty<string>());
    }

    private static List<string> Clean(string label, IEnumerable<string> raw)
    {
        var items = new List<string>();
        foreach (var item in raw)
        {
            var value = (item ?? string.Empty).Trim();
            if (value.Length == 0) continue;
            if (value.Length > MaxLength) throw new InvalidSchoolConfigException($"A {label} is too long (80 characters at most).");
            if (items.Contains(value, StringComparer.OrdinalIgnoreCase)) throw new InvalidSchoolConfigException($"'{value}' is listed twice.");
            items.Add(value);
        }

        if (items.Count > MaxItems) throw new InvalidSchoolConfigException($"At most {MaxItems} entries.");
        return items;
    }
}
