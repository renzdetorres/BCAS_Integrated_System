using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public interface IDbConnectionFactory
{
    Task<SqlConnection> CreateOpenConnectionAsync(CancellationToken cancellationToken = default);
}
