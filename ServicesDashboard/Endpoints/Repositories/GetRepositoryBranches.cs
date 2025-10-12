using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Git;

namespace ServicesDashboard.Endpoints.Repositories;

public class GetRepositoryBranchesRequest
{
    public int Id { get; set; }
}

public class GetRepositoryBranchesEndpoint : Endpoint<GetRepositoryBranchesRequest, List<GitBranchDto>>
{
    private readonly IGitRepositoryService _repositoryService;

    public GetRepositoryBranchesEndpoint(IGitRepositoryService repositoryService)
    {
        _repositoryService = repositoryService;
    }

    public override void Configure()
    {
        Get("/api/repositories/{id}/branches");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetRepositoryBranchesRequest req, CancellationToken ct)
    {
        var branches = await _repositoryService.GetBranchesAsync(req.Id);
        await Send.OkAsync(branches, cancellation: ct);
    }
}
