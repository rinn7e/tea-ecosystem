#!/usr/bin/env bash
# Decides whether the run of the weekly search of the day `$DAY` may
# propose (`.github/workflows/discover.yml`). It prints one line:
#
# - `go`: it may;
# - `pushed <commit>`: the branch of the run (`$BRANCH`, `discover/$DAY`
#   unless the workflow names another) is already on GitHub at that commit,
#   with no pull request (a run that pushed, then failed to open it, for
#   example before Actions was allowed to create pull requests): the
#   propose job opens its pull request when it holds the same commit;
# - `skip: <reason>`: it may not.
#
# Both jobs run it: the search job before the agent, so a run that may not
# propose spends nothing (it starts the agent on `go` only), and the propose
# job before it pushes. It also writes the pull requests the search opened
# before (open, merged or closed) to `$1`, for the agent to skip their
# candidates.
#
# Only the pull requests of this repository count: one from a fork comes
# from anyone, whatever its branch is called. A run may not propose when:
#
# - an earlier pull request of the search is still open (a person merges
#   or closes it first, so two never conflict);
# - a pull request was already opened from the branch of the run (a run
#   of the same day that a person merged or closed). A run started by hand
#   has a branch of its own (`discover/$DAY-<run number>`), so it is held
#   back only by an open pull request.
#
# Every value is read in a plain assignment, so a failing `gh` or `git`
# stops the script instead of reading as "nothing proposed yet". Needs `gh`
# (`GH_TOKEN`, `GH_REPO`) and `jq`.
#
# Run: DAY=<YYYY-MM-DD> [BRANCH=<branch>] scripts/gate-discovered.sh <proposed.json>
set -euo pipefail

day="${DAY:?the day of the run}"
proposed="${1:?the file to write the proposed pull requests to}"
repo_url="https://x-access-token:${GH_TOKEN:?a token that may read the repository}@github.com/${GITHUB_REPOSITORY:?owner/name}.git"
branch="${BRANCH:-discover/$day}"

all="$(gh pr list --state all --limit 1000 \
  --json number,headRefName,state,isCrossRepository,title,body,url)"
# The pull requests of the search: from a branch `discover/` of this
# repository
jq '[.[] | select((.isCrossRepository | not) and (.headRefName | startswith("discover/")))]' \
  <<<"$all" >"$proposed"
open="$(jq '[.[] | select(.state == "OPEN")] | length' "$proposed")"
from_branch="$(jq --arg branch "$branch" '[.[] | select(.headRefName == $branch)] | length' "$proposed")"
remote="$(git ls-remote --heads "$repo_url" "refs/heads/$branch")"

if [ "$open" != 0 ]; then
  echo "skip: an earlier pull request of the search is still open"
elif [ "$from_branch" != 0 ]; then
  echo "skip: a pull request was already opened from $branch"
elif [ -n "$remote" ]; then
  echo "pushed $(cut -f 1 <<<"$remote")"
else
  echo go
fi
