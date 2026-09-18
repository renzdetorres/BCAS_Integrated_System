using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface IAdminApplicationsService
{
    Task<IReadOnlyList<AdminApplicationListItemResponse>> SearchAsync(
        string? search,
        string? status,
        string? category,
        string? program,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Admin-only (BISAASS-31): sets an application's Status, with optional
    /// remarks. Throws InvalidApplicationCategoryException if
    /// request.Category isn't Admission/Scholarship,
    /// InvalidApplicationStatusException if request.Status isn't allowed
    /// for that category, or ApplicationNotFoundException if no
    /// application with that id exists in the given category.
    /// </summary>
    Task<AdminApplicationListItemResponse> UpdateStatusAsync(
        Guid applicationId,
        UpdateApplicationStatusRequest request,
        CancellationToken cancellationToken = default);
}
