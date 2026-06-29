# Repository hardening — multi-line release model

The library ships three release lines, one per supported Angular major: **22.x** (`main`),
**21.x**, **20.x**. Package major == Angular major. This doc describes the CI / Dependabot /
ruleset setup that protects all three lines and the runbook for cutting a maintenance branch.

## What's in place on `main` today

| Piece | File | Notes |
|-------|------|-------|
| CI (22.x) | `.github/workflows/ci.yml` | Check name **`Angular 22`** (line-specific, requireable). Builds the lib, runs the bundle-size gate, tests under `TZ=UTC` **and** `TZ=America/New_York` (DST), lints, builds the demo. |
| CodeQL | `.github/workflows/codeql.yml` | Security scanning. |
| Release | `.github/workflows/release.yml` | CI-only `npm publish --provenance` on `v*.*.*` tags; dist-tag derived from the tag's major. |
| Dependabot | `.github/dependabot.yml` | One npm entry **per line** via `target-branch`; ignores Angular-major bumps everywhere and TS-major bumps on 21.x/20.x. Plus a `github-actions` entry. |
| Ruleset (importable) | `.github/rulesets/release-lines.json` | Restrict deletions + block force-pushes, Active, admin bypass, covering `~DEFAULT_BRANCH` + `refs/heads/[0-9]*.x`. Apply with `scripts/apply-ruleset.sh`. |
| Maintenance CI templates | `.github/branch-templates/ci-21.x.yml`, `ci-20.x.yml` | Copied onto each line's branch when cut (each names its own `Angular 21` / `Angular 20` check). |

> **Why per-branch CI matters:** a workflow only runs from the branch (or PR base) that
> *contains* it. If CI lived only on `main`, PRs into `21.x`/`20.x` would run **no checks** and a
> bad Dependabot bump could merge unnoticed. Each branch therefore carries its own `ci.yml`.

## Applying the ruleset

```bash
gh auth login        # token needs `administration: write`
./scripts/apply-ruleset.sh ascentspark/angular-calendar
```

If the token lacks `administration: write` (403), create it in the UI instead:
**Settings → Rules → Rulesets → New branch ruleset**, mirroring `release-lines.json`
(target `~DEFAULT_BRANCH` + `[0-9]*.x`; enable only *Restrict deletions* and *Block force pushes*;
add Repository admin to the bypass list).

## Runbook — cutting a maintenance line (e.g. `21.x`)

1. **Branch from the release point:** `git switch -c 21.x v22.0.0` (or the last shared commit), then
   push: `git push -u origin 21.x`.
2. **Pin the Angular major:** in `projects/angular-calendar/package.json`, set
   `peerDependencies` to `^21.0.0`; set the package version to `21.0.0`; downgrade the workspace
   `@angular/*` / `ng-packagr` / `angular-eslint` devDeps to the 21 line; regenerate **that line's
   own** `package-lock.json` (never cherry-pick a lockfile across majors).
3. **Install its CI:** copy `.github/branch-templates/ci-21.x.yml` → `.github/workflows/ci.yml`
   **on the `21.x` branch** (replacing main's). Commit. Its check appears as **`Angular 21`**.
4. **Dependabot:** already configured — the `target-branch: "21.x"` entry on `main`'s
   `dependabot.yml` activates automatically once the branch exists.
5. **Ruleset:** `refs/heads/[0-9]*.x` already covers `21.x`. Optionally, once on a team flow, edit
   the ruleset to also *Require a pull request* + *Require status checks* and select the
   `Angular 21` check (keep admin in bypass).
6. **dist-tag:** releases tagged on `21.x` publish under the `ng21` npm dist-tag (see
   `release.yml`); `latest` stays on the newest major.

Repeat for `20.x` with the `ci-20.x.yml` template (Node 20).

## Cross-cutting fixes

Land on `main` (22.x) first, then cherry-pick newest→oldest (`21.x`, then `20.x`). Community files
(`README`, `SECURITY.md`, issue templates, etc.) are branch-agnostic and cherry-pick cleanly.
