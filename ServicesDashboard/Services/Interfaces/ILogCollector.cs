namespace ServicesDashboard.Services.LogCollection;

public interface ILogCollector
{
    Task<string> GetContainerLogsAsync(string containerId, int lines = 100);
    Task<string> DownloadContainerLogsAsync(string containerId);
    Task<IEnumerable<string>> ListContainersAsync();
}