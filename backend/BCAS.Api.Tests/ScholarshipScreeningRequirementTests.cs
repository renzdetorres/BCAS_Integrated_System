using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace BCAS.Api.Tests;

/// <summary>An applicant below a scholarship's minimum grade can't be screened as Qualified.</summary>
public class ScholarshipScreeningRequirementTests
{
    private static EvaluatorScholarshipApplicationService Service(FakeApplications applications) =>
        new(applications, new FakeDocuments(), null!, null!, null!, NullLogger<EvaluatorScholarshipApplicationService>.Instance);

    private static EvaluatorScholarshipApplicationDetail Detail(decimal grade, decimal? minimum) => new()
    {
        ApplicationId = Guid.NewGuid(),
        UserId = Guid.NewGuid(),
        ScholarshipName = "Top 1 Scholarship",
        ScholarshipType = "TopOne",
        GradeAverage = grade,
        MinimumGradeAverage = minimum,
        Status = "EligibilityScreening",
    };

    [Fact]
    public async Task Qualified_is_refused_when_the_grade_is_below_the_minimum()
    {
        var applications = new FakeApplications(Detail(85, 95));

        var error = await Assert.ThrowsAsync<ScreeningRequirementNotMetException>(() =>
            Service(applications).RecordScreeningAsync(applications.Detail.ApplicationId, Guid.NewGuid(), new RecordScholarshipScreeningRequest { Verdict = "Qualified" }));

        Assert.Contains("85", error.Message);
        Assert.Contains("95", error.Message);
        Assert.Equal(0, applications.Saved);
    }

    [Fact]
    public async Task Not_Qualified_is_always_allowed_even_below_the_minimum()
    {
        var applications = new FakeApplications(Detail(85, 95));

        var result = await Service(applications).RecordScreeningAsync(applications.Detail.ApplicationId, Guid.NewGuid(), new RecordScholarshipScreeningRequest { Verdict = "NotQualified" });

        Assert.Equal(1, applications.Saved);
        Assert.Equal("NotQualified", result.Screening?.Verdict);
    }

    [Theory]
    [InlineData(95, 95)]
    [InlineData(97.5, 95)]
    public async Task Qualified_is_saved_when_the_grade_meets_the_minimum(double grade, double minimum)
    {
        var applications = new FakeApplications(Detail((decimal)grade, (decimal)minimum));

        var result = await Service(applications).RecordScreeningAsync(applications.Detail.ApplicationId, Guid.NewGuid(), new RecordScholarshipScreeningRequest { Verdict = "Qualified" });

        Assert.Equal(1, applications.Saved);
        Assert.Equal("Qualified", result.Screening?.Verdict);
    }

    [Fact]
    public async Task Qualified_is_saved_when_the_scholarship_has_no_minimum()
    {
        var applications = new FakeApplications(Detail(70, null));

        await Service(applications).RecordScreeningAsync(applications.Detail.ApplicationId, Guid.NewGuid(), new RecordScholarshipScreeningRequest { Verdict = "Qualified" });

        Assert.Equal(1, applications.Saved);
    }

    private sealed class FakeApplications : IEvaluatorScholarshipApplicationRepository
    {
        public FakeApplications(EvaluatorScholarshipApplicationDetail detail) => Detail = detail;

        public EvaluatorScholarshipApplicationDetail Detail { get; }
        public int Saved { get; private set; }

        public Task<EvaluatorScholarshipApplicationDetail?> GetDetailAsync(Guid applicationId, CancellationToken cancellationToken = default) =>
            Task.FromResult<EvaluatorScholarshipApplicationDetail?>(Detail);

        public Task<ScholarshipEligibilityScreening?> UpsertScreeningAsync(Guid applicationId, string verdict, string? remarks, Guid evaluatedByUserId, CancellationToken cancellationToken = default)
        {
            Saved++;
            Detail.Screening = new ScholarshipEligibilityScreening { Verdict = verdict, Remarks = remarks };
            return Task.FromResult<ScholarshipEligibilityScreening?>(Detail.Screening);
        }

        public Task<EvaluatorScholarshipApplicationDetail?> AdvanceStatusAsync(Guid applicationId, string fromStatus, string toStatus, CancellationToken cancellationToken = default) => throw new NotSupportedException();

        public Task<EvaluatorScholarshipApplicationDetail?> RecordFinalDecisionAsync(Guid applicationId, string decision, string? remarks, Guid decidedByUserId, CancellationToken cancellationToken = default) => throw new NotSupportedException();

        public Task<IReadOnlyList<EvaluatorQueueApplication>> GetReadyForDecisionAsync(int take, string department, CancellationToken cancellationToken = default) => throw new NotSupportedException();
    }

    private sealed class FakeDocuments : IApplicantDocumentRepository
    {
        public Task<IReadOnlyList<ApplicantDocument>> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<ApplicantDocument>>(new List<ApplicantDocument>());

        public Task<ApplicantDocument> UpsertAsync(Guid userId, string documentType, string fileName, string contentType, byte[] fileData, CancellationToken cancellationToken = default) => throw new NotSupportedException();

        public Task<DocumentFile?> GetFileAsync(Guid userId, string documentType, CancellationToken cancellationToken = default) => throw new NotSupportedException();

        public Task ArchiveByUserIdAsync(Guid userId, CancellationToken cancellationToken = default) => throw new NotSupportedException();
    }
}
