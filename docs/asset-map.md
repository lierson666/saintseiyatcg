# Mapa de assets visuais

Estado levantado em 2026-10-22. Nenhum arquivo foi movido ou renomeado ainda.

## Estrutura atual

| Pasta | Conteúdo | Usado pelo jogo |
| --- | --- | --- |
| `ARTS/` | Artes-base dos personagens (PNG ~9 MB cada) e tabuleiros | Só `ARTS/BOARD.png` (fundo da mesa em `playtest/styles.css` e `playtest/arena.css`) |
| `FRAMES/<FACCAO>/<CATEGORIA>/` | PSDs editáveis das cartas (48 PSDs, ~593 MB) | Não |
| `CARDS/<FACCAO>/<CATEGORIA>/` | PNGs finais exportados | Sim: `caminho_imagem` em `data/cards.json` |
| `CARDS/<FACCAO>/vecteezy_*` e `CARDS/ATHENA/pattern/` | Molduras/texturas de banco de imagem (zip, eps, jpg, licença) | Não |
| `sacred-geometry-black-set/` (raiz) | Pack de geometria sagrada (eps, jpg, licença) | Não |

## Validação dos caminhos

- `data/cards.json`: 40 cartas com `caminho_imagem`; **todos os 40 arquivos existem**.
- `data/beta-athena.json` e `playtest/app.js` não guardam caminhos de imagem próprios (o app lê `caminho_imagem`).

## PNGs em `CARDS/` que nenhuma carta referencia

- `CARDS/ATHENA/ARES.png`: cópia do Deus Ares dentro da pasta de Athena. O oficial é `CARDS/ARES/ARES.png`.
- `CARDS/ATHENA/BRONZE/ATHENA.png`: cópia da Athena. A oficial é `CARDS/ATHENA/ATHENA.png`.
- `CARDS/ATHENA/BRONZE/ANDROMEDAv1.png`: Shun/Andromeda exportado, mas sem entrada no `cards.json`.
- `CARDS/ATHENA/TECHNIQUES/ATHENASJUDGMENT.png`: técnica exportada, mas sem entrada no `cards.json`.
- `CARDS/ATHENA/UNCOMMON/LIBRA-SWORD-WEAPON.png`: variante da Libra Sword.

## Reorganização proposta (não executada)

Regras:

- `CARDS/` guarda só cartas finais.
- Material de banco de imagem vai para `RESOURCES/STOCK/<FACCAO>/`.
- O nome de arquivo das cartas fica em MAIÚSCULAS, sem versão (`v1`) e sem espaços.

Movimentos:

```text
CARDS/ARES/vecteezy_*        -> RESOURCES/STOCK/ARES/
CARDS/ARTEMIS/vecteezy_*     -> RESOURCES/STOCK/ARTEMIS/
CARDS/POSEIDON/vecteezy_*    -> RESOURCES/STOCK/POSEIDON/
CARDS/ATHENA/vecteezy_*      -> RESOURCES/STOCK/ATHENA/
CARDS/ATHENA/pattern/        -> RESOURCES/STOCK/ATHENA/pattern/
sacred-geometry-black-set/   -> RESOURCES/STOCK/sacred-geometry-black-set/
CARDS/ATHENA/ARES.png        -> RESOURCES/DUPLICATES/ATHENA-ARES.png
CARDS/ATHENA/BRONZE/ATHENA.png -> RESOURCES/DUPLICATES/BRONZE-ATHENA.png
```

### Por que ainda não foi movido

Os PSDs em `FRAMES/` podem usar essas molduras e texturas como **smart objects vinculados**. O Photoshop guarda o caminho absoluto do arquivo vinculado. Se o arquivo mudar de lugar, o PSD abre com o vínculo quebrado e é preciso reapontar cada um.

**Confirmado:** pelo menos 10 PSDs têm smart objects vinculados (bloco `lnkE`): `FRAMES/ARES/ARES.psd`, `FRAMES/HADES/HADES.psd`, `FRAMES/ARTEMIS/ARTEMIS.psd`, `FRAMES/POSEIDON/POSEIDON.psd`, `FRAMES/ATHENA/ATHENA.psd`, `FRAMES/ATHENA/PHOENIX.psd`, `FRAMES/ATHENA/MOMENT/ATHENSJUDGMENT.psd`, `FRAMES/ATHENA/MOMENT/COSMOBLESSING.psd`, `FRAMES/ATHENA/BRONZE/DRAGONv1.psd` e `FRAMES/ATHENA/BRONZE/CYGNUSv1.psd`. A busca não chegou a identificar para quais arquivos esses vínculos apontam. Antes de mover, o caminho seguro é abrir um PSD de cada facção no Photoshop, em Layers → Smart Objects. Se nenhum vínculo apontar para `CARDS/` ou para `sacred-geometry-black-set/`, os movimentos acima podem ser feitos sem risco.

Nada disso afeta o jogo. Nenhum caminho do `cards.json` muda com esses movimentos.

## Sugestão para o deploy web

Os PNGs finais têm 1488×2091 px, 3 a 5 MB cada. Para o site, convém gerar uma cópia WebP com ~600 px de largura (~150 KB) e apontar o jogo para ela, mantendo os PNGs originais para impressão.
