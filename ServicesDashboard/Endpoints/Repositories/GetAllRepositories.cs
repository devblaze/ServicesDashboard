using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Git;

namespace ServicesDashboard.Endpoints.Repositories;

public class GetAllRepositoriesRequest
{
    public int? ProviderId { get; set; }
}

public class GetAllRepositoriesEndpoint : Endpoint<GetAllRepositoriesRequest, List<GitRepositoryDto>>
{
    private readonly IGitRepositoryService _repositoryService;

    public GetAllRepositoriesEndpoint(IGitRepositoryService repositoryService)
    {
        _repositoryService = repositoryService;
    }

    public override void Configure()
    {
        Get("/api/repositories");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetAllRepositoriesRequest req, CancellationToken ct)
    {
        var repositories = await _repositoryService.GetAllAsync(req.ProviderId);
        await Send.OkAsync(repositories, cancellation: ct);
    }
}
