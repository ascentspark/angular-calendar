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
      // Let the view settle (theme effect + view-model render).
      await page.locator('[data-testid="calendar-demo"]').waitFor();

      const results = await new AxeBuilder({ page })
        .include('[data-testid="calendar-demo"]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(
        results.violations,
        results.violations.map((v) => `${v.id} (${v.nodes.length})`).join(', '),
      ).toEqual([]);
    });
  }
}
