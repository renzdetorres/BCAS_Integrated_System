using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class ApplicantDocumentService : IApplicantDocumentService
{

    private readonly IApplicantDocumentRepository _documentRepository;
    private readonly IAdmissionApplicationRepository _admissionApplicationRepository;
    private readonly IScholarshipApplicationRepository _scholarshipApplicationRepository;
    private readonly ILogger<ApplicantDocumentService> _logger;

    public ApplicantDocumentService(
        IApplicantDocumentRepository documentRepository,
        IAdmissionApplicationRepository admissionApplicationRepository,
        IScholarshipApplicationRepository scholarshipApplicationRepository,
        ILogger<ApplicantDocumentService> logger)
    {
        _documentRepository = documentRepository;
        _admissionApplicationRepository = admissionApplicationRepository;
        _scholarshipApplicationRepository = scholarshipApplicationRepository;
        _logger = logger;
    }

    public async Task<DocumentChecklistResponse> GetMyChecklistAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var applicationType = await GetLatestApplicationTypeAsync(userId, cancellationToken);
        var requiredTypes = DocumentConstants.RequiredDocumentsByApplicationType[applicationType];
        var uploadedDocuments = await _documentRepository.GetByUserIdAsync(userId, cancellationToken);
        var uploadedByType = uploadedDocuments.ToDictionary(d => d.DocumentType, StringComparer.Ordinal);

        var requirements = requiredTypes
            .Select(type => uploadedByType.TryGetValue(type, out var uploaded)
                ? uploaded.ToResponse()
                : new DocumentChecklistItemResponse { DocumentType = type })
            .ToList();

        return new DocumentChecklistResponse { ApplicationType = applicationType, Requirements = requirements };
    }

    public async Task<DocumentChecklistResponse> GetMyScholarshipChecklistAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var applications = await _scholarshipApplicationRepository.GetByUserIdAsync(userId, cancellationToken);
        if (applications.Count == 0)
        {
            throw new NoScholarshipApplicationException();
        }

        var uploadedDocuments = await _documentRepository.GetByUserIdAsync(userId, cancellationToken);
        var uploadedByType = uploadedDocuments.ToDictionary(d => d.DocumentType, StringComparer.Ordinal);

        var requirements = DocumentConstants.RequiredDocumentsForScholarship
            .Select(type => uploadedByType.TryGetValue(type, out var uploaded)
                ? uploaded.ToResponse()
                : new DocumentChecklistItemResponse { DocumentType = type })
            .ToList();

        return new DocumentChecklistResponse { ApplicationType = "Scholarship", Requirements = requirements };
    }

    public async Task<DocumentChecklistItemResponse> UploadDocumentAsync(
        Guid userId,
        string documentType,
        string fileName,
        string contentType,
        byte[] fileBytes,
        CancellationToken cancellationToken = default)
    {
        if (!DocumentConstants.AllDocumentTypes.Contains(documentType))
        {
            throw new InvalidDocumentTypeException(documentType);
        }

        // Existence check only here - the checklist is what tells the
        // applicant which types apply to them; upload itself just needs an
        // application on file (admission or scholarship) to attach documents to.
        if ((await _admissionApplicationRepository.GetByUserIdAsync(userId, cancellationToken)).Count == 0
            && (await _scholarshipApplicationRepository.GetByUserIdAsync(userId, cancellationToken)).Count == 0)
        {
            throw new NoAdmissionApplicationException();
        }

        if (fileBytes.Length == 0)
        {
            throw new InvalidDocumentFileException("The uploaded file is empty.");
        }

        if (fileBytes.Length > DocumentConstants.MaxFileSizeBytes)
        {
            throw new InvalidDocumentFileException($"Files must be {DocumentConstants.MaxFileSizeBytes / (1024 * 1024)} MB or smaller.");
        }

        if (!DocumentConstants.IsAcceptedFile(fileName, contentType, fileBytes))
        {
            throw new InvalidDocumentFileException("Only PDF, JPG or PNG files are accepted.");
        }

        var document = await _documentRepository.UpsertAsync(userId, documentType, fileName, contentType, fileBytes, cancellationToken);

        _logger.LogInformation("Document {DocumentType} uploaded by {UserId}", documentType, userId);

        return document.ToResponse();
    }

    public Task ArchiveDocumentsAsync(Guid userId, CancellationToken cancellationToken = default) =>
        _documentRepository.ArchiveByUserIdAsync(userId, cancellationToken);

    private async Task<string> GetLatestApplicationTypeAsync(Guid userId, CancellationToken cancellationToken)
    {
        var applications = await _admissionApplicationRepository.GetByUserIdAsync(userId, cancellationToken);

        // Already ordered most-recent-first by the repository.
        return applications.FirstOrDefault()?.ApplicationType ?? throw new NoAdmissionApplicationException();
    }
}
