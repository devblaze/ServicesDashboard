using ServicesDashboard.Models;

namespace ServicesDashboard.Services;

public interface ISettingsService
{
    Task<bool> UpdateOllamaSettingsAsync(OllamaSettings settings);
    Task<OllamaSettings> GetOllamaSettingsAsync();
}
