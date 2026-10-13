using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class DashboardService : IDashboardService
{
    private const string ScholarshipDeadlineType = "ScholarshipDeadline";

    private readonly IDeadlineRepository _deadlineRepository;
    private readonly IScholarshipRepository _scholarshipRepository;
    private readonly ISystemSettingsRepository _systemSettingsRepository;

    public DashboardService(
        IDeadlineRepository deadlineRepository,
        IScholarshipRepository scholarshipRepository,
        ISystemSettingsRepository systemSettingsRepository)
    {
        _deadlineRepository = deadlineRepository;
        _scholarshipRepository = scholarshipRepository;
        _systemSettingsRepository = systemSettingsRepository;
    }

    public async Task<IReadOnlyList<DeadlineResponse>> GetUpcomingDeadlinesAsync(CancellationToken cancellationToken = default)
    {
        var deadlines = await _deadlineRepository.GetUpcomingAsync(cancellationToken);

        // The scholarship deadline is a standalone row, so it has to be hidden
        // here once there is nothing to apply for: either an Admin closed
        // scholarship applications, or every scholarship has been deactivated.
        if (deadlines.Any(d => d.DeadlineType == ScholarshipDeadlineType)
            && !await AreScholarshipsOpenAsync(cancellationToken))
        {
            deadlines = deadlines.Where(d => d.DeadlineType != ScholarshipDeadlineType).ToList();
        }

        return deadlines
            .Select(d => new DeadlineResponse
            {
                Type = d.DeadlineType,
                Title = d.Title,
                Date = d.DeadlineDate,
            })
            .ToList();
    }

    private async Task<bool> AreScholarshipsOpenAsync(CancellationToken cancellationToken)
    {
        if (!await _systemSettingsRepository.IsEnabledAsync(SystemSettingKeys.ScholarshipApplicationsOpen, cancellationToken))
        {
            return false;
        }

        return (await _scholarshipRepository.GetAvailableAsync(cancellationToken)).Count > 0;
    }
}
