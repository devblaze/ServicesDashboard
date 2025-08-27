namespace ServicesDashboard.Models.Results;

public class UpdateInfoResult
{
    public int TotalUpdates { get; set; }
    public int SecurityUpdates { get; set; }
    public List<object> Packages { get; set; } = new();
}