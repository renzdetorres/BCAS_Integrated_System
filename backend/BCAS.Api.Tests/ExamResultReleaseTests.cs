using System.Reflection;
using BCAS.Api.Constants;
using BCAS.Api.Controllers;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace BCAS.Api.Tests;

/// <summary>
/// The Evaluator records an exam score; Support Staff release it to the applicant. Exam permits are a Support
/// Staff screen, not an Evaluator one.
/// </summary>
public class ExamResultReleaseTests
{
    private static string[] RolesOf(MemberInfo member) =>
        member.GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .Select(a => a.Roles ?? string.Empty)
            .SelectMany(r => r.Split(','))
            .ToArray();

    [Fact]
    public void Exam_permits_belong_to_Support_Staff_not_the_Evaluator()
    {
        Assert.True(FeatureCatalog.IsKnown("SupportStaff", "/support-staff/exam-permits"));
        Assert.Equal("/support-staff/exam-permits", FeatureCatalog.FindByApiPath("SupportStaff", new PathString("/api/admin/exam-permits"))?.Key);
        Assert.DoesNotContain(FeatureCatalog.ByRole["Evaluator"], f => f.Key.Contains("exam-permits"));
        Assert.Null(FeatureCatalog.FindByApiPath("Evaluator", new PathString("/api/admin/exam-permits")));

        var roles = RolesOf(typeof(AdminExamPermitsController));
        Assert.Contains("SupportStaff", roles);
        Assert.Contains("Admin", roles);
        Assert.DoesNotContain("Evaluator", roles);
    }

    [Fact]
    public void The_Evaluator_keeps_Exam_Results_and_only_Admin_and_Evaluator_can_record_a_score()
    {
        Assert.True(FeatureCatalog.IsKnown("Evaluator", "/evaluator/exam-results"));

        var record = typeof(StaffExamResultsController).GetMethod(nameof(StaffExamResultsController.Record))!;
        var roles = RolesOf(record);
        Assert.Contains("Evaluator", roles);
        Assert.Contains("Admin", roles);
        Assert.DoesNotContain("SupportStaff", roles);
    }

    [Fact]
    public void Only_Admin_and_Support_Staff_can_release_a_result()
    {
        var release = typeof(StaffExamResultsController).GetMethod(nameof(StaffExamResultsController.Release))!;
        var roles = RolesOf(release);
        Assert.Contains("SupportStaff", roles);
        Assert.Contains("Admin", roles);
        Assert.DoesNotContain("Evaluator", roles);
    }

    [Fact]
    public async Task Recording_a_score_does_not_move_the_application_or_tell_the_applicant()
    {
        var repository = new FakeResultRepository { Item = Item("ExamDone") };
        // The application service and the notifier are null on purpose: recording must not touch them.
        var service = Service(repository);

        var item = await service.RecordAsync(repository.Item.ApplicationId, new RecordExamResultRequest { Score = 80 }, Guid.NewGuid());

        Assert.Equal("Passed", item.Result);
        Assert.Null(item.ReleasedAt);
        Assert.Equal("ExamDone", item.ApplicationStatus);
        Assert.Equal(1, repository.Inserted);
    }

    [Fact]
    public async Task Recording_again_before_release_corrects_the_score_instead_of_adding_an_attempt()
    {
        var repository = new FakeResultRepository { Item = Item("ExamDone") };
        var service = Service(repository);

        await service.RecordAsync(repository.Item.ApplicationId, new RecordExamResultRequest { Score = 10 }, Guid.NewGuid());
        var corrected = await service.RecordAsync(repository.Item.ApplicationId, new RecordExamResultRequest { Score = 90 }, Guid.NewGuid());

        Assert.Equal(1, repository.Inserted);
        Assert.Equal(1, repository.Updated);
        Assert.Equal("Passed", corrected.Result);
        Assert.Equal(90m, corrected.Score);
    }

    [Fact]
    public async Task A_result_cannot_be_released_before_a_score_is_recorded()
    {
        var repository = new FakeResultRepository { Item = Item("ExamDone") };

        await Assert.ThrowsAsync<AdmissionStepException>(() => Service(repository).ReleaseAsync(repository.Item.ApplicationId, Guid.NewGuid()));
    }

