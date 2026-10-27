using System.Text.Json;
using BCAS.Api.Exceptions;

namespace BCAS.Api.Constants;

/// <summary>
/// How many admission slots each level has. Stored as JSON under <see cref="SchoolConfigKeys.AdmissionLevelSlots"/>,
/// grouped by academic category and then level: {"High School":{"Grade 7":40}}. A level with no entry has no limit,
/// so nothing changes for a school that never sets one. A limit of 0 closes a level.
/// </summary>
public static class AdmissionLevelSlots
{
    public const int MaxSlots = 100_000;

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    /// <summary>Reads the stored limits; anything unreadable counts as "none set" so a bad value can never block applications.</summary>
    public static Dictionary<string, Dictionary<string, int>> Parse(string? json)
    {
        var limits = new Dictionary<string, Dictionary<string, int>>(StringComparer.Ordinal);
        if (string.IsNullOrWhiteSpace(json)) return limits;

        try
        {
            var parsed = JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, int>>>(json, Json);
            if (parsed is null) return limits;

            foreach (var (category, levels) in parsed)
            {
                if (levels is { Count: > 0 }) limits[category] = new Dictionary<string, int>(levels, StringComparer.Ordinal);
            }
        }
        catch (JsonException)
        {
            // Treated as no limits at all.
        }

        return limits;
    }

    /// <summary>The limit for one level, or null when it has none.</summary>
    public static int? LimitFor(IReadOnlyDictionary<string, Dictionary<string, int>> limits, string category, string level) =>
        limits.TryGetValue(category, out var levels) && levels.TryGetValue(level, out var slots) ? slots : null;

    /// <summary>Checks what an admin saves and returns it in its stored form. An empty list is stored as blank, meaning no limits.</summary>
    public static string Normalize(string json)
    {
        Dictionary<string, Dictionary<string, int?>>? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<Dictionary<string, Dictionary<string, int?>>>(json, Json);
        }
        catch (JsonException)
        {
            throw new InvalidSchoolConfigException("The admission slots could not be read. Reload the page and try again.");
        }

        var clean = new Dictionary<string, Dictionary<string, int>>(StringComparer.Ordinal);
        foreach (var (category, levels) in parsed ?? new())
        {
            if (!AcademicStructure.IsKnownCategory(category))
            {
                throw new InvalidSchoolConfigException($"'{category}' is not an academic category.");
            }

            foreach (var (level, slots) in levels ?? new())
            {
                // A blank limit means "no limit": it is simply not stored.
                if (slots is null) continue;

                if (string.IsNullOrWhiteSpace(level) || level.Length > 80)
                {
                    throw new InvalidSchoolConfigException("A level name is missing or too long.");
                }

                if (slots < 0 || slots > MaxSlots)
                {
                    throw new InvalidSchoolConfigException($"Slots for {level} must be a whole number from 0 to {MaxSlots:N0}.");
                }

                if (!clean.TryGetValue(category, out var stored))
                {
                    stored = new Dictionary<string, int>(StringComparer.Ordinal);
                    clean[category] = stored;
                }

                stored[level.Trim()] = slots.Value;
            }
        }

        return clean.Count == 0 ? string.Empty : JsonSerializer.Serialize(clean, Json);
    }
}
