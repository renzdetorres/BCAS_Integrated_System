using System.Data;
using System.Text.Json;
using BCAS.Api.Models;
using Microsoft.Data.SqlClient;

namespace BCAS.Api.Data;

/// <summary>Reads and writes the entrance-exam form columns of dbo.AdmissionApplications.</summary>
internal static class AdmissionFormColumns
{
    /// <summary>The column list, unqualified, for a SELECT.</summary>
    public const string Select =
        "Sex, PlaceOfBirth, PreviousSchoolAddress, SpecialSkills, FatherName, FatherOccupation, FatherPhone, " +
        "MotherName, MotherOccupation, MotherPhone, GuardianName, GuardianOccupation, GuardianPhone, Siblings, " +
        "StudentSignature, GuardianSignature";

    /// <summary>The same list qualified with a table alias, e.g. "inserted" or "a".</summary>
    public static string Qualified(string alias) => string.Join(", ", Select.Split(", ").Select(c => $"{alias}.{c}"));

    public static AdmissionFormDetails Read(SqlDataReader reader)
    {
        string? Text(string column) => reader.IsDBNull(reader.GetOrdinal(column)) ? null : reader.GetString(reader.GetOrdinal(column));

        var siblingsJson = Text("Siblings");
        return new AdmissionFormDetails
        {
            Sex = Text("Sex"),
            PlaceOfBirth = Text("PlaceOfBirth"),
            PreviousSchoolAddress = Text("PreviousSchoolAddress"),
            SpecialSkills = Text("SpecialSkills"),
            Father = new FamilyMember { Name = Text("FatherName"), Occupation = Text("FatherOccupation"), Phone = Text("FatherPhone") },
            Mother = new FamilyMember { Name = Text("MotherName"), Occupation = Text("MotherOccupation"), Phone = Text("MotherPhone") },
            Guardian = new FamilyMember { Name = Text("GuardianName"), Occupation = Text("GuardianOccupation"), Phone = Text("GuardianPhone") },
            Siblings = string.IsNullOrWhiteSpace(siblingsJson)
                ? new List<Sibling>()
                : JsonSerializer.Deserialize<List<Sibling>>(siblingsJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new List<Sibling>(),
            StudentSignature = Text("StudentSignature"),
            GuardianSignature = Text("GuardianSignature"),
        };
    }

    public static void AddParameters(SqlCommand command, AdmissionFormDetails form)
    {
        static object Value(string? v) => string.IsNullOrWhiteSpace(v) ? DBNull.Value : v.Trim();

        void Add(string name, int size, string? value) =>
            command.Parameters.Add(new SqlParameter(name, SqlDbType.NVarChar, size) { Value = Value(value) });

        Add("@Sex", 10, form.Sex);
        Add("@PlaceOfBirth", 200, form.PlaceOfBirth);
        Add("@PreviousSchoolAddress", 300, form.PreviousSchoolAddress);
        Add("@SpecialSkills", 300, form.SpecialSkills);
        Add("@FatherName", 200, form.Father.Name);
        Add("@FatherOccupation", 100, form.Father.Occupation);
        Add("@FatherPhone", 50, form.Father.Phone);
        Add("@MotherName", 200, form.Mother.Name);
        Add("@MotherOccupation", 100, form.Mother.Occupation);
        Add("@MotherPhone", 50, form.Mother.Phone);
        Add("@GuardianName", 200, form.Guardian.Name);
        Add("@GuardianOccupation", 100, form.Guardian.Occupation);
        Add("@GuardianPhone", 50, form.Guardian.Phone);
        command.Parameters.Add(new SqlParameter("@Siblings", SqlDbType.NVarChar, -1)
        {
            Value = form.Siblings.Count == 0 ? DBNull.Value : JsonSerializer.Serialize(form.Siblings),
        });
        Add("@StudentSignature", 200, form.StudentSignature);
        Add("@GuardianSignature", 200, form.GuardianSignature);
    }
}
