using Microsoft.EntityFrameworkCore;
using OllamaSharp;
using OllamaSharp.Models;
using ServicesDashboard.Data;
using ServicesDashboard.Models.Dtos;
using ServicesDashboard.Services.Git;
using System.Text;
using System.Text.Json;

namespace ServicesDashboard.Services.Deployment;

public interface IAiDeploymentAssistant
{
    Task<AiDeploymentSuggestions> GenerateSuggestionsAsync(int repositoryId, int serverId, string? branch = null);
}

public class AiDeploymentAssistant : IAiDeploymentAssistant
{
    private readonly ServicesDashboardContext _context;
    private readonly IOllamaApiClient _ollamaClient;
    private readonly IGitApiClientFactory _gitApiClientFactory;
    private readonly IPortAllocationService _portAllocationService;
    private readonly ILogger<AiDeploymentAssistant> _logger;

    public AiDeploymentAssistant(
        ServicesDashboardContext context,
        IOllamaApiClient ollamaClient,
        IGitApiClientFactory gitApiClientFactory,
        IPortAllocationService portAllocationService,
        ILogger<AiDeploymentAssistant> logger)
    {
        _context = context;
        _ollamaClient = ollamaClient;
        _gitApiClientFactory = gitApiClientFactory;
        _portAllocationService = portAllocationService;
        _logger = logger;
    }

    public async Task<AiDeploymentSuggestions> GenerateSuggestionsAsync(int repositoryId, int serverId, string? branch = null)
    {
        try
        {
            var repository = await _context.GitRepositories
                .Include(r => r.GitProviderConnection)
                .FirstOrDefaultAsync(r => r.Id == repositoryId);

            if (repository == null)
                throw new ArgumentException("Repository not found");

            var branchToUse = branch ?? repository.DefaultBranch ?? "main";

            // Create Git API client
            var client = _gitApiClientFactory.CreateClient(
                repository.GitProviderConnection.ProviderType,
                repository.GitProviderConnection.BaseUrl,
                repository.GitProviderConnection.AccessToken
            );

            // Analyze repository structure
            var analysis = await AnalyzeRepositoryAsync(client, repository, branchToUse);

            // Generate AI suggestions
            var prompt = BuildAnalysisPrompt(analysis, repository);
            var aiResponse = await GenerateOllamaResponseAsync(prompt);

            // Parse AI response
            var suggestions = ParseAiSuggestions(aiResponse, analysis);

            // Suggest available ports
            suggestions.SuggestedPorts = await SuggestPortsAsync(serverId, analysis.DetectedServices.Count);

            return suggestions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate deployment suggestions for repository {RepositoryId}", repositoryId);

            // Return basic suggestions as fallback
            return new AiDeploymentSuggestions
            {
                RecommendedType = "Docker",
                Confidence = 0.5,
                Reasoning = "Failed to analyze repository, using default suggestions"
            };
        }
    }

    private async Task<RepositoryAnalysis> AnalyzeRepositoryAsync(IGitApiClient client, Data.Entities.GitRepository repository, string branch)
    {
        var analysis = new RepositoryAnalysis();

        // Check for Docker Compose
        var dockerCompose = await client.GetFileContentAsync(repository.FullName, "docker-compose.yml", branch)
            ?? await client.GetFileContentAsync(repository.FullName, "docker-compose.yaml", branch);

        if (dockerCompose != null)
        {
            analysis.HasDockerCompose = true;
            analysis.DockerComposeContent = dockerCompose;
        }

        // Check for Dockerfile
        var dockerfile = await client.GetFileContentAsync(repository.FullName, "Dockerfile", branch);
        if (dockerfile != null)
        {
            analysis.HasDockerfile = true;
            analysis.DockerfileContent = dockerfile;
        }

        // Check for package.json (Node.js)
        var packageJson = await client.GetFileContentAsync(repository.FullName, "package.json", branch);
        if (packageJson != null)
        {
            analysis.DetectedLanguages.Add("Node.js");
            analysis.PackageJsonContent = packageJson;
        }

        // Check for requirements.txt (Python)
        var requirementsTxt = await client.GetFileContentAsync(repository.FullName, "requirements.txt", branch);
        if (requirementsTxt != null)
        {
            analysis.DetectedLanguages.Add("Python");
        }

        // Check for pom.xml or build.gradle (Java)
        var pomXml = await client.GetFileContentAsync(repository.FullName, "pom.xml", branch);
        var buildGradle = await client.GetFileContentAsync(repository.FullName, "build.gradle", branch);
        if (pomXml != null || buildGradle != null)
        {
            analysis.DetectedLanguages.Add("Java");
        }

        // Check for .csproj (C#/.NET)
        // This is simplified - in reality you'd search for *.csproj files
        analysis.DetectedServices.Add("web");

        return analysis;
    }

