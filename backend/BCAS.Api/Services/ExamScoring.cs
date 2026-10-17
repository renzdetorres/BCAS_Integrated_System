using BCAS.Api.Models;

namespace BCAS.Api.Services;

/// <summary>The rule that turns a raw entrance exam score into a result.</summary>
public static class ExamScoring
{
    /// <summary>
    /// Passed when the score reaches the passing score. Otherwise Retake while the applicant still
    /// has retakes left (attempt 1 is the first sitting, so attempt 3 is the second retake), and
    /// Failed once the allowed retakes are used up.
    /// </summary>
    public static string Decide(decimal score, int attemptNumber, ExamScoringRulesResponse rules)
    {
        if (score >= rules.PassingScore) return "Passed";
        return attemptNumber - 1 < rules.MaxRetakes ? "Retake" : "Failed";
    }
}
