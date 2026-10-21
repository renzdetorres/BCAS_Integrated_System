using BCAS.Api.Constants;
using BCAS.Api.Exceptions;
using Xunit;

namespace BCAS.Api.Tests;

public class PaymentMethodsTests
{
    private static string Json(params string[] methods) => "[" + string.Join(",", methods) + "]";

    private const string GCash = """{"name":"GCash","accountName":"BCAS Cashier","accountNumber":"0917 123 4567","instructions":"Send the exact fee.","qrImage":""}""";
    private const string Bank = """{"name":"Bank transfer","accountName":"Baliuag College","accountNumber":"1234-5678-90","instructions":"","qrImage":""}""";

    [Fact]
    public void A_valid_list_is_stored_trimmed_and_can_be_read_back()
    {
        var stored = PaymentMethods.Normalize(Json("""{"name":"  GCash ","accountName":" BCAS ","accountNumber":"0917","instructions":"Pay","qrImage":""}"""));
        var read = PaymentMethods.Parse(stored);

        var method = Assert.Single(read);
        Assert.Equal("GCash", method.Name);
        Assert.Equal("BCAS", method.AccountName);
        Assert.Equal("0917", method.AccountNumber);
    }

    [Theory]
    [InlineData("[]")]
    [InlineData("null")]
    public void An_empty_list_means_none_are_set_up(string json)
    {
        Assert.Equal(string.Empty, PaymentMethods.Normalize(json));
    }

    [Fact]
    public void Every_method_needs_a_name()
    {
        var error = Assert.Throws<InvalidSchoolConfigException>(() => PaymentMethods.Normalize(Json("""{"name":" ","instructions":"x"}""")));
        Assert.Contains("name", error.Message);
    }

    [Fact]
    public void Two_methods_cannot_share_a_name_even_in_a_different_case()
    {
        var error = Assert.Throws<InvalidSchoolConfigException>(() => PaymentMethods.Normalize(Json(GCash, GCash.Replace("GCash", "gcash"))));
        Assert.Contains("Two payment methods", error.Message);
    }

    [Fact]
    public void A_name_longer_than_the_database_column_is_refused()
    {
        var name = new string('x', PaymentMethods.MaxNameLength + 1);
        Assert.Throws<InvalidSchoolConfigException>(() => PaymentMethods.Normalize(Json($$"""{"name":"{{name}}","instructions":"x"}""")));
    }

    [Fact]
    public void A_method_must_say_how_to_pay_with_a_qr_code_an_account_number_or_instructions()
    {
        var error = Assert.Throws<InvalidSchoolConfigException>(() => PaymentMethods.Normalize(Json("""{"name":"Cashier","accountName":"BCAS"}""")));
        Assert.Contains("Cashier", error.Message);
    }

    [Fact]
    public void A_qr_code_must_be_a_png_or_jpg_image()
    {
        Assert.Throws<InvalidSchoolConfigException>(() => PaymentMethods.Normalize(Json("""{"name":"GCash","qrImage":"data:image/gif;base64,AAAA"}""")));
        Assert.Throws<InvalidSchoolConfigException>(() => PaymentMethods.Normalize(Json("""{"name":"GCash","qrImage":"https://example.com/qr.png"}""")));
        Assert.NotEmpty(PaymentMethods.Normalize(Json("""{"name":"GCash","qrImage":"data:image/png;base64,AAAA"}""")));
    }

    [Fact]
    public void There_is_a_limit_on_how_many_methods_can_be_set_up()
    {
        var many = Enumerable.Range(1, PaymentMethods.MaxMethods + 1).Select(i => $$"""{"name":"Method {{i}}","instructions":"x"}""").ToArray();
        Assert.Throws<InvalidSchoolConfigException>(() => PaymentMethods.Normalize(Json(many)));
    }

    [Fact]
    public void Unreadable_stored_text_never_breaks_the_payment_page()
    {
        Assert.Empty(PaymentMethods.Parse("not json"));
        Assert.Empty(PaymentMethods.Parse(null));
        Assert.Throws<InvalidSchoolConfigException>(() => PaymentMethods.Normalize("not json"));
    }

    [Fact]
    public void With_no_methods_the_old_single_setup_is_offered_as_one()
    {
        var config = new Dictionary<string, string>
        {
            [SchoolConfigKeys.PaymentMethods] = "",
            [SchoolConfigKeys.PaymentAccountName] = "BCAS Cashier",
            [SchoolConfigKeys.PaymentInstructions] = "Scan and pay.",
            [SchoolConfigKeys.PaymentQrImage] = "data:image/png;base64,AAAA",
        };

        var method = Assert.Single(PaymentMethods.Resolve(config));
        Assert.Equal(PaymentMethods.LegacyName, method.Name);
        Assert.Equal("BCAS Cashier", method.AccountName);
        Assert.Equal("data:image/png;base64,AAAA", method.QrImage);
    }

    [Fact]
    public void Configured_methods_replace_the_old_setup()
    {
        var config = new Dictionary<string, string>
        {
            [SchoolConfigKeys.PaymentMethods] = PaymentMethods.Normalize(Json(GCash, Bank)),
            [SchoolConfigKeys.PaymentAccountName] = "Old name",
        };

        var methods = PaymentMethods.Resolve(config);

        Assert.Equal(new[] { "GCash", "Bank transfer" }, methods.Select(m => m.Name));
    }

    [Fact]
    public void The_applicant_must_pick_a_method_the_school_offers()
    {
        var two = PaymentMethods.Parse(PaymentMethods.Normalize(Json(GCash, Bank)));
        var one = PaymentMethods.Parse(PaymentMethods.Normalize(Json(GCash)));

        Assert.Equal("Bank transfer", PaymentMethods.Choose(two, "bank TRANSFER")?.Name); // case does not matter
        Assert.Null(PaymentMethods.Choose(two, null));                                      // two to pick from: a choice is required
        Assert.Null(PaymentMethods.Choose(two, "PayPal"));                                  // not one of them
        Assert.Equal("GCash", PaymentMethods.Choose(one, null)?.Name);                      // only one: no need to ask
    }
}
