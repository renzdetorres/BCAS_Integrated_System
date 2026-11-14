using BCAS.Api.Mapping;
using BCAS.Api.Models;
using Xunit;

namespace BCAS.Api.Tests;

/// <summary>The applicant's own scholarship response carries their form answers, so the page can print a ready-to-sign copy.</summary>
public class ScholarshipFormResponseTests
{
    [Fact]
    public void An_applicants_scholarship_response_includes_the_form_answers()
    {
        var application = new ScholarshipApplication
        {
            ApplicationId = Guid.NewGuid(),
            ScholarshipName = "Academic Excellence",
            ScholarshipType = "Academic",
            GradeAverage = 96.5m,
            Status = "Submitted",
            SubmittedAt = DateTime.UtcNow,
            Details = new ScholarshipApplicationDetails
            {
                LevelApplied = "Grade 11",
                ApplicantFullName = "Dela Cruz, Juan",
                GuardianName = "Maria Dela Cruz",
                GuardianRole = "Parent",
                ConsentTerms = true,
                ConsentParticipation = true,
                ConsentCertification = false,
            },
        };

        var response = application.ToResponse();

        Assert.Equal("Grade 11", response.LevelApplied);
        Assert.Equal("Dela Cruz, Juan", response.Form.ApplicantFullName);
        Assert.Equal("Maria Dela Cruz", response.Form.GuardianName);
        Assert.True(response.Form.ConsentTerms);
        Assert.False(response.Form.ConsentCertification);
    }

    [Fact]
    public void An_application_filed_before_the_form_existed_has_empty_answers()
    {
        var response = new ScholarshipApplication { ScholarshipName = "Old", ScholarshipType = "Academic", Status = "Submitted" }.ToResponse();

        Assert.NotNull(response.Form);
        Assert.Null(response.Form.ApplicantFullName);
        Assert.Null(response.Form.ConsentTerms);
    }
}
