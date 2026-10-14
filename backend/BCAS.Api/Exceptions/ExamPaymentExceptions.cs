namespace BCAS.Api.Exceptions;

/// <summary>The payment can't be made, changed or reviewed in its current state.</summary>
public class ExamPaymentException : Exception
{
    public ExamPaymentException(string message)
        : base(message)
    {
    }
}

public class ExamPaymentNotFoundException : Exception
{
    public ExamPaymentNotFoundException(Guid paymentId)
        : base($"No payment found with id '{paymentId}'.")
    {
    }
}

/// <summary>A step that needs a verified entrance exam payment was attempted without one.</summary>
public class PaymentNotVerifiedException : Exception
{
    public PaymentNotVerifiedException()
        : base("Pay the entrance exam fee and wait for the payment to be verified before continuing.")
    {
    }
}
