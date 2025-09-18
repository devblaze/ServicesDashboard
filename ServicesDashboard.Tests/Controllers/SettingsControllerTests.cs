using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;
using ServicesDashboard.Controllers;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Services.ArtificialIntelligence;
using ServicesDashboard.Services.Settings;
using System.Net;
using System.Text;
using Xunit;

namespace ServicesDashboard.Tests.Controllers;

public class SettingsControllerTests
{
    private readonly Mock<ISettingsService> _mockSettingsService;
    private readonly Mock<IServiceRecognitionService> _mockServiceRecognition;
    private readonly Mock<ILogger<SettingsController>> _mockLogger;
    private readonly Mock<HttpMessageHandler> _mockHttpHandler;
    private readonly HttpClient _httpClient;
    private readonly SettingsController _controller;

    public SettingsControllerTests()
    {
        _mockSettingsService = new Mock<ISettingsService>();
        _mockServiceRecognition = new Mock<IServiceRecognitionService>();
        _mockLogger = new Mock<ILogger<SettingsController>>();
        _mockHttpHandler = new Mock<HttpMessageHandler>();
        
        _httpClient = new HttpClient(_mockHttpHandler.Object);
        
        _controller = new SettingsController(
            _mockSettingsService.Object,
            _mockServiceRecognition.Object,
            _mockLogger.Object,
            _httpClient);
    }

    [Fact]
    public async Task GetAllSettings_ReturnsOkWithSettingsList()
    {
        // Arrange
        var expectedSettings = new List<SettingsGroup>
        {
            new SettingsGroup 
            { 
                Category = "AI", 
                DisplayName = "AI Settings", 
                Description = "AI and ML configurations",
                Icon = "brain",
                Settings = new Dictionary<string, object>
                {
                    { "Provider", "ollama" },
                    { "BaseUrl", "http://localhost:11434" }
                }
            },
            new SettingsGroup 
            { 
                Category = "General", 
                DisplayName = "General Settings", 
                Description = "General application settings",
                Icon = "settings",
                Settings = new Dictionary<string, object>
                {
                    { "Theme", "dark" },
                    { "RefreshInterval", 30 }
                }
            }
        };

        _mockSettingsService.Setup(x => x.GetAllSettingsGroupsAsync())
            .ReturnsAsync(expectedSettings);

        // Act
        var result = await _controller.GetAllSettings();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var settings = Assert.IsAssignableFrom<IEnumerable<SettingsGroup>>(okResult.Value);
        Assert.Equal(2, settings.Count());
    }

    [Fact]
    public async Task GetAllSettings_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        _mockSettingsService.Setup(x => x.GetAllSettingsGroupsAsync())
            .ThrowsAsync(new Exception("Database connection failed"));

