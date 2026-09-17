namespace BCAS.Api.Models;

public class ApplicationTrackingResponse
{
    public IReadOnlyList<AdmissionApplicationTrackingResponse> AdmissionApplications { get; set; } =
        Array.Empty<AdmissionApplicationTrackingResponse>();

    public IReadOnlyList<ScholarshipApplicationTrackingResponse> ScholarshipApplications { get; set; } =
        Array.Empty<ScholarshipApplicationTrackingResponse>();

    /// <summary>Null if the applicant has no admission application yet - there's no checklist to compute without one.</summary>
    public DocumentChecklistResponse? Documents { get; set; }
}
