using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Git;

namespace ServicesDashboard.Endpoints.GitProviders;

public class GetAllGitProvidersEndpoint : EndpointWithoutRequest<List<GitProviderConnectionDto>>
{
    private readonly IGitProviderService _gitProviderService;

    public GetAllGitProvidersEndpoint(IGitProviderService gitProviderService)
    {
        _gitProviderService = gitProviderService;
    }

    public override void Configure()
    {
        Get("/api/git-providers");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var providers = await _gitProviderService.GetAllAsync();
        await Send.OkAsync(providers, cancellation: ct);
    }
}
