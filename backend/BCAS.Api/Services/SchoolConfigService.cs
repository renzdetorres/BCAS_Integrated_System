using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface ISchoolConfigService
{
    /// <summary>Every known key with its stored value, or its default when never saved.</summary>
    Task<IReadOnlyDictionary<string, string>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<string> GetAsync(string key, CancellationToken cancellationToken = default);

    Task<int> GetIntAsync(string key, CancellationToken cancellationToken = default);

    /// <summary>Validates and saves the given values. Throws InvalidSchoolConfigException for an unknown key or a bad value.</summary>
    Task SaveAsync(IReadOnlyDictionary<string, string?> values, CancellationToken cancellationToken = default);

    /// <summary>The academic year, age policy and cutoff the applicant form and eligibility checks use.</summary>
    Task<AdmissionConfigResponse> GetAdmissionConfigAsync(DateOnly today, CancellationToken cancellationToken = default);
}

public class SchoolConfigService : ISchoolConfigService
{
    private const int MaxQrImageChars = 1_500_000;

    private readonly ISchoolConfigRepository _repository;

    public SchoolConfigService(ISchoolConfigRepository repository)
    {
        _repository = repository;
    }

    public async Task<IReadOnlyDictionary<string, string>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        var stored = (await _repository.GetAllAsync(cancellationToken)).ToDictionary(e => e.ConfigKey, e => e.Value, StringComparer.Ordinal);

