namespace BCAS.Api.Exceptions;

public class SystemSettingNotFoundException : Exception
{
    public SystemSettingNotFoundException(string settingKey)
        : base($"'{settingKey}' is not a configurable system setting.")
    {
    }
}
