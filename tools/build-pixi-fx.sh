#!/bin/bash
# Gera shared/vendor/pixi-fx.js (PixiJS + pixi-filters) e shared/vendor/dotlottie/. O jogo não tem node_modules: o build fica fora do repositório.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=${PIXI_FX_WORK:-$HOME/.sstcg-pixi-fx}
mkdir -p "$WORK" "$ROOT/shared/vendor/dotlottie"
cd "$WORK"
[ -f package.json ] || echo '{"private":true}' > package.json
npm install --silent --no-audit --no-fund --ignore-scripts pixi.js@8.22.0 pixi-filters@6.1.5 esbuild@0.25.12 @lottiefiles/dotlottie-web@0.82.1
node node_modules/esbuild/install.js
cp "$ROOT/tools/pixi-fx-entry.js" entry.js
npx esbuild entry.js --bundle --format=esm --minify --target=es2020 --legal-comments=none --outfile="$ROOT/shared/vendor/pixi-fx.js"
D=node_modules/@lottiefiles/dotlottie-web
npx esbuild "$D/dist/index.js" --bundle --format=esm --minify --target=es2020 --legal-comments=none --outfile="$ROOT/shared/vendor/dotlottie/dotlottie.js"
cp "$D/dist/dotlottie-player.wasm" "$ROOT/shared/vendor/dotlottie/"
cp "$D/LICENSE" "$ROOT/shared/vendor/dotlottie/LICENSE" 2>/dev/null || true
