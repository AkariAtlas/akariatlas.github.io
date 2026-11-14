#!/bin/bash
# Akari Atlas build: splash + errlog stay separate (they must run first), everything else → one minified bundle akari.js
set -e; cd "$(dirname "$0")"; ES=/home/claude/tools/node_modules/.bin/esbuild
ORDER="net trips app nav pdf app2 plan talk extras sched sync2 import features explore2 stays live itin dnd compare wear onboard guide layout2 a11y selftest"
for n in splash errlog; do $ES src/$n.js --minify-whitespace --minify-syntax --target=es2020 --log-level=warning --outfile=$n.js; done
: > /tmp/akari.src.js; for n in $ORDER; do printf '\n/* ==== %s ==== */\n' $n >> /tmp/akari.src.js; cat src/$n.js >> /tmp/akari.src.js; printf '\n;\n' >> /tmp/akari.src.js; done
node --check /tmp/akari.src.js
$ES /tmp/akari.src.js --minify-whitespace --minify-syntax --target=es2020 --log-level=warning --outfile=akari.js; node --check akari.js
for n in $ORDER; do rm -f $n.js; done
V=$(date +%y%m%d%H%M); sed -i -E "s/\?v=[0-9a-z]+/?v=$V/g" index.html; sed -i -E "s/const C='[^']+'/const C='ak-$V'/" sw.js; echo "built $V · $(wc -c < akari.js) bytes"
