namespace ServicesDashboard.Models.Dtos;

public class CreateServiceDto
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string DockerImage { get; set; } = string.Empty;
    public int? Port { get; set; } = 80;
    public string? ServiceUrl { get; set; } = string.Empty;
    public bool IsDockerContainer { get; set; } = false;
    public string? ContainerId { get; set; }
    public int? ServerId { get; set; }
}