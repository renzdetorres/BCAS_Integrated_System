using System.Data;
using BCAS.Api.Constants;
using BCAS.Api.Data;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Services;

/// <summary>Everything the Analytics page draws, for one academic year or all of them.</summary>
public class AdmissionAnalyticsResponse
{
    /// <summary>The year the figures are for, or empty for all years.</summary>
    public string AcademicYear { get; set; } = string.Empty;

    /// <summary>The five academic years the picker offers, oldest first.</summary>
    public IReadOnlyList<string> AcademicYears { get; set; } = Array.Empty<string>();

    /// <summary>Applications that reached each stage, in order: submitted, documents cleared, paid, took the exam, passed, interviewed, enrolled.</summary>
    public IReadOnlyList<AnalyticsStageCount> Funnel { get; set; } = Array.Empty<AnalyticsStageCount>();

    public AnalyticsKpis Kpis { get; set; } = new();

    /// <summary>The same figures for the year before, so the page can say whether things improved. Null when there is no earlier year.</summary>
    public AnalyticsKpis? PreviousKpis { get; set; }

    /// <summary>Applications submitted in each of the last 12 weeks (Monday-based), oldest first. Always the most recent weeks, whatever year is picked.</summary>
    public IReadOnlyList<AnalyticsWeek> Weekly { get; set; } = Array.Empty<AnalyticsWeek>();

    public IReadOnlyList<AnalyticsLevelPass> PassByLevel { get; set; } = Array.Empty<AnalyticsLevelPass>();

    /// <summary>Median days each step takes. MedianDays is null when nothing has gone through that step yet.</summary>
    public IReadOnlyList<AnalyticsStepDuration> Steps { get; set; } = Array.Empty<AnalyticsStepDuration>();

    public AnalyticsPayments Payments { get; set; } = new();
    public IReadOnlyList<AnalyticsDocumentFlag> Documents { get; set; } = Array.Empty<AnalyticsDocumentFlag>();

    /// <summary>The five academic years side by side (never narrowed by the year picked), oldest first.</summary>
    public IReadOnlyList<AnalyticsYearPoint> YearTrend { get; set; } = Array.Empty<AnalyticsYearPoint>();

    /// <summary>Applications by level (department) in the selection.</summary>
    public IReadOnlyList<AnalyticsCount> ByLevel { get; set; } = Array.Empty<AnalyticsCount>();

    /// <summary>Applications by type (new student, transferee) in the selection.</summary>
    public IReadOnlyList<AnalyticsCount> ByType { get; set; } = Array.Empty<AnalyticsCount>();

    /// <summary>When applications come in: seven rows (Monday first) of six four-hour blocks (midnight first), in school time.</summary>
    public IReadOnlyList<IReadOnlyList<int>> SubmissionHeat { get; set; } = Array.Empty<IReadOnlyList<int>>();

    /// <summary>How first-attempt exam scores are spread, with the exam's size and passing score.</summary>
    public AnalyticsScores Scores { get; set; } = new();
}

public class AnalyticsYearPoint
{
    public string AcademicYear { get; set; } = string.Empty;
    public int Applicants { get; set; }
    public int Took { get; set; }
    public int Passed { get; set; }
    public int Enrolled { get; set; }
}

