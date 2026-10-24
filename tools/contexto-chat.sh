#!/bin/sh
# Junta o contexto de regras num arquivo só, para colar ou anexar num chat novo.
# Uso (da raiz do projeto): sh tools/contexto-chat.sh  ->  card-forge/out/contexto-chat-regras-completo.md
set -e
cd "$(dirname "$0")/.."
out=card-forge/out/contexto-chat-regras-completo.md
mkdir -p card-forge/out
{
  cat docs/contexto-chat-regras.md
  for f in docs/guia-do-jogo.md docs/CHANGELOG-regras.md docs/beta-athena.md; do
    printf '\n\n---\n\n# Anexo: %s\n\n' "$f"
    cat "$f"
  done
} > "$out"
echo "$out"
