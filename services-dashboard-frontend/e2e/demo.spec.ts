import { test } from '@playwright/test';

/**
 * Demo Test Suite for Services Dashboard
 *
 * These tests are designed to create demonstration videos showcasing
 * the application's key features. Run with: yarn demo:record
 *
 * Videos will be saved to: test-results/
 */

test.describe('Services Dashboard - Feature Demonstrations', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('Demo 1: Dashboard Overview and Navigation', async ({ page }) => {
    // Take screenshot of the landing page
    await page.screenshot({ path: 'screenshots/01-dashboard-overview.png', fullPage: true });

    // Hover over navigation elements to show interactivity
    await page.getByRole('link', { name: /services/i }).hover();
    await page.waitForTimeout(1000);

    await page.getByRole('link', { name: /servers/i }).hover();
    await page.waitForTimeout(1000);


    await page.getByRole('link', { name: /settings/i }).hover();
    await page.waitForTimeout(1000);

    // Click through main sections
    await page.getByRole('link', { name: /services/i }).click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'screenshots/02-services-page.png', fullPage: true });
  });

  test('Demo 2: Service Management Features', async ({ page }) => {
    // Navigate to services
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    // Show the services list
    await page.waitForTimeout(1500);

    // Interact with service cards if they exist
    const serviceCards = page.locator('[data-testid="service-card"], .service-card, [class*="service"]').first();
    if (await serviceCards.count() > 0) {
      await serviceCards.hover();
      await page.waitForTimeout(1000);

      // Take screenshot
      await page.screenshot({ path: 'screenshots/03-service-details.png', fullPage: true });
    }

    // Try to interact with add service button if it exists
    const addButton = page.getByRole('button', { name: /add service/i });
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'screenshots/04-add-service-modal.png' });

      // Close modal if opened
      const closeButton = page.getByRole('button', { name: /close|cancel/i });
      if (await closeButton.count() > 0) {
        await closeButton.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });

  test('Demo 3: Server Management', async ({ page }) => {
    // Navigate to servers
    await page.goto('/servers');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Take screenshot of servers page
    await page.screenshot({ path: 'screenshots/05-servers-page.png', fullPage: true });

    // Interact with server elements if they exist
    const serverItems = page.locator('[data-testid="server-item"], .server-item, [class*="server"]').first();
    if (await serverItems.count() > 0) {
      await serverItems.hover();
      await page.waitForTimeout(1000);
    }

    // Look for network discovery or scan features
    const scanButton = page.getByRole('button', { name: /scan|discover/i });
    if (await scanButton.count() > 0) {
      await scanButton.hover();
      await page.waitForTimeout(1000);
    }
  });

  test('Demo 4: Settings and Configuration', async ({ page }) => {
    // Navigate to settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Take screenshot of settings
    await page.screenshot({ path: 'screenshots/06-settings-page.png', fullPage: true });

    // Interact with settings sections
    const settingsSections = page.locator('[data-testid="settings-section"], .settings-section, section');
    const count = await settingsSections.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      await settingsSections.nth(i).scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
    }

    // Take final screenshot
    await page.screenshot({ path: 'screenshots/07-settings-scrolled.png', fullPage: true });
  });

  test('Demo 5: Search and Filter Functionality', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('networkidle');

    // Look for search input
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.count() > 0) {
      await searchInput.click();
      await page.waitForTimeout(500);

      // Type slowly for demo effect
      await searchInput.type('service', { delay: 100 });
      await page.waitForTimeout(1000);

      await page.screenshot({ path: 'screenshots/08-search-results.png', fullPage: true });

      // Clear search
      await searchInput.clear();
      await page.waitForTimeout(500);
    }
  });

  test('Demo 6: Real-time Updates and Monitoring', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Demonstrate live monitoring
    // Look for health status indicators
    const healthIndicators = page.locator('[data-testid="health-indicator"], .health-status, [class*="status"]');
    const indicatorCount = await healthIndicators.count();

    if (indicatorCount > 0) {
      for (let i = 0; i < Math.min(indicatorCount, 5); i++) {
        await healthIndicators.nth(i).scrollIntoViewIfNeeded();
        await healthIndicators.nth(i).hover();
        await page.waitForTimeout(800);
      }
    }

    // Wait to show live updates
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'screenshots/09-monitoring-dashboard.png', fullPage: true });
  });

  test('Demo 7: Responsive Design - Mobile View', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'screenshots/10-mobile-dashboard.png', fullPage: true });

    // Show mobile navigation
    const menuButton = page.getByRole('button', { name: /menu|navigation/i });
    if (await menuButton.count() > 0) {
      await menuButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/11-mobile-menu.png', fullPage: true });
    }
  });

  test('Demo 8: Logs and Troubleshooting', async ({ page }) => {
    // Try to navigate to logs page
    await page.goto('/logs');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'screenshots/12-logs-page.png', fullPage: true });

    // Interact with log entries if they exist
    const logEntries = page.locator('[data-testid="log-entry"], .log-entry, [class*="log"]').first();
    if (await logEntries.count() > 0) {
      await logEntries.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'screenshots/13-log-details.png' });
    }
  });

  test('Demo 9: Network Discovery Features', async ({ page }) => {
    // Navigate to network discovery
    const discoveryPath = '/network-discovery';
    await page.goto(discoveryPath);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'screenshots/14-network-discovery.png', fullPage: true });

    // Look for scan functionality
    const scanButton = page.getByRole('button', { name: /scan|start/i }).first();
    if (await scanButton.count() > 0) {
      await scanButton.hover();
      await page.waitForTimeout(1000);
    }
  });

  test('Demo 10: Complete User Journey', async ({ page }) => {
    // Demonstrate a complete workflow
    await page.goto('/');
    await page.waitForTimeout(2000);

    // 1. View Dashboard
    await page.screenshot({ path: 'screenshots/15-journey-start.png', fullPage: true });

    // 2. Navigate to Services
    await page.goto('/services');
    await page.waitForTimeout(1500);

    // 3. Navigate to Servers
    await page.goto('/servers');
    await page.waitForTimeout(1500);

    // 4. Check Settings
    await page.goto('/settings');
    await page.waitForTimeout(1500);

    // 5. Return to Dashboard
    await page.goto('/');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'screenshots/16-journey-complete.png', fullPage: true });
  });
});
