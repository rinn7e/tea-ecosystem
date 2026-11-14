#!/usr/bin/env bash
# Why the data of the commit `$2` on top of `$1` cannot go into the
# catalog, or nothing when it can: the guard of the weekly search
# (`scripts/check-discovered.sh`, with at most `$3` entries dated on the day
# `$4`), then `pnpm run format:check` and `pnpm run test` on that commit,
# without the token. Used by `scripts/propose-discovered.sh` before it opens
# the pull request of a run, and by `scripts/settle-pull-request.sh` before
# it settles one.
#
# Only the data differs from the base, which the guard has checked, so the
# checks run the code of the base. Their output goes to the log, not into
# the answer, with the workflow commands of GitHub turned off, so a line of
# the data in it is never read as one. A check that fails to run counts as
# a problem, never as a pass. It leaves the checkout detached at `$2`.
#
# Run: scripts/recheck-discovered.sh <base> <commit> <max> <day>
set -euo pipefail
# A failing command inside `$(...)` stops the script too (bash 4.4 and
# later, as on the runners of GitHub)
shopt -s inherit_errexit 2>/dev/null || { echo "$0 needs bash 4.4 or later" >&2; exit 2; }

on="${1:?the base}"
commit="${2:?the commit to check}"
max="${3:?the most entries}"
day="${4:?the day of the run}"
here="$(dirname "$0")"

if ! problem="$("$here/check-discovered.sh" "$on" "$commit" "$max" "$day")"; then
  echo "its checks failed to run"
elif [ -n "$problem" ]; then
  echo "$problem"
else
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
