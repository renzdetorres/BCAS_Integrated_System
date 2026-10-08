namespace BCAS.Api.Constants;

/// <summary>Choices on the Academic Scholarship Application and Consent Form.</summary>
public static class ScholarshipFormConstants
{
    public const string Grade7 = "Grade 7";
    public const string Grade11 = "Grade 11";
    public const string FirstYearCollege = "First Year College";

    public static readonly string[] Levels = { Grade7, Grade11, FirstYearCollege };

    public const string Parent = "Parent";
    public const string OfficialGuardian = "Official guardian";

    public static readonly string[] GuardianRoles = { Parent, OfficialGuardian };

    /// <summary>The department a level places the applicant in (see DepartmentConstants).</summary>
    public static string DepartmentFor(string level) => level switch
    {
        Grade7 => "High School",
        Grade11 => "Senior High School",
        FirstYearCollege => "College",
        _ => string.Empty,
    };
}
