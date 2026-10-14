using BCAS.Api.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BCAS.Api.Controllers;

/// <summary>
/// The academic lists the forms and filters offer: year levels per category,
/// terms, semesters, strands and College programs. They are not sensitive and
/// the app needs them before anyone signs in (the language of its filters
/// and forms), so this is open to everyone; admins change them in Settings.
/// </summary>
[ApiController]
public class AcademicCatalogController : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("api/academic-catalog")]
    [ProducesResponseType(typeof(AcademicCatalogResponse), StatusCodes.Status200OK)]
    public ActionResult<AcademicCatalogResponse> Get()
    {
        var catalog = AcademicCatalog.Current;
        return Ok(new AcademicCatalogResponse(
            catalog.Strands,
            catalog.Terms,
            catalog.Semesters,
            catalog.YearLevels,
            catalog.CollegePrograms,
            AcademicCatalog.ProtectedLevels));
    }
}

public sealed record AcademicCatalogResponse(
    IReadOnlyList<string> Strands,
    IReadOnlyList<string> Terms,
    IReadOnlyList<string> Semesters,
    IReadOnlyDictionary<string, IReadOnlyList<string>> YearLevels,
    IReadOnlyList<CatalogProgram> Programs,
    IReadOnlyList<string> ProtectedLevels);
