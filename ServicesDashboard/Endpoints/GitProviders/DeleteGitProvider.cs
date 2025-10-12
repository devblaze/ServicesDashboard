using FastEndpoints;
using ServicesDashboard.Services.Git;

namespace ServicesDashboard.Endpoints.GitProviders;

public class DeleteGitProviderRequest
{
    public int Id { get; set; }
}

public class DeleteGitProviderEndpoint : Endpoint<DeleteGitProviderRequest>
{
    private readonly IGitProviderService _gitProviderService;

    public DeleteGitProviderEndpoint(IGitProviderService gitProviderService)
    {
        _gitProviderService = gitProviderService;
    }

    public override void Configure()
    {
        Delete("/api/git-providers/{id}");
        AllowAnonymous();
    }

    public override async Task HandleAsync(DeleteGitProviderRequest req, CancellationToken ct)
    {
        var success = await _gitProviderService.DeleteAsync(req.Id);

        if (!success)
        {
            await Send.NotFoundAsync(ct);
            return;
        }

        await Send.NoContentAsync(ct);
    }
}
