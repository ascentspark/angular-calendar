import type { CalendarEvent, ZonedDateTime } from '@ascentsparksoftware/angular-calendar';

/** Options for {@link eventsToPrintHtml}. */
export interface PrintExportOptions {
  /** Document heading / `<title>`. Default `'Calendar'`. */
  readonly title?: string;
  /** BCP-47 locale for date/time formatting. Default `'en-US'`. */
  readonly locale?: string;
  /** IANA zone the wall-clock times are rendered in. Default: host zone. */
  readonly timeZone?: string;
  /** Force 12h (`true`) / 24h (`false`) clock; default lets the locale decide. */
  readonly hour12?: boolean;
}

function epochOf(value: Date | ZonedDateTime): number {
  return value instanceof Date ? value.getTime() : value.epochMs;
}

/** Minimal HTML-entity escaping for text interpolated into the document. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Default print stylesheet: a clean, paper-friendly agenda. Exposed so a host can
 * reuse it when printing the live DOM rather than this generated document.
 */
export const CAL_PRINT_STYLES = `
*{box-sizing:border-box}
body{font:13px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:24px}
h1{font-size:20px;margin:0 0 16px}
h2{font-size:14px;margin:20px 0 6px;padding-bottom:4px;border-bottom:1px solid #999}
table{width:100%;border-collapse:collapse}
th,td{text-align:start;padding:4px 8px;border-bottom:1px solid #ddd;vertical-align:top}
th{font-weight:600;color:#444}
.cal-print__time{white-space:nowrap;width:1%;color:#333}
.cal-print__empty{color:#777;font-style:italic}
@media print{body{margin:0}h2{page-break-after:avoid}tr{page-break-inside:avoid}}
`.trim();

/**
 * Serialise events to a complete, self-contained printable HTML document — an
 * agenda grouped by calendar day, ready to hand to a browser's print / "Save as
 * PDF". Pure (no DOM): the caller decides how to render it (see {@link printDocument}).
 * Events are ordered by start; all-day events sort before timed ones within a day.
 */
export function eventsToPrintHtml(
  events: readonly CalendarEvent[],
  options: PrintExportOptions = {},
): string {
  const title = options.title ?? 'Calendar';
  const locale = options.locale ?? 'en-US';
  const dateFmt = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(options.timeZone !== undefined ? { timeZone: options.timeZone } : {}),
  });
  const timeOpts: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    ...(options.timeZone !== undefined ? { timeZone: options.timeZone } : {}),
    ...(options.hour12 !== undefined ? { hour12: options.hour12 } : {}),
  };
  const timeFmt = new Intl.DateTimeFormat(locale, timeOpts);
  // Group key = the locale/zone day label; keeps DST-correct day boundaries.
  const dayKeyFmt = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(options.timeZone !== undefined ? { timeZone: options.timeZone } : {}),
  });

  const sorted = [...events].sort((a, b) => {
    const sa = epochOf(a.start);
    const sb = epochOf(b.start);
    if (sa !== sb) {
      return sa - sb;
    }
    // All-day first within the same instant.
    return (b.allDay === true ? 1 : 0) - (a.allDay === true ? 1 : 0);
  });

  const groups = new Map<string, { label: string; events: CalendarEvent[] }>();
  for (const event of sorted) {
    const start = new Date(epochOf(event.start));
    const key = dayKeyFmt.format(start);
    let group = groups.get(key);
    if (group === undefined) {
      group = { label: dateFmt.format(start), events: [] };
      groups.set(key, group);
    }
    group.events.push(event);
  }

  const sections: string[] = [];
  for (const group of groups.values()) {
    const rows = group.events
      .map((event) => {
        const time =
          event.allDay === true
            ? 'All day'
            : event.end === undefined
              ? timeFmt.format(new Date(epochOf(event.start)))
              : `${timeFmt.format(new Date(epochOf(event.start)))} – ${timeFmt.format(
                  new Date(epochOf(event.end)),
                )}`;
        const titleCell = esc(event.title ?? '(untitled)');
        const status = event.status === undefined ? '' : esc(event.status);
        return `<tr><td class="cal-print__time">${esc(time)}</td><td>${titleCell}</td><td>${status}</td></tr>`;
      })
      .join('');
    sections.push(
      `<section><h2>${esc(group.label)}</h2><table><tbody>${rows}</tbody></table></section>`,
    );
  }

  const body =
    sections.length === 0
      ? '<p class="cal-print__empty">No events.</p>'
      : sections.join('\n');

  return `<!DOCTYPE html>
<html lang="${esc(locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>${CAL_PRINT_STYLES}</style>
</head>
<body>
<h1>${esc(title)}</h1>
${body}
</body>
</html>`;
}

/**
 * Render a print document (from {@link eventsToPrintHtml}) in a hidden window and
 * invoke the browser print dialog. SSR-safe (no-op when `window` is absent).
 * Returns `true` if a print was triggered. Pass a custom `target` window to test
 * or to print into an existing popup.
 */
export function printDocument(
  html: string,
  target?: { document: Document; focus(): void; print(): void; close?: () => void } | null,
): boolean {
  const win =
    target !== undefined
      ? target
      : typeof window === 'undefined'
        ? null
        : (window.open('', '_blank') as Window | null);
  // `window.open` returns null when a popup blocker (or SSR) prevents the window.
  if (win === null) {
    return false;
  }
  const doc = win.document;
  // Trusted-Types / strict-CSP safe: parse the HTML off-document with DOMParser (which
  // neither executes scripts nor is a Trusted-Types sink) and adopt the parsed tree,
  // instead of `document.write()` / `innerHTML=` which throw a TypeError under strict CSP.
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const root = doc.documentElement;
  if (root === null) {
    doc.appendChild(doc.importNode(parsed.documentElement, true));
  } else {
    doc.replaceChild(doc.importNode(parsed.documentElement, true), root);
  }
  win.focus();
  win.print();
  return true;
}
