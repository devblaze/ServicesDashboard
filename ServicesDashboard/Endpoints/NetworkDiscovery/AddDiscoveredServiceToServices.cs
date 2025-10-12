using FastEndpoints;
using ServicesDashboard.Data;
using ServicesDashboard.Models;
using ServicesDashboard.Models.Requests;
using ServicesDashboard.Services;
using System.Text.Json;

namespace ServicesDashboard.Endpoints.NetworkDiscovery;

public class AddDiscoveredServiceToServicesEndpoint : Endpoint<AddDiscoveredServiceRequest, HostedService>
{
    private readonly IUserServices _userServices;
    private readonly ILogger<AddDiscoveredServiceToServicesEndpoint> _logger;

    public AddDiscoveredServiceToServicesEndpoint(
        IUserServices userServices,
        ILogger<AddDiscoveredServiceToServicesEndpoint> logger)
    {
        _userServices = userServices;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/networkdiscovery/add-to-services");
        AllowAnonymous();
    }

    public override async Task HandleAsync(AddDiscoveredServiceRequest req, CancellationToken ct)
    {
        try
        {
            _logger.LogInformation("Adding discovered service: {Name} at {HostAddress}:{Port}",
                req.Name, req.HostAddress, req.Port);

            if (string.IsNullOrWhiteSpace(req.Name))
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync(@"{""error"":""Service name is required""}", ct);
                return;
            }

            if (string.IsNullOrWhiteSpace(req.HostAddress))
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync(@"{""error"":""Host address is required""}", ct);
                return;
            }

            if (req.Port <= 0 || req.Port > 65535)
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync(@"{""error"":""Invalid port number""}", ct);
                return;
            }

            var protocol = req.ServiceType?.ToLower() switch
            {
                "https" => "https",
                "http" => "http",
                var type when type?.Contains("ssl") == true => "https",
                var type when type?.Contains("tls") == true => "https",
                _ => req.Port == 443 ? "https" : "http"
            };

            var serviceUrl = $"{protocol}://{req.HostAddress}:{req.Port}";

            // Use AI-suggested name if provided and confident
            var serviceName = req.Name;
            if (!string.IsNullOrEmpty(req.RecognizedName) &&
                req.AiConfidence.HasValue &&
                req.AiConfidence.Value > 0.7)
            {
                serviceName = req.RecognizedName;
            }

            // Use AI-suggested description if provided
            var description = req.Description;
            if (string.IsNullOrEmpty(description) && !string.IsNullOrEmpty(req.SuggestedDescription))
            {
                description = req.SuggestedDescription;
            }

            var hostedService = new HostedService
            {
                Name = serviceName,
                Description = description,
                Url = serviceUrl,
                IsDockerContainer = false,
                LastChecked = DateTime.UtcNow,
                // Store AI metadata for future reference
                Metadata = !string.IsNullOrEmpty(req.ServiceCategory)
                    ? JsonSerializer.Serialize(new
                    {
                        Category = req.ServiceCategory,
                        AiConfidence = req.AiConfidence,
                        SuggestedIcon = req.SuggestedIcon
                    })
                    : null
            };

            var createdService = await _userServices.AddServiceAsync(hostedService);

            _logger.LogInformation("Successfully added service: {ServiceId}", createdService.Id);
            await Send.OkAsync(createdService, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding discovered service: {Name} at {HostAddress}:{Port}",
                req.Name, req.HostAddress, req.Port);

            if (ex.InnerException != null)
            {
                HttpContext.Response.StatusCode = 400;
                await HttpContext.Response.WriteAsync($@"{{""error"":""Database error: {ex.InnerException.Message.Replace("\"", "\\\"")}""}}", ct);
                return;
            }

            HttpContext.Response.StatusCode = 500;
            await HttpContext.Response.WriteAsync($@"{{""error"":""Error adding service: {ex.Message.Replace("\"", "\\\"")}""}}", ct);
            return;
        }
    }
}
