namespace BCAS.Api.Constants;

/// <summary>
/// ConfigKey values in dbo.SchoolConfig - the admin-editable numbers and
/// text the admission process reads (age policy, academic year, payment
/// details). Distinct from SystemSettingKeys, which are on/off switches.
/// </summary>
public static class SchoolConfigKeys
{
    /// <summary>The academic year new applications are filed for, e.g. "2026-2027". Blank means work it out from today's date.</summary>
    public const string AdmissionAcademicYear = "Admission.AcademicYear";

    /// <summary>Minimum age (in whole years) a Pre-Kinder applicant must have reached by the cutoff.</summary>
    public const string PreKinderMinAge = "AgePolicy.PreKinderMinAge";

    /// <summary>Minimum age (in whole years) a Kindergarten applicant must have reached by the cutoff.</summary>
    public const string KinderMinAge = "AgePolicy.KinderMinAge";

    /// <summary>The month (1-12) at whose end the minimum age is measured. 12 = "4 years old until December".</summary>
    public const string AgeCutoffMonth = "AgePolicy.CutoffMonth";

    public const string ExamFee = "Payment.ExamFee";
    public const string PaymentAccountName = "Payment.AccountName";
    public const string PaymentInstructions = "Payment.Instructions";

    /// <summary>The school's QR payment code, stored as an image data URL.</summary>
    public const string PaymentQrImage = "Payment.QrImage";

    /// <summary>The payment methods applicants can choose from, as a JSON list (see PaymentMethods). Blank until an admin sets some up.</summary>
    public const string PaymentMethods = "Payment.Methods";

    /// <summary>How many items the entrance exam has: the highest raw score an applicant can get.</summary>
    public const string ExamTotalItems = "Exam.TotalItems";

    /// <summary>The lowest raw score that passes the entrance exam.</summary>
    public const string ExamPassingScore = "Exam.PassingScore";

    /// <summary>How many times an applicant who falls short may retake the exam before the result is Failed.</summary>
    public const string ExamMaxRetakes = "Exam.MaxRetakes";

    // The academic lists, each stored as JSON (see AcademicCatalog).
    public const string AcademicStrands = "Academic.Strands";
    public const string AcademicTerms = "Academic.Terms";
    public const string AcademicSemesters = "Academic.Semesters";
    public const string AcademicYearLevels = "Academic.YearLevels";
    public const string AcademicPrograms = "Academic.Programs";

    public static readonly IReadOnlyDictionary<string, string> Defaults = new Dictionary<string, string>(AcademicCatalog.ToConfig(AcademicCatalog.Defaults), StringComparer.Ordinal)
    {
        [AdmissionAcademicYear] = "",
        [PreKinderMinAge] = "4",
        [KinderMinAge] = "5",
        [AgeCutoffMonth] = "12",
        [ExamFee] = "500",
        [PaymentAccountName] = "",
        [PaymentInstructions] = "Scan the QR code with your banking or e-wallet app, pay the exact exam fee, then upload a screenshot or photo of your receipt.",
        [PaymentQrImage] = "",
        [PaymentMethods] = "",
        [ExamTotalItems] = "100",
        [ExamPassingScore] = "75",
        [ExamMaxRetakes] = "2",
    };
}