        // A stored blank falls back to the default only for settings that have a
        // non-blank default; blank is a real value for the rest (e.g. no QR yet).
        return SchoolConfigKeys.Defaults.ToDictionary(
            d => d.Key,
            d => stored.TryGetValue(d.Key, out var value) && (value.Length > 0 || d.Value.Length == 0) ? value : d.Value,
            StringComparer.Ordinal);
    }

    public async Task<string> GetAsync(string key, CancellationToken cancellationToken = default) =>
        (await GetAllAsync(cancellationToken)).TryGetValue(key, out var value) ? value : string.Empty;

    public async Task<int> GetIntAsync(string key, CancellationToken cancellationToken = default) =>
        int.TryParse(await GetAsync(key, cancellationToken), out var number) ? number : int.Parse(SchoolConfigKeys.Defaults[key]);

    public async Task SaveAsync(IReadOnlyDictionary<string, string?> values, CancellationToken cancellationToken = default)
    {
        var clean = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var (key, raw) in values)
        {
            if (!SchoolConfigKeys.Defaults.ContainsKey(key))
            {
                throw new InvalidSchoolConfigException($"'{key}' is not a known setting.");
            }

            var value = (raw ?? string.Empty).Trim();
            Validate(key, value);
            clean[key] = NormalizeAcademicList(key, value);
        }

        await _repository.UpsertManyAsync(clean, cancellationToken);

        // The validators read the live snapshot, so it is refreshed as soon as an admin saves.
        AcademicCatalog.Apply(await GetAllAsync(cancellationToken));
    }

    public async Task<AdmissionConfigResponse> GetAdmissionConfigAsync(DateOnly today, CancellationToken cancellationToken = default)
    {
        var all = await GetAllAsync(cancellationToken);

        var academicYear = all[SchoolConfigKeys.AdmissionAcademicYear];
        if (academicYear.Length == 0)
        {
            academicYear = AcademicStructure.AcademicYearFor(today);
        }

        return new AdmissionConfigResponse
        {
            AcademicYear = academicYear,
            PreKinderMinAge = int.Parse(all[SchoolConfigKeys.PreKinderMinAge]),
            KinderMinAge = int.Parse(all[SchoolConfigKeys.KinderMinAge]),
            AgeCutoffMonth = int.Parse(all[SchoolConfigKeys.AgeCutoffMonth]),
            AgeCutoffYear = int.Parse(academicYear[..4]),
        };
    }

    /// <summary>Checks an academic list and returns it in its stored JSON form. A blank value resets the list to its default.</summary>
    private static string NormalizeAcademicList(string key, string value)
    {
        if (value.Length == 0) return value;

        return key switch
        {
            SchoolConfigKeys.AcademicStrands => AcademicCatalog.ValidateList("strand", value),
            SchoolConfigKeys.AcademicTerms => AcademicCatalog.ValidateList("term", value),
            SchoolConfigKeys.AcademicSemesters => AcademicCatalog.ValidateList("semester", value),
            SchoolConfigKeys.AcademicYearLevels => AcademicCatalog.ValidateYearLevels(value),
            SchoolConfigKeys.AcademicPrograms => AcademicCatalog.ValidatePrograms(value),
            SchoolConfigKeys.PaymentMethods => PaymentMethods.Normalize(value),
            SchoolConfigKeys.AdmissionLevelSlots => AdmissionLevelSlots.Normalize(value),
            _ => value,
        };
    }

    private static void Validate(string key, string value)
    {
        switch (key)
        {
            case SchoolConfigKeys.AdmissionAcademicYear:
                if (value.Length > 0 && !AcademicStructure.IsValidAcademicYear(value))
                {
                    throw new InvalidSchoolConfigException("Academic year must look like 2026-2027 (two consecutive years).");
                }

                break;
            case SchoolConfigKeys.PreKinderMinAge:
            case SchoolConfigKeys.KinderMinAge:
                if (!int.TryParse(value, out var age) || age < 1 || age > 12)
                {
                    throw new InvalidSchoolConfigException("A minimum age must be a whole number from 1 to 12.");
                }

                break;
            case SchoolConfigKeys.AgeCutoffMonth:
                if (!int.TryParse(value, out var month) || month < 1 || month > 12)
                {
                    throw new InvalidSchoolConfigException("The age cutoff month must be a number from 1 to 12.");
                }

                break;
            case SchoolConfigKeys.ExamFee:
                if (!decimal.TryParse(value, out var fee) || fee < 0 || fee > 1_000_000)
                {
                    throw new InvalidSchoolConfigException("The exam fee must be an amount of 0 or more.");
                }

                break;
            case SchoolConfigKeys.PaymentQrImage:
                if (value.Length > 0 && !(value.StartsWith("data:image/png;base64,", StringComparison.Ordinal) || value.StartsWith("data:image/jpeg;base64,", StringComparison.Ordinal)))
                {
                    throw new InvalidSchoolConfigException("The QR code must be a PNG or JPG image.");
                }

                if (value.Length > MaxQrImageChars)
                {
                    throw new InvalidSchoolConfigException("The QR code image is too large. Use one under 1 MB.");
                }

                break;
            case SchoolConfigKeys.ExamTotalItems:
                if (!int.TryParse(value, out var items) || items < 1 || items > 999)
                {
                    throw new InvalidSchoolConfigException("The number of exam items must be a whole number from 1 to 999.");
                }

                break;
            case SchoolConfigKeys.ExamPassingScore:
                if (!decimal.TryParse(value, out var passing) || passing < 0 || passing > 999)
                {
                    throw new InvalidSchoolConfigException("The passing score must be a number of 0 or more.");
                }

                break;
            case SchoolConfigKeys.ExamMaxRetakes:
                if (!int.TryParse(value, out var retakes) || retakes < 0 || retakes > 10)
                {
                    throw new InvalidSchoolConfigException("Retakes allowed must be a whole number from 0 to 10.");
                }

                break;
            case SchoolConfigKeys.PaymentAccountName:
                if (value.Length > 200) throw new InvalidSchoolConfigException("The account name is too long.");
                break;
            case SchoolConfigKeys.PaymentInstructions:
                if (value.Length > 1000) throw new InvalidSchoolConfigException("The payment instructions are too long (1000 characters at most).");
                break;
        }
    }
}
