using BCAS.Api.Models;

namespace BCAS.Api.Data;

public interface ISemesterRepository
{
    /// <summary>Every semester, most recent start first.</summary>
    Task<IReadOnlyList<Semester>> GetAllAsync(CancellationToken cancellationToken = default);

    /// <summary>The semester containing `date` (inclusive), or null.</summary>
    Task<Semester?> GetOngoingAsync(DateOnly date, CancellationToken cancellationToken = default);

    /// <summary>Whether any semester overlaps start..end (inclusive).</summary>
    Task<bool> OverlapsAsync(DateOnly start, DateOnly end, CancellationToken cancellationToken = default);

    Task<Semester> CreateAsync(string name, DateOnly start, DateOnly end, Guid createdByUserId, CancellationToken cancellationToken = default);

    /// <summary>Deletes a semester; false if it didn't exist.</summary>
    Task<bool> DeleteAsync(int semesterId, CancellationToken cancellationToken = default);
}
