namespace BCAS.Api.Constants;

/// <summary>
/// One restrictable page. <see cref="Key"/> is the page's route in the SPA
/// (the same string navigation.js links to), so the frontend can hide the
/// link and guard the route without a translation table. <see cref="ApiPrefixes"/>
/// are the API paths that page depends on - the server refuses them for a
/// role the Super Admin has blocked, so hiding the link isn't the only
/// protection. Pages that share an API with another page (Records and
/// Archives both read Applications) list no prefix and are UI-only.
/// </summary>
public sealed record FeatureDefinition(string Key, string Label, string Group, params string[] ApiPrefixes);

/// <summary>
/// What a Super Admin can switch off per role. The Dashboard, profile and
/// settings pages are deliberately not listed: every role needs somewhere to
/// land and to manage its own account.
/// </summary>
public static class FeatureCatalog
{
    public static readonly IReadOnlyDictionary<string, IReadOnlyList<FeatureDefinition>> ByRole =
        new Dictionary<string, IReadOnlyList<FeatureDefinition>>
        {
            ["Admin"] = new FeatureDefinition[]
            {
                new("/admin/applications", "Applications", "Admission Management", "/api/admin/applications"),
                new("/admin/document-verification", "Document Verification", "Admission Management", "/api/support-staff/documents"),
                new("/admin/document-archive", "Document Archive", "Admission Management"),
                new("/admin/documents", "Document Verification Log", "Admission Management", "/api/admin/documents"),
                new("/admin/payments", "Payments", "Admission Management", "/api/staff/payments"),
                new("/admin/admission-slots", "Admission Slots", "Admission Management", "/api/admin/admission-slots"),
                new("/admin/exam-schedules", "Exam Schedules", "Admission Management", "/api/admin/exam-schedules"),
                new("/admin/exam-permits", "Exam Permits", "Admission Management", "/api/admin/exam-permits"),
                new("/admin/exam-results", "Exam Results", "Admission Management", "/api/staff/exam-results"),
                new("/admin/interviews", "Interviews & Results", "Admission Management", "/api/staff/interviews"),
                new("/admin/reservations", "Reservations", "Admission Management", "/api/admin/reservations"),
                new("/admin/applicant-records", "Applicant Records", "Admission Management", "/api/support-staff/applicants"),
                new("/admin/records", "Records", "Admission Management"),
                new("/admin/archive", "Archives", "Admission Management"),
                new("/admin/scholarships", "Scholarships", "Scholarships", "/api/admin/scholarships"),
                new("/admin/scholarship-slots", "Scholarship Slots", "Scholarships", "/api/evaluator/scholarship-slots"),
                new("/admin/scholarship-screening", "Scholarship Screening", "Scholarships",
                    "/api/evaluator/dashboard", "/api/evaluator/scholarship-applications"),
                new("/admin/scholarship-pipeline", "Scholarship Exam & Grantees", "Scholarships", "/api/staff/scholarship-pipeline"),
                new("/admin/announcements", "Announcements", "Communications", "/api/admin/announcements"),
                new("/staff/inquiries", "Inquiries", "Communications", "/api/staff/inquiries"),
                new("/admin/reports", "Reports", "Reports", "/api/admin/reports"),
                new("/admin/analytics", "Analytics", "Reports", "/api/admin/analytics"),
                new("/admin/users", "Account Management", "Administration", "/api/admin/users", "/api/admin/staff"),
                new("/admin/audit-logs", "Activity Log", "Administration", "/api/admin/audit-logs"),
            },
            ["Evaluator"] = new FeatureDefinition[]
            {
                new("/evaluator/scholarship-slots", "Scholarship Slots", "Scholarships",
                    "/api/evaluator/scholarship-slots", "/api/evaluator/scholarship-applications"),
                new("/evaluator/scholarship-pipeline", "Scholarship Exam & Grantees", "Scholarships", "/api/staff/scholarship-pipeline"),
                new("/evaluator/applications", "Applications", "Admission", "/api/admin/applications"),
                new("/evaluator/documents", "Document Verification", "Admission", "/api/support-staff/documents"),
                new("/evaluator/documents/archive", "Document Archive", "Admission"),
                new("/evaluator/exam-permits", "Exam Permits", "Admission", "/api/admin/exam-permits"),
                new("/evaluator/exam-results", "Exam Results", "Admission", "/api/staff/exam-results"),
                new("/evaluator/interviews", "Interviews & Results", "Admission", "/api/staff/interviews"),
            },
            ["AcademicHead"] = new FeatureDefinition[]
            {
                new("/academic-head/scholarships", "Scholarships", "Scholarship Oversight",
                    "/api/academic-head/scholarships", "/api/academic-head/scholarship-applications"),
                new("/academic-head/scholarship-pipeline", "Exam & Grantees", "Scholarship Oversight", "/api/staff/scholarship-pipeline"),
                new("/academic-head/announcements", "Announcements", "Scholarship Oversight", "/api/academic-head/announcements"),
                new("/academic-head/reports", "Reports", "Scholarship Oversight", "/api/academic-head/reports"),
            },
            ["SupportStaff"] = new FeatureDefinition[]
            {
                new("/support-staff/payments", "Payment Verification", "Payments", "/api/staff/payments"),
                new("/support-staff/exam-results", "Exam Results", "Records", "/api/staff/exam-results"),
                new("/support-staff/applicants", "Applicant Records", "Records", "/api/support-staff/applicants"),
                new("/staff/inquiries", "Inquiries", "Records", "/api/staff/inquiries"),
            },
            ["Applicant"] = new FeatureDefinition[]
            {
                new("/applications", "Admission Application", "My Application", "/api/admission-applications"),
                new("/applications/history", "Application History", "My Application", "/api/applications"),
                new("/application-tracking", "Application Tracking & Documents", "My Application", "/api/application-tracking", "/api/documents"),
                new("/scholarships", "Scholarship Application", "Scholarship", "/api/scholarships", "/api/scholarship-applications"),
                new("/payment", "Exam Payment", "Entrance Exam", "/api/exam-payment"),
                new("/exam-schedule", "Exam Schedule", "Entrance Exam", "/api/exam-schedules"),
                new("/exam-permit", "Exam Permit", "Entrance Exam", "/api/exam-permit"),
                new("/exam-result", "Exam Result", "Entrance Exam", "/api/exam-result"),
                new("/interview", "Interview & Result", "Admission Result", "/api/interview"),
                new("/announcements", "Announcements", "Other", "/api/announcements"),
                new("/inquiries", "Inquiries", "Other", "/api/inquiries"),
            },
        };

    public static bool IsKnown(string role, string featureKey) =>
        ByRole.TryGetValue(role, out var features) && features.Any(f => f.Key == featureKey);

    /// <summary>The feature whose API prefix covers this request path for this role, or null.</summary>
    public static FeatureDefinition? FindByApiPath(string role, PathString path)
    {
        if (!ByRole.TryGetValue(role, out var features)) return null;
        return features.FirstOrDefault(f => f.ApiPrefixes.Any(prefix => path.StartsWithSegments(prefix, StringComparison.OrdinalIgnoreCase)));
    }
}
