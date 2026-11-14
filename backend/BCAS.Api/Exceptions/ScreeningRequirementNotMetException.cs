namespace BCAS.Api.Exceptions;

/// <summary>
/// An applicant whose grade average is below the scholarship's minimum can't be marked Qualified.
/// (Not Qualified is always allowed.)
/// </summary>
public class ScreeningRequirementNotMetException : Exception
{
    public ScreeningRequirementNotMetException(decimal gradeAverage, decimal minimumGradeAverage)
        : base($"The applicant's grade average ({gradeAverage:0.##}) is below the minimum required for this scholarship ({minimumGradeAverage:0.##}), so they can't be marked Qualified. Mark them Not Qualified instead.")
    {
    }
}
