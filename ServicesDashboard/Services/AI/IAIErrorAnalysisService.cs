using ServicesDashboard.Models;

namespace ServicesDashboard.Services.AI;

public interface IAIErrorAnalysisService
{
    Task<AIErrorAnalysisResult> AnalyzeErrorAsync(ErrorContext context);
    Task<ErrorNotification> CreateErrorNotificationAsync(ErrorContext context, AIErrorAnalysisResult? analysis = null);
    Task<List<ErrorNotification>> GetUnresolvedErrorsAsync();
    Task<bool> MarkErrorResolvedAsync(int errorId, string resolution);
}
