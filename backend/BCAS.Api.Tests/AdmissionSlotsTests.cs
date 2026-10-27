using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace BCAS.Api.Tests;

public class AdmissionSlotsTests
{
    [Fact]
    public void A_valid_list_is_stored_without_blank_limits()
    {
        var stored = AdmissionLevelSlots.Normalize("""{"High School":{"Grade 7":40,"Grade 8":null}}""");
        var read = AdmissionLevelSlots.Parse(stored);

        Assert.Equal(40, AdmissionLevelSlots.LimitFor(read, "High School", "Grade 7"));
        Assert.Null(AdmissionLevelSlots.LimitFor(read, "High School", "Grade 8"));
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("""{"College":{"1st Year":null}}""")]
    [InlineData("null")]
    public void No_limits_at_all_is_stored_as_blank(string json)
    {
        Assert.Equal(string.Empty, AdmissionLevelSlots.Normalize(json));
    }

    [Fact]
    public void Zero_is_a_real_limit_that_closes_the_level()
    {
        var read = AdmissionLevelSlots.Parse(AdmissionLevelSlots.Normalize("""{"College":{"1st Year":0}}"""));
        Assert.Equal(0, AdmissionLevelSlots.LimitFor(read, "College", "1st Year"));
    }

    [Theory]
    [InlineData("""{"College":{"1st Year":-1}}""")]
    [InlineData("""{"College":{"1st Year":100001}}""")]
    [InlineData("""{"Preschool":{"Nursery":5}}""")]
    [InlineData("not json")]
    public void Bad_values_are_rejected(string json)
    {
        Assert.Throws<InvalidSchoolConfigException>(() => AdmissionLevelSlots.Normalize(json));
    }

    [Fact]
    public void An_unreadable_stored_value_means_no_limits()
    {
        Assert.Empty(AdmissionLevelSlots.Parse("{broken"));
        Assert.Empty(AdmissionLevelSlots.Parse(null));
    }

    [Fact]
    public async Task A_level_is_full_once_every_slot_is_taken()
    {
        var service = ServiceWith("""{"High School":{"Grade 7":2}}""", taken: ("High School", "Grade 7", 2));

        Assert.True(await service.IsFullAsync("High School", "Grade 7"));
    }

    [Fact]
    public async Task A_level_with_a_free_slot_is_not_full()
    {
        var service = ServiceWith("""{"High School":{"Grade 7":2}}""", taken: ("High School", "Grade 7", 1));

        Assert.False(await service.IsFullAsync("High School", "Grade 7"));
    }

    [Fact]
    public async Task A_level_with_no_limit_is_never_full()
    {
        var service = ServiceWith("""{"High School":{"Grade 7":2}}""", taken: ("High School", "Grade 8", 500));

        Assert.False(await service.IsFullAsync("High School", "Grade 8"));
    }

    [Fact]
    public async Task A_level_set_to_zero_is_full_from_the_start()
    {
        var service = ServiceWith("""{"College":{"1st Year":0}}""", taken: ("College", "1st Year", 0));

        Assert.True(await service.IsFullAsync("College", "1st Year"));
    }

    [Fact]
    public async Task The_applicant_view_lists_only_limited_levels_and_never_the_counts()
    {
        var service = ServiceWith("""{"High School":{"Grade 7":1,"Grade 8":5}}""", taken: ("High School", "Grade 7", 1));

        var availability = await service.GetAvailabilityAsync();

        Assert.Equal(2, availability.Count);
        var full = Assert.Single(availability, a => a.IsFull);
        Assert.Equal("Grade 7", full.Level);
        Assert.Equal("Sorry, the admission slot for Grade 7 has been reached.", full.Message);
        Assert.Null(availability.Single(a => a.Level == "Grade 8").Message);
    }

    [Fact]
    public async Task The_admin_view_shows_taken_and_remaining_per_level()
    {
        var service = ServiceWith("""{"High School":{"Grade 7":10}}""", taken: ("High School", "Grade 7", 4));

        var row = (await service.GetAllAsync()).Single(r => r.Category == "High School" && r.Level == "Grade 7");

        Assert.Equal(10, row.Slots);
        Assert.Equal(4, row.Taken);
        Assert.Equal(6, row.Remaining);
        Assert.False(row.IsFull);
    }

    [Fact]
    public async Task Remaining_never_goes_below_zero()
    {
        var service = ServiceWith("""{"High School":{"Grade 7":3}}""", taken: ("High School", "Grade 7", 5));

        var row = (await service.GetAllAsync()).Single(r => r.Category == "High School" && r.Level == "Grade 7");

        Assert.Equal(0, row.Remaining);
        Assert.True(row.IsFull);
    }

