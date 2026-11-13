using BCAS.Api.Constants;
using BCAS.Api.Controllers;
using BCAS.Api.Exceptions;
using BCAS.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace BCAS.Api.Tests;

public class EvaluatorDashboardAndPaymentTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task A_payment_cannot_be_verified_without_a_sales_invoice_number(string? invoice)
    {
        // The SI check runs before anything is read or written, so no dependencies are needed to prove it.
        var service = new ExamPaymentService(null!, null!, null!, null!, null!, null!, NullLogger<ExamPaymentService>.Instance, null!);

        var error = await Assert.ThrowsAsync<ExamPaymentException>(() => service.VerifyAsync(Guid.NewGuid(), Guid.NewGuid(), invoice));

        Assert.Contains("SI", error.Message);
    }

    [Fact]
    public void Support_Staff_schedule_interviews_and_the_Evaluator_does_not()
    {
        Assert.True(FeatureCatalog.IsKnown("SupportStaff", "/support-staff/interviews"));
        Assert.Equal("/support-staff/interviews", FeatureCatalog.FindByApiPath("SupportStaff", new PathString("/api/staff/interviews"))?.Key);
        Assert.DoesNotContain(FeatureCatalog.ByRole["Evaluator"], f => f.Key.Contains("interviews"));
        Assert.Null(FeatureCatalog.FindByApiPath("Evaluator", new PathString("/api/staff/interviews")));
    }

    [Fact]
    public void The_interview_endpoints_are_open_to_Support_Staff_and_Admin_but_not_the_Evaluator()
    {
        var roles = typeof(StaffInterviewsController)
            .GetCustomAttributes(typeof(AuthorizeAttribute), inherit: true)
            .Cast<AuthorizeAttribute>()
            .Select(a => a.Roles ?? string.Empty)
            .Single()
            .Split(',');

        Assert.Contains("SupportStaff", roles);
        Assert.Contains("Admin", roles);
        Assert.DoesNotContain("Evaluator", roles);
    }

    [Fact]
    public void The_exam_permit_hint_no_longer_mentions_a_venue()
    {
        var stage = ApplicationWorkflowSteps.DescribeAdmission("ExamScheduled");

        Assert.NotNull(stage);
        Assert.DoesNotContain("venue", stage!.NextAction, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void The_Evaluator_has_its_own_scholarship_screening_page()
    {
        Assert.True(FeatureCatalog.IsKnown("Evaluator", "/evaluator/scholarship-screening"));
        Assert.Equal(
            "/evaluator/scholarship-screening",
            FeatureCatalog.FindByApiPath("Evaluator", new PathString("/api/evaluator/dashboard"))?.Key);
    }
}
