using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class SemesterService : ISemesterService
{
    private readonly ISemesterRepository _semesterRepository;
    private readonly ISuperAdminGuard _superAdminGuard;

    public SemesterService(ISemesterRepository semesterRepository, ISuperAdminGuard superAdminGuard)
    {
        _semesterRepository = semesterRepository;
        _superAdminGuard = superAdminGuard;
    }

    public async Task<SemesterOverviewResponse> GetOverviewAsync(Guid callerUserId, CancellationToken cancellationToken = default)
    {
        var today = PhilippineTime.Today;
        var semesters = (await _semesterRepository.GetAllAsync(cancellationToken)).Select(s => ToResponse(s, today)).ToList();

        return new SemesterOverviewResponse
        {
            Semesters = semesters,
            Ongoing = semesters.FirstOrDefault(s => s.IsOngoing),
            CallerIsSuperAdmin = await _superAdminGuard.IsSuperAdminAsync(callerUserId, cancellationToken),
        };
    }

    public Task<Semester?> GetOngoingAsync(CancellationToken cancellationToken = default) =>
        _semesterRepository.GetOngoingAsync(PhilippineTime.Today, cancellationToken);

    public async Task<SemesterResponse> CreateAsync(Guid callerUserId, CreateSemesterRequest request, CancellationToken cancellationToken = default)
    {
        await _superAdminGuard.EnsureAsync(callerUserId, "manage semesters", cancellationToken);

        var start = request.StartDate!.Value;
        var end = request.EndDate!.Value;
        if (end < start)
        {
            throw new InvalidSemesterException("The end date must be on or after the start date.");
        }

        if (await _semesterRepository.OverlapsAsync(start, end, cancellationToken))
        {
            throw new InvalidSemesterException("These dates overlap another semester. Semesters can't overlap.");
        }

        var created = await _semesterRepository.CreateAsync(request.Name.Trim(), start, end, callerUserId, cancellationToken);
        return ToResponse(created, PhilippineTime.Today);
    }

    public async Task DeleteAsync(Guid callerUserId, int semesterId, CancellationToken cancellationToken = default)
    {
        await _superAdminGuard.EnsureAsync(callerUserId, "manage semesters", cancellationToken);

        if (!await _semesterRepository.DeleteAsync(semesterId, cancellationToken))
        {
            throw new SemesterNotFoundException(semesterId);
        }
    }

    private static SemesterResponse ToResponse(Semester semester, DateOnly today) => new()
    {
        SemesterId = semester.SemesterId,
        Name = semester.Name,
        StartDate = semester.StartDate,
        EndDate = semester.EndDate,
        IsOngoing = today >= semester.StartDate && today <= semester.EndDate,
    };
}
