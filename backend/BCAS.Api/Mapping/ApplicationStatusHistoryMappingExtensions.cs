using BCAS.Api.Models;

namespace BCAS.Api.Mapping;

public static class ApplicationStatusHistoryMappingExtensions
{
    public static ApplicationStatusHistoryEntryResponse ToResponse(this ApplicationStatusHistoryEntry entry) => new()
    {
        HistoryId = entry.HistoryId,
        FromStatus = entry.FromStatus,
        ToStatus = entry.ToStatus,
        Remarks = entry.Remarks,
        ChangedByName = entry.ChangedByName,
        ChangedAt = entry.ChangedAt,
    };
}
