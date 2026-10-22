# Card Forge

Editor de cartas no navegador (vanilla JS, sem build). Monta a carta no canvas nativo 1488×2091 (2.5×3.5 in, ~595 dpi) com as peças extraídas dos PSDs.

## Abrir

Na raiz do projeto:

```bash
python3 card-forge/serve.py
```

Depois abra `http://localhost:8765/card-forge/` (ou `?card=athena-021` para abrir direto numa carta). O servidor só escuta em 127.0.0.1. Ele não faz parte do site público.

## O que faz

- Carrega qualquer carta de `data/cards.json`, ou cria uma nova (botão "Nova carta").
- Edita nome, título, subtítulo, custo, tipo, subtipos, regras, Power/Resistance, bônus, Equip/Damage, Soul/Attack/Awaken, raridade, facção e flavour.
- Arte: envie ou solte uma imagem sobre a carta, arraste para mover e use a roda do mouse para zoom. Se existir `ARTS/<mesmo nome do PNG>`, a arte entra sozinha.
- Regras: linha em branco separa habilidades. `**negrito**`. `{C}` Cosmo, `{B}` Base Cosmo e `{L}` Latent Cosmo viram ícones. Keywords de uma palavra (Pierce, Nimble…) saem em negrito maiúsculo.
- "Sobrepor PNG original" põe o PNG de `CARDS/` por cima para comparar.
- Export: PNG alta 1488×2091 e PNG web 1100×1546.
- "Salvar projeto" grava em `card-forge/projects/<id>.json` o que não existe no cards.json: título na carta, subtítulo, flavour e enquadramento da arte. Arte enviada vai para `card-forge/art/` (fora do git).
- "Gravar no cards.json…" mostra o diff campo a campo e só grava depois de confirmar. Só o bloco daquela carta muda no arquivo. Habilidades que você não editou mantêm o texto original.

## Templates

- `CARD-TEMPLATE/templates.json`: layouts por tipo (devotee, relic_cloth, relic_weapon, relic para Relic/Technique/Moment/Domain, e god). Cada layout tem a posição de cada região.
- `CARD-TEMPLATE/pieces.json`: posição de cada peça PNG e de qual PSD/camada ela saiu.
- Re-extrair as peças (só lê `FRAMES/`):

```bash
uv run --with psd-tools --with pillow --with scipy python card-forge/tools/extract_template.py
```

- Auto-teste do gravador do cards.json:

```bash
python3 card-forge/serve.py --selftest
```

## Limites conhecidos

- Fontes: o PSD usa Futura100 LXT BoldOblique e ITC Avant Garde Pro, que não estão instaladas. O editor cai em Futura/Avenir do macOS, e o título sai um pouco mais estreito.
- Efeitos de camada (brilho, sombra, bevel) são aproximados no canvas. O bevel não é reproduzido.
- 14 smart objects vinculados (`.ai`) não existem no disco: `SlksHc.tif.ai`, `tbpBDu.tif.ai`, `Arte 3/4/6/7/8/9/10/11/13/16/24/27.ai`. As peças saíram da prévia raster salva dentro do PSD, então são bitmap, não vetor. A lista fica em `pieces.json → linked_missing`.
- Hades: o `HADES.psd` não tem símbolo próprio (só o capacete de Ares, oculto). Falta o símbolo de Hades.
- God: layout simplificado; o bloco Awaken entra no texto de regras.
