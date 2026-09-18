using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface IScholarshipRepository
{
    /// <summary>Active scholarships with at least one remaining slot, for applicants to browse.</summary>
    Task<IReadOnlyList<Scholarship>> GetAvailableAsync(CancellationToken cancellationToken = default);

    /// <summary>Every scholarship regardless of active status or remaining slots, for the Evaluator slots view (read-only).</summary>
    Task<IReadOnlyList<Scholarship>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>A single scholarship by id, or null if none exists.</summary>
    Task<Scholarship?> GetByIdAsync(int scholarshipId, CancellationToken cancellationToken = default);

    /// <summary>Admin-only (BISAASS-32): creates a new scholarship slot. RemainingSlots starts equal to TotalSlots; IsActive defaults to true.</summary>
    Task<Scholarship> CreateAsync(
        string name,
        string scholarshipType,
        int totalSlots,
        decimal? minimumGradeAverage,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Admin-only (BISAASS-32): updates a scholarship's catalog fields.
    /// RemainingSlots shifts by the same delta as TotalSlots so the number
    /// of already-occupied slots is preserved - the caller is responsible
    /// for rejecting a totalSlots below the current occupied count before
    /// calling this (see AdminScholarshipsService.UpdateAsync). Returns
    /// null if no scholarship with that id exists.
    /// </summary>
    Task<Scholarship?> UpdateAsync(
        int scholarshipId,
        string name,
        string scholarshipType,
        int totalSlots,
        decimal? minimumGradeAverage,
        CancellationToken cancellationToken = default);

    /// <summary>Admin-only (BISAASS-32): activates or deactivates a scholarship. Returns null if no scholarship with that id exists.</summary>
    Task<Scholarship?> SetActiveStatusAsync(int scholarshipId, bool isActive, CancellationToken cancellationToken = default);
}
