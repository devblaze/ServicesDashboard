using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Git;

namespace ServicesDashboard.Endpoints.GitProviders;

public class TestGitProviderConnectionEndpoint : Endpoint<TestGitProviderConnectionRequest, TestGitProviderConnectionResponse>
{
    private readonly IGitProviderService _gitProviderService;

    public TestGitProviderConnectionEndpoint(IGitProviderService gitProviderService)
    {
        _gitProviderService = gitProviderService;
    }

    public override void Configure()
    {
        Post("/api/git-providers/test");
        AllowAnonymous();
    }

    public override async Task HandleAsync(TestGitProviderConnectionRequest req, CancellationToken ct)
    {
        var result = await _gitProviderService.TestConnectionAsync(req);
        await Send.OkAsync(result, cancellation: ct);
    }
}