        // Act
        var result = await _controller.GetAllSettings();

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(500, statusResult.StatusCode);
        Assert.Contains("Failed to retrieve settings", statusResult.Value?.ToString());
    }

    [Fact]
    public async Task GetAISettings_ReturnsOkWithSettings()
    {
        // Arrange
        var expectedSettings = new AISettings
        {
            Provider = "ollama",
            BaseUrl = "http://localhost:11434",
            Model = "llama3.2:3b-instruct-q8_0",
            EnableServiceRecognition = true,
            EnableScreenshots = true,
            TimeoutSeconds = 30
        };

        _mockSettingsService.Setup(x => x.GetSettingsAsync<AISettings>())
            .ReturnsAsync(expectedSettings);

        // Act
        var result = await _controller.GetAISettings();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var settings = Assert.IsType<AISettings>(okResult.Value);
        Assert.Equal("ollama", settings.Provider);
        Assert.Equal("http://localhost:11434", settings.BaseUrl);
        Assert.True(settings.EnableServiceRecognition);
    }

    [Fact]
    public async Task GetAISettings_WhenExceptionThrown_ReturnsDefaultSettings()
    {
        // Arrange
        _mockSettingsService.Setup(x => x.GetSettingsAsync<AISettings>())
            .ThrowsAsync(new Exception("Settings not found"));

        // Act
        var result = await _controller.GetAISettings();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var settings = Assert.IsType<AISettings>(okResult.Value);
        // Should return default settings
        Assert.Equal("ollama", settings.Provider);
        Assert.Equal("http://localhost:11434", settings.BaseUrl);
    }

    [Fact]
    public async Task UpdateAISettings_WithValidSettings_ReturnsOkWithSettings()
    {
        // Arrange
        var settingsToUpdate = new AISettings
        {
            Provider = "openai",
            BaseUrl = "https://api.openai.com/v1",
            Model = "gpt-4",
            ApiKey = "test-key",
            EnableServiceRecognition = false,
            TimeoutSeconds = 60
        };

        _mockSettingsService.Setup(x => x.UpdateSettingsAsync(settingsToUpdate, "AI"))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.UpdateAISettings(settingsToUpdate);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var settings = Assert.IsType<AISettings>(okResult.Value);
        Assert.Equal("openai", settings.Provider);
        Assert.Equal("gpt-4", settings.Model);
        Assert.False(settings.EnableServiceRecognition);
    }

    [Fact]
    public async Task UpdateAISettings_WithNullSettings_ReturnsBadRequest()
    {
        // Act
        var result = await _controller.UpdateAISettings(null!);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Settings cannot be null", badRequestResult.Value);
    }

    [Fact]
    public async Task UpdateAISettings_WhenUpdateFails_ReturnsBadRequest()
    {
        // Arrange
        var settingsToUpdate = new AISettings();
        _mockSettingsService.Setup(x => x.UpdateSettingsAsync(settingsToUpdate, "AI"))
            .ReturnsAsync(false);

        // Act
        var result = await _controller.UpdateAISettings(settingsToUpdate);

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Failed to update AI settings", badRequestResult.Value);
    }

    [Fact]
    public async Task UpdateAISettings_WhenExceptionThrown_ReturnsInternalServerError()
    {
        // Arrange
        var settingsToUpdate = new AISettings();
        _mockSettingsService.Setup(x => x.UpdateSettingsAsync(settingsToUpdate, "AI"))
            .ThrowsAsync(new Exception("Database error"));

        // Act
        var result = await _controller.UpdateAISettings(settingsToUpdate);

        // Assert
        var statusResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(500, statusResult.StatusCode);
        Assert.Contains("Failed to update AI settings", statusResult.Value?.ToString());
    }

    [Fact]
    public async Task GetNotificationSettings_ReturnsOkWithSettings()
    {
        // Arrange
        var expectedSettings = new NotificationSettings
        {
            EnablePushover = true,
            PushoverUserKey = "test-user-key",
            EnableEmail = false,
            SmtpPort = 587
        };

        _mockSettingsService.Setup(x => x.GetSettingsAsync<NotificationSettings>())
            .ReturnsAsync(expectedSettings);

        // Act
        var result = await _controller.GetNotificationSettings();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var settings = Assert.IsType<NotificationSettings>(okResult.Value);
        Assert.True(settings.EnablePushover);
        Assert.Equal("test-user-key", settings.PushoverUserKey);
        Assert.False(settings.EnableEmail);
    }

    [Fact]
    public async Task GetNotificationSettings_WhenExceptionThrown_ReturnsDefaultSettings()
    {
        // Arrange
        _mockSettingsService.Setup(x => x.GetSettingsAsync<NotificationSettings>())
            .ThrowsAsync(new Exception("Settings not found"));

        // Act
        var result = await _controller.GetNotificationSettings();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var settings = Assert.IsType<NotificationSettings>(okResult.Value);
        // Should return default settings
        Assert.False(settings.EnablePushover);
        Assert.False(settings.EnableEmail);
    }

    [Fact]
    public async Task UpdateNotificationSettings_WithValidSettings_ReturnsOkWithSettings()
    {
        // Arrange
        var settingsToUpdate = new NotificationSettings
        {
            EnableEmail = true,
            SmtpServer = "smtp.gmail.com",
            SmtpPort = 587,
            FromEmail = "test@example.com"
        };

        _mockSettingsService.Setup(x => x.UpdateSettingsAsync(settingsToUpdate, "Notifications"))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.UpdateNotificationSettings(settingsToUpdate);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var settings = Assert.IsType<NotificationSettings>(okResult.Value);
        Assert.True(settings.EnableEmail);
        Assert.Equal("smtp.gmail.com", settings.SmtpServer);
    }

    [Fact]
    public async Task GetGeneralSettings_ReturnsOkWithSettings()
    {
        // Arrange
        var expectedSettings = new GeneralSettings
        {
            ApplicationName = "My Dashboard",
            Theme = "light",
            RefreshInterval = 60,
            EnableAutoRefresh = false,
            DefaultScanPorts = "extended"
        };

        _mockSettingsService.Setup(x => x.GetSettingsAsync<GeneralSettings>())
            .ReturnsAsync(expectedSettings);

        // Act
        var result = await _controller.GetGeneralSettings();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var settings = Assert.IsType<GeneralSettings>(okResult.Value);
        Assert.Equal("My Dashboard", settings.ApplicationName);
        Assert.Equal("light", settings.Theme);
        Assert.Equal(60, settings.RefreshInterval);
        Assert.False(settings.EnableAutoRefresh);
    }

    [Fact]
    public async Task UpdateGeneralSettings_WithValidSettings_ReturnsOkWithSettings()
    {
        // Arrange
        var settingsToUpdate = new GeneralSettings
        {
            ApplicationName = "Updated Dashboard",
            Theme = "auto",
            RefreshInterval = 45,
            EnableAutoRefresh = true,
            DefaultScanPorts = "custom",
            CustomPorts = "80,443,22,21"
        };

        _mockSettingsService.Setup(x => x.UpdateSettingsAsync(settingsToUpdate, "General"))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.UpdateGeneralSettings(settingsToUpdate);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var settings = Assert.IsType<GeneralSettings>(okResult.Value);
        Assert.Equal("Updated Dashboard", settings.ApplicationName);
        Assert.Equal("auto", settings.Theme);
        Assert.Equal("80,443,22,21", settings.CustomPorts);
    }

    [Fact]
    public async Task TestAIConnection_WhenConnectionSuccessful_ReturnsTrue()
    {
        // Arrange
        _mockServiceRecognition.Setup(x => x.TestOllamaConnectionAsync())
            .ReturnsAsync(true);

        // Act
        var result = await _controller.TestAIConnection();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.True((bool)okResult.Value!);
    }

    [Fact]
    public async Task TestAIConnection_WhenConnectionFails_ReturnsFalse()
    {
        // Arrange
        _mockServiceRecognition.Setup(x => x.TestOllamaConnectionAsync())
            .ReturnsAsync(false);

        // Act
        var result = await _controller.TestAIConnection();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.False((bool)okResult.Value!);
    }

    [Fact]
    public async Task TestAIConnection_WhenExceptionThrown_ReturnsFalse()
    {
        // Arrange
        _mockServiceRecognition.Setup(x => x.TestOllamaConnectionAsync())
            .ThrowsAsync(new Exception("Connection timeout"));

        // Act
        var result = await _controller.TestAIConnection();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.False((bool)okResult.Value!);
    }

    [Fact]
    public async Task GetAvailableModels_WithOllamaProvider_ReturnsModels()
    {
        // Arrange
        var aiSettings = new AISettings
        {
            Provider = "ollama",
            BaseUrl = "http://localhost:11434",
            Model = "llama3.2:3b-instruct-q8_0"
        };

        _mockSettingsService.Setup(x => x.GetSettingsAsync<AISettings>())
            .ReturnsAsync(aiSettings);

        var mockResponse = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("{\"models\": []}", Encoding.UTF8, "application/json")
        };

        _mockHttpHandler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req => req.RequestUri!.ToString().Contains("/api/tags")),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(mockResponse);

        // Act
        var result = await _controller.GetAvailableModels();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var models = Assert.IsAssignableFrom<IEnumerable<string>>(okResult.Value);
        Assert.Contains("llama3.2:3b-instruct-q8_0", models);
    }

    [Fact]
    public async Task GetAvailableModels_WithNonOllamaProvider_ReturnsEmptyArray()
    {
        // Arrange
        var aiSettings = new AISettings
        {
            Provider = "openai",
            BaseUrl = "https://api.openai.com/v1"
        };

        _mockSettingsService.Setup(x => x.GetSettingsAsync<AISettings>())
            .ReturnsAsync(aiSettings);

        // Act
        var result = await _controller.GetAvailableModels();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var models = Assert.IsAssignableFrom<IEnumerable<string>>(okResult.Value);
        Assert.Empty(models);
    }

    [Fact]
    public async Task GetAvailableModels_WhenHttpRequestFails_ReturnsBadRequest()
    {
        // Arrange
        var aiSettings = new AISettings
        {
            Provider = "ollama",
            BaseUrl = "http://localhost:11434"
        };

        _mockSettingsService.Setup(x => x.GetSettingsAsync<AISettings>())
            .ReturnsAsync(aiSettings);

        var mockResponse = new HttpResponseMessage(HttpStatusCode.InternalServerError);

        _mockHttpHandler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(mockResponse);

        // Act
        var result = await _controller.GetAvailableModels();

        // Assert
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(result.Result);
        Assert.Equal("Failed to connect to Ollama server", badRequestResult.Value);
    }

    [Theory]
    [InlineData("dark")]
    [InlineData("light")]
    [InlineData("auto")]
    public async Task UpdateGeneralSettings_WithDifferentThemes_UpdatesCorrectly(string theme)
    {
        // Arrange
        var settingsToUpdate = new GeneralSettings { Theme = theme };
        _mockSettingsService.Setup(x => x.UpdateSettingsAsync(settingsToUpdate, "General"))
            .ReturnsAsync(true);

        // Act
        var result = await _controller.UpdateGeneralSettings(settingsToUpdate);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var settings = Assert.IsType<GeneralSettings>(okResult.Value);
        Assert.Equal(theme, settings.Theme);
    }

    public void Dispose()
    {
        _httpClient?.Dispose();
    }
}