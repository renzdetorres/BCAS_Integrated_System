namespace BCAS.Api.Models;

/// <summary>
/// The Admin/Academic Head dashboard. The top-level figures describe
/// admission applications (unchanged since BISAASS-37's dashboard);
/// Scholarship carries the same summary for scholarship applications so
/// the dashboard can switch between the two workspaces.
/// </summary>
public class AdminDashboardResponse
{
    public int TotalApplications { get; set; }
    public int TotalApplicants { get; set; }
    public int PendingCount { get; set; }
    public int ApprovedCount { get; set; }
    public int RejectedCount { get; set; }

    /// <summary>Admission applications submitted in the last 7 days.</summary>
    public int SubmittedThisWeek { get; set; }

    /// <summary>Admission applications with no department yet - invisible to every Academic Head.</summary>
    public int UnassignedCount { get; set; }

    /// <summary>Uploaded applicant documents still waiting for verification (non-archived).</summary>
    public int PendingDocumentsCount { get; set; }

    /// <summary>Distinct admission applicants per program (course applied for), highest first.</summary>
    public IReadOnlyList<ProgramCountResponse> ByProgram { get; set; } = Array.Empty<ProgramCountResponse>();

    /// <summary>Admission applications per department; a null Department is the unassigned bucket.</summary>
    public IReadOnlyList<DepartmentCountResponse> ByDepartment { get; set; } = Array.Empty<DepartmentCountResponse>();

    public IReadOnlyList<RecentApplicationResponse> RecentApplications { get; set; } = Array.Empty<RecentApplicationResponse>();

    public ScholarshipDashboardSummaryResponse Scholarship { get; set; } = new();
}

public class DepartmentCountResponse
{
    /// <summary>One of DepartmentConstants.AllowedDepartments, or null for applications not yet filed under one.</summary>
    public string? Department { get; set; }
    public int Count { get; set; }
}

/// <summary>
/// Scholarship-application counterpart of the admission figures on
/// AdminDashboardResponse. An application's department is its applicant's
/// latest admission application's (vw_ApplicantDepartments).
/// </summary>
public class ScholarshipDashboardSummaryResponse
{
    public int TotalApplications { get; set; }
    public int TotalApplicants { get; set; }

    /// <summary>Anything not yet Approved or Rejected, Waitlisted included.</summary>
    public int PendingCount { get; set; }
    public int ApprovedCount { get; set; }
    public int RejectedCount { get; set; }
    public int SubmittedThisWeek { get; set; }
    public int UnassignedCount { get; set; }
    public IReadOnlyList<DepartmentCountResponse> ByDepartment { get; set; } = Array.Empty<DepartmentCountResponse>();

    /// <summary>Distinct scholarship applicants per scholarship, highest first.</summary>
    public IReadOnlyList<ProgramCountResponse> ByProgram { get; set; } = Array.Empty<ProgramCountResponse>();
    public IReadOnlyList<RecentScholarshipApplicationResponse> RecentApplications { get; set; } = Array.Empty<RecentScholarshipApplicationResponse>();
}

public class RecentScholarshipApplicationResponse
{
    public Guid ApplicationId { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string ScholarshipName { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
}
