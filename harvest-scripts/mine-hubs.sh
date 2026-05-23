#!/bin/bash
# Mine all hub URLs found per specialty. /tmp/hubs/<spec>.txt -> mine each URL.
set -u
cd /home/jmandel/hobby/intake-forms
dir="${1:-/tmp/hubs}"
hint="${2:-history}"
for f in "$dir"/*.txt; do
  spec=$(basename "$f" .txt)
  while read -r url; do
    [ -z "$url" ] && continue
    # skip non-clinical / template / aggregator hosts upfront
    if echo "$url" | grep -qE 'jotform|intakeq|simplepractice|formsbank|pdffiller|wpforms|sampleforms|carepatron|template\.net'; then continue; fi
    echo "=== [$spec] $url"
    timeout 45 node scripts/mine-page.mjs "$spec" "$hint" "$url" 2>&1 | grep -E '^  + |saved=' | head -25
  done < "$f"
done
echo "ALL DONE"
