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
    private readonly IUserManagementService _userManagementService;

    public AdminController(
        IStaffProvisioningService staffProvisioningService,
        IUserManagementService userManagementService)
    {
        _staffProvisioningService = staffProvisioningService;
        _userManagementService = userManagementService;
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

    /// <summary>Admin-only: lists every account so one can be selected to activate/deactivate.</summary>
    [HttpGet("users")]
    [ProducesResponseType(typeof(IReadOnlyList<UserProfileResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<UserProfileResponse>>> ListUsers(CancellationToken cancellationToken)
    {
        var users = await _userManagementService.ListUsersAsync(cancellationToken);
        return Ok(users);
    }

    /// <summary>
    /// Admin-only: activates or deactivates an account without deleting it.
    /// Deactivated accounts fail login (see AuthService.LoginAsync) but keep
    /// their row and any linked records untouched.
    /// </summary>
    [HttpPatch("users/{userId:guid}/status")]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserProfileResponse>> SetActiveStatus(
        Guid userId,
        [FromBody] SetActiveStatusRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _userManagementService.SetActiveStatusAsync(userId, request.IsActive!.Value, cancellationToken);
            return Ok(response);
        }
        catch (UserNotFoundException ex)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Account not found",
                Detail = ex.Message,
                Status = StatusCodes.Status404NotFound,
            });
        }
    }

    /// <summary>
    /// Admin-only: edits an existing account's name, email, and role. Works
    /// across all five roles (Applicant included), unlike staff provisioning
    /// which only ever creates staff accounts.
    /// </summary>
    [HttpPut("users/{userId:guid}")]
    [ProducesResponseType(typeof(UserProfileResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserProfileResponse>> UpdateUser(
        Guid userId,
        [FromBody] UpdateUserRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var response = await _userManagementService.UpdateUserAsync(userId, request, cancellationToken);
            return Ok(response);
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
        catch (UserNotFoundException ex)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Account not found",
                Detail = ex.Message,
                Status = StatusCodes.Status404NotFound,
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
