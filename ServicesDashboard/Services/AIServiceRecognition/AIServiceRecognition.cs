using ServicesDashboard.Models;
using ServicesDashboard.Services.AIServiceRecognition;
using Microsoft.Extensions.Options;
using OllamaSharp;
using OllamaSharp.Models;
using PuppeteerSharp;
using HtmlAgilityPack;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Text;

namespace ServicesDashboard.Services.AIServiceRecognition;

public class AIServiceRecognition : IAIServiceRecognitionService
{
    private readonly IOllamaApiClient _ollamaClient;
    private readonly ILogger<AIServiceRecognition> _logger;
    private readonly OllamaSettings _settings;
    private readonly HttpClient _httpClient;

    private static readonly Dictionary<string, string> ServiceIcons = new()
    {
        // Web servers
        { "nginx", "server" },
        { "apache", "server" },
        { "traefik", "route" },
        { "caddy", "server" },
        
        // Databases
        { "mysql", "database" },
        { "postgresql", "database" },
        { "mongodb", "database" },
        { "redis", "database" },
        { "elasticsearch", "search" },
        
        // Monitoring
        { "prometheus", "activity" },
        { "grafana", "bar-chart-3" },
        { "portainer", "docker" },
        { "adminer", "database" },
        
        // Development
        { "jenkins", "git-branch" },
        { "gitlab", "git-branch" },
        { "github", "github" },
        { "sonarqube", "code" },
        
        // Communication
        { "nextcloud", "cloud" },
        { "wordpress", "globe" },
        { "mattermost", "message-circle" },
        
        // Default
        { "unknown", "server" }
    };

    public AIServiceRecognition(
        IOptions<AppSettings> settings,
        ILogger<AIServiceRecognition> logger,
        HttpClient httpClient)
    {
        _settings = settings.Value.Ollama;
        _logger = logger;
        _httpClient = httpClient;
        _ollamaClient = new OllamaApiClient(new Uri(_settings.BaseUrl));
    }

