using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Git;

namespace ServicesDashboard.Endpoints.Repositories;

public class SyncRepositoriesEndpoint : Endpoint<SyncRepositoriesRequest, SyncRepositoriesResponse>
{
    private readonly IGitRepositoryService _repositoryService;

    public SyncRepositoriesEndpoint(IGitRepositoryService repositoryService)
    {
        _repositoryService = repositoryService;
    }

    public override void Configure()
    {
        Post("/api/repositories/sync");
        AllowAnonymous();
    }

    public override async Task HandleAsync(SyncRepositoriesRequest req, CancellationToken ct)
    {
        var result = await _repositoryService.SyncRepositoriesAsync(req.GitProviderConnectionId);
        await Send.OkAsync(result, cancellation: ct);
    }
}
