using System.Security.Claims;
using BCAS.Api.Constants;
using BCAS.Api.Extensions;

namespace BCAS.Api.Services;

/// <summary>
/// Refuses an API call to a page the Super Admin has switched off for the
/// caller's role. Runs after authentication so it can see the role, and only
/// does any work for paths that belong to a restrictable feature.
/// </summary>
public class RoleAccessMiddleware
{
    private readonly RequestDelegate _next;

    public RoleAccessMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, IRoleAccessService roleAccess)
    {
        var role = context.User.FindFirstValue(ClaimTypes.Role);
        if (role is not null && context.User.Identity?.IsAuthenticated == true)
        {
            var feature = FeatureCatalog.FindByApiPath(role, context.Request.Path);
            if (feature is not null)
            {
                var blocked = await roleAccess.GetBlockedForUserAsync(context.User.GetUserId(), role, context.RequestAborted);
                if (blocked.Contains(feature.Key))
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    await context.Response.WriteAsJsonAsync(new Microsoft.AspNetCore.Mvc.ProblemDetails
                    {
                        Title = "Access restricted",
                        Detail = $"Your role no longer has access to {feature.Label}. Ask the principal if you need it.",
                        Status = StatusCodes.Status403Forbidden,
                    });
                    return;
                }
            }
        }

        await _next(context);
    }
}
