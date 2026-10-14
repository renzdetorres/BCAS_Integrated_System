using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface ISchoolConfigRepository
{
    /// <summary>Every stored config row.</summary>
    Task<IReadOnlyList<SchoolConfigEntry>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>Inserts or replaces each given key's value.</summary>
    Task UpsertManyAsync(IReadOnlyDictionary<string, string> values, CancellationToken cancellationToken = default);
}
