namespace BCAS.Api.Models;

/// <summary>One uploaded document's stored file, for viewing.</summary>
public class DocumentFile
{
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public byte[] FileData { get; set; } = Array.Empty<byte>();
}