public class AnalyticsCount
{
    public string Label { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class AnalyticsScores
{
    public int TotalItems { get; set; }
    public decimal PassingScore { get; set; }
    public IReadOnlyList<AnalyticsScoreBin> Bins { get; set; } = Array.Empty<AnalyticsScoreBin>();
}

public class AnalyticsScoreBin
{
    public double From { get; set; }
    public double To { get; set; }
    public int Count { get; set; }
}

public class AnalyticsStageCount
{
    public string Stage { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class AnalyticsKpis
{
    public int Took { get; set; }
    public int Passed { get; set; }
    public double? MedianDaysToDecision { get; set; }
    public int PaymentsTotal { get; set; }
    public int PaymentsVerified { get; set; }
    public int DocumentsUploaded { get; set; }
    public int DocumentsFlagged { get; set; }
}

public class AnalyticsWeek
{
    public DateOnly WeekStart { get; set; }
    public int Applications { get; set; }
}

public class AnalyticsLevelPass
{
    public string Level { get; set; } = string.Empty;
    public int Took { get; set; }
    public int Passed { get; set; }
}

public class AnalyticsStepDuration
{
    public string Step { get; set; } = string.Empty;
    public double? MedianDays { get; set; }

    /// <summary>The typical range: a quarter of cases were quicker than P25, a quarter slower than P75.</summary>
    public double? P25 { get; set; }
    public double? P75 { get; set; }

    /// <summary>The same step's median the year before, for comparison; null when there is no earlier year or no data.</summary>
    public double? PreviousMedianDays { get; set; }
    public int Samples { get; set; }
}

public class AnalyticsPayments
{
    public int Verified { get; set; }
    public int Pending { get; set; }
    public int Rejected { get; set; }
}

public class AnalyticsDocumentFlag
{
    public string DocumentType { get; set; } = string.Empty;
    public int Uploaded { get; set; }
    public int Flagged { get; set; }
}

public interface IAdmissionAnalyticsService
{
    Task<AdmissionAnalyticsResponse> GetAsync(string? academicYear, CancellationToken cancellationToken = default);
}

public class AdmissionAnalyticsService : IAdmissionAnalyticsService
{
    public const int TrendWeeks = 12;

    public static readonly IReadOnlyList<string> FunnelStages = new[]
    {
        "Submitted", "Documents cleared", "Paid", "Took the exam", "Passed", "Interviewed", "Enrolled",
    };

    public static readonly IReadOnlyList<string> StepNames = new[]
    {
        "Document review", "Payment check", "Exam scoring", "Interview to decision",
    };

    // The academic year starts in June (the same rule the admission summary uses).
    private const string AppCte = @"
WITH app AS (
    SELECT a.ApplicationId, a.UserId, a.Status, a.Department, a.ApplicationType, a.SubmittedAt,
           COALESCE(a.AcademicYear,
                    CASE WHEN MONTH(a.SubmittedAt) >= 6 THEN CONCAT(YEAR(a.SubmittedAt), N'-', YEAR(a.SubmittedAt) + 1)
                         ELSE CONCAT(YEAR(a.SubmittedAt) - 1, N'-', YEAR(a.SubmittedAt)) END) AS AY,
           r.Result AS LastResult,
           CASE WHEN rs.ApplicationId IS NULL THEN 0 ELSE 1 END AS IsReserved
    FROM dbo.AdmissionApplications a
    LEFT JOIN dbo.AdmissionReservations rs ON rs.ApplicationId = a.ApplicationId AND rs.IsReserved = 1
    OUTER APPLY (
        SELECT TOP (1) x.Result FROM dbo.ExamResults x WHERE x.ApplicationId = a.ApplicationId ORDER BY x.Attempt DESC
    ) r
    WHERE a.IsArchived = 0
)";

    private readonly IDbConnectionFactory _connectionFactory;
    private readonly ISchoolConfigService _schoolConfig;

    public AdmissionAnalyticsService(IDbConnectionFactory connectionFactory, ISchoolConfigService schoolConfig)
    {
        _connectionFactory = connectionFactory;
        _schoolConfig = schoolConfig;
    }

    public async Task<AdmissionAnalyticsResponse> GetAsync(string? academicYear, CancellationToken cancellationToken = default)
    {
        var config = await _schoolConfig.GetAdmissionConfigAsync(DateOnly.FromDateTime(DateTime.UtcNow), cancellationToken);
        var years = Enumerable.Range(config.AgeCutoffYear - 4, 5).Select(y => $"{y}-{y + 1}").ToList();
        var selected = academicYear is not null && years.Contains(academicYear) ? academicYear : null;

        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var year = await LoadYearAsync(connection, selected, cancellationToken);

        // "Did it improve?" needs the year before; there is nothing to compare an all-years view with.
        YearFigures? previousYear = null;
        if (selected is not null)
        {
            var index = years.IndexOf(selected);
            if (index > 0) previousYear = await LoadYearAsync(connection, years[index - 1], cancellationToken);
        }

        var all = await _schoolConfig.GetAllAsync(cancellationToken);
        var totalItems = int.Parse(all[SchoolConfigKeys.ExamTotalItems]);
        var passingScore = decimal.Parse(all[SchoolConfigKeys.ExamPassingScore]);

        var response = new AdmissionAnalyticsResponse
        {
            AcademicYear = selected ?? string.Empty,
            AcademicYears = years,
            Funnel = FunnelStages.Select((stage, i) => new AnalyticsStageCount { Stage = stage, Count = year.Funnel[i] }).ToList(),
            Kpis = year.Kpis,
            PreviousKpis = previousYear?.Kpis,
            PassByLevel = year.PassByLevel,
            Steps = StepNames
                .Select((name, i) => new AnalyticsStepDuration
                {
                    Step = name,
                    MedianDays = Median(year.StepDays[i]),
                    P25 = Percentile(year.StepDays[i], 0.25),
                    P75 = Percentile(year.StepDays[i], 0.75),
                    PreviousMedianDays = previousYear is null ? null : Median(previousYear.StepDays[i]),
                    Samples = year.StepDays[i].Count,
                })
                .ToList(),
            Payments = year.Payments,
            Documents = year.Documents,
            Weekly = await LoadWeeklyAsync(connection, cancellationToken),
            YearTrend = await LoadYearTrendAsync(connection, years, cancellationToken),
            ByLevel = year.ByLevel,
            ByType = year.ByType,
            SubmissionHeat = Heatmap(year.SubmittedAt),
            Scores = new AnalyticsScores { TotalItems = totalItems, PassingScore = passingScore, Bins = Histogram(year.Scores, totalItems) },
        };

        return response;
    }

    // ---- The median and the week buckets are plain functions so they can be tested without a database.

    /// <summary>The middle value (the average of the middle two for an even count), rounded to a tenth; null for no values.</summary>
    public static double? Median(IReadOnlyList<double> values)
    {
        if (values.Count == 0) return null;
        var sorted = values.OrderBy(v => v).ToList();
        var mid = sorted.Count / 2;
        var median = sorted.Count % 2 == 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
        return Math.Round(median, 1, MidpointRounding.AwayFromZero);
    }

    /// <summary>The value below which <paramref name="fraction"/> of the values fall (linear between neighbours), rounded to a tenth; null for no values.</summary>
    public static double? Percentile(IReadOnlyList<double> values, double fraction)
    {
        if (values.Count == 0) return null;
        var sorted = values.OrderBy(v => v).ToList();
        var position = Math.Clamp(fraction, 0, 1) * (sorted.Count - 1);
        var below = (int)Math.Floor(position);
        var above = (int)Math.Ceiling(position);
        var value = sorted[below] + (sorted[above] - sorted[below]) * (position - below);
        return Math.Round(value, 1, MidpointRounding.AwayFromZero);
    }

    /// <summary>The school keeps Philippine time (UTC+8); timestamps are stored in UTC.</summary>
    public static readonly TimeSpan SchoolOffset = TimeSpan.FromHours(8);

    /// <summary>Counts by weekday (Monday first) and four-hour block (midnight first) in school time.</summary>
    public static IReadOnlyList<IReadOnlyList<int>> Heatmap(IEnumerable<DateTime> submittedUtc)
    {
        var grid = Enumerable.Range(0, 7).Select(_ => new int[6]).ToArray();
        foreach (var utc in submittedUtc)
        {
            var local = utc + SchoolOffset;
            grid[((int)local.DayOfWeek + 6) % 7][local.Hour / 4]++;
        }

        return grid.Select(row => (IReadOnlyList<int>)row).ToList();
    }

    /// <summary>Ten equal bins from 0 to the exam's total items; a perfect score lands in the last bin.</summary>
    public static IReadOnlyList<AnalyticsScoreBin> Histogram(IEnumerable<double> scores, int totalItems, int bins = 10)
    {
        if (totalItems <= 0) return Array.Empty<AnalyticsScoreBin>();
        var width = (double)totalItems / bins;
        var counts = new int[bins];
        foreach (var score in scores)
        {
            var index = (int)Math.Floor(score / width);
            counts[Math.Clamp(index, 0, bins - 1)]++;
        }

        return counts.Select((count, i) => new AnalyticsScoreBin { From = Math.Round(i * width, 1), To = Math.Round((i + 1) * width, 1), Count = count }).ToList();
    }

    /// <summary>The Monday on or before a date.</summary>
    public static DateOnly WeekStart(DateTime date)
    {
        var day = DateOnly.FromDateTime(date);
        return day.AddDays(-(((int)day.DayOfWeek + 6) % 7));
    }

    /// <summary>Counts per Monday-based week for the last <paramref name="weeks"/> weeks up to and including the week of <paramref name="now"/>, zero-filled, oldest first.</summary>
    public static IReadOnlyList<AnalyticsWeek> Weekly(IEnumerable<DateTime> submittedAt, DateTime now, int weeks)
    {
        var thisWeek = WeekStart(now);
        var counts = submittedAt.GroupBy(WeekStart).ToDictionary(g => g.Key, g => g.Count());
        return Enumerable.Range(0, weeks)
            .Select(i => thisWeek.AddDays(-7 * (weeks - 1 - i)))
            .Select(start => new AnalyticsWeek { WeekStart = start, Applications = counts.TryGetValue(start, out var n) ? n : 0 })
            .ToList();
    }

    // ---- Queries

    private sealed class YearFigures
    {
        public int[] Funnel { get; set; } = new int[7];
        public AnalyticsKpis Kpis { get; set; } = new();
        public List<AnalyticsLevelPass> PassByLevel { get; set; } = new();
        public List<double>[] StepDays { get; set; } = Enumerable.Range(0, 4).Select(_ => new List<double>()).ToArray();
        public AnalyticsPayments Payments { get; set; } = new();
        public List<AnalyticsDocumentFlag> Documents { get; set; } = new();
        public List<AnalyticsCount> ByLevel { get; set; } = new();
        public List<AnalyticsCount> ByType { get; set; } = new();
        public List<DateTime> SubmittedAt { get; set; } = new();
        public List<double> Scores { get; set; } = new();
    }

    private async Task<YearFigures> LoadYearAsync(SqlConnection connection, string? academicYear, CancellationToken ct)
    {
        var figures = new YearFigures();

        // Funnel and the exam counts, one pass over the year's applications.
        // SQL Server will not SUM a sub-select, so each "did it ever reach this stage" test becomes a 0/1 column first.
        var funnelSql = AppCte + @",
f AS (
    SELECT app.*,
           CASE WHEN app.Status IN (N'DocumentsCleared', N'ExamScheduled', N'ExamDone', N'DidNotTakeExam', N'Registration', N'Approved')
                  OR EXISTS (SELECT 1 FROM dbo.ApplicationStatusHistory h WHERE h.ApplicationId = app.ApplicationId AND h.Category = N'Admission' AND h.ToStatus = N'DocumentsCleared')
                THEN 1 ELSE 0 END AS Cleared,
           CASE WHEN EXISTS (SELECT 1 FROM dbo.ExamPayments p WHERE p.ApplicationId = app.ApplicationId AND p.Status = N'Verified') THEN 1 ELSE 0 END AS Paid,
           CASE WHEN EXISTS (SELECT 1 FROM dbo.InterviewSchedules i WHERE i.ApplicationId = app.ApplicationId AND i.Evaluation IS NOT NULL) THEN 1 ELSE 0 END AS Interviewed
    FROM app
    WHERE @AcademicYear IS NULL OR app.AY = @AcademicYear
)
SELECT COUNT(*) AS Submitted,
       SUM(Cleared) AS Cleared,
       SUM(Paid) AS Paid,
       SUM(CASE WHEN LastResult IS NOT NULL OR Status = N'ExamDone' THEN 1 ELSE 0 END) AS Took,
       SUM(CASE WHEN LastResult = N'Passed' THEN 1 ELSE 0 END) AS Passed,
       SUM(Interviewed) AS Interviewed,
       SUM(CASE WHEN Status = N'Approved' AND IsReserved = 1 THEN 1 ELSE 0 END) AS Enrolled
FROM f;";
        await using (var command = Command(funnelSql, connection, academicYear))
        await using (var reader = await command.ExecuteReaderAsync(ct))
        {
            if (await reader.ReadAsync(ct))
            {
                int N(int i) => reader.IsDBNull(i) ? 0 : reader.GetInt32(i);
                for (var i = 0; i < 7; i++) figures.Funnel[i] = N(i);
                figures.Kpis.Took = figures.Funnel[3];
                figures.Kpis.Passed = figures.Funnel[4];
            }
        }

        // Pass rate by level: of the applicants with an exam result, how many passed.
        var levelSql = AppCte + @"
SELECT ISNULL(Department, N'Not specified') AS Level, COUNT(*) AS Took, SUM(CASE WHEN LastResult = N'Passed' THEN 1 ELSE 0 END) AS Passed
FROM app
WHERE LastResult IS NOT NULL AND (@AcademicYear IS NULL OR AY = @AcademicYear)
GROUP BY ISNULL(Department, N'Not specified');";
        await using (var command = Command(levelSql, connection, academicYear))
        await using (var reader = await command.ExecuteReaderAsync(ct))
        {
            while (await reader.ReadAsync(ct))
            {
                figures.PassByLevel.Add(new AnalyticsLevelPass { Level = reader.GetString(0), Took = reader.GetInt32(1), Passed = reader.GetInt32(2) });
            }
        }

        // Who applies: by level and by type, and when (the heat map is built from the timestamps).
        foreach (var (column, target) in new[] { ("ISNULL(Department, N'Not specified')", figures.ByLevel), ("ApplicationType", figures.ByType) })
        {
            var sql = AppCte + $"SELECT {column}, COUNT(*) FROM app WHERE @AcademicYear IS NULL OR AY = @AcademicYear GROUP BY {column} ORDER BY COUNT(*) DESC;";
            await using var command = Command(sql, connection, academicYear);
            await using var reader = await command.ExecuteReaderAsync(ct);
            while (await reader.ReadAsync(ct)) target.Add(new AnalyticsCount { Label = reader.GetString(0), Count = reader.GetInt32(1) });
        }

        await using (var command = Command(AppCte + "SELECT SubmittedAt FROM app WHERE @AcademicYear IS NULL OR AY = @AcademicYear;", connection, academicYear))
        await using (var reader = await command.ExecuteReaderAsync(ct))
        {
            while (await reader.ReadAsync(ct)) figures.SubmittedAt.Add(reader.GetDateTime(0));
        }

        // First-attempt exam scores (a retake would count the same person twice).
        await using (var command = Command(AppCte + @"
SELECT r.Score FROM app JOIN dbo.ExamResults r ON r.ApplicationId = app.ApplicationId AND r.Attempt = 1
WHERE r.Score IS NOT NULL AND (@AcademicYear IS NULL OR AY = @AcademicYear);", connection, academicYear))
        await using (var reader = await command.ExecuteReaderAsync(ct))
        {
            while (await reader.ReadAsync(ct)) figures.Scores.Add(Convert.ToDouble(reader.GetValue(0)));
        }

        // How long each step takes, as day-gaps (the median is taken in code).
        figures.StepDays[0] = await DaysAsync(connection, AppCte + @"
SELECT DATEDIFF(MINUTE, app.SubmittedAt, MIN(h.ChangedAt)) / 1440.0
FROM app JOIN dbo.ApplicationStatusHistory h ON h.ApplicationId = app.ApplicationId AND h.Category = N'Admission' AND h.ToStatus = N'DocumentsCleared'
WHERE @AcademicYear IS NULL OR AY = @AcademicYear
GROUP BY app.ApplicationId, app.SubmittedAt;", academicYear, ct);

        figures.StepDays[1] = await DaysAsync(connection, AppCte + @"
SELECT DATEDIFF(MINUTE, p.ProofUploadedAt, p.VerifiedAt) / 1440.0
FROM app JOIN dbo.ExamPayments p ON p.ApplicationId = app.ApplicationId
WHERE p.Status = N'Verified' AND p.VerifiedAt IS NOT NULL AND (@AcademicYear IS NULL OR AY = @AcademicYear);", academicYear, ct);

        figures.StepDays[2] = await DaysAsync(connection, AppCte + @"
SELECT DATEDIFF(MINUTE, CAST(r.ExamDate AS datetime2), r.RecordedAt) / 1440.0
FROM app JOIN dbo.ExamResults r ON r.ApplicationId = app.ApplicationId AND r.Attempt = 1
WHERE r.ExamDate IS NOT NULL AND (@AcademicYear IS NULL OR AY = @AcademicYear);", academicYear, ct);

        figures.StepDays[3] = await DaysAsync(connection, AppCte + @"
SELECT DATEDIFF(MINUTE, CAST(i.InterviewDate AS datetime2), i.EvaluatedAt) / 1440.0
FROM app JOIN dbo.InterviewSchedules i ON i.ApplicationId = app.ApplicationId
WHERE i.EvaluatedAt IS NOT NULL AND (@AcademicYear IS NULL OR AY = @AcademicYear);", academicYear, ct);

        // Submitted to a final decision (approved or rejected), for the headline.
        var decisionDays = await DaysAsync(connection, AppCte + @"
SELECT DATEDIFF(MINUTE, app.SubmittedAt, MIN(h.ChangedAt)) / 1440.0
FROM app JOIN dbo.ApplicationStatusHistory h ON h.ApplicationId = app.ApplicationId AND h.Category = N'Admission' AND h.ToStatus IN (N'Approved', N'Rejected')
WHERE @AcademicYear IS NULL OR AY = @AcademicYear
GROUP BY app.ApplicationId, app.SubmittedAt;", academicYear, ct);
        figures.Kpis.MedianDaysToDecision = Median(decisionDays);

        // Payments by outcome.
        var paymentSql = AppCte + @"
SELECT p.Status, COUNT(*) FROM app JOIN dbo.ExamPayments p ON p.ApplicationId = app.ApplicationId
WHERE @AcademicYear IS NULL OR AY = @AcademicYear GROUP BY p.Status;";
        await using (var command = Command(paymentSql, connection, academicYear))
        await using (var reader = await command.ExecuteReaderAsync(ct))
        {
            while (await reader.ReadAsync(ct))
            {
                var count = reader.GetInt32(1);
                switch (reader.GetString(0))
                {
                    case "Verified": figures.Payments.Verified = count; break;
                    case "Rejected": figures.Payments.Rejected = count; break;
                    default: figures.Payments.Pending += count; break;
                }
            }
        }

        figures.Kpis.PaymentsVerified = figures.Payments.Verified;
        figures.Kpis.PaymentsTotal = figures.Payments.Verified + figures.Payments.Pending + figures.Payments.Rejected;

        // Documents still sent back (flagged or rejected), by type, among uploads made in the academic year (June to May).
        var documentSql = @"
SELECT DocumentType, COUNT(*), SUM(CASE WHEN Status IN (N'Flagged', N'Rejected') THEN 1 ELSE 0 END)
FROM dbo.ApplicantDocuments
WHERE DocumentType <> N'ScholarshipForm' AND (@Start IS NULL OR (UploadedAt >= @Start AND UploadedAt < @End))
GROUP BY DocumentType;";
        await using (var command = new SqlCommand(documentSql, connection))
        {
            (DateTime? start, DateTime? end) = YearBounds(academicYear);
            command.Parameters.Add(new SqlParameter("@Start", SqlDbType.DateTime2) { Value = (object?)start ?? DBNull.Value });
            command.Parameters.Add(new SqlParameter("@End", SqlDbType.DateTime2) { Value = (object?)end ?? DBNull.Value });
            await using var reader = await command.ExecuteReaderAsync(ct);
            while (await reader.ReadAsync(ct))
            {
                figures.Documents.Add(new AnalyticsDocumentFlag { DocumentType = reader.GetString(0), Uploaded = reader.GetInt32(1), Flagged = reader.GetInt32(2) });
            }
        }

        figures.Kpis.DocumentsUploaded = figures.Documents.Sum(d => d.Uploaded);
        figures.Kpis.DocumentsFlagged = figures.Documents.Sum(d => d.Flagged);
        return figures;
    }

    private static async Task<IReadOnlyList<AnalyticsYearPoint>> LoadYearTrendAsync(SqlConnection connection, IReadOnlyList<string> years, CancellationToken ct)
    {
        var sql = AppCte + @"
SELECT AY, COUNT(*),
       SUM(CASE WHEN LastResult IS NOT NULL OR Status = N'ExamDone' THEN 1 ELSE 0 END),
       SUM(CASE WHEN LastResult = N'Passed' THEN 1 ELSE 0 END),
       SUM(CASE WHEN Status = N'Approved' AND IsReserved = 1 THEN 1 ELSE 0 END)
FROM app WHERE AY IN (SELECT value FROM STRING_SPLIT(@Years, N',')) GROUP BY AY;";
        var byYear = new Dictionary<string, AnalyticsYearPoint>(StringComparer.Ordinal);
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Years", SqlDbType.NVarChar, 200) { Value = string.Join(',', years) });
        await using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            var year = reader.GetString(0);
            byYear[year] = new AnalyticsYearPoint { AcademicYear = year, Applicants = reader.GetInt32(1), Took = reader.GetInt32(2), Passed = reader.GetInt32(3), Enrolled = reader.GetInt32(4) };
        }

        return years.Select(y => byYear.TryGetValue(y, out var point) ? point : new AnalyticsYearPoint { AcademicYear = y }).ToList();
    }

    private static async Task<IReadOnlyList<AnalyticsWeek>> LoadWeeklyAsync(SqlConnection connection, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var since = WeekStart(now).AddDays(-7 * (TrendWeeks - 1)).ToDateTime(TimeOnly.MinValue);
        var dates = new List<DateTime>();
        await using var command = new SqlCommand("SELECT SubmittedAt FROM dbo.AdmissionApplications WHERE IsArchived = 0 AND SubmittedAt >= @Since;", connection);
        command.Parameters.Add(new SqlParameter("@Since", SqlDbType.DateTime2) { Value = since });
        await using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct)) dates.Add(reader.GetDateTime(0));
        return Weekly(dates, now, TrendWeeks);
    }

    private static async Task<List<double>> DaysAsync(SqlConnection connection, string sql, string? academicYear, CancellationToken ct)
    {
        var days = new List<double>();
        await using var command = Command(sql, connection, academicYear);
        await using var reader = await command.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            if (reader.IsDBNull(0)) continue;
            var value = Convert.ToDouble(reader.GetValue(0));
            if (value >= 0) days.Add(value); // a negative gap is a data-entry slip, not a duration
        }

        return days;
    }

    private static (DateTime? Start, DateTime? End) YearBounds(string? academicYear)
    {
        if (academicYear is null || academicYear.Length < 4 || !int.TryParse(academicYear.AsSpan(0, 4), out var startYear)) return (null, null);
        return (new DateTime(startYear, 6, 1), new DateTime(startYear + 1, 6, 1));
    }

    private static SqlCommand Command(string sql, SqlConnection connection, string? academicYear)
    {
        var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@AcademicYear", SqlDbType.NVarChar, 9) { Value = (object?)academicYear ?? DBNull.Value });
        return command;
    }
}