    private string BuildAnalysisPrompt(RepositoryAnalysis analysis, Data.Entities.GitRepository repository)
    {
        var prompt = new StringBuilder();
        prompt.AppendLine("You are a DevOps expert. Analyze this repository and suggest deployment configuration.");
        prompt.AppendLine($"\nRepository: {repository.Name}");
        prompt.AppendLine($"Description: {repository.Description ?? "No description"}");
        prompt.AppendLine($"\nDetected languages: {string.Join(", ", analysis.DetectedLanguages)}");
        prompt.AppendLine($"Has Dockerfile: {analysis.HasDockerfile}");
        prompt.AppendLine($"Has Docker Compose: {analysis.HasDockerCompose}");

        if (analysis.PackageJsonContent != null)
        {
            prompt.AppendLine("\npackage.json detected - Node.js project");
        }

        prompt.AppendLine("\nProvide deployment suggestions in JSON format with:");
        prompt.AppendLine("1. recommendedType: DockerCompose, Docker, or Kubernetes");
        prompt.AppendLine("2. suggestedEnvironmentVariables: key-value pairs");
        prompt.AppendLine("3. suggestedVolumes: array of {hostPath, containerPath, mode}");
        prompt.AppendLine("4. buildContext: relative path (default: \".\")");
        prompt.AppendLine("5. confidence: 0.0-1.0");
        prompt.AppendLine("6. reasoning: brief explanation");
        prompt.AppendLine("\nRespond ONLY with valid JSON, no additional text.");

        return prompt.ToString();
    }

    private AiDeploymentSuggestions ParseAiSuggestions(string aiResponse, RepositoryAnalysis analysis)
    {
        try
        {
            // Try to extract JSON from the response
            var jsonStart = aiResponse.IndexOf('{');
            var jsonEnd = aiResponse.LastIndexOf('}');

            if (jsonStart >= 0 && jsonEnd > jsonStart)
            {
                var jsonString = aiResponse.Substring(jsonStart, jsonEnd - jsonStart + 1);
                var parsed = JsonSerializer.Deserialize<AiDeploymentSuggestions>(jsonString, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (parsed != null)
                {
                    // Set file paths based on analysis
                    if (analysis.HasDockerCompose)
                        parsed.DockerComposeFile = "docker-compose.yml";
                    if (analysis.HasDockerfile)
                        parsed.Dockerfile = "Dockerfile";

                    return parsed;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to parse AI suggestions, using fallback");
        }

        // Fallback suggestions based on analysis
        return new AiDeploymentSuggestions
        {
            RecommendedType = analysis.HasDockerCompose ? "DockerCompose" : analysis.HasDockerfile ? "Docker" : "Script",
            DockerComposeFile = analysis.HasDockerCompose ? "docker-compose.yml" : null,
            Dockerfile = analysis.HasDockerfile ? "Dockerfile" : null,
            BuildContext = ".",
            Confidence = 0.7,
            Reasoning = $"Based on repository analysis: {string.Join(", ", analysis.DetectedLanguages)}"
        };
    }

    private async Task<List<PortMappingDto>> SuggestPortsAsync(int serverId, int count)
    {
        var availablePorts = await _portAllocationService.FindAvailablePortsAsync(serverId, Math.Max(count, 1));

        return availablePorts.Select((port, index) => new PortMappingDto
        {
            HostPort = port,
            ContainerPort = 3000 + index, // Common app ports: 3000, 3001, etc.
            Protocol = "tcp"
        }).ToList();
    }

    private async Task<string> GenerateOllamaResponseAsync(string prompt)
    {
        var response = new StringBuilder();

        await foreach (var chunk in _ollamaClient.GenerateAsync(new GenerateRequest
        {
            Model = "llama3.2:3b", // Using a default model - could be configured
            Prompt = prompt,
            Stream = false
        }))
        {
            if (chunk?.Response != null)
                response.Append(chunk.Response);
        }

        return response.ToString();
    }

    private class RepositoryAnalysis
    {
        public bool HasDockerfile { get; set; }
        public bool HasDockerCompose { get; set; }
        public string? DockerfileContent { get; set; }
        public string? DockerComposeContent { get; set; }
        public string? PackageJsonContent { get; set; }
        public List<string> DetectedLanguages { get; set; } = new();
        public List<string> DetectedServices { get; set; } = new();
    }
}
