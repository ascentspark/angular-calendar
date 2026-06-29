#!/usr/bin/env bash
# Apply (or update) the "Protect release lines" branch ruleset on the GitHub repo.
#
#   ./scripts/apply-ruleset.sh [owner/repo]
#
# Covers the default branch + every `NN.x` maintenance line with: restrict deletions +
# block force pushes (Active), admin bypass. These don't block a solo maintainer's
# direct-push + cherry-pick flow, but release lines can't be deleted or rewritten.
#
# Needs a token with `administration: write`. If you get a 403
# ("Resource not accessible by personal access token"), create the ruleset in the UI
# instead: Settings → Rules → Rulesets → New branch ruleset (mirror release-lines.json).
set -euo pipefail

REPO="${1:-ascentspark/angular-calendar}"
JSON="$(dirname "$0")/../.github/rulesets/release-lines.json"

existing_id="$(gh api "repos/${REPO}/rulesets" --jq '.[] | select(.name=="Protect release lines") | .id' 2>/dev/null || true)"

if [ -n "${existing_id}" ]; then
  echo "Updating existing ruleset #${existing_id} on ${REPO}…"
  gh api -X PUT "repos/${REPO}/rulesets/${existing_id}" --input "${JSON}"
else
  echo "Creating ruleset on ${REPO}…"
  gh api -X POST "repos/${REPO}/rulesets" --input "${JSON}"
fi
echo "Done."
