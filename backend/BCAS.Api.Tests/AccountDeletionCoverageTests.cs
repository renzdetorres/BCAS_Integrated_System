using System.Text.RegularExpressions;
using Xunit;

namespace BCAS.Api.Tests;

/// <summary>
/// Deleting an account is one SQL batch that has to know every table pointing at Users. A table added later and
/// left out of it makes the delete fail with a 500 for any applicant who has reached that step.
/// </summary>
public class AccountDeletionCoverageTests
{
    // Start from this file's own folder (known at compile time), so it works wherever the build output goes.
    private static string? FindUp(string relativePath, [System.Runtime.CompilerServices.CallerFilePath] string sourceFile = "")
    {
        var dir = new DirectoryInfo(Path.GetDirectoryName(sourceFile) ?? AppContext.BaseDirectory);
        while (dir is not null)
        {
            var candidate = Path.Combine(dir.FullName, relativePath);
            if (File.Exists(candidate)) return candidate;
            dir = dir.Parent;
        }

        return null;
    }

    [Fact]
    public void Every_table_that_points_at_Users_is_handled_when_an_account_is_deleted()
    {
        var schemaPath = FindUp(Path.Combine("database", "schema.sql"));
        var repositoryPath = FindUp(Path.Combine("backend", "BCAS.Api", "Data", "UserRepository.cs"));
        if (schemaPath is null || repositoryPath is null) return; // run outside a full checkout: nothing to compare

        var schema = File.ReadAllText(schemaPath);
        var repository = File.ReadAllText(repositoryPath);

        // Each CREATE TABLE block that has a foreign key to Users.
        var tables = Regex.Split(schema, @"CREATE TABLE dbo\.", RegexOptions.IgnoreCase)
            .Skip(1)
            .Where(block => block.Contains("REFERENCES dbo.Users", StringComparison.OrdinalIgnoreCase))
            .Select(block => Regex.Match(block, @"^\w+").Value)
            .Where(name => name.Length > 0 && name != "Users")
            .Distinct()
            .ToList();

        Assert.NotEmpty(tables);

        var missing = tables.Where(name => !repository.Contains($"dbo.{name}", StringComparison.Ordinal)).ToList();

        Assert.True(missing.Count == 0, "UserRepository.DeleteAccountAsync does not handle: " + string.Join(", ", missing));
    }
}
