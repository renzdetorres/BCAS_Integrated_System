using BCAS.Api.Exceptions;
using BCAS.Api.Extensions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>Admin-Registrar reservation management (BISAASS-33).</summary>
[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/reservations")]
public class AdminReservationsController : ControllerBase
{
    private readonly IAdminReservationsService _reservationsService;

    public AdminReservationsController(IAdminReservationsService reservationsService)
    {
        _reservationsService = reservationsService;
    }

    /// <summary>Admin-only: every Approved admission application, with its reservation status - reserved and unreserved alike.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdminReservationResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminReservationResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var reservations = await _reservationsService.GetAllAsync(cancellationToken);
        return Ok(reservations);
    }

    /// <summary>
    /// Admin-only: records (or replaces) an applicant's reservation status,
    /// with optional remarks. Only Approved admission applications can be
    /// reserved. Blocked while the ReservationOnlinePaymentRequired system
    /// setting is on - the school's ₱2,500 reservation fee is never
    /// processed by this system, only recorded once received.
    /// </summary>
    [HttpPut("{applicationId:guid}")]
    [ProducesResponseType(typeof(AdminReservationResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminReservationResponse>> Record(
        Guid applicationId,
        [FromBody] RecordReservationRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _reservationsService.RecordAsync(applicationId, request, User.GetUserId(), cancellationToken);
            return Ok(updated);
        }
        catch (ReservationRequiresApprovedApplicationException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Application not approved",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (OnlinePaymentRequiredException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Online payment required",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
        catch (ApplicationNotFoundException ex)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Application not found",
                Detail = ex.Message,
                Status = StatusCodes.Status404NotFound,
            });
        }
    }
}
