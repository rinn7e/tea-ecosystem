#!/usr/bin/env bash
# Hands the branch of a run of the weekly search, `discover/$DAY`, from the
# search job to the propose job (`.github/workflows/discover.yml`): it
# writes a bundle of its commits on top of `$BASE` to `$1`, and `found=true`
# to `$GITHUB_OUTPUT`, when the branch has a commit. Any other branch under
# `discover/` is named and left out, and the step then fails, so a person
# sees it; the branch of the run still goes on.
#
# Every value is read in a plain assignment, so a failing `git` stops the
# step instead of reading as "no branch".
#
# The branch is `$BRANCH`, or `discover/$DAY` when the workflow names none.
#
# Run: BASE=<commit> DAY=<YYYY-MM-DD> [BRANCH=<branch>] scripts/bundle-discovered.sh <bundle>
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

if [ "$commits" != 0 ]; then
  git bundle create --quiet "$out" "refs/heads/$branch" "^$base"
  echo "found=true" >>"${GITHUB_OUTPUT:-/dev/null}"
  echo "Bundled $commits commits of $branch."
else
  echo "No candidates this run."
fi
exit "$stray"
