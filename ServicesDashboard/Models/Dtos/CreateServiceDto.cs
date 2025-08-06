namespace ServicesDashboard.Models.Dtos;

public class CreateServiceDto
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public bool IsDockerContainer { get; set; } = false;
    public string? ContainerId { get; set; }
}
