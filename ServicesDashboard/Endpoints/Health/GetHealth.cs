using FastEndpoints;

namespace ServicesDashboard.Endpoints.Health;

public class GetHealthEndpoint : EndpointWithoutRequest
{
    public override void Configure()
    {
        Get("/api/health");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await Send.OkAsync(new
        {
            status = "healthy",
            timestamp = DateTime.UtcNow,
            version = "1.0.0"
        }, ct);
    }
}
