# Card Forge — instruções para agentes (Codex, Claude, etc.)

Editor de cartas do Saint Seiya TCG no navegador. Vanilla JS, sem build e sem dependências. Leia o `README.md` desta pasta antes de mexer.

## Rodar

Na raiz do projeto:

```bash
python3 card-forge/serve.py
```

Abra `http://localhost:8765/card-forge/`. O `serve.py` só usa a stdlib e só escuta em 127.0.0.1.

Auto-teste do gravador do cards.json (rode depois de mexer em `serve.py`):

```bash
python3 card-forge/serve.py --selftest
```

## Mapa

- `index.html`, `forge.css`, `forge.js`: a UI e o renderizador. Desenha no canvas nativo 1488×2091.
- `serve.py`: serve arquivos estáticos e grava edições: `/api/card`, `/api/cards`, `/api/project/<id>`, `/api/art/<id>` e `/api/export/<nome>`.
- `tools/extract_template.py`: extrai as peças PNG dos PSDs. Só lê `FRAMES/`.

```bash
uv run --with psd-tools --with pillow --with scipy python card-forge/tools/extract_template.py
```

- `../CARD-TEMPLATE/templates.json`: layouts por tipo de carta e pacotes de facção (cor, brilho, moldura). Coordenadas no canvas 1488×2091.
- `../CARD-TEMPLATE/pieces.json`: posição e origem (PSD :: camada) de cada peça.
- `projects/<id>.json`: dados que não existem no cards.json (título na carta, subtítulo, flavour, enquadramento da arte).
- `import/modelo.txt`: formato do lote (várias cartas num `.txt`).

## Regras

- **Nunca edite, mova ou renomeie** nada em `FRAMES/`, `ARTS/` ou `CARDS/`. Os PSDs têm smart objects vinculados que quebram se as pastas mudarem.
- **`data/cards.json`:** só grave depois que o usuário aprovar um diff. Use `serve.py` (`upsert_card`): ele mantém o formato do arquivo e muda só o bloco da carta.
- **`playtest/`:** em 23/10/2026, o autor autorizou expressamente aplicar o Rulebook 2.0 e modificar o jogo neste chat. Essa autorização permite a migração local; não inclui publicar no domínio nem fazer push/deploy sem pedido específico.
- **O editor não vai para o site público** sem o usuário pedir.
- **Idioma:** notas e comentários em português; texto visível na carta em inglês.
- **Saídas fora do git:** `card-forge/out/` (PNGs exportados) e `card-forge/art/` (artes enviadas). Arte pesada e PSD também ficam só no Google Drive (veja `.gitignore`).

## Representações da carta

- **Diretriz confirmada pelo autor em 2026-10-23:** cada carta tem uma representação final para impressão e uma representação interativa para o jogo. Consulte `../docs/cartas-print-e-interativas.md`.
- A versão de impressão pode ser uma composição achatada em PNG/PDF, produzida pelo canvas.
- No jogo, use a ilustração como fundo. Nome, tipo, custo, regras, atributos e estados são camadas próprias, renderizadas a partir dos dados da carta e do estado da partida. Não use o PNG completo de impressão como corpo da carta jogável.
- Molduras, ornamentos e ícones podem continuar usando as peças visuais existentes. As duas representações compartilham ID, revisão, dados e ilustração; não mantenha duas cópias independentes do texto ou das regras.
- Mudanças válidas de atributos e estados devem aparecer durante a partida sem reexportar a imagem. A engine calcula o resultado; a apresentação apenas o exibe.
- A autorização local de migração de `playtest/` está registrada acima. A diretriz de representação não dispensa diff aprovado para `data/cards.json` nem aprovação para novas regras.
- Hierarquia visual é obrigatória nas duas representações: identidade/custo, tipo, keywords, blocos de habilidade com títulos e custos, Owners/Resonance/estágios e indicadores. EQUIP nunca deve sumir em uma carta equipável. A sintaxe visual compartilhada fica em `shared/card-text.js`; nenhuma formatação pode inventar efeitos ou mudar o texto salvo silenciosamente.

## Convenções do texto de regras

- Linha em branco separa habilidades. `**negrito**` força negrito.
- Ícones: `{C}` Cosmo, `{B}` Base Cosmo, `{L}` Latent Cosmo, `{S}` Soul, `{T}` Tap.
- Keywords (`KEYWORDS` em `forge.js`) saem em negrito maiúsculo sozinhas.
- `toMarkup`/`fromMarkup` em `forge.js` convertem entre o texto do cards.json e a marcação. A ida e a volta precisam devolver o texto original para todas as cartas. Teste com `forge.fromMarkup(forge.toMarkup(h)) === h` no console.

## Verificar uma mudança visual

`window.forge` expõe `render`, `selectCard`, `buildCard`, `parseBatch`, `toMarkup` e `fromMarkup`. Para comparar com o original, use "Sobrepor PNG original" na UI, ou exporte o canvas e compare com `CARDS/…png` ou com o composite do PSD (`psd-tools`).
