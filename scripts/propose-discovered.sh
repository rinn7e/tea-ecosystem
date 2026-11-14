#!/usr/bin/env bash
# Opens the draft pull request of a run of the weekly search of the day
# `$DAY` (`.github/workflows/discover.yml`), from what the agent left on
# the branch `discover/$DAY`, in a fresh checkout of the base `$BASE`.
#
# No commit of the agent is ever pushed: its messages, its authors and the
# states in between never leave the run. The script takes only the final
# data of the branch, checks it (`scripts/check-discovered.sh`), and makes
# one fresh commit of it on the base, with a message and an author of its
# own. The commit is the same on every try of a run (its date is the day
# of the run), so a try that pushed it and failed to open the pull request
# is finished by the next one, which fetches it from GitHub and needs
# nothing else of the search job.
#
# Before anything, `scripts/gate-discovered.sh` decides whether the run
# may propose at all. Then `pnpm run format:check` and `pnpm run test` run
# on the fresh commit, without the token. The text of the pull request is
# built from the data: one heading per new id, its entry as code, where
# GitHub turns no `@name`, `#12` or link into a mention or a reference.
# Needs `gh` (`GH_TOKEN`, `GH_REPO`) and `jq`.
#
# Run: BASE=<commit> DAY=<YYYY-MM-DD> scripts/propose-discovered.sh
set -euo pipefail
# A failing command inside `$(...)` stops the script too (bash 4.4 and
# later, as on the runners of GitHub)
shopt -s inherit_errexit 2>/dev/null || { echo "$0 needs bash 4.4 or later" >&2; exit 2; }

base="${BASE:?the commit the run started from}"
day="${DAY:?the day of the run}"
max="${MAX_CANDIDATES:-3}"
repo_url="https://x-access-token:${GH_TOKEN:?a token that may push and open pull requests}@github.com/${GITHUB_REPOSITORY:?owner/name}.git"
here="$(dirname "$0")"
branch="discover/$day"

# The fresh commit of the data of `$2` on top of `$1`: the two data files
# and the examples it adds, each a plain file, with a message and an author
# of the script, dated the day of the run
fresh_commit_of() {
  local on="$1" from="$2" index examples path blob ids tree
  index="$(mktemp)"
  examples="$(git diff --name-only --no-renames --diff-filter=A "$on" "$from" -- data/snippet/)"
  ids="$(new_ids_of "$on" "$from" | paste -s -d ',' - | sed 's/,/, /g')"
  GIT_INDEX_FILE="$index" git read-tree "$on"
  for path in data/frameworks.json data/adjacent.json $examples; do
    blob="$(git rev-parse "$from:$path")"
    GIT_INDEX_FILE="$index" git update-index --add --cacheinfo "100644,$blob,$path"
  done
  tree="$(GIT_INDEX_FILE="$index" git write-tree)"
  rm -f "$index"
  GIT_AUTHOR_NAME='github-actions[bot]' \
    GIT_AUTHOR_EMAIL='41898282+github-actions[bot]@users.noreply.github.com' \
    GIT_COMMITTER_NAME='github-actions[bot]' \
    GIT_COMMITTER_EMAIL='41898282+github-actions[bot]@users.noreply.github.com' \
    GIT_AUTHOR_DATE="${day}T00:00:00Z" \
    GIT_COMMITTER_DATE="${day}T00:00:00Z" \
    git commit-tree "$tree" -p "$on" \
    -m "Add the entries the weekly search found on $day" \
    -m "Entries: $ids."
}

# The ids of the entries `$2` adds to `$1`, one a line, checked already
new_ids_of() {
  jq -r -n \
    --slurpfile old <(git show "$1:data/frameworks.json" "$1:data/adjacent.json") \
    --slurpfile new <(git show "$2:data/frameworks.json" "$2:data/adjacent.json") \
    '([$old[0][].id, $old[1][].id]) as $oldIds
     | $new[0][], $new[1][] | select(.id as $i | any($oldIds[]; . == $i) | not) | .id'
}

