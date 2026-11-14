#!/usr/bin/env bash
# Prints why the commit `$2`, the tip of what a run of the weekly search of
# the day `$4` found, cannot become a pull request on top of the commit
# `$1`, or nothing when it can. Only its final data counts: the commits in
# between, their messages and their authors never leave the run
# (`scripts/propose-discovered.sh` makes a fresh commit of the data). The
# data comes from an agent that read untrusted pages, so nothing of it is
# run here, and nothing of it reaches a command line or a pattern
# unchecked. Against `$1`, it must:
#
# - add from 1 to `$3` entries to `data/frameworks.json` and
#   `data/adjacent.json`, and leave every existing entry as it was and
#   where it was, in its file;
# - give each new entry an id of lowercase words joined by `-`, a time in
#   UTC of the day `$4` (`$4THH:MM:SSZ`) as its `discoveredAt`, and a
#   `repo` of one line that starts with `https://`;
# - change no other file, but add at most one example for each new entry,
#   `data/snippet/<id>.<ext>`, as a plain file (no rename, no change to
#   another example, no link).
#
# `scripts/propose-discovered.sh` runs it, then the checks of the
# repository. Needs `jq`.
#
# Run: scripts/check-discovered.sh <base> <tip> <most entries> <day>
set -euo pipefail
# A failing command inside `$(...)` stops the script too (bash 4.4 and
# later, as on the runners of GitHub)
shopt -s inherit_errexit 2>/dev/null || { echo "$0 needs bash 4.4 or later" >&2; exit 2; }

base="$1"
tip="$2"
max="$3"
day="$4"

# Every value is read in a plain assignment, which stops the script when its
# command fails (a failure inside a test would not)

# The entries of the tip against those of the base, file by file: the
# existing ones, kept in the same order and unchanged, and the new ones. The
# files go to `jq` as files, not as arguments: the catalog is larger than
# the limit of one argument on Linux. `\A` and `\z` are the ends of a text,
# where `$` would also match before a last line break.
entries="$(jq -n --arg day "$day" \
  --slurpfile old <(git show "$base:data/frameworks.json" "$base:data/adjacent.json") \
  --slurpfile new <(git show "$tip:data/frameworks.json" "$tip:data/adjacent.json") \
  '([$old[0][].id, $old[1][].id]) as $oldIds
   | def kept($file): [$file[] | select(.id as $i | any($oldIds[]; . == $i))];
   [$new[0][], $new[1][] | select(.id as $i | any($oldIds[]; . == $i) | not)] as $added
   | { kept: (kept($new[0]) == $old[0] and kept($new[1]) == $old[1]),
       count: ($added | length),
       bad: [$added[]
         | select(
             ((.id | type) != "string" or (.id | test("\\A[a-z0-9]+(-[a-z0-9]+)*\\z") | not))
             or ((.discoveredAt | type) != "string"
               or (.discoveredAt | test("\\A" + $day + "T[0-9]{2}:[0-9]{2}:[0-9]{2}Z\\z") | not))
             or ((.repo | type) != "string" or (.repo | test("\\Ahttps://\\S+\\z") | not)))
         | .id],
       ids: [$added[].id | tostring] }' 2>/dev/null || true)"

if [ -z "$entries" ]; then
  echo "its data files do not read as JSON"
else
  kept="$(jq '.kept' <<<"$entries")"
  count="$(jq '.count' <<<"$entries")"
  bad="$(jq -c '.bad' <<<"$entries")"
  if [ "$kept" != true ]; then
    echo "it changes, moves or removes existing entries"
  elif [ "$count" = 0 ] || [ "$count" -gt "$max" ]; then
    echo "it adds $count entries, not 1 to $max"
  elif [ "$bad" != "[]" ]; then
    echo "its new entries need an id of lowercase words joined by -, a discoveredAt at a time of $day and a repo of one line that starts with https://: $bad"
  else
    # The ids are checked, so they may go into a pattern: one alternative
    # each
    alternatives="$(jq -r '.ids | join("|")' <<<"$entries")"
    # Each file with its status, a rename as a deletion and an addition
    files="$(git diff --name-status --no-renames "$base" "$tip")"
    # The ids with more than one example
    examples="$(grep -E '^A[[:space:]]+data/snippet/' <<<"$files" || true)"
    doubled="$(sed -E 's#^A[[:space:]]+data/snippet/##; s#\.[^.]*$##' <<<"$examples" | sed '/^$/d' | sort | uniq -d)"
    # The modes of the files it adds or changes: a plain file is `100644`
    modes="$(git diff --raw --no-renames "$base" "$tip" | awk '{ print $2 }' | sort -u)"
    if outside="$(grep -v -E "^M[[:space:]]+data/(frameworks|adjacent)\.json$|^A[[:space:]]+data/snippet/($alternatives)\.[a-z0-9]+$" <<<"$files")"; then
      echo "it changes files outside the data of its entries: $(tr '\n\t' '  ' <<<"$outside")"
    elif [ -n "$doubled" ]; then
      echo "it adds more than one example for: $(tr '\n' ' ' <<<"$doubled")"
    elif [ "$modes" != 100644 ]; then
      echo "it adds a file that is not a plain file (mode $(tr '\n' ' ' <<<"$modes"))"
    fi
  fi
fi
