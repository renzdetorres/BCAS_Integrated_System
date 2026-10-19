using BCAS.Api.Constants;
using BCAS.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace BCAS.Api.Extensions;

public static class ControllerBaseExtensions
{
    /// <summary>429 with a Retry-After header and a message that says how long to wait.</summary>
    public static ObjectResult TooManyAttempts(this ControllerBase controller, int retryAfterSeconds)
    {
        var seconds = Math.Max(1, retryAfterSeconds);
        controller.Response.Headers.RetryAfter = seconds.ToString();
        var minutes = (int)Math.Ceiling(seconds / 60.0);
        return controller.StatusCode(StatusCodes.Status429TooManyRequests, new ProblemDetails
        {
            Title = "Too many attempts",
            Detail = $"Too many attempts. Please wait {minutes} minute{(minutes == 1 ? "" : "s")} and try again.",
            Status = StatusCodes.Status429TooManyRequests,
        });
    }

    /// <summary>
    /// Writes the login cookie: HttpOnly, with the Secure/SameSite attributes the configuration calls for. Used
    /// at sign-in and again after a password change, when the old token stops working and the person who just
    /// changed it needs a fresh one.
    /// </summary>
    public static void SetAuthCookie(this ControllerBase controller, string token, DateTime expiresAtUtc)
    {
        var http = controller.HttpContext;
        var (secure, sameSite) = http.RequestServices.GetRequiredService<IOptions<AuthCookieOptions>>().Value
            .Resolve(http.Request.IsHttps, http.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment());
        http.Response.Cookies.Append(AuthConstants.AuthCookieName, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = secure,
            SameSite = sameSite,
            Path = "/",
            Expires = expiresAtUtc,
        });
    }
}