# Why the commit `$2` on top of `$1` cannot be proposed, or nothing when it
# can
problem_of() {
  local on="$1" commit="$2" problem marker
  # A check that fails to run counts as a problem, never as a pass
  if ! problem="$("$here/check-discovered.sh" "$on" "$commit" "$max" "$day")"; then
    echo "its checks failed to run"
  elif [ -n "$problem" ]; then
    echo "$problem"
  else
    # Only the data differs from the base, so these run the code of the
    # base. Their output goes to the log, not into the problem, with the
    # workflow commands of GitHub turned off, so a line of the data in it
    # is never read as one
    marker="stop-$(date +%s)-$RANDOM$RANDOM"
    echo "::stop-commands::$marker" >&2
    if ! git switch --quiet --detach "$commit"; then
      echo "it cannot be checked out"
    elif ! env -u GH_TOKEN pnpm run format:check >&2; then
      echo "pnpm run format:check fails"
    elif ! env -u GH_TOKEN pnpm run test >&2; then
      echo "pnpm run test fails"
    fi
    echo "::$marker::" >&2
  fi
}

# The text of the pull request of the commit `$2` on top of `$1`: each new
# entry under a heading of its id, as code, a run of three backticks in it
# broken up, so it cannot end its block
body_of() {
  local id
  echo "The weekly search of $day found these entries."
  if [ -n "${GITHUB_RUN_ID:-}" ]; then
    echo "Its report, with where each one was found and what it could not check, is in the summary of the run: ${GITHUB_SERVER_URL:-https://github.com}/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID"
  fi
  echo
  for id in $(new_ids_of "$1" "$2"); do
    echo "## $id"
    echo
    echo '```json'
    jq --arg id "$id" '.[] | select(.id == $id)' \
      <(git show "$2:data/frameworks.json") <(git show "$2:data/adjacent.json") |
      sed 's/```/` ` `/g'
    echo '```'
    echo
  done
  echo 'A person reviews these entries before they are merged. To turn one down, remove its entry and its example from this pull request and add its repository to `data/rejected.json` with the day and the reason, then run `pnpm run test` on the branch. To turn them all down, close this pull request and add each one there.'
}

# Every value read from a command is read in a plain assignment, which stops
# the run when the command fails
gate="$("$here/gate-discovered.sh" "${RUNNER_TEMP:-/tmp}/discover-proposed.json")"

if [[ "$gate" == skip:* ]]; then
  echo "::warning::$branch is skipped: ${gate#skip: }"
  exit 0
elif [[ "$gate" == pushed\ * ]]; then
  # An earlier try pushed the fresh commit and failed to open its pull
  # request: its commit, from GitHub, on top of its own base
  pushed="${gate#pushed }"
  if ! git fetch --quiet "$repo_url" "refs/heads/$branch"; then
    echo "::error::$branch cannot be fetched from GitHub"
    exit 1
  fi
  fetched="$(git rev-parse FETCH_HEAD)"
  parents="$(git rev-parse "$fetched^@")"
  parent_count="$(wc -w <<<"$parents" | tr -d ' ')"
  if [ "$fetched" != "$pushed" ] || [ "$parent_count" != 1 ]; then
    echo "::error::$branch on GitHub is not one commit of the search: a person deletes it"
    exit 1
  fi
  on="$parents"
  commit="$fetched"
else
  has_branch="$(git for-each-ref --format='%(objectname)' "refs/heads/$branch")"
  if [ -z "$has_branch" ]; then
    echo "::error::there is no branch $branch to propose"
    exit 1
  fi
  # The data of the branch is checked before a commit is made of it; a
  # check that fails to run counts as a problem, never as a pass
  if ! problem="$("$here/check-discovered.sh" "$base" "$has_branch" "$max" "$day")"; then
    problem="its checks failed to run"
  fi
  if [ -n "$problem" ]; then
    echo "::error::$branch is left out: $problem"
    exit 1
  fi
  on="$base"
  commit="$(fresh_commit_of "$base" "$has_branch")"
fi

problem="$(problem_of "$on" "$commit")"
if [ -n "$problem" ]; then
  echo "::error::$branch is left out: $problem"
  exit 1
fi

count="$(new_ids_of "$on" "$commit" | wc -l | tr -d ' ')"
body="$(body_of "$on" "$commit")"
# The most GitHub takes in the text of a pull request
if [ "${#body}" -gt 65000 ]; then
  echo "::error::$branch is left out: the text of its pull request is longer than GitHub takes"
  exit 1
fi
[ "$gate" != go ] || git push --quiet "$repo_url" "$commit:refs/heads/$branch"
gh pr create --draft --base master --head "$branch" \
  --title "Add the entries the weekly search found on $day" --body-file - <<<"$body"
echo "Proposed $count candidates in one pull request."
