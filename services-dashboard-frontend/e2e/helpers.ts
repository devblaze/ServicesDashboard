import { Page } from '@playwright/test';

/**
 * Helper functions for Playwright tests and demos
 */

/**
 * Wait for network to be idle with custom timeout
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Take a full page screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string, fullPage = true) {
  await page.screenshot({
    path: `screenshots/${name}.png`,
    fullPage,
  });
}

/**
 * Slow down actions for better demo visibility
 */
export async function demoDelay(duration = 1000) {
  await new Promise(resolve => setTimeout(resolve, duration));
}

/**
 * Type text slowly for demo effect
 */
export async function slowType(page: Page, selector: string, text: string, delay = 100) {
  const element = page.locator(selector);
  await element.click();
  await element.type(text, { delay });
}

/**
 * Scroll through a page smoothly for demo
 */
export async function smoothScroll(page: Page, direction: 'down' | 'up' = 'down', steps = 5) {
  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  const viewportHeight = await page.evaluate(() => window.innerHeight);
  const maxScroll = scrollHeight - viewportHeight;
  const stepSize = maxScroll / steps;

  for (let i = 0; i < steps; i++) {
    const scrollTo = direction === 'down' ? stepSize * (i + 1) : maxScroll - (stepSize * (i + 1));
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'smooth' }), scrollTo);
    await demoDelay(500);
  }
}

/**
 * Highlight an element by adding a border (for demo purposes)
 */
export async function highlightElement(page: Page, selector: string, duration = 2000) {
  await page.locator(selector).evaluate((el) => {
    el.style.outline = '3px solid #3b82f6';
    el.style.outlineOffset = '2px';
  });

  await demoDelay(duration);

  await page.locator(selector).evaluate((el) => {
    el.style.outline = '';
    el.style.outlineOffset = '';
  });
}

/**
 * Navigate with animation/transition wait
 */
export async function navigateWithAnimation(page: Page, url: string) {
  await page.goto(url);
  await waitForNetworkIdle(page);
  await demoDelay(500); // Wait for animations
}

/**
 * Click and wait with demo delay
 */
export async function clickAndWait(page: Page, selector: string, waitTime = 1000) {
  await page.locator(selector).click();
  await demoDelay(waitTime);
}

/**
 * Hover with demo delay
 */
export async function hoverAndWait(page: Page, selector: string, waitTime = 800) {
  await page.locator(selector).hover();
  await demoDelay(waitTime);
}

/**
 * Check if element exists
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  return (await page.locator(selector).count()) > 0;
}

/**
 * Wait for element to be visible
 */
export async function waitForElement(page: Page, selector: string, timeout = 10000) {
  await page.locator(selector).waitFor({ state: 'visible', timeout });
}

/**
 * Get random delay for more natural demo flow
 */
export function getRandomDelay(min = 500, max = 1500): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
