#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

required=(
  index.html
  sw.js
  version.json
  manifest.webmanifest
  config.json
  .htaccess
  robots.txt
  google-apps-script/Code.gs
  google-apps-script/README-BACKEND-SETUP.md
  badbin/index.html
  badbin/.htaccess
  badbin/manifest.webmanifest
  badbin/robots.txt
  badbin/assets/index-Final20260916.js
  badbin/assets/index-CktYb_0n.css
  badbin/assets/badbin-flow-atlas.webp
  badbin/assets/badbin-paper-grain.webp
  badbin/assets/badbin-route-mark.webp
  badbin/assets/badbin-route-texture.webp
)

for file in "${required[@]}"; do
  test -f "$ROOT/$file" || { echo "Missing: $file" >&2; exit 1; }
done
echo "All ${#required[@]} required files verified."

if command -v node >/dev/null 2>&1; then
  node --check "$ROOT/sw.js"
  node -e "new Function(require('fs').readFileSync('$ROOT/google-apps-script/Code.gs', 'utf8'))"
  node --check "$ROOT/badbin/assets/index-Final20260916.js"
  node -e "JSON.parse(require('fs').readFileSync('$ROOT/version.json'))"
  node -e "JSON.parse(require('fs').readFileSync('$ROOT/manifest.webmanifest'))"
  node -e "const cfg=JSON.parse(require('fs').readFileSync('$ROOT/config.json')); if (cfg.ENVIRONMENT !== 'production') throw new Error('config.json must be production'); console.log('Production config valid.')"
  echo "JavaScript syntax and JSON schemas valid."
else
  echo "Note: Node.js not detected in Linux environment; on Windows run ./validate-release.ps1"
fi

if grep -qE 'Repared|IMIE|dissimilariteis|UNKNWN' "$ROOT/badbin/assets/index-Final20260916.js"; then
  echo 'Known seed-data typo remains' >&2
  exit 1
fi

if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server 4174 --bind 127.0.0.1 --directory "$ROOT" >/dev/null 2>&1 &
  server_pid=$!
  trap 'kill "$server_pid" 2>/dev/null || true' EXIT
  sleep 2
  for path in / /index.html /sw.js /version.json /manifest.webmanifest /badbin/ /badbin/index.html /badbin/assets/index-Final20260916.js /badbin/assets/index-CktYb_0n.css; do
    code=$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:4174$path" || echo "000")
    if [ "$code" = "200" ]; then
      echo "  [OK 200] $path"
    fi
  done
fi

echo "Release validation passed."
