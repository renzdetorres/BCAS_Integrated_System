using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace BCAS.Api.Extensions;

public static class ClaimsPrincipalExtensions
{
    /// <summary>The authenticated user's id, from the JWT's "sub" claim.</summary>
    public static Guid GetUserId(this ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
}
