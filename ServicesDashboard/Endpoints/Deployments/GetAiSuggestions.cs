using FastEndpoints;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Deployment;

namespace ServicesDashboard.Endpoints.Deployments;

public class GetAiSuggestionsRequest
{
    public int RepositoryId { get; set; }
    public int ServerId { get; set; }
    public string? Branch { get; set; }
}

public class GetAiSuggestionsEndpoint : Endpoint<GetAiSuggestionsRequest, AiDeploymentSuggestions>
{
    private readonly IAiDeploymentAssistant _aiAssistant;

    public GetAiSuggestionsEndpoint(IAiDeploymentAssistant aiAssistant)
    {
        _aiAssistant = aiAssistant;
    }

    public override void Configure()
    {
        Post("/api/deployments/ai-suggestions");
        AllowAnonymous();
    }

    public override async Task HandleAsync(GetAiSuggestionsRequest req, CancellationToken ct)
    {
        var suggestions = await _aiAssistant.GenerateSuggestionsAsync(
            req.RepositoryId,
            req.ServerId,
            req.Branch
        );

        await Send.OkAsync(suggestions, cancellation: ct);
    }
}
