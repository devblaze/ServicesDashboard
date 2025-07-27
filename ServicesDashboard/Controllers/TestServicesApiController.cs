
using Microsoft.AspNetCore.Mvc;

namespace ServicesDashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestController : ControllerBase
{
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
    }

    [HttpGet("services-test")]
    public IActionResult ServicesTest()
    {
        // Return mock data to test the endpoint
        var mockServices = new[]
        {
            new {
                id = Guid.NewGuid(),
                name = "Test Service 1",
                description = "Mock service for testing",
                status = "Running",
                dockerImage = "nginx:latest",
                port = 80,
                environment = "development",
                createdAt = DateTime.UtcNow.AddDays(-1),
                updatedAt = DateTime.UtcNow
            },
            new {
                id = Guid.NewGuid(),
                name = "Test Service 2", 
                description = "Another mock service",
                status = "Stopped",
                dockerImage = "postgres:15",
                port = 5432,
                environment = "development",
                createdAt = DateTime.UtcNow.AddDays(-2),
                updatedAt = DateTime.UtcNow
            }
        };

        return Ok(mockServices);
    }
}
