using BCAS.Api.Services;
using Xunit;

namespace BCAS.Api.Tests;

public class AdmissionAnalyticsTests
{
    [Fact]
    public void The_median_of_nothing_is_nothing()
    {
        Assert.Null(AdmissionAnalyticsService.Median(Array.Empty<double>()));
    }

    [Theory]
    [InlineData(new[] { 5.0 }, 5.0)]
    [InlineData(new[] { 9.0, 1.0, 5.0 }, 5.0)]            // odd count: the middle one, whatever the order
    [InlineData(new[] { 1.0, 2.0, 3.0, 10.0 }, 2.5)]       // even count: the mean of the middle two
    [InlineData(new[] { 1.0, 100.0, 2.0 }, 2.0)]           // one huge outlier does not drag it
    [InlineData(new[] { 1.24, 1.26 }, 1.3)]                // rounded to a tenth of a day
    public void The_median_is_the_middle_value(double[] values, double expected)
    {
        Assert.Equal(expected, AdmissionAnalyticsService.Median(values));
    }

    [Theory]
    [InlineData(0.0, 1.0)]
    [InlineData(0.5, 3.0)]
    [InlineData(1.0, 5.0)]
    [InlineData(0.25, 2.0)]
    [InlineData(0.75, 4.0)]
    public void A_percentile_is_the_value_that_fraction_of_cases_fall_below(double fraction, double expected)
    {
        Assert.Equal(expected, AdmissionAnalyticsService.Percentile(new[] { 5.0, 1.0, 3.0, 2.0, 4.0 }, fraction));
    }

    [Fact]
    public void A_percentile_between_two_cases_is_rounded_to_a_tenth()
    {
        Assert.Equal(1.7, AdmissionAnalyticsService.Percentile(new[] { 1.0, 2.0 }, 0.7));
        Assert.Null(AdmissionAnalyticsService.Percentile(Array.Empty<double>(), 0.5));
    }

    [Fact]
    public void The_heat_map_counts_by_weekday_and_four_hour_block_in_school_time()
    {
        // 2026-10-19 is a Monday. 17:30 UTC is 01:30 on Tuesday in Manila (UTC+8): Tuesday, block 0 (midnight to 4 AM).
        // 02:00 UTC Monday is 10:00 Monday: Monday, block 2 (8 AM to noon).
        var grid = AdmissionAnalyticsService.Heatmap(new[] { new DateTime(2026, 10, 19, 17, 30, 0), new DateTime(2026, 10, 19, 2, 0, 0), new DateTime(2026, 10, 19, 2, 59, 0) });

        Assert.Equal(7, grid.Count);
        Assert.All(grid, row => Assert.Equal(6, row.Count));
        Assert.Equal(2, grid[0][2]); // Monday 8 AM to noon
        Assert.Equal(1, grid[1][0]); // Tuesday after midnight
        Assert.Equal(3, grid.Sum(row => row.Sum()));
    }

    [Fact]
    public void Scores_fall_into_ten_equal_bins_and_a_perfect_score_stays_in_the_last()
    {
        var bins = AdmissionAnalyticsService.Histogram(new[] { 0.0, 9.9, 10.0, 55.0, 100.0, 100.0 }, 100);

        Assert.Equal(10, bins.Count);
        Assert.Equal(new[] { 2, 1, 0, 0, 0, 1, 0, 0, 0, 2 }, bins.Select(b => b.Count));
        Assert.Equal(0, bins[0].From);
        Assert.Equal(100, bins[9].To);
        Assert.Empty(AdmissionAnalyticsService.Histogram(new[] { 1.0 }, 0));
    }

    [Theory]
    [InlineData("2026-10-19", "2026-10-19")] // a Monday is its own week start
    [InlineData("2026-10-21", "2026-10-19")] // Wednesday
    [InlineData("2026-10-25", "2026-10-19")] // Sunday still belongs to the week that began on Monday
    [InlineData("2026-10-26", "2026-10-26")] // the next Monday
    public void Weeks_start_on_monday(string date, string expectedMonday)
    {
        Assert.Equal(DateOnly.Parse(expectedMonday), AdmissionAnalyticsService.WeekStart(DateTime.Parse(date)));
    }

    [Fact]
    public void Weekly_counts_cover_the_last_weeks_with_gaps_filled_with_zero()
    {
        var now = new DateTime(2026, 10, 21, 9, 0, 0);
        var submitted = new[]
        {
            new DateTime(2026, 10, 20), new DateTime(2026, 10, 19, 23, 59, 0), // this week (Mon Oct 19): 2
            new DateTime(2026, 10, 7),                                          // the week of Oct 5: 1
            new DateTime(2026, 8, 3),                                           // older than 4 weeks back: not in a 4-week window
        };

        var weeks = AdmissionAnalyticsService.Weekly(submitted, now, 4);

        Assert.Equal(4, weeks.Count);
        Assert.Equal(new[] { new DateOnly(2026, 9, 28), new DateOnly(2026, 10, 5), new DateOnly(2026, 10, 12), new DateOnly(2026, 10, 19) }, weeks.Select(w => w.WeekStart));
        Assert.Equal(new[] { 0, 1, 0, 2 }, weeks.Select(w => w.Applications));
    }
}
