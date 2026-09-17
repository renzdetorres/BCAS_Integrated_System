using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly IStaffProvisioningService _staffProvisioningService;

    public AdminController(IStaffProvisioningService staffProvisioningService)
    {
        _staffProvisioningService = staffProvisioningService;
    }

    /// <summary>
    /// Admin-only: creates a staff account (Evaluator, SupportStaff,
    /// AcademicHead, or Admin). These roles are never self-served via public
    /// registration. The created account is immediately usable for login.
    /// </summary>
    [HttpPost("staff")]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserProfileResponse>> CreateStaff(
        [FromBody] ProvisionStaffRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _staffProvisioningService.CreateStaffAsync(request, cancellationToken);
            return CreatedAtAction(nameof(CreateStaff), new { id = response.UserId }, response);
        }
        catch (InvalidRoleException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid role",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (DuplicateEmailException ex)
        {
            return Conflict(new ProblemDetails
            {
                Title = "Email already registered",
                Detail = ex.Message,
                Status = StatusCodes.Status409Conflict,
            });
        }
    }
}
