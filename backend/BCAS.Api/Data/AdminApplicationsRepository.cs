using System.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

public class AdminApplicationsRepository : IAdminApplicationsRepository
{
    private readonly IDbConnectionFactory _connectionFactory;

    public AdminApplicationsRepository(IDbConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<AdminApplicationListItem>> SearchAsync(
        string? search,
        string? status,
        string? category,
        string? program,
        bool? archived = null,
        string? department = null,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = SelectColumns + @"
FROM dbo.vw_ApplicationHistory h
JOIN dbo.Users u ON u.UserId = h.UserId" + DepartmentApply + @"
WHERE (@Search IS NULL
       OR u.FirstName LIKE '%' + @Search + '%' OR u.LastName LIKE '%' + @Search + '%'
       OR (u.FirstName + N' ' + u.LastName) LIKE '%' + @Search + '%'
       OR u.Email LIKE '%' + @Search + '%'
       OR h.CourseAppliedFor LIKE '%' + @Search + '%' OR h.ScholarshipName LIKE '%' + @Search + '%')
  AND (@Status IS NULL OR h.Status = @Status)
  AND (@Category IS NULL OR h.Category = @Category)
  AND (@Program IS NULL OR h.CourseAppliedFor LIKE '%' + @Program + '%' OR h.ScholarshipName LIKE '%' + @Program + '%')
  AND (@Archived IS NULL OR h.IsArchived = @Archived)
  AND (@Department IS NULL
       OR (@Department = N'Unassigned' AND dep.Department IS NULL)
       OR dep.Department = @Department)
ORDER BY h.SubmittedAt DESC;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@Search", SqlDbType.NVarChar, 256) { Value = (object?)NullIfEmpty(search) ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@Status", SqlDbType.NVarChar, 30) { Value = (object?)NullIfEmpty(status) ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@Category", SqlDbType.NVarChar, 20) { Value = (object?)NullIfEmpty(category) ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@Program", SqlDbType.NVarChar, 200) { Value = (object?)NullIfEmpty(program) ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@Archived", SqlDbType.Bit) { Value = (object?)archived ?? DBNull.Value });
        command.Parameters.Add(new SqlParameter("@Department", SqlDbType.NVarChar, 100) { Value = (object?)NullIfEmpty(department) ?? DBNull.Value });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var items = new List<AdminApplicationListItem>();
        while (await reader.ReadAsync(cancellationToken))
        {
            items.Add(MapItem(reader));
        }

        return items;
    }

    public async Task<IReadOnlyList<ApplicationLogEntry>> GetActivityLogAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);
        var entries = new List<ApplicationLogEntry>();

        const string documentsSql = @"
SELECT d.DocumentType, d.Status, d.FlaggedReason, d.ReviewedAt, ru.FirstName, ru.LastName
FROM dbo.ApplicantDocuments d
LEFT JOIN dbo.Users ru ON ru.UserId = d.ReviewedByUserId
WHERE d.UserId = @UserId AND d.ReviewedAt IS NOT NULL;";

        await using (var command = new SqlCommand(documentsSql, connection))
        {
            command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var reason = reader.IsDBNull(reader.GetOrdinal("FlaggedReason")) ? null : reader.GetString(reader.GetOrdinal("FlaggedReason"));
                entries.Add(new ApplicationLogEntry
                {
                    At = reader.GetDateTime(reader.GetOrdinal("ReviewedAt")),
                    Action = "Document reviewed",
                    Details = $"{reader.GetString(reader.GetOrdinal("DocumentType"))}: {reader.GetString(reader.GetOrdinal("Status"))}" + (reason is null ? "" : $" ({reason})"),
                    ActorName = reader.IsDBNull(reader.GetOrdinal("FirstName"))
                        ? null
                        : $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
                });
            }
        }

        const string examSql = @"
