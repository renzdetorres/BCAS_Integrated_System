using BCAS.Api.Constants;
using BCAS.Api.Exceptions;

namespace BCAS.Api.Tests;

// These use only the pure functions (FromConfig / Validate*) - never AcademicCatalog.Apply,
// which would change the shared snapshot other tests read.
public class AcademicCatalogTests
{
    [Fact]
    public void Empty_config_keeps_every_default()
    {
        var catalog = AcademicCatalog.FromConfig(new Dictionary<string, string>());

        Assert.Equal(AcademicCatalog.Defaults.Strands, catalog.Strands);
        Assert.Equal(AcademicCatalog.Defaults.Terms, catalog.Terms);
        Assert.Equal(AcademicCatalog.Defaults.Semesters, catalog.Semesters);
        Assert.Equal(AcademicCatalog.Defaults.CollegePrograms, catalog.CollegePrograms);
        Assert.Equal(new[] { "Grade 11", "Grade 12" }, catalog.YearLevels[AcademicStructure.SeniorHigh]);
    }

    [Fact]
    public void Saved_lists_replace_the_defaults()
    {
        var catalog = AcademicCatalog.FromConfig(new Dictionary<string, string>
        {
            [SchoolConfigKeys.AcademicStrands] = """["STEM","ICT"]""",
            [SchoolConfigKeys.AcademicPrograms] = """[{"code":"BSCS","name":"BS Computer Science"}]""",
            [SchoolConfigKeys.AcademicYearLevels] = """{"College":["1st Year","2nd Year","5th Year"]}""",
        });

        Assert.Equal(new[] { "STEM", "ICT" }, catalog.Strands);
        Assert.Equal(new CatalogProgram("BSCS", "BS Computer Science"), Assert.Single(catalog.CollegePrograms));
        Assert.Equal(new[] { "1st Year", "2nd Year", "5th Year" }, catalog.YearLevels[AcademicStructure.College]);
        // A category that wasn't saved keeps its default levels.
        Assert.Equal(AcademicCatalog.Defaults.YearLevels[AcademicStructure.HighSchool], catalog.YearLevels[AcademicStructure.HighSchool]);
    }

    [Fact]
    public void Unreadable_stored_json_falls_back_to_the_default_instead_of_breaking_forms()
    {
        var catalog = AcademicCatalog.FromConfig(new Dictionary<string, string>
        {
            [SchoolConfigKeys.AcademicStrands] = "not json",
            [SchoolConfigKeys.AcademicPrograms] = "{",
        });

        Assert.Equal(AcademicCatalog.Defaults.Strands, catalog.Strands);
        Assert.Equal(AcademicCatalog.Defaults.CollegePrograms, catalog.CollegePrograms);
    }

    [Fact]
    public void List_validation_trims_and_rejects_duplicates_and_empties()
    {
        Assert.Equal("""["STEM","ICT"]""", AcademicCatalog.ValidateList("strand", """[" STEM ","ICT",""]"""));
        Assert.Throws<InvalidSchoolConfigException>(() => AcademicCatalog.ValidateList("strand", """["STEM","stem"]"""));
        Assert.Throws<InvalidSchoolConfigException>(() => AcademicCatalog.ValidateList("strand", "[]"));
        Assert.Throws<InvalidSchoolConfigException>(() => AcademicCatalog.ValidateList("strand", "oops"));
    }

    [Theory]
    [InlineData("Elementary", "Pre-Kinder")]
    [InlineData("Elementary", "Kindergarten")]
    [InlineData("High School", "Grade 7")]
    [InlineData("Senior High School", "Grade 11")]
    [InlineData("College", "1st Year")]
    public void Levels_the_age_and_scholarship_rules_depend_on_cannot_be_removed(string category, string level)
    {
        var defaults = AcademicCatalog.Defaults.YearLevels[category].Where(l => l != level).Concat(new[] { "Extra" });
        var json = System.Text.Json.JsonSerializer.Serialize(new Dictionary<string, string[]> { [category] = defaults.ToArray() });

        var error = Assert.Throws<InvalidSchoolConfigException>(() => AcademicCatalog.ValidateYearLevels(json));
        Assert.Contains(level, error.Message);
    }

    [Fact]
    public void Other_levels_can_be_added_and_removed()
    {
        var json = AcademicCatalog.ValidateYearLevels("""{"College":["1st Year","2nd Year","5th Year"],"High School":["Grade 7","Grade 8"]}""");

        Assert.Contains("5th Year", json);
        Assert.Throws<InvalidSchoolConfigException>(() => AcademicCatalog.ValidateYearLevels("""{"Nursery":["Pre-School"]}"""));
        Assert.Throws<InvalidSchoolConfigException>(() => AcademicCatalog.ValidateYearLevels("""{"College":[]}"""));
    }

    [Fact]
    public void Program_validation_uppercases_codes_and_rejects_bad_rows()
    {
        var json = AcademicCatalog.ValidatePrograms("""[{"code":"bscs","name":" BS Computer Science "}]""");
        Assert.Contains("BSCS", json);
        Assert.Contains("BS Computer Science", json);

        Assert.Throws<InvalidSchoolConfigException>(() => AcademicCatalog.ValidatePrograms("""[{"code":"A B","name":"Spaces"}]"""));
        Assert.Throws<InvalidSchoolConfigException>(() => AcademicCatalog.ValidatePrograms("""[{"code":"BSIT","name":""}]"""));
        Assert.Throws<InvalidSchoolConfigException>(() => AcademicCatalog.ValidatePrograms("""[{"code":"BSIT","name":"One"},{"code":"bsit","name":"Two"}]"""));
        Assert.Throws<InvalidSchoolConfigException>(() => AcademicCatalog.ValidatePrograms("[]"));
    }
}
