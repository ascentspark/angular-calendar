# Releasing

Releases are **CI-only** and use **npm OIDC trusted publishing** — there is **no npm token** and
no manual `npm publish`. GitHub Actions authenticates to npm with a short-lived OIDC token, so npm
must have a **Trusted Publisher** configured for this package (npmjs.com → the package →
Settings → Trusted Publisher → GitHub Actions → repo `ascentspark/angular-calendar`, workflow
`release.yml`). Published artifacts carry provenance.

## Versioning

The package **major tracks the Angular major**: `22.x.x` (current, `main`), `21.x.x`, `20.x.x`
(maintenance branches). Minor/patch are the library's own feature/fix cadence within a major.

## Cut a release

1. Land the change on the right line (`main` for the current major; cherry-pick to `21.x`/`20.x`
   newest→oldest for cross-cutting fixes).
2. Bump `version` in `projects/angular-calendar/package.json` and add a `CHANGELOG.md` entry
   (`## <version> — <ISO date>`). Commit and push the branch.
3. Run the **Release** workflow from that branch: GitHub → Actions → **Release** → *Run workflow*
   (or `gh workflow run release.yml --ref <branch>`).
4. The workflow derives the npm **dist-tag from the branch** (`main`→`latest`, `21.x`→`ng21`,
   `20.x`→`ng20`), verifies the version major matches the line, builds + runs the bundle-size gate,
   `npm publish --provenance --access public`, then tags the commit and cuts a GitHub Release
   (maintenance lines are marked non-latest so they never displace `latest`).
5. Verify: `npm view @ascentsparksoftware/angular-calendar dist-tags`.

## Notes

- Never run `npm publish` locally.
- Provenance + trusted publishing require the workflow's `id-token: write` permission (set).
- First-ever publish: the npm Trusted Publisher must exist before the workflow can authenticate.