SELECT sel.SelectedAt, sel.PermitReleasedAt, sch.ExamDate, ru.FirstName, ru.LastName
FROM dbo.ExamScheduleSelections sel
JOIN dbo.ExamSchedules sch ON sch.ExamScheduleId = sel.ExamScheduleId
LEFT JOIN dbo.Users ru ON ru.UserId = sel.PermitReleasedByUserId
WHERE sel.UserId = @UserId;";

        await using (var command = new SqlCommand(examSql, connection))
        {
            command.Parameters.Add(new SqlParameter("@UserId", SqlDbType.UniqueIdentifier) { Value = userId });
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken))
            {
                var examDate = reader.GetDateTime(reader.GetOrdinal("ExamDate")).ToString("MMM d, yyyy");
                entries.Add(new ApplicationLogEntry
                {
                    At = reader.GetDateTime(reader.GetOrdinal("SelectedAt")),
                    Action = "Exam schedule selected",
                    Details = $"Exam on {examDate}",
                });

                if (!reader.IsDBNull(reader.GetOrdinal("PermitReleasedAt")))
                {
                    entries.Add(new ApplicationLogEntry
                    {
                        At = reader.GetDateTime(reader.GetOrdinal("PermitReleasedAt")),
                        Action = "Exam permit released",
                        ActorName = reader.IsDBNull(reader.GetOrdinal("FirstName"))
                            ? null
                            : $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
                    });
                }
            }
        }

        return entries;
    }

    public async Task<AdminApplicationListItem?> GetByIdAsync(Guid applicationId, CancellationToken cancellationToken = default)
    {
        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        const string sql = SelectColumns + @"
FROM dbo.vw_ApplicationHistory h
JOIN dbo.Users u ON u.UserId = h.UserId" + DepartmentApply + @"
WHERE h.ApplicationId = @ApplicationId;";

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        return await reader.ReadAsync(cancellationToken) ? MapItem(reader) : null;
    }

    public async Task<AdminApplicationListItem?> UpdateStatusAsync(
        Guid applicationId,
        string category,
        string status,
        string? remarks,
        CancellationToken cancellationToken = default)
    {
        // category is validated by the caller against a fixed allowed set
        // before reaching here, but the switch below is the actual guard -
        // `table` can only ever be one of these two literals, never the
        // raw category value, so this is never vulnerable to injection
        // regardless of what category contains.
        var table = category switch
        {
            "Admission" => "dbo.AdmissionApplications",
            "Scholarship" => "dbo.ScholarshipApplications",
            _ => throw new InvalidApplicationCategoryException(category),
        };

        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var updateSql = $@"
UPDATE {table}
SET Status = @Status, Remarks = @Remarks, UpdatedAt = SYSUTCDATETIME()
WHERE ApplicationId = @ApplicationId;";

        await using (var command = new SqlCommand(updateSql, connection))
        {
            command.Parameters.Add(new SqlParameter("@Status", SqlDbType.NVarChar, 30) { Value = status });
            command.Parameters.Add(new SqlParameter("@Remarks", SqlDbType.NVarChar, 1000) { Value = (object?)NullIfEmpty(remarks) ?? DBNull.Value });
            command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });

            var rowsAffected = await command.ExecuteNonQueryAsync(cancellationToken);
            if (rowsAffected == 0)
            {
                return null;
            }
        }

        return await GetByIdAsync(applicationId, cancellationToken);
    }

    public async Task<AdminApplicationListItem?> ArchiveAsync(
        Guid applicationId,
        string category,
        string? reason,
        Guid archivedByUserId,
        CancellationToken cancellationToken = default)
    {
        // Same table-selection guard as UpdateStatusAsync above - category
        // is validated by the caller against a fixed allowed set before
        // reaching here, and `table` can only ever be one of these two
        // literals, never the raw category value.
        var table = category switch
        {
            "Admission" => "dbo.AdmissionApplications",
            "Scholarship" => "dbo.ScholarshipApplications",
            _ => throw new InvalidApplicationCategoryException(category),
        };

        await using var connection = await _connectionFactory.CreateOpenConnectionAsync(cancellationToken);

        var updateSql = $@"
UPDATE {table}
SET IsArchived = 1, ArchivedAt = SYSUTCDATETIME(), ArchivedByUserId = @ArchivedByUserId, ArchiveReason = @Reason
WHERE ApplicationId = @ApplicationId;";

        await using (var command = new SqlCommand(updateSql, connection))
        {
            command.Parameters.Add(new SqlParameter("@ArchivedByUserId", SqlDbType.UniqueIdentifier) { Value = archivedByUserId });
            command.Parameters.Add(new SqlParameter("@Reason", SqlDbType.NVarChar, 500) { Value = (object?)NullIfEmpty(reason) ?? DBNull.Value });
            command.Parameters.Add(new SqlParameter("@ApplicationId", SqlDbType.UniqueIdentifier) { Value = applicationId });

            var rowsAffected = await command.ExecuteNonQueryAsync(cancellationToken);
            if (rowsAffected == 0)
            {
                return null;
            }
        }

        return await GetByIdAsync(applicationId, cancellationToken);
    }

    private const string SelectColumns = @"
