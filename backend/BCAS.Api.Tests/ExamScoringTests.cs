using BCAS.Api.Models;
using BCAS.Api.Services;
using Xunit;

namespace BCAS.Api.Tests;

public class ExamScoringTests
{
    private static readonly ExamScoringRulesResponse Rules = new() { TotalItems = 100, PassingScore = 75, MaxRetakes = 2 };

    [Theory]
    [InlineData(75, 1, "Passed")]
    [InlineData(100, 1, "Passed")]
    [InlineData(74.99, 1, "Retake")]
    [InlineData(0, 1, "Retake")]
    [InlineData(60, 2, "Retake")]   // first retake missed: one more allowed
    [InlineData(60, 3, "Failed")]   // second retake missed: none left
    [InlineData(80, 3, "Passed")]   // passing on the last retake still passes
    public void A_raw_score_decides_the_result(double score, int attempt, string expected)
    {
        Assert.Equal(expected, ExamScoring.Decide((decimal)score, attempt, Rules));
    }

    [Fact]
    public void With_no_retakes_allowed_a_miss_fails_at_once()
    {
        var strict = new ExamScoringRulesResponse { TotalItems = 100, PassingScore = 75, MaxRetakes = 0 };
        Assert.Equal("Failed", ExamScoring.Decide(10, 1, strict));
    }
}
