import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NAV } from './nav';

/**
 * Site shell: branded header (dark toggle) + grouped sidebar nav + routed content.
 * The heavy interactive demos live in the lazily-loaded route components.
 */
@Component({
  selector: 'cal-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly nav = NAV;
  protected readonly dark = signal(false);
  protected readonly menuOpen = signal(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('cal-demo-theme');
      if (stored === 'dark') {
        this.dark.set(true);
        document.documentElement.classList.add('dark');
      }
    }
  }

  protected toggleDark(): void {
    const next = !this.dark();
    this.dark.set(next);
    if (isPlatformBrowser(this.platformId)) {
      document.documentElement.classList.toggle('dark', next);
      localStorage.setItem('cal-demo-theme', next ? 'dark' : 'light');
    }
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }
}
