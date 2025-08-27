namespace ServicesDashboard.Models.Results;

public class UpdateInfoResult
{
    public int TotalUpdates { get; set; }
    public int SecurityUpdates { get; set; }
    public string PackageManager { get; set; } = "";
    public List<string> Packages { get; set; } = new();
}