namespace BCAS.Api.Models;

/// <summary>
/// The outcome of a bulk action applied to a list of ids - each id succeeds
/// or fails independently (one bad row, e.g. already archived, never aborts
/// the rest of the batch), so the caller can see exactly what happened
/// across the whole selection in one response.
/// </summary>
public class BulkOperationResultResponse
{
    public int SucceededCount { get; set; }
    public IReadOnlyList<BulkOperationFailure> Failures { get; set; } = new List<BulkOperationFailure>();
}

public class BulkOperationFailure
{
    public Guid Id { get; set; }
    public string Reason { get; set; } = string.Empty;
}
