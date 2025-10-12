using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Git;

namespace ServicesDashboard.Endpoints.GitProviders;

public class GetGitProviderRequest
{
    public int Id { get; set; }
}

public class GetGitProviderEndpoint : Endpoint<GetGitProviderRequest, GitProviderConnectionDto>
{
    private readonly IGitProviderService _gitProviderService;

    public GetGitProviderEndpoint(IGitProviderService gitProviderService)
    {
        _gitProviderService = gitProviderService;
    }

    public override void Configure()
    {
        Get("/api/git-providers/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetGitProviderRequest req, CancellationToken ct)
    {
        var provider = await _gitProviderService.GetByIdAsync(req.Id);

        if (provider == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.OkAsync(provider, cancellation: ct);
    }
}
