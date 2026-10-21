using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>
/// The Analytics page: where applicants drop off, how busy each week is, how the exam and payments
/// are going, and how long each step takes. Admin only; read-only.
/// </summary>
[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/analytics")]
public class AdminAnalyticsController : ControllerBase
{
    private readonly IAdmissionAnalyticsService _analytics;

    public AdminAnalyticsController(IAdmissionAnalyticsService analytics)
    {
        _analytics = analytics;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AdmissionAnalyticsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdmissionAnalyticsResponse>> Get([FromQuery] string? academicYear, CancellationToken cancellationToken)
    {
        return Ok(await _analytics.GetAsync(string.IsNullOrWhiteSpace(academicYear) ? null : academicYear, cancellationToken));
    }
}
