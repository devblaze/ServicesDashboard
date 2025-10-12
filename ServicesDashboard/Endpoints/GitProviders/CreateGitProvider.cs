using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Git;

namespace ServicesDashboard.Endpoints.GitProviders;

public class CreateGitProviderEndpoint : Endpoint<CreateGitProviderConnectionRequest, GitProviderConnectionDto>
{
    private readonly IGitProviderService _gitProviderService;

    public CreateGitProviderEndpoint(IGitProviderService gitProviderService)
    {
        _gitProviderService = gitProviderService;
    }

    public override void Configure()
    {
        Post("/api/git-providers");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CreateGitProviderConnectionRequest req, CancellationToken ct)
    {
        var provider = await _gitProviderService.CreateAsync(req);
        await Send.CreatedAtAsync<GetGitProviderEndpoint>(new { id = provider.Id }, provider, cancellation: ct);
    }
}
