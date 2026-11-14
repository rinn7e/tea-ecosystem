#!/usr/bin/env bash
# Settles an open pull request of the weekly search by its number, `$1`
# (`.github/workflows/settle-discovered.yml`, started by hand): the same
# checks and the same rules as a run right after it opens its pull request,
# for one that was opened before (by an older version of the search) or
# that a person edited since.
#
# It takes only a pull request of this repository from a branch of the
# search, `discover/<day>` or `discover/<day>-<run>`, whose head is the
# commit it fetches. Its data is the head on top of the commit it shares
# with `master`; the guard, the format and the tests check that data
# (`scripts/recheck-discovered.sh`, the checkout left detached at the head)
# before `scripts/settle-discovered.sh` merges it or comments on it. Needs
# `gh` (`GH_TOKEN`, `GH_REPO`), `jq`, and a checkout of `master`.
#
# Run: scripts/settle-pull-request.sh <number>
set -euo pipefail
# A failing command inside `$(...)` stops the script too (bash 4.4 and
# later, as on the runners of GitHub)
shopt -s inherit_errexit 2>/dev/null || { echo "$0 needs bash 4.4 or later" >&2; exit 2; }

number="${1:?the number of the pull request}"
max="${MAX_CANDIDATES:-3}"
repo_url="https://x-access-token:${GH_TOKEN:?a token that may merge and comment}@github.com/${GITHUB_REPOSITORY:?owner/name}.git"
here="$(dirname "$0")"

if [[ ! "$number" =~ ^[0-9]+$ ]]; then
  echo "::error::$number is not the number of a pull request"
  exit 1
fi

info="$(gh pr view "$number" --json url,state,isCrossRepository,headRefName,headRefOid)"
url="$(jq -r '.url' <<<"$info")"
state="$(jq -r '.state' <<<"$info")"
cross="$(jq -r '.isCrossRepository' <<<"$info")"
branch="$(jq -r '.headRefName' <<<"$info")"
head="$(jq -r '.headRefOid' <<<"$info")"

if [ "$state" != OPEN ]; then
  echo "::error::pull request $number is $state, not open"
  exit 1
elif [ "$cross" != false ]; then
  echo "::error::pull request $number comes from a fork, not from the search"
  exit 1
elif [[ ! "$branch" =~ ^discover/([0-9]{4}-[0-9]{2}-[0-9]{2})(-[0-9]+)?$ ]]; then
  echo "::error::pull request $number is not from a branch of the search (discover/<day>)"
  exit 1
fi
day="${BASH_REMATCH[1]}"

git fetch --quiet "$repo_url" "refs/heads/$branch"
commit="$(git rev-parse FETCH_HEAD)"
if [ "$commit" != "$head" ]; then
  echo "::error::$branch moved while it was read: start again"
  exit 1
fi
if ! on="$(git merge-base HEAD "$commit")"; then
  echo "::error::$branch shares no commit with master here (a shallow checkout, or another history)"
  exit 1
fi

problem="$("$here/recheck-discovered.sh" "$on" "$commit" "$max" "$day")"
if [ -n "$problem" ]; then
  echo "::error::pull request $number is left as it is: $problem"
  exit 1
fi

DAY="$day" "$here/settle-discovered.sh" "$url" "$on" "$commit"
