namespace BCAS.Api.Exceptions;

/// <summary>Scholarship exists but can't currently be applied to (inactive, or no slots remaining).</summary>
public class ScholarshipNotAvailableException : Exception
{
    public ScholarshipNotAvailableException(string reason)
        : base(reason)
    {
    }
}
