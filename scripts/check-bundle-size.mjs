#!/usr/bin/env node
/**
 * Bundle-size budget gate (SPEC §13). Fails CI if any built FESM bundle exceeds
 * its gzipped budget. Run after `ng build angular-calendar`.
 */
import { gzipSync } from 'node:zlib';
import { readFileSync, existsSync } from 'node:fs';

const DIST = 'dist/angular-calendar/fesm2022';

// Gzipped budgets in KB. The primary bundle carries every view + the recurrence
// editor; consumers tree-shake to what they import. Secondary entries are tiny.
const BUDGETS = [
  { file: 'ascentsparksoftware-angular-calendar.mjs', kb: 48 },
  { file: 'ascentsparksoftware-angular-calendar-date-fns.mjs', kb: 6 },
  { file: 'ascentsparksoftware-angular-calendar-recurrence.mjs', kb: 6 },
  { file: 'ascentsparksoftware-angular-calendar-export.mjs', kb: 6 },
];

let failed = false;
for (const { file, kb } of BUDGETS) {
  const path = `${DIST}/${file}`;
  if (!existsSync(path)) {
    console.error(`✗ missing ${path} (run \`ng build angular-calendar\` first)`);
    failed = true;
    continue;
  }
  const gz = gzipSync(readFileSync(path)).length;
  const budget = kb * 1024;
  const status = gz <= budget ? '✔' : '✗';
  console.log(`${status} ${file}: ${(gz / 1024).toFixed(1)} KB gzip (budget ${kb} KB)`);
  if (gz > budget) {
    failed = true;
  }
}

if (failed) {
  console.error('\nBundle-size budget exceeded.');
  process.exit(1);
}
console.log('\nAll bundles within budget.');
