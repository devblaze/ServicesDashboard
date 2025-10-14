using Microsoft.EntityFrameworkCore;
using ServicesDashboard.Data;
using ServicesDashboard.Data.Entities;
using ServicesDashboard.Models.Dtos;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.PixelFormats;

namespace ServicesDashboard.Services.Docker;

public interface IDockerServicesService
{
    Task<List<DockerServiceWithServer>> ApplyArrangementsAsync(List<DockerServiceWithServer> services);
    Task UpdateArrangementsAsync(List<DockerServiceArrangementDto> arrangements);
    Task<bool> UpdateServiceIconAsync(int serverId, string containerId, string? iconUrl, string? iconData, bool removeBackground, bool downloadFromUrl, string? imageName);
}

public class DockerServicesService : IDockerServicesService
{
    private readonly ServicesDashboardContext _context;
    private readonly ILogger<DockerServicesService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    public DockerServicesService(
        ServicesDashboardContext context,
        ILogger<DockerServicesService> logger,
        IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<List<DockerServiceWithServer>> ApplyArrangementsAsync(List<DockerServiceWithServer> services)
    {
        try
        {
            var arrangements = await _context.DockerServiceArrangements
                .ToDictionaryAsync(a => $"{a.ServerId}:{a.ContainerId}", a => a);

            // Create a dictionary for icon sharing by image name
            var iconsByImage = await _context.DockerServiceArrangements
                .Where(a => !string.IsNullOrEmpty(a.ImageName) &&
                           (a.CustomIconUrl != null || a.CustomIconData != null))
                .GroupBy(a => a.ImageName!)
                .ToDictionaryAsync(
                    g => g.Key,
                    g => g.OrderByDescending(a => a.UpdatedAt).First()
                );

            var arrangedServices = services.Select(service =>
            {
                var key = $"{service.ServerId}:{service.ContainerId}";

                // First check for container-specific arrangement
                if (arrangements.TryGetValue(key, out var arrangement))
                {
                    service.Order = arrangement.Order;
                    service.CustomIconUrl = arrangement.CustomIconUrl;
                    service.CustomIconData = arrangement.CustomIconData;
                }
                else
                {
                    service.Order = int.MaxValue;

                    // If no container-specific icon, check for image-based icon sharing
                    if (iconsByImage.TryGetValue(service.Image, out var sharedIconArrangement))
                    {
                        service.CustomIconUrl = sharedIconArrangement.CustomIconUrl;
                        service.CustomIconData = sharedIconArrangement.CustomIconData;
                        _logger.LogDebug("Sharing icon from image {ImageName} for container {ContainerName}",
                            service.Image, service.Name);
                    }
                }

                return service;
            }).ToList();

            // Sort by order, then by name for items without specific order
            return arrangedServices
                .OrderBy(s => s.Order == int.MaxValue ? 1 : 0)
                .ThenBy(s => s.Order)
                .ThenBy(s => s.Name)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying arrangements");
            return services.OrderBy(s => s.Name).ToList();
        }
    }

    public async Task UpdateArrangementsAsync(List<DockerServiceArrangementDto> arrangements)
    {
        try
        {
            // Get existing arrangements
            var existingArrangements = await _context.DockerServiceArrangements.ToListAsync();
            var existingDict = existingArrangements.ToDictionary(a => $"{a.ServerId}:{a.ContainerId}");

            foreach (var arrangement in arrangements)
            {
                var key = $"{arrangement.ServerId}:{arrangement.ContainerId}";
                
                if (existingDict.TryGetValue(key, out var existing))
                {
                    existing.Order = arrangement.Order;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    _context.DockerServiceArrangements.Add(new DockerServiceArrangement
                    {
                        ServerId = arrangement.ServerId,
                        ContainerId = arrangement.ContainerId,
                        ContainerName = arrangement.ContainerName,
                        Order = arrangement.Order
                    });
                }
            }

            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating arrangements");
            throw;
        }
    }

    public async Task<bool> UpdateServiceIconAsync(int serverId, string containerId, string? iconUrl, string? iconData, bool removeBackground, bool downloadFromUrl, string? imageName)
    {
        try
        {
            var key = $"{serverId}:{containerId}";
            var arrangement = await _context.DockerServiceArrangements
                .FirstOrDefaultAsync(a => a.ServerId == serverId && a.ContainerId == containerId);

            string? processedIconData = iconData;
            string? finalIconUrl = iconUrl;

            // Download from URL if requested
            if (downloadFromUrl && !string.IsNullOrEmpty(iconUrl))
            {
                try
                {
                    var httpClient = _httpClientFactory.CreateClient();
                    var imageBytes = await httpClient.GetByteArrayAsync(iconUrl);

                    // Process the downloaded image
                    processedIconData = await ProcessImageAsync(imageBytes, removeBackground);
                    finalIconUrl = null; // Store as base64 data instead of URL

                    _logger.LogInformation("Downloaded and processed icon from URL: {IconUrl}", iconUrl);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to download icon from URL: {IconUrl}", iconUrl);
                    // Fall back to storing the URL
                    finalIconUrl = iconUrl;
                    processedIconData = null;
                }
            }
            // Process uploaded image data if background removal is requested
            else if (removeBackground && !string.IsNullOrEmpty(iconData))
            {
                try
                {
                    // Extract base64 data (remove data:image prefix if present)
                    var base64Data = iconData;
                    if (iconData.Contains(","))
                    {
                        base64Data = iconData.Split(',')[1];
                    }

                    var imageBytes = Convert.FromBase64String(base64Data);
                    processedIconData = await ProcessImageAsync(imageBytes, true);

                    _logger.LogInformation("Processed uploaded icon with background removal");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to process uploaded icon");
                    // Fall back to using original image
                    processedIconData = iconData;
                }
            }

            if (arrangement == null)
            {
                // Create new arrangement if it doesn't exist
                var containerName = containerId.Length > 12 ? containerId.Substring(0, 12) : containerId;
                arrangement = new DockerServiceArrangement
                {
                    ServerId = serverId,
                    ContainerId = containerId,
                    ContainerName = containerName,
                    Order = int.MaxValue,
                    ImageName = imageName,
                    CustomIconUrl = finalIconUrl,
                    CustomIconData = processedIconData
                };
                _context.DockerServiceArrangements.Add(arrangement);
            }
            else
            {
                arrangement.ImageName = imageName;
                arrangement.CustomIconUrl = finalIconUrl;
                arrangement.CustomIconData = processedIconData;
                arrangement.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating service icon for {ContainerId}", containerId);
            return false;
        }
    }

    private async Task<string> ProcessImageAsync(byte[] imageBytes, bool removeBackground)
    {
        await using var inputStream = new MemoryStream(imageBytes);
        using var image = await Image.LoadAsync<Rgba32>(inputStream);

        if (removeBackground)
        {
            // Remove background by making pixels with similar color to corners transparent
            RemoveBackground(image);
        }

        // Resize to reasonable icon size (128x128) while maintaining aspect ratio
        image.Mutate(x => x.Resize(new ResizeOptions
        {
            Size = new Size(128, 128),
            Mode = ResizeMode.Max
        }));

        // Convert back to base64
        await using var outputStream = new MemoryStream();
        await image.SaveAsPngAsync(outputStream);
        var processedBytes = outputStream.ToArray();
        return $"data:image/png;base64,{Convert.ToBase64String(processedBytes)}";
    }

    private void RemoveBackground(Image<Rgba32> image)
    {
        // Sample corner pixels to determine background color
        var topLeft = image[0, 0];
        var topRight = image[image.Width - 1, 0];
        var bottomLeft = image[0, image.Height - 1];
        var bottomRight = image[image.Width - 1, image.Height - 1];

        // Average the corner colors to get background color
        var bgColor = new Rgba32(
            (byte)((topLeft.R + topRight.R + bottomLeft.R + bottomRight.R) / 4),
            (byte)((topLeft.G + topRight.G + bottomLeft.G + bottomRight.G) / 4),
            (byte)((topLeft.B + topRight.B + bottomLeft.B + bottomRight.B) / 4),
            255
        );

        // Increased threshold for better background removal (was 40, now 80)
        // Higher values remove more aggressive backgrounds but may affect edges
        const int threshold = 80;

        // Process each pixel
        for (int y = 0; y < image.Height; y++)
        {
            for (int x = 0; x < image.Width; x++)
            {
                var pixel = image[x, y];

                // Calculate Euclidean color distance in RGB space
                var distance = Math.Sqrt(
                    Math.Pow(pixel.R - bgColor.R, 2) +
                    Math.Pow(pixel.G - bgColor.G, 2) +
                    Math.Pow(pixel.B - bgColor.B, 2)
                );

                // Make pixel transparent if similar to background
                // Use gradient transparency for smoother edges
                if (distance < threshold)
                {
                    // Calculate alpha based on distance for smoother edges
                    // Pixels very close to background become fully transparent
                    // Pixels near the threshold retain some opacity
                    var alpha = (byte)Math.Min(255, (distance / threshold) * 255);
                    image[x, y] = new Rgba32(pixel.R, pixel.G, pixel.B, alpha);
                }
            }
        }
    }
}
