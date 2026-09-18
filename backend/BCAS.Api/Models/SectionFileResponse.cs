namespace BCAS.Api.Models;

/// <summary>
/// File per Section (BISAASS-37) - enrolled admission applicants grouped by
/// section. This system has no separate class-section entity, so the
/// applied-for course (CourseAppliedFor) is used as the section grouping -
/// the closest existing concept to a "section" for a newly-enrolled student.
/// </summary>
public class SectionFileResponse
{
    public string Section { get; set; } = string.Empty;
    public IReadOnlyList<EnrollmentListItemResponse> Students { get; set; } = Array.Empty<EnrollmentListItemResponse>();
}
