#!/usr/bin/env bash
# Whether the pull request of a run of the weekly search may merge on its
# own (`scripts/propose-discovered.sh`): it prints one line for each rule a
# new entry of the commit `$2` on top of `$1` breaks, `<id>: <why>`, and
# nothing when every new entry passes. A person reviews the pull request of
# a run that breaks one.
#
# A new entry merges on its own when:
#
# - its repository has at least `MIN_STARS` stars (a project people use);
# - it was pushed to in the `MAX_IDLE_DAYS` days before the day `$DAY` of
#   the run, and its `status` is not `archived` (a project alive);
# - the agent checked every grade against its docs or source
#   (`verified: true`);
# - it has an example, `data/snippet/<id>.<ext>`, of at most
#   `MAX_EXAMPLE_LINES` lines, and the `snippetSource` it was copied from.
#
# It reads only the data of the commit: no network. The checks of the run
# (`scripts/check-discovered.sh`, the format and the tests) have passed
# before, so the ids are lowercase words joined by `-`. Needs `jq`.
#
# Run: DAY=<YYYY-MM-DD> scripts/judge-discovered.sh <base> <commit>
set -euo pipefail
# A failing command inside `$(...)` stops the script too (bash 4.4 and
# later, as on the runners of GitHub)
shopt -s inherit_errexit 2>/dev/null || { echo "$0 needs bash 4.4 or later" >&2; exit 2; }

MIN_STARS=5
MAX_IDLE_DAYS=365
MAX_EXAMPLE_LINES=90

day="${DAY:?the day of the run}"
base="${1:?the commit the run started from}"
commit="${2:?the commit of the run}"

# The new entries of the commit, one JSON object a line
new_entries="$(jq -c -n \
  --slurpfile old <(git show "$base:data/frameworks.json" "$base:data/adjacent.json") \
  --slurpfile new <(git show "$commit:data/frameworks.json" "$commit:data/adjacent.json") \
  '([$old[0][].id, $old[1][].id]) as $oldIds
   | $new[0][], $new[1][] | select(.id as $i | any($oldIds[]; . == $i) | not)')"

# The rules of the data alone, in `jq`
jq -r --arg day "$day" \
  --argjson minStars "$MIN_STARS" --argjson maxIdleDays "$MAX_IDLE_DAYS" '
  def daysBetween($a; $b):
    (($b | strptime("%Y-%m-%d") | mktime) - ($a | strptime("%Y-%m-%d") | mktime)) / 86400;
  .id as $id
  | (if (.stars // 0) < $minStars then "\($id): \(.stars // 0) stars (at least \($minStars))" else empty end),
    (if (.updatedAt | type) != "string" then "\($id): no day it was last pushed to"
     elif daysBetween(.updatedAt; $day) > $maxIdleDays then "\($id): last pushed to on \(.updatedAt), more than \($maxIdleDays) days ago"
     else empty end),
    (if .status == "archived" then "\($id): archived" else empty end),
    (if .verified != true then "\($id): grades not verified" else empty end),
    (if (.snippetSource | type) != "string" then "\($id): no snippetSource" else empty end)
  ' <<<"$new_entries"

# The example of each new entry, and its length
examples="$(git ls-tree --name-only "$commit" data/snippet/)"
for id in $(jq -r '.id' <<<"$new_entries"); do
  example="$(grep -E "^data/snippet/$id\.[a-z0-9]+$" <<<"$examples" || true)"
  if [ -z "$example" ]; then
    echo "$id: no example"
  else
    lines="$(git show "$commit:$example" | wc -l | tr -d ' ')"
    if [ "$lines" -gt "$MAX_EXAMPLE_LINES" ]; then
      echo "$id: example of $lines lines (at most $MAX_EXAMPLE_LINES)"
    fi
  fi
done