SELECT
    h.ApplicationId, h.UserId, u.FirstName, u.LastName, u.Email,
    h.Category, h.ApplicationType, h.CourseAppliedFor, h.PreviousSchool,
    h.ScholarshipName, h.ScholarshipType, h.GradeAverage, h.Status, h.Remarks, h.SubmittedAt, h.UpdatedAt,
    h.IsArchived, h.ArchivedAt, h.ArchivedByUserId, h.ArchiveReason,
    dep.Department";

    // An admission application's own department; a scholarship
    // application's is its applicant's latest admission application's.
    // Applied as a row source (alias dep) so both the select list and the
    // search's department filter read the same value.
    private const string DepartmentApply = @"
CROSS APPLY (
    SELECT CASE WHEN h.Category = N'Admission'
        THEN (SELECT x.Department FROM dbo.AdmissionApplications x WHERE x.ApplicationId = h.ApplicationId)
        ELSE (SELECT d.Department FROM dbo.vw_ApplicantDepartments d WHERE d.UserId = h.UserId)
    END AS Department
) dep";

    private static AdminApplicationListItem MapItem(SqlDataReader reader) => new()
    {
        ApplicationId = reader.GetGuid(reader.GetOrdinal("ApplicationId")),
        UserId = reader.GetGuid(reader.GetOrdinal("UserId")),
        ApplicantName = $"{reader.GetString(reader.GetOrdinal("FirstName"))} {reader.GetString(reader.GetOrdinal("LastName"))}",
        ApplicantEmail = reader.GetString(reader.GetOrdinal("Email")),
        Category = reader.GetString(reader.GetOrdinal("Category")),
        ApplicationType = reader.IsDBNull(reader.GetOrdinal("ApplicationType")) ? null : reader.GetString(reader.GetOrdinal("ApplicationType")),
        CourseAppliedFor = reader.IsDBNull(reader.GetOrdinal("CourseAppliedFor")) ? null : reader.GetString(reader.GetOrdinal("CourseAppliedFor")),
        PreviousSchool = reader.IsDBNull(reader.GetOrdinal("PreviousSchool")) ? null : reader.GetString(reader.GetOrdinal("PreviousSchool")),
        ScholarshipName = reader.IsDBNull(reader.GetOrdinal("ScholarshipName")) ? null : reader.GetString(reader.GetOrdinal("ScholarshipName")),
        ScholarshipType = reader.IsDBNull(reader.GetOrdinal("ScholarshipType")) ? null : reader.GetString(reader.GetOrdinal("ScholarshipType")),
        GradeAverage = reader.IsDBNull(reader.GetOrdinal("GradeAverage")) ? null : reader.GetDecimal(reader.GetOrdinal("GradeAverage")),
        Status = reader.GetString(reader.GetOrdinal("Status")),
        Remarks = reader.IsDBNull(reader.GetOrdinal("Remarks")) ? null : reader.GetString(reader.GetOrdinal("Remarks")),
        SubmittedAt = reader.GetDateTime(reader.GetOrdinal("SubmittedAt")),
        UpdatedAt = reader.GetDateTime(reader.GetOrdinal("UpdatedAt")),
        IsArchived = reader.GetBoolean(reader.GetOrdinal("IsArchived")),
        ArchivedAt = reader.IsDBNull(reader.GetOrdinal("ArchivedAt")) ? null : reader.GetDateTime(reader.GetOrdinal("ArchivedAt")),
        ArchivedByUserId = reader.IsDBNull(reader.GetOrdinal("ArchivedByUserId")) ? null : reader.GetGuid(reader.GetOrdinal("ArchivedByUserId")),
        ArchiveReason = reader.IsDBNull(reader.GetOrdinal("ArchiveReason")) ? null : reader.GetString(reader.GetOrdinal("ArchiveReason")),
        Department = reader.IsDBNull(reader.GetOrdinal("Department")) ? null : reader.GetString(reader.GetOrdinal("Department")),
    };

    private static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
