using BCAS.Api.Constants;
using BCAS.Api.Data;
using BCAS.Api.Exceptions;
using BCAS.Api.Mapping;
using BCAS.Api.Models;

namespace BCAS.Api.Services;

public class ExamScheduleService : IExamScheduleService
{
    private readonly IExamScheduleRepository _examScheduleRepository;
    private readonly IUserRepository _userRepository;
    private readonly INotificationDispatchService _notificationDispatchService;
    private readonly IExamPaymentService _paymentService;
    private readonly IAdmissionApplicationRepository _applicationRepository;
    private readonly IAdminApplicationsService _applicationsService;

    public ExamScheduleService(
        IExamScheduleRepository examScheduleRepository,
        IUserRepository userRepository,
        INotificationDispatchService notificationDispatchService,
        IExamPaymentService paymentService,
        IAdmissionApplicationRepository applicationRepository,
        IAdminApplicationsService applicationsService)
    {
        _paymentService = paymentService;
        _applicationRepository = applicationRepository;
        _applicationsService = applicationsService;
        _examScheduleRepository = examScheduleRepository;
        _userRepository = userRepository;
        _notificationDispatchService = notificationDispatchService;
    }

    public async Task<IReadOnlyList<ExamScheduleResponse>> GetAvailableAsync(CancellationToken cancellationToken = default)
    {
        var schedules = await _examScheduleRepository.GetAvailableAsync(cancellationToken);
        return schedules.Select(s => s.ToResponse()).ToList();
    }

    public async Task<ExamScheduleSelectionResponse?> GetMySelectionAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var selection = await _examScheduleRepository.GetSelectionByUserIdAsync(userId, cancellationToken);
        return selection?.ToResponse();
    }

    public async Task<ExamScheduleSelectionResponse> SelectAsync(
        Guid userId,
        SelectExamScheduleRequest request,
        CancellationToken cancellationToken = default)
    {
        var examType = ExamTypes.Normalize(request.ExamType)
            ?? throw new ExamScheduleNotAvailableException($"Exam type must be one of: {string.Join(", ", ExamTypes.All)}.");

        // The entrance exam fee has to be paid (and verified) before an entrance exam slot is
        // taken. The scholarship exam has no entrance fee.
        if (examType == ExamTypes.Entrance && !await _paymentService.IsSatisfiedAsync(userId, cancellationToken))
        {
            throw new PaymentNotVerifiedException();
        }

        var selection = await _examScheduleRepository.SelectAsync(userId, request.ExamScheduleId!.Value, examType, cancellationToken);

        // Booking a slot is what moves the application to "Exam scheduled" - where the
        // workflow allows it (the first booking, or after a missed exam or a retake).
        var application = examType == ExamTypes.Entrance
            ? (await _applicationRepository.GetByUserIdAsync(userId, cancellationToken)).FirstOrDefault()
            : null;
        if (application is not null && AdmissionWorkflowConstants.IsAllowedTransition(application.Status, "ExamScheduled"))
        {
            await _applicationsService.UpdateStatusAsync(
                application.ApplicationId,
                new UpdateApplicationStatusRequest { Category = "Admission", Status = "ExamScheduled", Remarks = "Applicant chose an exam schedule" },
                userId,
                cancellationToken);
        }

        // Exam Schedule notification (BISAASS-59).
        var applicant = await _userRepository.GetByIdAsync(userId, cancellationToken);
        if (applicant is not null)
        {
            await _notificationDispatchService.NotifyExamScheduleAsync(
                userId, applicant.Email, applicant.FirstName, selection.ExamDate, selection.ExamTime, examType, cancellationToken);
        }

        return selection.ToResponse();
    }
}
