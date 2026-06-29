import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility gate: every calendar view must have zero WCAG 2.0/2.1 A & AA
 * violations, in both light and dark themes, evaluated against the live rendered
 * DOM. This is a hard exit criterion — a regression here fails CI.
 */
const VIEWS = ['month', 'week', 'day', 'timeline', 'agenda', 'year', 'weekrows'] as const;
const MODES = ['light', 'dark'] as const;

for (const mode of MODES) {
  for (const view of VIEWS) {
    test(`${view} view has no axe violations (${mode})`, async ({ page }) => {
      await page.goto('/');
      if (mode === 'dark') {
        await page.locator('[data-testid="toggle-mode"]').click();
      }
      await page.locator(`[data-testid="view-${view}"]`).click();
      // Let the view settle: the calendar present, the active tab styled by the
      // applied accent token, and a frame for the theme effect to flush.
      await page.locator('[data-testid="calendar-demo"]').waitFor();
      await page
        .locator(`[data-testid="view-${view}"].segment__btn--on`)
        .waitFor();
      await page.waitForFunction(() => {
        const root = document.querySelector('cal-root');
        return (
          root !== null &&
          getComputedStyle(root).getPropertyValue('--cal-accent').trim() !== ''
        );
      });
      await page.waitForTimeout(120);

      // Scan the whole shell (top bar, theme controls, exports, filters) plus the
      // calendar — the entire rendered surface must clear the gate.
      const results = await new AxeBuilder({ page })
        .include('main.app')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(
        results.violations,
        results.violations.map((v) => `${v.id} (${v.nodes.length})`).join(', '),
      ).toEqual([]);
    });
  }
}

test('month "+N more" overflow popover has no axe violations', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-testid="view-month"]').click();
  await page.locator('.cal-day__more').first().click();
  await page.locator('.cal-more').waitFor();
  await page.locator('.cal-more__item').nth(2).hover(); // exercise the sunk hover bg
  await page.waitForTimeout(120);

  const results = await new AxeBuilder({ page })
    .include('main.app')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(
    results.violations,
    results.violations.map((v) => `${v.id} (${v.nodes.length})`).join(', '),
  ).toEqual([]);
});
