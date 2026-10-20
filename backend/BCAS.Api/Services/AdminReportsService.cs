using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AdminReportsService : IAdminReportsService
{
    private readonly IAdminReportsRepository _reportsRepository;
    private readonly IScholarshipRepository _scholarshipRepository;

    public AdminReportsService(IAdminReportsRepository reportsRepository, IScholarshipRepository scholarshipRepository)
    {
        _reportsRepository = reportsRepository;
        _scholarshipRepository = scholarshipRepository;
    }

    public async Task<IReadOnlyList<EnrollmentListItemResponse>> GetEnrollmentListAsync(
        string? program, string? applicationType, CancellationToken cancellationToken = default)
    {
        var items = await _reportsRepository.GetEnrollmentListAsync(program, applicationType, cancellationToken);
        return items.Select(i => i.ToResponse()).ToList();
    }

    public async Task<EnrollmentSummaryResponse> GetEnrollmentSummaryAsync(string? program = null, CancellationToken cancellationToken = default)
    {
        var enrolled = await _reportsRepository.GetEnrollmentListAsync(program, null, cancellationToken);

        var byProgram = enrolled
            .GroupBy(e => e.CourseAppliedFor, StringComparer.Ordinal)
            .Select(g => new ProgramCountResponse { Program = g.Key, Count = g.Count() })
            .OrderByDescending(p => p.Count)
            .ThenBy(p => p.Program, StringComparer.Ordinal)
            .ToList();

        var byApplicationType = enrolled
            .GroupBy(e => e.ApplicationType, StringComparer.Ordinal)
            .Select(g => new ApplicationTypeCountResponse { ApplicationType = g.Key, Count = g.Count() })
            .OrderByDescending(t => t.Count)
            .ThenBy(t => t.ApplicationType, StringComparer.Ordinal)
            .ToList();

        return new EnrollmentSummaryResponse
        {
            TotalEnrolled = enrolled.Count,
            ByProgram = byProgram,
            ByApplicationType = byApplicationType,
        };
    }

    public async Task<IReadOnlyList<SectionFileResponse>> GetSectionFilesAsync(string? program = null, CancellationToken cancellationToken = default)
    {
        var enrolled = await _reportsRepository.GetEnrollmentListAsync(program, null, cancellationToken);

        return enrolled
            .GroupBy(e => e.CourseAppliedFor, StringComparer.Ordinal)
            .OrderBy(g => g.Key, StringComparer.Ordinal)
            .Select(g => new SectionFileResponse
            {
                Section = g.Key,
                Students = g.OrderBy(e => e.ApplicantName, StringComparer.Ordinal).Select(e => e.ToResponse()).ToList(),
            })
            .ToList();
    }

    public async Task<byte[]> ExportEnrollmentListAsync(
        string? program, string? applicationType, CancellationToken cancellationToken = default)
    {
        var items = await GetEnrollmentListAsync(program, applicationType, cancellationToken);

        var headers = new List<string> { "Applicant", "Email", "Type", "Program", "Previous School", "Submitted", "Reservation Fee", "Reserved At" };
        var rows = items.Select(i => (IReadOnlyList<string>)new List<string>
        {
            i.ApplicantName,
            i.ApplicantEmail,
            i.ApplicationType,
            i.CourseAppliedFor,
            i.PreviousSchool ?? string.Empty,
            i.SubmittedAt.ToString("yyyy-MM-dd"),
            i.ReservationFee?.ToString("0.00") ?? string.Empty,
            i.ReservedAt?.ToString("yyyy-MM-dd") ?? string.Empty,
        }).ToList();

        return XlsxWriter.Write("Enrollment List", headers, rows);
    }

    public async Task<byte[]> ExportEnrollmentSummaryAsync(string? program = null, CancellationToken cancellationToken = default)
    {
        var summary = await GetEnrollmentSummaryAsync(program, cancellationToken);

        var headers = new List<string> { "Summary of Enrollment" };
        var rows = new List<IReadOnlyList<string>>
        {
            new List<string> { "Total Enrolled", summary.TotalEnrolled.ToString() },
            Array.Empty<string>(),
            new List<string> { "By Program" },
            new List<string> { "Program", "Count" },
        };
        rows.AddRange(summary.ByProgram.Select(p => (IReadOnlyList<string>)new List<string> { p.Program, p.Count.ToString() }));
        rows.Add(Array.Empty<string>());
        rows.Add(new List<string> { "By Application Type" });
        rows.Add(new List<string> { "Application Type", "Count" });
        rows.AddRange(summary.ByApplicationType.Select(t => (IReadOnlyList<string>)new List<string> { t.ApplicationType, t.Count.ToString() }));

        return XlsxWriter.Write("Enrollment Summary", headers, rows);
    }

    public async Task<byte[]> ExportSectionFilesAsync(string? program = null, CancellationToken cancellationToken = default)
    {
        var sections = await GetSectionFilesAsync(program, cancellationToken);

        var headers = new List<string> { "File per Section" };
        var rows = new List<IReadOnlyList<string>>();
        foreach (var section in sections)
        {
            rows.Add(Array.Empty<string>());
            rows.Add(new List<string> { section.Section });
            rows.Add(new List<string> { "Applicant", "Email", "Type", "Submitted" });
            rows.AddRange(section.Students.Select(s => (IReadOnlyList<string>)new List<string>
            {
                s.ApplicantName, s.ApplicantEmail, s.ApplicationType, s.SubmittedAt.ToString("yyyy-MM-dd"),
            }));
        }

        return XlsxWriter.Write("File per Section", headers, rows);
    }

    public async Task<IReadOnlyList<ScholarshipApplicantListItemResponse>> GetScholarshipApplicantListAsync(
        string? scholarshipName, string? status, CancellationToken cancellationToken = default)
    {
        var items = await _reportsRepository.GetScholarshipApplicantListAsync(scholarshipName, status, cancellationToken);
        return items.Select(i => i.ToResponse()).ToList();
    }

    public async Task<IReadOnlyList<ScholarshipQualificationListItemResponse>> GetScholarshipQualificationListAsync(
        string? verdict, CancellationToken cancellationToken = default)
    {
        var items = await _reportsRepository.GetScholarshipQualificationListAsync(verdict, cancellationToken);
        return items.Select(i => i.ToResponse()).ToList();
    }

    public async Task<IReadOnlyList<ScholarshipResultListItemResponse>> GetScholarshipResultListAsync(
        string? decision, CancellationToken cancellationToken = default)
    {
        var items = await _reportsRepository.GetScholarshipResultListAsync(decision, cancellationToken);
        return items.Select(i => i.ToResponse()).ToList();
    }

    public async Task<IReadOnlyList<AdminScholarshipResponse>> GetScholarshipSlotReportAsync(CancellationToken cancellationToken = default)
    {
        var scholarships = await _scholarshipRepository.GetAllAsync(cancellationToken);
        return scholarships.Select(s => s.ToAdminResponse()).ToList();
    }

    public async Task<ScholarshipContractResponse> GetScholarshipContractAsync(Guid applicationId, CancellationToken cancellationToken = default)
    {
        var result = await _reportsRepository.GetScholarshipResultByApplicationIdAsync(applicationId, cancellationToken);
        if (result is null || result.Status != "Approved")
        {
            throw new ScholarshipContractNotAvailableException(applicationId);
        }

        return result.ToContractResponse();
    }

    public async Task<ApplicationTrendResponse> GetApplicationTrendAsync(
        string? program, int weeks, CancellationToken cancellationToken = default)
    {
        var clampedWeeks = Math.Clamp(weeks <= 0 ? ReportTrendConstants.DefaultTrendWeeks : weeks, 1, ReportTrendConstants.MaxTrendWeeks);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var currentWeekStart = today.AddDays(-DayOfWeekOffset(today));
        var sinceWeekStart = currentWeekStart.AddDays(-7 * (clampedWeeks - 1));

        var rows = await _reportsRepository.GetWeeklyApplicationCountsAsync(sinceWeekStart, program, cancellationToken);
        var countsByWeek = rows
            .GroupBy(r => r.WeekStart)
            .ToDictionary(
                g => g.Key,
                g => (
                    Admission: g.Where(r => r.Category == "Admission").Sum(r => r.Count),
                    Scholarship: g.Where(r => r.Category == "Scholarship").Sum(r => r.Count)));

        var weekly = new List<WeeklyTrendPointResponse>(clampedWeeks);
        for (var weekStart = sinceWeekStart; weekStart <= currentWeekStart; weekStart = weekStart.AddDays(7))
        {
            var counts = countsByWeek.TryGetValue(weekStart, out var found) ? found : (Admission: 0, Scholarship: 0);
            weekly.Add(new WeeklyTrendPointResponse
            {
                WeekStart = weekStart,
                AdmissionCount = counts.Admission,
                ScholarshipCount = counts.Scholarship,
            });
        }

        return new ApplicationTrendResponse { Weekly = weekly };
    }

    public async Task<ApplicationFunnelResponse> GetApplicationFunnelAsync(string? program, CancellationToken cancellationToken = default)
    {
        var admissionCounts = await _reportsRepository.GetAdmissionFunnelCountsAsync(program, cancellationToken);
        var scholarshipCounts = await _reportsRepository.GetScholarshipFunnelCountsAsync(cancellationToken);

        return new ApplicationFunnelResponse
        {
            AdmissionFunnel = ProjectOntoStageOrder(admissionCounts, ReportTrendConstants.AdmissionFunnelStages),
            ScholarshipFunnel = ProjectOntoStageOrder(scholarshipCounts, ReportTrendConstants.ScholarshipFunnelStages),
        };
    }

    private static IReadOnlyList<FunnelStageCountResponse> ProjectOntoStageOrder(
        IReadOnlyList<(string Status, int Count)> counts, IReadOnlyList<string> stageOrder)
    {
        var countByStatus = counts.ToDictionary(c => c.Status, c => c.Count, StringComparer.Ordinal);
        return stageOrder
            .Select(stage => new FunnelStageCountResponse { Stage = stage, Count = countByStatus.GetValueOrDefault(stage) })
            .ToList();
    }

    /// <summary>Days to subtract from `date` to reach that week's Monday (DayOfWeek.Sunday = 0, so Sunday needs -6, not -0).</summary>
    private static int DayOfWeekOffset(DateOnly date) =>
        date.DayOfWeek == DayOfWeek.Sunday ? 6 : (int)date.DayOfWeek - 1;
}
