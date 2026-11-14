#!/usr/bin/env bash
# Hands the branch of a run of the weekly search, `discover/$DAY`, from the
# search job to the propose job (`.github/workflows/discover.yml`): it
# writes a bundle of its commits on top of `$BASE` to `$1`, and `found=true`
# to `$GITHUB_OUTPUT`, when the branch has a commit. Any other branch under
# `discover/` is named and left out, and the step then fails, so a person
# sees it; the branch of the run still goes on.
#
# The bundle is uploaded as an artifact, which any signed-in GitHub user
# can download, with the commits of the agent as they are. So the branch is
# searched first: every object the bundle would carry (each commit with its
# author and message, each tree with its file names, each file, also one a
# later commit removes) is read for the values of the key and the tokens
# of the job, as fixed strings (`scripts/check-secrets.mjs`). A branch
# that holds one is named with `::error::` and not bundled, so nothing of
# it is uploaded and no pull request is opened.
#
# Every value is read in a plain assignment, so a failing `git` stops the
# step instead of reading as "no branch".
#
# The branch is `$BRANCH`, or `discover/$DAY` when the workflow names none.
#
# Run: BASE=<commit> DAY=<YYYY-MM-DD> [BRANCH=<branch>] \
#   ANTHROPIC_API_KEY=<key> GH_TOKEN=<token> scripts/bundle-discovered.sh <bundle>
set -euo pipefail

base="${BASE:?the commit the run started from}"
day="${DAY:?the day of the run}"
out="${1:?the file to write the bundle to}"
branch="${BRANCH:-discover/$day}"

refs="$(git for-each-ref --format='%(refname:short)' 'refs/heads/discover/')"
exists="$(git for-each-ref --format='%(refname)' "refs/heads/$branch")"
commits=0
[ -z "$exists" ] || commits="$(git rev-list --count "$base..refs/heads/$branch")"

stray=0
for ref in $refs; do
  if [ "$ref" != "$branch" ]; then
    echo "::error::$ref is left out: a run proposes only its own branch, $branch"
    stray=1
  fi
done

status="$stray"
if [ "$commits" != 0 ]; then
  objects="$(mktemp)"
  trap 'rm -f "$objects"' EXIT
  # The same objects as `git bundle create` packs below
  git rev-list --objects "$base..refs/heads/$branch" | cut -d ' ' -f 1 |
    git cat-file --batch >"$objects"
  if node "$(dirname "${BASH_SOURCE[0]}")/check-secrets.mjs" "The branch $branch" <"$objects"; then
    git bundle create --quiet "$out" "refs/heads/$branch" "^$base"
    echo "found=true" >>"${GITHUB_OUTPUT:-/dev/null}"
    echo "Bundled $commits commits of $branch."
  else
    status=1
  fi
else
  echo "No candidates this run."
fi
exit "$status"