    [Fact]
    public async Task Saving_stores_the_limits_through_the_school_config()
    {
        var config = new FakeSchoolConfig(string.Empty);
        var service = new AdmissionSlotsService(config, new FakeSlotsRepository());

        await service.SaveAsync(new[]
        {
            new AdmissionLevelSlotInput { Category = "High School", Level = "Grade 7", Slots = 30 },
            new AdmissionLevelSlotInput { Category = "High School", Level = "Grade 8", Slots = null },
        });

        var saved = Assert.Single(config.Saved);
        Assert.Equal(SchoolConfigKeys.AdmissionLevelSlots, saved.Key);
        Assert.Contains("30", saved.Value);
    }

    private static AdmissionSlotsService ServiceWith(string limitsJson, (string Category, string Level, int Count) taken) =>
        new(new FakeSchoolConfig(limitsJson), new FakeSlotsRepository(taken));

    private sealed class FakeSlotsRepository : IAdmissionSlotsRepository
    {
        private readonly Dictionary<(string Category, string Level), int> _taken = new();

        public FakeSlotsRepository(params (string Category, string Level, int Count)[] taken)
        {
            foreach (var (category, level, count) in taken) _taken[(category, level)] = count;
        }

        public Task<IReadOnlyDictionary<(string Category, string Level), int>> GetTakenAsync(string academicYear, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyDictionary<(string Category, string Level), int>>(_taken);
    }

    private sealed class FakeSchoolConfig : ISchoolConfigService
    {
        private readonly string _limits;

        public FakeSchoolConfig(string limits)
        {
            _limits = limits;
        }

        public Dictionary<string, string?> Saved { get; } = new();

        public Task<IReadOnlyDictionary<string, string>> GetAllAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyDictionary<string, string>>(new Dictionary<string, string> { [SchoolConfigKeys.AdmissionLevelSlots] = _limits });

        public Task<string> GetAsync(string key, CancellationToken cancellationToken = default) =>
            Task.FromResult(key == SchoolConfigKeys.AdmissionLevelSlots ? _limits : string.Empty);

        public Task<int> GetIntAsync(string key, CancellationToken cancellationToken = default) => Task.FromResult(0);

        public Task SaveAsync(IReadOnlyDictionary<string, string?> values, CancellationToken cancellationToken = default)
        {
            foreach (var (key, value) in values) Saved[key] = value;
            return Task.CompletedTask;
        }

        public Task<AdmissionConfigResponse> GetAdmissionConfigAsync(DateOnly today, CancellationToken cancellationToken = default) =>
            Task.FromResult(new AdmissionConfigResponse { AcademicYear = "2026-2027" });
    }
}

public class RoleFeatureTests
{
    private static bool Has(string role, string key) => FeatureCatalog.IsKnown(role, key);

    [Fact]
    public void The_Evaluator_verifies_documents_and_Support_Staff_does_not()
    {
        Assert.True(Has("Evaluator", "/evaluator/documents"));
        Assert.True(Has("Evaluator", "/evaluator/documents/archive"));
        Assert.DoesNotContain(FeatureCatalog.ByRole["SupportStaff"], f => f.Key.Contains("documents"));
        Assert.Null(FeatureCatalog.FindByApiPath("SupportStaff", new PathString("/api/support-staff/documents")));
    }

    [Fact]
    public void Support_Staff_keeps_payments_results_records_and_inquiries()
    {
        foreach (var key in new[] { "/support-staff/payments", "/support-staff/exam-results", "/support-staff/applicants", "/staff/inquiries" })
        {
            Assert.True(Has("SupportStaff", key), key);
        }
    }

    [Fact]
    public void The_Admin_holds_the_Evaluator_and_Support_Staff_controls()
    {
        foreach (var key in new[]
        {
            "/admin/document-verification", "/admin/document-archive", "/admin/applicant-records", "/admin/payments",
            "/admin/exam-results", "/admin/exam-permits", "/admin/interviews", "/admin/scholarship-slots",
            "/admin/scholarship-screening", "/admin/admission-slots", "/staff/inquiries",
        })
        {
            Assert.True(Has("Admin", key), key);
        }
    }

    [Fact]
    public void The_Admin_document_queue_is_covered_by_the_same_api_prefix_as_the_Evaluators()
    {
        var admin = FeatureCatalog.FindByApiPath("Admin", new PathString("/api/support-staff/documents"));
        var evaluator = FeatureCatalog.FindByApiPath("Evaluator", new PathString("/api/support-staff/documents"));

        Assert.Equal("/admin/document-verification", admin?.Key);
        Assert.Equal("/evaluator/documents", evaluator?.Key);
    }

    [Fact]
    public void The_applicant_has_one_page_for_tracking_and_documents()
    {
        Assert.False(Has("Applicant", "/documents"));
        var tracking = FeatureCatalog.FindByApiPath("Applicant", new PathString("/api/documents"));
        Assert.Equal("/application-tracking", tracking?.Key);
    }
}
