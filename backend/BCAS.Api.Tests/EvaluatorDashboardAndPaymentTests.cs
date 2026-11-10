using BCAS.Api.Constants;
using BCAS.Api.Exceptions;
using BCAS.Api.Services;
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
    public void The_Evaluator_has_its_own_scholarship_screening_page()
    {
        Assert.True(FeatureCatalog.IsKnown("Evaluator", "/evaluator/scholarship-screening"));
        Assert.Equal(
            "/evaluator/scholarship-screening",
            FeatureCatalog.FindByApiPath("Evaluator", new PathString("/api/evaluator/dashboard"))?.Key);
    }
}
