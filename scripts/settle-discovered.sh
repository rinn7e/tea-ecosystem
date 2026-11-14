#!/usr/bin/env bash
# Settles the pull request `$1` of the weekly search, whose data is the
# commit `$3` on top of `$2`, checked already: it merges it when every new
# entry passes the rules of `scripts/judge-discovered.sh`, and otherwise
# leaves it as it is (a draft) with a comment that names each rule that
# failed, for a person to review. Rules that fail to run count as failed,
# never as passed. Used by `scripts/propose-discovered.sh` right after it
# opens the pull request of a run, and by `scripts/settle-pull-request.sh`
# for one opened before.
#
# A merge made with the token of a workflow starts no other workflow, so
# after a merge it starts the Pages workflow itself. The comment holds only
# ids, numbers and days of the data, which the guard has checked: GitHub
# turns none of it into a mention or a reference. Needs `gh` (`GH_TOKEN`,
# `GH_REPO`).
#
# Run: DAY=<YYYY-MM-DD> scripts/settle-discovered.sh <pull request> <base> <commit>
set -euo pipefail
# A failing command inside `$(...)` stops the script too (bash 4.4 and
# later, as on the runners of GitHub)
shopt -s inherit_errexit 2>/dev/null || { echo "$0 needs bash 4.4 or later" >&2; exit 2; }

url="${1:?the pull request}"
on="${2:?the base}"
commit="${3:?the commit of the data}"
here="$(dirname "$0")"

if ! broken="$("$here/judge-discovered.sh" "$on" "$commit")"; then
  broken="the rules failed to run"
fi
if [ -z "$broken" ]; then
  # Already ready when a person marked it so; the merge fails if it is not
  gh pr ready "$url" || true
  gh pr merge "$url" --merge --delete-branch
  gh workflow run pages.yml --ref master
  echo "Merged it: every candidate passed the rules."
else
  {
    echo 'Left for a person to review: not every candidate passed the rules that let the weekly search merge on its own (`scripts/judge-discovered.sh`).'
    echo
    echo '```text'
    echo "$broken"
    echo '```'
  } | gh pr comment "$url" --body-file -
  echo "Left it for a person: $(wc -l <<<"$broken" | tr -d ' ') rules failed."
fi
