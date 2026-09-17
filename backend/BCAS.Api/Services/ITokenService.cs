using BCAS.Api.Models;

namespace BCAS.Api.Services;

public interface ITokenService
{
    (string Token, DateTime ExpiresAtUtc) GenerateToken(User user);
}
