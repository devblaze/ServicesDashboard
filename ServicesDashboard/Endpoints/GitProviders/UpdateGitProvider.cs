using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Git;

namespace ServicesDashboard.Endpoints.GitProviders;

public class UpdateGitProviderRequest
{
    public int Id { get; set; }
    public UpdateGitProviderConnectionRequest Data { get; set; } = null!;
}

public class UpdateGitProviderEndpoint : Endpoint<UpdateGitProviderRequest, GitProviderConnectionDto>
{
    private readonly IGitProviderService _gitProviderService;

    public UpdateGitProviderEndpoint(IGitProviderService gitProviderService)
    {
        _gitProviderService = gitProviderService;
    }

    public override void Configure()
    {
        Put("/api/git-providers/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateGitProviderRequest req, CancellationToken ct)
    {
        var provider = await _gitProviderService.UpdateAsync(req.Id, req.Data);

        if (provider == null)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.OkAsync(provider, cancellation: ct);
    }
}
