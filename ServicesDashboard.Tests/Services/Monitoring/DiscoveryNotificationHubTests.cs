using ServicesDashboard.Hubs;
using Xunit;

namespace ServicesDashboard.Tests.Services.Monitoring;

/// <summary>
/// Tests that the IDiscoveryNotificationClient interface includes
/// the server monitoring methods required by ServerMonitoringWorker.
/// </summary>
public class DiscoveryNotificationHubTests
{
    [Fact]
    public void IDiscoveryNotificationClient_HasReceiveServerStatusUpdateMethod()
    {
        var method = typeof(IDiscoveryNotificationClient).GetMethod("ReceiveServerStatusUpdate");
        Assert.NotNull(method);

        var parameters = method!.GetParameters();
        Assert.Equal(3, parameters.Length);
        Assert.Equal(typeof(int), parameters[0].ParameterType);    // serverId
        Assert.Equal(typeof(string), parameters[1].ParameterType);  // status
        Assert.Equal(typeof(string), parameters[2].ParameterType);  // lastCheckTime
    }

    [Fact]
    public void IDiscoveryNotificationClient_HasReceiveServerHealthUpdateMethod()
    {
        var method = typeof(IDiscoveryNotificationClient).GetMethod("ReceiveServerHealthUpdate");
        Assert.NotNull(method);

        var parameters = method!.GetParameters();
        Assert.Equal(2, parameters.Length);
        Assert.Equal(typeof(int), parameters[0].ParameterType);     // serverId
        Assert.Equal(typeof(object), parameters[1].ParameterType);  // healthCheck
    }

    [Fact]
    public void IDiscoveryNotificationClient_RetainsOriginalScanMethods()
    {
        // Ensure we didn't break existing methods
        Assert.NotNull(typeof(IDiscoveryNotificationClient).GetMethod("ReceiveScanStarted"));
        Assert.NotNull(typeof(IDiscoveryNotificationClient).GetMethod("ReceiveScanProgress"));
        Assert.NotNull(typeof(IDiscoveryNotificationClient).GetMethod("ReceiveScanCompleted"));
        Assert.NotNull(typeof(IDiscoveryNotificationClient).GetMethod("ReceiveScanError"));
        Assert.NotNull(typeof(IDiscoveryNotificationClient).GetMethod("ReceiveHostDiscovered"));
        Assert.NotNull(typeof(IDiscoveryNotificationClient).GetMethod("ReceiveServiceDiscovered"));
    }
}
