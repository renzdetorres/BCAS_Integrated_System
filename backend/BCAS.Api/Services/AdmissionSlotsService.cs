using System.Text.Json;
using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IAdmissionSlotsService
{
    /// <summary>Every level of every category with its limit and how many slots are taken (the Admission Slots screen).</summary>
    Task<IReadOnlyList<AdmissionLevelSlotResponse>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>Saves the limits. A level with a blank Slots has no limit. Throws InvalidSchoolConfigException for a bad value.</summary>
    Task SaveAsync(IReadOnlyList<AdmissionLevelSlotInput> levels, CancellationToken cancellationToken = default);

    /// <summary>The levels that have a limit, with whether each is full - what an applicant is shown.</summary>
    Task<IReadOnlyList<AdmissionSlotAvailabilityResponse>> GetAvailabilityAsync(CancellationToken cancellationToken = default);

    /// <summary>True when the level has a limit and every slot is already taken.</summary>
    Task<bool> IsFullAsync(string category, string level, CancellationToken cancellationToken = default);
}

public class AdmissionSlotsService : IAdmissionSlotsService
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly ISchoolConfigService _schoolConfig;
    private readonly IAdmissionSlotsRepository _repository;

    public AdmissionSlotsService(ISchoolConfigService schoolConfig, IAdmissionSlotsRepository repository)
    {
        _schoolConfig = schoolConfig;
        _repository = repository;
    }

    public async Task<IReadOnlyList<AdmissionLevelSlotResponse>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var (limits, taken) = await LoadAsync(cancellationToken);

        var rows = new List<AdmissionLevelSlotResponse>();
        foreach (var (category, levels) in AcademicCatalog.Current.YearLevels)
        {
            foreach (var level in levels)
            {
                var slots = AdmissionLevelSlots.LimitFor(limits, category, level);
                var count = taken.GetValueOrDefault((category, level));
                rows.Add(new AdmissionLevelSlotResponse
                {
                    Category = category,
                    Level = level,
                    Slots = slots,
                    Taken = count,
                    Remaining = slots is null ? null : Math.Max(0, slots.Value - count),
                    IsFull = slots is not null && count >= slots.Value,
                });
            }
        }

        return rows;
    }

    public async Task SaveAsync(IReadOnlyList<AdmissionLevelSlotInput> levels, CancellationToken cancellationToken = default)
    {
        var grouped = new Dictionary<string, Dictionary<string, int?>>(StringComparer.Ordinal);
        foreach (var input in levels)
        {
            if (!grouped.TryGetValue(input.Category, out var group))
            {
                group = new Dictionary<string, int?>(StringComparer.Ordinal);
                grouped[input.Category] = group;
            }

            group[input.Level.Trim()] = input.Slots;
        }

        // SaveAsync validates the JSON (known categories, 0 to 100,000) and stores it normalised.
        await _schoolConfig.SaveAsync(
            new Dictionary<string, string?> { [SchoolConfigKeys.AdmissionLevelSlots] = JsonSerializer.Serialize(grouped, Json) },
            cancellationToken);
    }

    public async Task<IReadOnlyList<AdmissionSlotAvailabilityResponse>> GetAvailabilityAsync(CancellationToken cancellationToken = default)
    {
        var all = await GetAllAsync(cancellationToken);
        return all
            .Where(row => row.Slots is not null)
            .Select(row => new AdmissionSlotAvailabilityResponse
            {
                Category = row.Category,
                Level = row.Level,
                IsFull = row.IsFull,
                Message = row.IsFull ? FullMessage(row.Level) : null,
            })
            .ToList();
    }

    public async Task<bool> IsFullAsync(string category, string level, CancellationToken cancellationToken = default)
    {
        var (limits, taken) = await LoadAsync(cancellationToken);
        var slots = AdmissionLevelSlots.LimitFor(limits, category, level);
        return slots is not null && taken.GetValueOrDefault((category, level)) >= slots.Value;
    }

    /// <summary>What the applicant is told when the level has no slot left.</summary>
    public static string FullMessage(string level) =>
        $"Sorry, the admission slot for {level} has been reached.";

    private async Task<(Dictionary<string, Dictionary<string, int>> Limits, IReadOnlyDictionary<(string Category, string Level), int> Taken)> LoadAsync(
        CancellationToken cancellationToken)
    {
        var limits = AdmissionLevelSlots.Parse(await _schoolConfig.GetAsync(SchoolConfigKeys.AdmissionLevelSlots, cancellationToken));
        if (limits.Count == 0)
        {
            return (limits, new Dictionary<(string, string), int>());
        }

        var config = await _schoolConfig.GetAdmissionConfigAsync(DateOnly.FromDateTime(DateTime.UtcNow), cancellationToken);
        return (limits, await _repository.GetTakenAsync(config.AcademicYear, cancellationToken));
    }
}
