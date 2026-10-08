using BCAS.Api.Exceptions;
using BCAS.Api.Models;

namespace BCAS.Api.Constants;

public static class AdmissionFormConstants
{
    public static readonly string[] SexOptions = { "Male", "Female" };
    public const int MaxSiblings = 10;

    /// <summary>
    /// Checks the form and tidies it (trims text, drops blank sibling rows).
    /// Throws InvalidEntranceFormException with a message the applicant can act on.
    /// </summary>
    public static void ValidateAndNormalize(AdmissionFormDetails form)
    {
        static string? Clean(string? v) => string.IsNullOrWhiteSpace(v) ? null : v.Trim();

        form.Sex = SexOptions.FirstOrDefault(s => string.Equals(s, Clean(form.Sex), StringComparison.OrdinalIgnoreCase))
            ?? throw new InvalidEntranceFormException("Choose the student's sex.");
        form.PlaceOfBirth = Clean(form.PlaceOfBirth) ?? throw new InvalidEntranceFormException("Enter the student's place of birth.");
        form.PreviousSchoolAddress = Clean(form.PreviousSchoolAddress) ?? throw new InvalidEntranceFormException("Enter the address of the school last attended.");
        form.SpecialSkills = Clean(form.SpecialSkills);

        foreach (var member in new[] { form.Father, form.Mother, form.Guardian })
        {
            member.Name = Clean(member.Name);
            member.Occupation = Clean(member.Occupation);
            member.Phone = Clean(member.Phone);
        }

        // The paper form lists father, mother and guardian; at least one must be reachable.
        if (!new[] { form.Father, form.Mother, form.Guardian }.Any(m => m.Name is not null && m.Phone is not null))
        {
            throw new InvalidEntranceFormException("Give the name and phone number of at least one parent or guardian.");
        }

        form.Siblings = form.Siblings
            .Select(s => new Sibling { Name = Clean(s.Name), Age = s.Age, Occupation = Clean(s.Occupation), SchoolOrWork = Clean(s.SchoolOrWork) })
            .Where(s => s.Name is not null || s.Age is not null || s.Occupation is not null || s.SchoolOrWork is not null)
            .ToList();
        if (form.Siblings.Count > MaxSiblings)
        {
            throw new InvalidEntranceFormException($"List at most {MaxSiblings} brothers and sisters.");
        }

        if (form.Siblings.Any(s => s.Name is null))
        {
            throw new InvalidEntranceFormException("Every brother or sister listed needs a name.");
        }

        form.StudentSignature = Clean(form.StudentSignature) ?? throw new InvalidEntranceFormException("Type the student's name as the student's signature.");
        form.GuardianSignature = Clean(form.GuardianSignature) ?? throw new InvalidEntranceFormException("Type a parent's or guardian's name as their signature.");
    }
}
