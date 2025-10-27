namespace ServicesDashboard.Models.Results;

public class WakeOnLanResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? MacAddress { get; set; }
    public string? TargetHost { get; set; }
    public int Port { get; set; }
    public DateTime SentAt { get; set; }
    public string? ErrorMessage { get; set; }
}
