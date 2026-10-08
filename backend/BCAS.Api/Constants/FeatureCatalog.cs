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
                new("/admin/documents", "Document Verification Log", "Admission Management", "/api/admin/documents"),
                new("/admin/exam-schedules", "Exam Schedules", "Admission Management", "/api/admin/exam-schedules"),
                new("/admin/exam-permits", "Exam Permits", "Admission Management", "/api/admin/exam-permits"),
                new("/admin/reservations", "Reservations", "Admission Management", "/api/admin/reservations"),
                new("/admin/records", "Records", "Admission Management"),
                new("/admin/archive", "Archives", "Admission Management"),
                new("/admin/scholarships", "Scholarships", "Scholarships", "/api/admin/scholarships"),
                new("/admin/announcements", "Announcements", "Communications", "/api/admin/announcements"),
                new("/staff/inquiries", "Inquiries", "Communications", "/api/staff/inquiries"),
                new("/admin/reports", "Reports", "Reports", "/api/admin/reports"),
                new("/admin/users", "Account Management", "Administration", "/api/admin/users"),
                new("/admin/duplicate-applicants", "Duplicate Applicants", "Administration", "/api/admin/duplicate-applicants"),
                new("/admin/staff", "Provision Staff", "Administration", "/api/admin/staff"),
                new("/admin/audit-logs", "Activity Log", "Administration", "/api/admin/audit-logs"),
            },
            ["Evaluator"] = new FeatureDefinition[]
            {
                new("/evaluator/scholarship-slots", "Scholarship Slots", "Scholarships",
                    "/api/evaluator/scholarship-slots", "/api/evaluator/scholarship-applications"),
            },
            ["AcademicHead"] = new FeatureDefinition[]
            {
                new("/academic-head/scholarships", "Scholarships", "Scholarship Oversight",
                    "/api/academic-head/scholarships", "/api/academic-head/scholarship-applications"),
                new("/academic-head/announcements", "Announcements", "Scholarship Oversight", "/api/academic-head/announcements"),
                new("/academic-head/reports", "Reports", "Scholarship Oversight", "/api/academic-head/reports"),
            },
            ["SupportStaff"] = new FeatureDefinition[]
            {
                new("/support-staff/documents", "Verification Queue", "Document Verification", "/api/support-staff/documents"),
                new("/support-staff/documents/archive", "Document Archive", "Document Verification"),
                new("/support-staff/applicants", "Applicant Records", "Records", "/api/support-staff/applicants"),
                new("/staff/inquiries", "Inquiries", "Records", "/api/staff/inquiries"),
            },
            ["Applicant"] = new FeatureDefinition[]
            {
                new("/applications", "Admission Application", "My Application", "/api/admission-applications"),
                new("/applications/history", "Application History", "My Application", "/api/applications"),
                new("/application-tracking", "Application Tracking", "My Application", "/api/application-tracking"),
                new("/documents", "Documents", "My Application", "/api/documents"),
                new("/scholarships", "Scholarship Application", "Scholarship", "/api/scholarships", "/api/scholarship-applications"),
                new("/exam-schedule", "Exam Schedule", "Entrance Exam", "/api/exam-schedules"),
                new("/exam-permit", "Exam Permit", "Entrance Exam", "/api/exam-permit"),
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
