using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using ServicesDashboard.Controllers;
using ServicesDashboard.Models;
using ServicesDashboard.Services.LogCollection;
using ServicesDashboard.Services;
using ServicesDashboard.Services.ArtificialIntelligence;
using ServicesDashboard.Services.Interfaces; // Add this for the Services LogAnalysisResult
using Xunit;
using LogAnalysisResult = ServicesDashboard.Services.Interfaces.LogAnalysisResult;

namespace ServicesDashboard.Tests.Controllers;

public class LogsControllerTests
{
    private readonly Mock<IDockerLogCollector> _mockLogCollector;
    private readonly Mock<ILogAnalyzer> _mockLogAnalyzer;
    private readonly Mock<ILogger<LogsController>> _mockLogger;
    private readonly LogsController _controller;

    public LogsControllerTests()
    {
        _mockLogCollector = new Mock<IDockerLogCollector>();
        _mockLogAnalyzer = new Mock<ILogAnalyzer>();
        _mockLogger = new Mock<ILogger<LogsController>>();
        _controller = new LogsController(_mockLogCollector.Object, _mockLogAnalyzer.Object, _mockLogger.Object);
    }

    [Fact]
    public async Task GetContainers_ReturnsOkWithContainerList()
    {
        // Arrange
        var expectedContainers = new List<string> { "container1", "container2" };
        _mockLogCollector.Setup(x => x.ListContainersAsync()).ReturnsAsync(expectedContainers);

        // Act
        var result = await _controller.GetContainers();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var containers = Assert.IsAssignableFrom<IEnumerable<string>>(okResult.Value);
        Assert.Equal(2, containers.Count());
    }

    [Fact]
    public async Task GetContainerLogs_WithValidContainerId_ReturnsOkWithLogs()
    {
        // Arrange
        var containerId = "test-container";
        var expectedLogs = "Test log content";
        _mockLogCollector.Setup(x => x.GetContainerLogsAsync(containerId, 100)).ReturnsAsync(expectedLogs);

        // Act
        var result = await _controller.GetContainerLogs(containerId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(expectedLogs, okResult.Value);
    }

    [Fact]
    public async Task GetContainerLogs_WithCustomLines_PassesCorrectParameter()
    {
        // Arrange
        var containerId = "test-container";
        var lines = 500;
        _mockLogCollector.Setup(x => x.GetContainerLogsAsync(containerId, lines)).ReturnsAsync("logs");

        // Act
        await _controller.GetContainerLogs(containerId, lines);

        // Assert
        _mockLogCollector.Verify(x => x.GetContainerLogsAsync(containerId, lines), Times.Once);
    }

    [Fact]
    public async Task DownloadContainerLogs_WithValidContainerId_ReturnsFileResult()
    {
        // Arrange
        var containerId = "test-container";
        var expectedLogs = "Test log content for download";
        _mockLogCollector.Setup(x => x.DownloadContainerLogsAsync(containerId)).ReturnsAsync(expectedLogs);

        // Act
        var result = await _controller.DownloadContainerLogs(containerId);

        // Assert
        var fileResult = Assert.IsType<FileContentResult>(result);
        Assert.Equal("text/plain", fileResult.ContentType);
        Assert.Equal($"{containerId}-logs.txt", fileResult.FileDownloadName);
    }

    [Fact]
    public async Task AnalyzeLogs_WithValidLogs_ReturnsAnalysisResult()
    {
        // Arrange
        var logs = "Sample log content";
        
        // Use the correct LogAnalysisResult from Services namespace
        var expectedResult = new LogAnalysisResult
        {
            HasErrors = true,
            Summary = "Analysis complete",
            Errors = new List<string> { "Error found in logs" },
            Suggestions = new List<string> { "Consider checking configuration" },
            Issues = new List<LogIssue>
            {
                new LogIssue { Severity = "warning", Description = "Test issue" }
            }
        };

        _mockLogAnalyzer.Setup(x => x.AnalyzeLogsAsync(logs)).ReturnsAsync(expectedResult);

        // Act
        var result = await _controller.AnalyzeLogs(logs);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var analysisResult = Assert.IsType<LogAnalysisResult>(okResult.Value);
        Assert.Equal(expectedResult.Summary, analysisResult.Summary);
        Assert.True(analysisResult.HasErrors);
        Assert.Single(analysisResult.Issues);
    }
}