    public async Task<ServiceRecognitionResult> RecognizeServiceAsync(
        string hostAddress, 
        int port, 
        string serviceType, 
        string? banner = null, 
        string? htmlContent = null, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Starting AI service recognition for {Host}:{Port}", hostAddress, port);

            var result = new ServiceRecognitionResult();

            // Try to get HTML content if it's a web service
            if (IsWebService(serviceType) && string.IsNullOrEmpty(htmlContent))
            {
                htmlContent = await FetchHtmlContentAsync($"http://{hostAddress}:{port}", cancellationToken);
            }

            // Extract title from HTML
            if (!string.IsNullOrEmpty(htmlContent))
            {
                result.ExtractedTitle = ExtractTitleFromHtml(htmlContent);
            }

            // Use AI to analyze the service
            var aiAnalysis = await AnalyzeServiceWithAI(hostAddress, port, serviceType, banner, htmlContent, result.ExtractedTitle, cancellationToken);
            
            if (aiAnalysis != null)
            {
                result.RecognizedName = aiAnalysis.Name;
                result.Description = aiAnalysis.Description;
                result.Category = aiAnalysis.Category;
                result.Confidence = aiAnalysis.Confidence;
                result.IsPopularService = aiAnalysis.IsPopular;
                result.IconName = GetIconForService(aiAnalysis.ServiceKey);
                result.Metadata = aiAnalysis.Metadata;
            }

            // Fallback to banner/title analysis if AI fails
            if (result.Confidence < 0.5)
            {
                var fallbackResult = AnalyzeServiceFallback(serviceType, banner, result.ExtractedTitle);
                if (fallbackResult.Confidence > result.Confidence)
                {
                    result = fallbackResult;
                }
            }

            _logger.LogInformation("Service recognition completed with confidence {Confidence}", result.Confidence);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during service recognition");
            return new ServiceRecognitionResult
            {
                RecognizedName = $"{serviceType} Service",
                Description = $"Service running on {hostAddress}:{port}",
                Confidence = 0.1
            };
        }
    }

    private async Task<AIAnalysisResult?> AnalyzeServiceWithAI(
        string hostAddress, 
        int port, 
        string serviceType, 
        string? banner, 
        string? htmlContent, 
        string? title,
        CancellationToken cancellationToken)
    {
        try
        {
            if (!_settings.EnableServiceRecognition)
            {
                return null;
            }

            var prompt = BuildAnalysisPrompt(hostAddress, port, serviceType, banner, htmlContent, title);
        
            var request = new GenerateRequest
            {
                Model = _settings.Model,
                Prompt = prompt,
                Stream = false
            };

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(_settings.TimeoutSeconds));

            // Collect the streamed response
            var responseBuilder = new StringBuilder();
            await foreach (var responseChunk in _ollamaClient.GenerateAsync(request, cts.Token))
            {
                if (responseChunk?.Response != null)
                {
                    responseBuilder.Append(responseChunk.Response);
                }
            
                // If this is the final chunk (done = true), break
                if (responseChunk?.Done == true)
                {
                    break;
                }
            }

            var fullResponse = responseBuilder.ToString();
            if (!string.IsNullOrEmpty(fullResponse))
            {
                return ParseAIResponse(fullResponse);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("AI analysis timed out for {Host}:{Port}", hostAddress, port);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during AI analysis for {Host}:{Port}", hostAddress, port);
        }

        return null;
    }

    private string BuildAnalysisPrompt(string hostAddress, int port, string serviceType, string? banner, string? htmlContent, string? title)
    {
        var prompt = $"""
        Analyze this network service and identify what application/service it is:

        Host: {hostAddress}
        Port: {port}
        Service Type: {serviceType}
        Banner: {banner ?? "N/A"}
        Page Title: {title ?? "N/A"}
        
        """;

        if (!string.IsNullOrEmpty(htmlContent))
        {
            // Truncate HTML content to avoid token limits
            var truncatedHtml = htmlContent.Length > 2000 ? htmlContent.Substring(0, 2000) + "..." : htmlContent;
            prompt += $"HTML Content Sample: {truncatedHtml}\n\n";
        }

        prompt += """
        Based on this information, identify the specific application/service. Respond ONLY with a valid JSON object in this exact format:
        {
          "name": "Specific service name (e.g., 'Nginx Web Server', 'MySQL Database', 'Grafana Dashboard')",
          "description": "Brief description of what this service does",
          "category": "One of: Web Server, Database, Monitoring, Development, Communication, Storage, Security, Unknown",
          "serviceKey": "lowercase key for icon mapping (e.g., 'nginx', 'mysql', 'grafana', 'unknown')",
          "confidence": 0.85,
          "isPopular": true,
          "metadata": {
            "version": "detected version if available",
            "vendor": "software vendor/company"
          }
        }

        Be specific and accurate. If uncertain, use lower confidence and 'unknown' serviceKey.
        """;

        return prompt;
    }

    private AIAnalysisResult? ParseAIResponse(string response)
    {
        try
        {
            // Clean the response - sometimes AI adds extra text
            var jsonMatch = Regex.Match(response, @"\{.*\}", RegexOptions.Singleline);
            if (!jsonMatch.Success)
            {
                return null;
            }

            var jsonString = jsonMatch.Value;
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            return JsonSerializer.Deserialize<AIAnalysisResult>(jsonString, options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse AI response: {Response}", response);
            return null;
        }
    }

    private ServiceRecognitionResult AnalyzeServiceFallback(string serviceType, string? banner, string? title)
    {
        var result = new ServiceRecognitionResult();

        // Analyze banner for known signatures
        if (!string.IsNullOrEmpty(banner))
        {
            var lowerBanner = banner.ToLower();
            
            if (lowerBanner.Contains("nginx"))
            {
                result.RecognizedName = "Nginx Web Server";
                result.Category = "Web Server";
                result.IconName = "server";
                result.Confidence = 0.8;
                result.IsPopularService = true;
            }
            else if (lowerBanner.Contains("apache"))
            {
                result.RecognizedName = "Apache HTTP Server";
                result.Category = "Web Server";
                result.IconName = "server";
                result.Confidence = 0.8;
                result.IsPopularService = true;
            }
            else if (lowerBanner.Contains("mysql"))
            {
                result.RecognizedName = "MySQL Database";
                result.Category = "Database";
                result.IconName = "database";
                result.Confidence = 0.9;
                result.IsPopularService = true;
            }
        }

        // Analyze title for known patterns
        if (!string.IsNullOrEmpty(title))
        {
            var lowerTitle = title.ToLower();
            
            if (lowerTitle.Contains("grafana"))
            {
                result.RecognizedName = "Grafana Dashboard";
                result.Category = "Monitoring";
                result.IconName = "bar-chart-3";
                result.Confidence = 0.9;
                result.IsPopularService = true;
            }
            else if (lowerTitle.Contains("portainer"))
            {
                result.RecognizedName = "Portainer Docker Management";
                result.Category = "Development";
                result.IconName = "docker";
                result.Confidence = 0.9;
                result.IsPopularService = true;
            }
        }

        // Default fallback
        if (result.Confidence == 0)
        {
            result.RecognizedName = !string.IsNullOrEmpty(title) ? title : $"{serviceType} Service";
            result.Description = $"Service running on port {serviceType}";
            result.Confidence = 0.3;
        }

        return result;
    }

    private async Task<string?> FetchHtmlContentAsync(string url, CancellationToken cancellationToken)
    {
        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(10));

            var response = await _httpClient.GetStringAsync(url, cts.Token);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to fetch HTML content from {Url}", url);
            return null;
        }
    }

    public string ExtractTitleFromHtml(string htmlContent)
    {
        try
        {
            var doc = new HtmlDocument();
            doc.LoadHtml(htmlContent);

            var titleNode = doc.DocumentNode.SelectSingleNode("//title");
            if (titleNode != null)
            {
                return titleNode.InnerText.Trim();
            }

            // Fallback to h1 tag
            var h1Node = doc.DocumentNode.SelectSingleNode("//h1");
            if (h1Node != null)
            {
                return h1Node.InnerText.Trim();
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to extract title from HTML");
        }

        return string.Empty;
    }

    public async Task<byte[]?> TakeScreenshotAsync(string url, CancellationToken cancellationToken = default)
    {
        if (!_settings.EnableScreenshots)
        {
            return null;
        }

        try
        {
            await new BrowserFetcher().DownloadAsync();

            var launchOptions = new LaunchOptions
            {
                Headless = true,
                Args = new[] { "--no-sandbox", "--disable-setuid-sandbox" }
            };

            using var browser = await Puppeteer.LaunchAsync(launchOptions);
            using var page = await browser.NewPageAsync();

            await page.SetViewportAsync(new ViewPortOptions
            {
                Width = 1200,
                Height = 800
            });

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(15));

            await page.GoToAsync(url, new NavigationOptions
            {
                WaitUntil = new[] { WaitUntilNavigation.DOMContentLoaded },
                Timeout = 10000
            });

            var screenshot = await page.ScreenshotDataAsync(new ScreenshotOptions
            {
                Type = ScreenshotType.Png,
                FullPage = false
            });

            return screenshot;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to take screenshot of {Url}", url);
            return null;
        }
    }

    public async Task<bool> TestOllamaConnectionAsync()
    {
        try
        {
            // Use direct HTTP call to test connection since API methods are unclear
            var response = await _httpClient.GetAsync($"{_settings.BaseUrl.TrimEnd('/')}/api/tags");
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect to Ollama server");
            return false;
        }
    }

    private static bool IsWebService(string serviceType)
    {
        var webServices = new[] { "http", "https", "http alt", "https alt" };
        return webServices.Contains(serviceType.ToLower());
    }

    private static string GetIconForService(string serviceKey)
    {
        return ServiceIcons.GetValueOrDefault(serviceKey.ToLower(), "server");
    }

    private class AIAnalysisResult
    {
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = "Unknown";
        public string ServiceKey { get; set; } = "unknown";
        public double Confidence { get; set; }
        public bool IsPopular { get; set; }
        public Dictionary<string, string> Metadata { get; set; } = new();
    }
}