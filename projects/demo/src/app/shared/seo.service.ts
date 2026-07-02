import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, NavigationEnd, NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';

import {
  FaqItem,
  faqPageLd,
  SITE_ORIGIN,
  softwareApplicationLd,
  webPageLd,
} from './structured-data';

const DEFAULT_DESCRIPTION =
  'A themeable, signals-first Angular 22 calendar and resource scheduler: month, week, day, ' +
  'timeline, agenda and year views; timezone-correct; RRULE recurrence; drag/resize; OKLCH theming. ' +
  'Standalone, zoneless, SSR-safe. Free and open-source.';

/**
 * Keeps the document title, description, canonical link, Open Graph / Twitter tags
 * and JSON-LD structured data in sync with the active route. SSR-safe (uses
 * `DOCUMENT`), so prerendered HTML carries correct per-page metadata for SEO/LLMs.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  init(): void {
    // Sitewide SoftwareApplication structured data (set once).
    this.setJsonLd('app', softwareApplicationLd());

    // Clear the previous page's FAQ block as navigation STARTS, so a page that sets
    // FAQ in its constructor (which runs before NavigationEnd) keeps it.
    this.router.events
      .pipe(filter((e): e is NavigationStart => e instanceof NavigationStart))
      .subscribe(() => this.clearJsonLd('faq'));

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        let r = this.route;
        while (r.firstChild) {
          r = r.firstChild;
        }
        const description = (r.snapshot.data['description'] as string) ?? DEFAULT_DESCRIPTION;
        const path = e.urlAfterRedirects.split(/[?#]/)[0] ?? '/';
        const url = SITE_ORIGIN + (path === '/' ? '' : path);
        const pageTitle = this.title.getTitle();

        this.meta.updateTag({ name: 'description', content: description });
        this.meta.updateTag({ property: 'og:title', content: pageTitle });
        this.meta.updateTag({ property: 'og:description', content: description });
        this.meta.updateTag({ property: 'og:url', content: url });
        this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
        this.meta.updateTag({ name: 'twitter:description', content: description });
        this.setCanonical(url);
        this.setJsonLd('page', webPageLd(pageTitle, description, path));
      });
  }

  /** Set FAQ structured data for the current page (call from the page component). */
  setFaq(items: FaqItem[]): void {
    this.setJsonLd('faq', faqPageLd(items));
  }

  private setCanonical(url: string): void {
    let link = this.doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setJsonLd(id: string, data: unknown): void {
    let script = this.doc.querySelector<HTMLScriptElement>(`script[data-ld="${id}"]`);
    if (!script) {
      script = this.doc.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-ld', id);
      this.doc.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);
  }

  private clearJsonLd(id: string): void {
    this.doc.querySelector(`script[data-ld="${id}"]`)?.remove();
  }
}
