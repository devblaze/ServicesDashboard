using FastEndpoints;
using ServicesDashboard.Services.ArtificialIntelligence;

namespace ServicesDashboard.Endpoints.Settings;

public class TestAIConnectionEndpoint : EndpointWithoutRequest<bool>
{
    private readonly IServiceRecognitionService _serviceRecognition;
    private readonly ILogger<TestAIConnectionEndpoint> _logger;

    public TestAIConnectionEndpoint(
        IServiceRecognitionService serviceRecognition,
        ILogger<TestAIConnectionEndpoint> logger)
    {
        _serviceRecognition = serviceRecognition;
        _logger = logger;
    }

    public override void Configure()
    {
        Post("/api/settings/ai/test");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            var result = await _serviceRecognition.TestOllamaConnectionAsync();
            await Send.OkAsync(result, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to test AI connection");
            await Send.OkAsync(false, ct);
        }
    }
}
