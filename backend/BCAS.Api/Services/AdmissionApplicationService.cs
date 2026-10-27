using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class AdmissionApplicationService : IAdmissionApplicationService
{
    private readonly IAdmissionApplicationRepository _applicationRepository;
    private readonly IApplicantProfileRepository _profileRepository;
    private readonly ISystemSettingsRepository _systemSettingsRepository;
    private readonly IApplicationStatusHistoryRepository _statusHistoryRepository;
    private readonly IUserRepository _userRepository;
    private readonly ISchoolConfigService _schoolConfigService;
    private readonly INotificationDispatchService _notificationDispatchService;
    private readonly IAdmissionSlotsService _admissionSlots;
    private readonly ILogger<AdmissionApplicationService> _logger;

    public AdmissionApplicationService(
        IAdmissionApplicationRepository applicationRepository,
        IApplicantProfileRepository profileRepository,
        ISystemSettingsRepository systemSettingsRepository,
        IApplicationStatusHistoryRepository statusHistoryRepository,
        IUserRepository userRepository,
        ISchoolConfigService schoolConfigService,
        INotificationDispatchService notificationDispatchService,
        IAdmissionSlotsService admissionSlots,
        ILogger<AdmissionApplicationService> logger)
    {
        _admissionSlots = admissionSlots;
        _applicationRepository = applicationRepository;
        _profileRepository = profileRepository;
        _systemSettingsRepository = systemSettingsRepository;
        _statusHistoryRepository = statusHistoryRepository;
        _userRepository = userRepository;
        _schoolConfigService = schoolConfigService;
        _notificationDispatchService = notificationDispatchService;
        _logger = logger;
    }

    public async Task<AdmissionApplicationResponse> SubmitAsync(
        Guid userId,
        SubmitAdmissionApplicationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!await _systemSettingsRepository.IsEnabledAsync(SystemSettingKeys.AdmissionsApplicationsOpen, cancellationToken))
        {
            throw new AdmissionApplicationsClosedException();
        }

        if (!AdmissionConstants.AllowedApplicationTypes.Contains(request.ApplicationType))
        {
            throw new InvalidApplicationTypeException(request.ApplicationType);
        }

        if (string.IsNullOrWhiteSpace(request.Department))
        {
            throw InvalidDepartmentException.RequiredForApplication();
        }

        request.Department = DepartmentConstants.Normalize(request.Department)
            ?? throw new InvalidDepartmentException(request.Department);

        // A department with a fixed program list (College) only takes those
        // programs; stored by code so reports group them consistently.
        var program = DepartmentConstants.NormalizeProgram(request.Department, request.CourseAppliedFor)
            ?? throw new InvalidCourseProgramException(request.Department, request.CourseAppliedFor);

        AdmissionFormConstants.ValidateAndNormalize(request.Form!);

        // The year level, term/semester and strand have to fit the academic
        // category; the course stored is the program (College), strand
        // (Senior High School) or grade level.
        var form = request.Form!;
        request.CourseAppliedFor = AcademicStructure.ValidateLevel(request.Department, form.YearLevel, form.AcademicTerm, request.Department == AcademicStructure.College ? program : request.CourseAppliedFor);
        form.YearLevel = AcademicStructure.NormalizeYearLevel(request.Department, form.YearLevel);
        form.AcademicTerm = AcademicStructure.NormalizeTerm(request.Department, form.AcademicTerm);

        var profile = await _profileRepository.GetByUserIdAsync(userId, cancellationToken)
            ?? throw new ProfileIncompleteException();

        // Pre-Kinder and Kindergarten are age-gated against the admission
        // year's cutoff, not against the day the form is filed.
        var config = await _schoolConfigService.GetAdmissionConfigAsync(DateOnly.FromDateTime(DateTime.UtcNow), cancellationToken);
        form.AcademicYear = config.AcademicYear;
        var minAge = AcademicStructure.MinAgeFor(form.YearLevel, config.PreKinderMinAge, config.KinderMinAge);
        if (minAge is not null)
        {
            AcademicStructure.ValidateAge(form.YearLevel, profile.BirthDate, minAge.Value, config.AgeCutoffMonth, config.AgeCutoffYear);
        }

        // One admission application per applicant. The repository's INSERT
        // repeats this check atomically, so two simultaneous submissions
        // can't both get through.
        if ((await _applicationRepository.GetByUserIdAsync(userId, cancellationToken)).Count > 0)
        {
            throw new ApplicationAlreadySubmittedException("admission");
        }

        // A level whose slots are all taken still accepts the application; the applicant is told so right away.
        var slotReached = await _admissionSlots.IsFullAsync(request.Department, form.YearLevel!, cancellationToken);

        var application = await _applicationRepository.CreateAsync(userId, request, cancellationToken);

        // The opening row of this application's status-history audit trail
        // (BISAASS-56) - FromStatus/changedByUserId both null since there's
        // no prior status and this is the applicant's own action, not staff's.
        await _statusHistoryRepository.InsertAsync(
            application.ApplicationId, "Admission", fromStatus: null, toStatus: application.Status,
            remarks: slotReached ? $"The admission slot for {form.YearLevel} was already reached when this was submitted." : null,
            changedByUserId: null, cancellationToken);

        // Application Received notification (BISAASS-59).
        var applicant = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (applicant is not null)
        {
            await _notificationDispatchService.NotifyApplicationReceivedAsync(
                userId, applicant.Email, applicant.FirstName, "Admission", application.CourseAppliedFor, cancellationToken);

            if (slotReached)
            {
                await _notificationDispatchService.NotifyAdmissionSlotFullAsync(
                    userId, applicant.Email, applicant.FirstName, form.YearLevel!, cancellationToken);
            }
        }

        _logger.LogInformation(
            "Admission application {ApplicationId} submitted by {UserId}",
            application.ApplicationId,
            userId);

        var response = application.ToResponse();
        response.SlotReached = slotReached;
        response.SlotMessage = slotReached ? AdmissionSlotsService.FullMessage(form.YearLevel!) : null;
        return response;
    }

    public async Task<IReadOnlyList<AdmissionApplicationResponse>> GetMyApplicationsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var applications = await _applicationRepository.GetByUserIdAsync(userId, cancellationToken);
        return applications.Select(a => a.ToResponse()).ToList();
    }
}
