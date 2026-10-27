using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>Admission Slots: how many applicants each level takes. The Admin edits it.</summary>
[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/admission-slots")]
public class AdminAdmissionSlotsController : ControllerBase
{
    private readonly IAdmissionSlotsService _slots;

    public AdminAdmissionSlotsController(IAdmissionSlotsService slots)
    {
        _slots = slots;
    }

    /// <summary>Every level with its limit and how many slots are taken.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdmissionLevelSlotResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdmissionLevelSlotResponse>>> Get(CancellationToken cancellationToken) =>
        Ok(await _slots.GetAllAsync(cancellationToken));

    /// <summary>Saves the limit of each level (a blank limit means no limit) and returns the refreshed list.</summary>
    [HttpPut]
    [ProducesResponseType(typeof(IReadOnlyList<AdmissionLevelSlotResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<AdmissionLevelSlotResponse>>> Save(
        [FromBody] UpdateAdmissionSlotsRequest request, CancellationToken cancellationToken)
    {
        try
        {
            await _slots.SaveAsync(request.Levels, cancellationToken);
            return Ok(await _slots.GetAllAsync(cancellationToken));
        }
        catch (InvalidSchoolConfigException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid admission slots",
                Detail = ex.Message,
                Status = StatusCodes.Status400BadRequest,
            });
        }
    }
}

/// <summary>What an applicant sees about slots: only which levels are full, so the form can say so before they submit.</summary>
[Authorize(Roles = "Applicant")]
[ApiController]
[Route("api/admission-slots")]
public class AdmissionSlotsController : ControllerBase
{
    private readonly IAdmissionSlotsService _slots;

    public AdmissionSlotsController(IAdmissionSlotsService slots)
    {
        _slots = slots;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<AdmissionSlotAvailabilityResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdmissionSlotAvailabilityResponse>>> Get(CancellationToken cancellationToken) =>
        Ok(await _slots.GetAvailabilityAsync(cancellationToken));
}
