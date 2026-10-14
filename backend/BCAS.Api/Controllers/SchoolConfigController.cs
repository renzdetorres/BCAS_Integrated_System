using BCAS.Api.Constants;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>
/// The school's admission configuration: academic year, Pre-Kinder and
/// Kindergarten age policy, exam fee and payment details. Admins edit it;
/// every signed-in user can read the parts the forms need.
/// </summary>
[ApiController]
public class SchoolConfigController : ControllerBase
{
    private readonly ISchoolConfigService _schoolConfigService;

    public SchoolConfigController(ISchoolConfigService schoolConfigService)
    {
        _schoolConfigService = schoolConfigService;
    }

    /// <summary>The academic year and age policy the admission form validates against.</summary>
    [Authorize]
    [HttpGet("api/school-config/admission")]
    [ProducesResponseType(typeof(AdmissionConfigResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<AdmissionConfigResponse>> GetAdmissionConfig(CancellationToken cancellationToken) =>
        Ok(await _schoolConfigService.GetAdmissionConfigAsync(DateOnly.FromDateTime(DateTime.UtcNow), cancellationToken));

    /// <summary>Every configurable value, for the admin settings screen.</summary>
    [Authorize(Roles = "Admin")]
    [HttpGet("api/admin/school-config")]
    [ProducesResponseType(typeof(IReadOnlyDictionary<string, string>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyDictionary<string, string>>> GetAll(CancellationToken cancellationToken) =>
        Ok(await _schoolConfigService.GetAllAsync(cancellationToken));

    /// <summary>Saves the given values. Unknown keys and out-of-range values are rejected.</summary>
    [Authorize(Roles = "Admin")]
    [HttpPut("api/admin/school-config")]
    [ProducesResponseType(typeof(IReadOnlyDictionary<string, string>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyDictionary<string, string>>> Save(
        [FromBody] UpdateSchoolConfigRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            await _schoolConfigService.SaveAsync(request.Values, cancellationToken);
            return Ok(await _schoolConfigService.GetAllAsync(cancellationToken));
        }
        catch (InvalidSchoolConfigException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid setting",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
    }
}
