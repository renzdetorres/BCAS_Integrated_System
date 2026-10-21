using System.Text.Json;
using BCAS.Api.Exceptions;

namespace BCAS.Api.Constants;

/// <summary>One way the school accepts the entrance exam fee, with everything an applicant needs to pay that way.</summary>
public sealed record PaymentMethod(string Name, string AccountName, string AccountNumber, string Instructions, string QrImage);

/// <summary>
/// The payment methods an admin sets up (GCash, a bank, the cashier...). They are stored as one JSON list under
/// <see cref="SchoolConfigKeys.PaymentMethods"/>. Until an admin sets any up, the older single account name,
/// instructions and QR code are offered as one method, so nothing changes for a school that never touches this.
/// </summary>
public static class PaymentMethods
{
    public const int MaxMethods = 6;
    public const int MaxNameLength = 30; // the length of dbo.ExamPayments.PaymentType, where the chosen name is kept
    public const int MaxAccountNameLength = 200;
    public const int MaxAccountNumberLength = 60;
    public const int MaxInstructionsLength = 1000;
    public const int MaxQrImageChars = 1_500_000;

    /// <summary>What the old single payment setup is called when it is shown as a method.</summary>
    public const string LegacyName = "QR payment";

    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    /// <summary>Reads a stored list; anything unreadable is treated as "none set up" so a bad value can never break the payment page.</summary>
    public static IReadOnlyList<PaymentMethod> Parse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return Array.Empty<PaymentMethod>();
        try
        {
            var items = JsonSerializer.Deserialize<List<PaymentMethodInput>>(json, Json) ?? new();
            return items.Where(i => !string.IsNullOrWhiteSpace(i?.Name)).Select(i => i!.ToMethod()).ToList();
        }
        catch (JsonException)
        {
            return Array.Empty<PaymentMethod>();
        }
    }

    /// <summary>Checks an admin's list and returns it in its stored form. An empty list (or blank) means "none set up" and is stored as blank.</summary>
    public static string Normalize(string json)
    {
        List<PaymentMethodInput>? items;
        try
        {
            items = JsonSerializer.Deserialize<List<PaymentMethodInput>>(json, Json);
        }
        catch (JsonException)
        {
            throw new InvalidSchoolConfigException("The payment methods could not be read. Reload the page and try again.");
        }

        if (items is null || items.Count == 0) return string.Empty;
        if (items.Count > MaxMethods) throw new InvalidSchoolConfigException($"You can set up at most {MaxMethods} payment methods.");

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var clean = new List<PaymentMethod>();
        foreach (var item in items)
        {
            var method = (item ?? new PaymentMethodInput()).ToMethod();
            if (method.Name.Length == 0) throw new InvalidSchoolConfigException("Give every payment method a name, such as GCash or Bank transfer.");
            if (method.Name.Length > MaxNameLength) throw new InvalidSchoolConfigException($"A payment method's name can be at most {MaxNameLength} characters ('{method.Name[..20]}...').");
            if (!seen.Add(method.Name)) throw new InvalidSchoolConfigException($"Two payment methods are named '{method.Name}'. Give each one its own name.");
            if (method.AccountName.Length > MaxAccountNameLength) throw new InvalidSchoolConfigException($"The account name for '{method.Name}' is too long.");
            if (method.AccountNumber.Length > MaxAccountNumberLength) throw new InvalidSchoolConfigException($"The account number for '{method.Name}' is too long.");
            if (method.Instructions.Length > MaxInstructionsLength) throw new InvalidSchoolConfigException($"The instructions for '{method.Name}' are too long ({MaxInstructionsLength} characters at most).");

            if (method.QrImage.Length > 0)
            {
                if (!(method.QrImage.StartsWith("data:image/png;base64,", StringComparison.Ordinal) || method.QrImage.StartsWith("data:image/jpeg;base64,", StringComparison.Ordinal)))
                    throw new InvalidSchoolConfigException($"The QR code for '{method.Name}' must be a PNG or JPG image.");
                if (method.QrImage.Length > MaxQrImageChars)
                    throw new InvalidSchoolConfigException($"The QR code for '{method.Name}' is too large. Use one under 1 MB.");
            }

            if (method.QrImage.Length == 0 && method.AccountNumber.Length == 0 && method.Instructions.Length == 0)
                throw new InvalidSchoolConfigException($"Add a QR code, an account number or instructions to '{method.Name}' so applicants know how to pay.");

            clean.Add(method);
        }

        return JsonSerializer.Serialize(clean, Json);
    }

    /// <summary>The methods applicants can choose from: the admin's list, or the old single setup as one method.</summary>
    public static IReadOnlyList<PaymentMethod> Resolve(IReadOnlyDictionary<string, string> config)
    {
        var configured = Parse(config.GetValueOrDefault(SchoolConfigKeys.PaymentMethods));
        if (configured.Count > 0) return configured;

        return new[]
        {
            new PaymentMethod(
                LegacyName,
                config.GetValueOrDefault(SchoolConfigKeys.PaymentAccountName) ?? string.Empty,
                string.Empty,
                config.GetValueOrDefault(SchoolConfigKeys.PaymentInstructions) ?? string.Empty,
                config.GetValueOrDefault(SchoolConfigKeys.PaymentQrImage) ?? string.Empty),
        };
    }

    /// <summary>The method an applicant named (or the only one there is); null when the choice is missing or is not one the school offers.</summary>
    public static PaymentMethod? Choose(IReadOnlyList<PaymentMethod> methods, string? requested)
    {
        if (string.IsNullOrWhiteSpace(requested)) return methods.Count == 1 ? methods[0] : null;
        return methods.FirstOrDefault(m => string.Equals(m.Name, requested.Trim(), StringComparison.OrdinalIgnoreCase));
    }

    private sealed class PaymentMethodInput
    {
        public string? Name { get; set; }
        public string? AccountName { get; set; }
        public string? AccountNumber { get; set; }
        public string? Instructions { get; set; }
        public string? QrImage { get; set; }

        public PaymentMethod ToMethod() =>
            new((Name ?? string.Empty).Trim(), (AccountName ?? string.Empty).Trim(), (AccountNumber ?? string.Empty).Trim(), (Instructions ?? string.Empty).Trim(), (QrImage ?? string.Empty).Trim());
    }
}
