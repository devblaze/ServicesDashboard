using FastEndpoints;
using ServicesDashboard.Services.Servers;

namespace ServicesDashboard.Endpoints.Servers;

public class TestConnectionRequest
{
    public string Id { get; set; } = string.Empty;
}

public class TestConnectionEndpoint : Endpoint<TestConnectionRequest, bool>
{
    private readonly IServerConnectionManager _connectionManager;

    public TestConnectionEndpoint(IServerConnectionManager connectionManager)
    {
        _connectionManager = connectionManager;
    }

    public override void Configure()
    {
        Post("/api/servers/{id}/test");
        AllowAnonymous();
    }

    public override async Task HandleAsync(TestConnectionRequest req, CancellationToken ct)
    {
        var result = await _connectionManager.TestConnectionAsync(req.Id);
        await Send.OkAsync(result, ct);
    }
}
