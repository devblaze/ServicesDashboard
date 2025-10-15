# E2E Testing and Demo Video Generation

This directory contains Playwright end-to-end tests configured to generate demonstration videos of the Services Dashboard application.

## Quick Start

### Install Dependencies

```bash
# Install node dependencies
yarn install

# Install Playwright browsers
yarn playwright:install
```

### Run Demo Videos

```bash
# Run demos and generate videos (using the script)
./run-demo.sh

# Or run directly with yarn
yarn demo:record

# Watch demos in headed mode (see browser)
yarn demo

# Use Playwright UI mode for debugging
yarn test:e2e:ui
```

## Output Locations

After running demos, you'll find:

- **Videos**: `./videos/` - All generated demo videos (WebM format)
- **Screenshots**: `./screenshots/` - Screenshots taken during tests
- **Test Report**: `./playwright-report/` - HTML test report with videos embedded

## Demo Tests

The `demo.spec.ts` file contains 10 different demonstration scenarios:

1. **Dashboard Overview and Navigation** - Shows main dashboard and navigation
2. **Service Management Features** - Demonstrates service cards and management
3. **Server Management** - Shows server listing and management features
4. **Settings and Configuration** - Walks through application settings
5. **Search and Filter Functionality** - Demonstrates search capabilities
6. **Real-time Updates and Monitoring** - Shows live health monitoring
7. **Responsive Design - Mobile View** - Demonstrates mobile responsive design
8. **Logs and Troubleshooting** - Shows log viewing and filtering
9. **Network Discovery Features** - Demonstrates network scanning
10. **Complete User Journey** - Full workflow from start to finish

## Video Format

Videos are automatically recorded in WebM format. To convert to MP4:

```bash
# Install ffmpeg if needed (macOS)
brew install ffmpeg

# Convert a single video
ffmpeg -i videos/demo-1-*.webm -c:v libx264 -crf 23 -c:a aac output.mp4

# Convert all videos
for f in videos/*.webm; do
  ffmpeg -i "$f" -c:v libx264 -crf 23 -c:a aac "${f%.webm}.mp4"
done
```

## Configuration

### Video Settings

Edit `playwright.config.ts` to customize:

```typescript
video: {
  mode: 'on',                          // Always record
  size: { width: 1920, height: 1080 }  // Full HD resolution
}
```

### Demo Speed

Control demo speed with the `DEMO_MODE` environment variable:

```bash
# Slow motion for better visibility
DEMO_MODE=true yarn demo:record

# Normal speed
yarn demo:record
```

### Test Timeout

Adjust timeout in `playwright.config.ts`:

```typescript
timeout: 60 * 1000,  // 60 seconds per test
```

## Helper Functions

The `helpers.ts` file provides utilities for creating better demos:

- `demoDelay(duration)` - Add pauses for visibility
- `slowType(page, selector, text)` - Type slowly for demo effect
- `smoothScroll(page, direction)` - Smooth scrolling
- `highlightElement(page, selector)` - Highlight UI elements
- `navigateWithAnimation(page, url)` - Navigate with transitions

Example usage:

```typescript
import { demoDelay, slowType, highlightElement } from './helpers';

test('My Demo', async ({ page }) => {
  await page.goto('/');
  await demoDelay(1000);

  await highlightElement(page, '.important-button');
  await slowType(page, 'input[name="search"]', 'my search query');
});
```

## Running Specific Tests

```bash
# Run a single test by name
yarn test:e2e --grep "Dashboard Overview"

# Run tests matching a pattern
yarn test:e2e --grep "Demo [1-3]"

# Run in headed mode to watch
yarn test:e2e:headed --grep "Service Management"
```

## Viewing Results

### HTML Report

```bash
# Generate and open HTML report
yarn playwright show-report
```

The HTML report includes:
- Video playback for each test
- Screenshots
- Detailed test steps
- Network activity
- Console logs

### Test Results Directory

Videos and traces are saved in `test-results/`:

```
test-results/
├── demo-1-dashboard/
│   ├── video.webm
│   └── trace.zip
├── demo-2-services/
│   ├── video.webm
│   └── trace.zip
└── ...
```

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Install Playwright
  run: |
    cd services-dashboard-frontend
    yarn install
    yarn playwright:install --with-deps

- name: Run Demo Tests
  run: |
    cd services-dashboard-frontend
    yarn demo:record

- name: Upload Videos
  uses: actions/upload-artifact@v4
  if: always()
  with:
    name: demo-videos
    path: services-dashboard-frontend/videos/
    retention-days: 30
```

## Troubleshooting

### Tests Timing Out

Increase timeout in `playwright.config.ts` or specific tests:

```typescript
test('My Test', async ({ page }) => {
  test.setTimeout(120000); // 2 minutes
  // test code
});
```

### Backend Not Running

Tests expect the backend to be running. Start it with:

```bash
# From repository root
docker-compose up -d

# Or run backend directly
cd ServicesDashboard
dotnet run
```

### Browser Installation Issues

```bash
# Reinstall browsers with dependencies
yarn playwright:install --with-deps

# Or manually install system dependencies
npx playwright install-deps
```

### Videos Not Generated

Ensure video recording is enabled in config:

```typescript
use: {
  video: 'on',  // or 'retain-on-failure'
}
```

## Best Practices for Demo Videos

1. **Add Delays**: Use `demoDelay()` between actions
2. **Slow Motion**: Enable with `DEMO_MODE=true`
3. **Highlight Elements**: Use `highlightElement()` for important UI
4. **Full Page Screenshots**: Set `fullPage: true`
5. **Clear Actions**: Make user actions obvious with slow typing
6. **Test in Isolation**: Each test should be independent
7. **Meaningful Names**: Use descriptive test names for video files
8. **Clean State**: Reset state between tests

## Advanced Usage

### Custom Slow Motion

```typescript
// In test
await page.evaluate(() => {
  const style = document.createElement('style');
  style.innerHTML = '* { transition: all 0.3s ease !important; }';
  document.head.appendChild(style);
});
```

### Picture-in-Picture Effect

```typescript
// Zoom in on specific element
await page.locator('.important-section').evaluate((el) => {
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
await demoDelay(2000);
```

### Add Text Overlays (Post-Processing)

Use ffmpeg to add text:

```bash
ffmpeg -i input.webm -vf "drawtext=text='Dashboard Overview':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=50" output.webm
```

## Contributing

When adding new demo tests:

1. Follow the naming pattern: `Demo X: Feature Name`
2. Add descriptive comments
3. Include appropriate delays for visibility
4. Take screenshots at key moments
5. Test in headed mode first
6. Update this README if adding new features

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
- [Video Recording Guide](https://playwright.dev/docs/videos)
- [Best Practices](https://playwright.dev/docs/best-practices)