    [Fact]
    public async Task A_released_result_cannot_be_released_twice()
    {
        var item = Item("Registration");
        item.Result = "Passed";
        item.Score = 80;
        item.ReleasedAt = DateTime.UtcNow;
        var repository = new FakeResultRepository { Item = item };

        var error = await Assert.ThrowsAsync<AdmissionStepException>(() => Service(repository).ReleaseAsync(item.ApplicationId, Guid.NewGuid()));

        Assert.Contains("already been released", error.Message);
    }

    private static ExamResultQueueItem Item(string status) => new()
    {
        ApplicationId = Guid.NewGuid(),
        UserId = Guid.NewGuid(),
        ApplicantName = "Test Applicant",
        ApplicantEmail = "test@example.com",
        CourseAppliedFor = "BSIT",
        ApplicationStatus = status,
    };

    private static ExamResultService Service(FakeResultRepository repository) =>
        new(repository, null!, null!, null!, null!, null!, new FakeSchoolConfig(), NullLogger<ExamResultService>.Instance);

    private sealed class FakeSchoolConfig : ISchoolConfigService
    {
        public Task<IReadOnlyDictionary<string, string>> GetAllAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyDictionary<string, string>>(new Dictionary<string, string>
            {
                [SchoolConfigKeys.ExamTotalItems] = "100",
                [SchoolConfigKeys.ExamPassingScore] = "75",
                [SchoolConfigKeys.ExamMaxRetakes] = "1",
            });

        public Task<string> GetAsync(string key, CancellationToken cancellationToken = default) => throw new NotSupportedException();

        public Task<int> GetIntAsync(string key, CancellationToken cancellationToken = default) => throw new NotSupportedException();

        public Task SaveAsync(IReadOnlyDictionary<string, string?> values, CancellationToken cancellationToken = default) => throw new NotSupportedException();

        public Task<AdmissionConfigResponse> GetAdmissionConfigAsync(DateOnly today, CancellationToken cancellationToken = default) => throw new NotSupportedException();
    }

    /// <summary>One application's results held in memory.</summary>
    private sealed class FakeResultRepository : IExamResultRepository
    {
        public ExamResultQueueItem Item { get; set; } = new();
        public int Inserted { get; private set; }
        public int Updated { get; private set; }
        private bool _hasPending;

        public Task<IReadOnlyList<ExamResultRecord>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            var list = new List<ExamResultRecord>();
            if (Item.Result is not null)
            {
                list.Add(new ExamResultRecord { Attempt = 1, Result = Item.Result, Score = Item.Score, RecordedAt = DateTime.UtcNow, ReleasedAt = Item.ReleasedAt });
            }

            return Task.FromResult<IReadOnlyList<ExamResultRecord>>(list);
        }

        public Task<ExamResultRecord> InsertAsync(Guid applicationId, Guid userId, string result, decimal? score, string? remarks, DateOnly? examDate, Guid recordedByUserId, CancellationToken cancellationToken = default)
        {
            Inserted++;
            _hasPending = true;
            Item.Result = result;
            Item.Score = score;
            Item.Remarks = remarks;
            Item.RecordedAt = DateTime.UtcNow;
            return Task.FromResult(new ExamResultRecord { Attempt = 1, Result = result, Score = score });
        }

        public Task<bool> UpdatePendingAsync(Guid applicationId, string result, decimal? score, string? remarks, DateOnly? examDate, Guid recordedByUserId, CancellationToken cancellationToken = default)
        {
            if (!_hasPending)
            {
                return Task.FromResult(false);
            }

            Updated++;
            Item.Result = result;
            Item.Score = score;
            Item.Remarks = remarks;
            return Task.FromResult(true);
        }

        public Task<bool> ReleaseAsync(Guid applicationId, CancellationToken cancellationToken = default) => throw new NotSupportedException();

        public Task<IReadOnlyList<ExamResultQueueItem>> GetQueueAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<ExamResultQueueItem>>(new[] { Item });

        public Task<ExamResultQueueItem?> GetQueueItemAsync(Guid applicationId, CancellationToken cancellationToken = default) =>
            Task.FromResult<ExamResultQueueItem?>(Item);

        public Task<DateOnly?> GetBookedExamDateAsync(Guid userId, CancellationToken cancellationToken = default) =>
            Task.FromResult<DateOnly?>(null);
    }
}
