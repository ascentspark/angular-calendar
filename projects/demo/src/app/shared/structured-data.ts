/**
 * JSON-LD structured-data builders. Emitted as `<script type="application/ld+json">`
 * so search engines and LLM crawlers get machine-readable facts about the library
 * and each page (and FAQ rich-result eligibility).
 */

export const SITE_ORIGIN = 'https://angular-calendar.ascentspark.com';

export function softwareApplicationLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: '@ascentsparksoftware/angular-calendar',
    description:
      'Themeable, signals-first Angular calendar and resource scheduler: month, week, day, ' +
      'timeline, agenda and year views; timezone-correct date engine; RFC 5545 RRULE recurrence; ' +
      'pointer + keyboard drag/resize/create; OKLCH two-colour theming. Standalone, zoneless, SSR-safe.',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    softwareVersion: '22.0.2',
    license: 'https://opensource.org/licenses/MIT',
    author: { '@type': 'Organization', name: 'Ascentspark', url: 'https://ascentspark.com' },
    codeRepository: 'https://github.com/ascentspark/angular-calendar',
    url: SITE_ORIGIN,
  };
}

export function webPageLd(
  name: string,
  description: string,
  path: string,
): Record<string, unknown> {
  const trimmed = path.replace(/^\//, '');
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    description,
    url: trimmed ? `${SITE_ORIGIN}/${trimmed}` : SITE_ORIGIN,
    isPartOf: { '@type': 'WebSite', name: 'Angular Calendar', url: SITE_ORIGIN },
  };
}

export interface FaqItem {
  q: string;
  a: string;
}

export function faqPageLd(items: FaqItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.q,
      acceptedAnswer: { '@type': 'Answer', text: i.a },
    })),
  };
}
