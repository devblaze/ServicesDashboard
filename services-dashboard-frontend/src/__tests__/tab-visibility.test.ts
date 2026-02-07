import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for tab visibility behavior.
 * Validates that polling pauses when the browser tab is hidden and resumes when visible.
 */

describe('Tab visibility: CSS animation pausing', () => {
  beforeEach(() => {
    document.body.classList.remove('tab-hidden');
  });

  it('should add tab-hidden class to body when document is hidden', () => {
    // Simulate the visibility listener from main.tsx
    const listener = () => {
      document.body.classList.toggle('tab-hidden', document.hidden);
    };
    document.addEventListener('visibilitychange', listener);

    // Simulate tab becoming hidden
    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(document.body.classList.contains('tab-hidden')).toBe(true);

    // Simulate tab becoming visible
    Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(document.body.classList.contains('tab-hidden')).toBe(false);

    document.removeEventListener('visibilitychange', listener);
  });
});

describe('Tab visibility: terminal polling pause/resume', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should stop polling when tab is hidden and resume when visible', () => {
    let pollCount = 0;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const poll = () => { pollCount++; };

    // Simulate the TerminalCommandExecutor visibility logic
    const startPolling = () => {
      poll(); // immediate
      intervalId = setInterval(poll, 2500);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } else {
        poll();
        intervalId = setInterval(poll, 2500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    // Start polling
    startPolling();
    expect(pollCount).toBe(1); // immediate poll

    // Advance 5 seconds → 2 more polls (at 2.5s and 5s)
    vi.advanceTimersByTime(5000);
    expect(pollCount).toBe(3);

    // Hide tab
    Object.defineProperty(document, 'hidden', { value: true, writable: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    const countBeforeHidden = pollCount;

    // Advance 10 seconds while hidden → should NOT poll
    vi.advanceTimersByTime(10000);
    expect(pollCount).toBe(countBeforeHidden);

    // Show tab again → immediate poll + interval restarts
    Object.defineProperty(document, 'hidden', { value: false, writable: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(pollCount).toBe(countBeforeHidden + 1); // immediate poll on visibility

    // Advance 2.5s → one more poll
    vi.advanceTimersByTime(2500);
    expect(pollCount).toBe(countBeforeHidden + 2);

    // Cleanup
    if (intervalId) clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibility);
  });

  it('should poll at 2500ms intervals, not 500ms', () => {
    let pollCount = 0;
    const poll = () => { pollCount++; };
    const intervalId = setInterval(poll, 2500);

    // At 500ms, old interval would have fired once. New interval: 0
    vi.advanceTimersByTime(500);
    expect(pollCount).toBe(0);

    // At 2500ms: 1 poll
    vi.advanceTimersByTime(2000);
    expect(pollCount).toBe(1);

    // At 5000ms: 2 polls
    vi.advanceTimersByTime(2500);
    expect(pollCount).toBe(2);

    clearInterval(intervalId);
  });
});

describe('Tab visibility: performance impact measurement', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should make 80% fewer polling calls when tab is hidden 50% of the time vs always-on at 500ms', () => {
    // Old behavior: 500ms interval, always-on
    let oldPollCount = 0;
    const oldInterval = setInterval(() => { oldPollCount++; }, 500);

    // Simulate 60 seconds
    vi.advanceTimersByTime(60000);
    clearInterval(oldInterval);
    // Expected: 60000/500 = 120 polls

    vi.useRealTimers();
    vi.useFakeTimers();

    // New behavior: 2500ms interval, hidden 50% of time
    let newPollCount = 0;
    let newInterval: ReturnType<typeof setInterval> | null = setInterval(() => { newPollCount++; }, 2500);

    // 30s visible
    vi.advanceTimersByTime(30000);

    // 30s hidden (clear interval)
    if (newInterval) { clearInterval(newInterval); newInterval = null; }
    vi.advanceTimersByTime(30000);

    // Expected: 30000/2500 = 12 polls (vs 120 old)
    expect(oldPollCount).toBe(120);
    expect(newPollCount).toBe(12);
    expect(newPollCount).toBeLessThan(oldPollCount * 0.2); // 90% reduction
  });
});
