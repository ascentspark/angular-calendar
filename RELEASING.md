# Releasing

Releases are **CI-only**. There is no manual `npm publish`; the only npm credential is the
`NPM_TOKEN` repository Actions secret.

## Versioning

The package **major tracks the Angular major**: `22.x.x` (current, `main`), `21.x.x`, `20.x.x`
(maintenance branches). Minor/patch are the library's own feature/fix cadence within a major.

## Cut a release

1. Land the change on the right line (`main` for the current major; cherry-pick to `21.x`/`20.x`
   newest→oldest for cross-cutting fixes).
2. Bump `version` in `projects/angular-calendar/package.json` and add a `CHANGELOG.md` entry
   (`## <version> — <ISO date>`).
3. Commit, then tag: `git tag vMAJOR.MINOR.PATCH && git push --tags`.
4. The **Release** workflow runs: `npm ci` → build → test (`TZ=UTC` and `America/New_York`) →
   lint → `npm publish --provenance` with the dist-tag derived from the major
   (`22`→`latest`, `21`→`ng21`, `20`→`ng20`).
5. Verify on npm: `npm view @ascentsparksoftware/angular-calendar dist-tags`.

## Re-publish a tag

Use the workflow's `workflow_dispatch` with the existing tag if a publish needs re-running.

## Notes

- Never run `npm publish` locally.
- Provenance requires the workflow's `id-token: write` permission (already set).
