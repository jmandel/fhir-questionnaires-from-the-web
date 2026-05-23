#!/bin/bash
# Run a list of pipe-delimited queries through google-grab.mjs sequentially.
set -u
cd /home/jmandel/hobby/intake-forms
file="${1:-/tmp/site-queries.txt}"
while IFS='|' read -r spec hint query; do
  [ -z "$spec" ] && continue
  echo "=== [$spec / $hint] $query"
  node scripts/multi-grab.mjs "$spec" "$hint" "$query"
  sleep 5
done < "$file"
echo "ALL DONE"
