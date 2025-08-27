namespace ServicesDashboard.Models.Responses;

public class AiUpdateResponse
{
    public string? Recommendation { get; set; }
    public double Confidence { get; set; }
}