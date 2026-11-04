# Animation System

## Orquestrador
`createDirector({ui, getFx, settings})` → `{busy, skip(), play(events)}`.
- Fila **sequencial**: cada handler retorna uma Promise; o próximo evento espera.
- Entrada travada enquanto `busy`; clique ou Espaço chama `skip()` (tempos viram 0, VFX param de nascer, o estado final aparece).
- Velocidade: `fast` ×0,55, `normal` ×1, `cinematic` ×1,35.
- `reduceMotion`: sem WebGL VFX, sem voos de carta, CSS sem animação.

## Tempos de referência (normal)
| Evento | ms |
| --- | --- |
| Banner de turno | 900 |
| Compra (por carta) | 220 (pulável em Settings) |
| Base colocada | 260 |
| Carta jogada | 320 + 120 |
| Declaração de Strike | 260 |
| Strike comum / assinatura | ~600 / ~1300 com callout 650 |
| Dano | 120–220 |
| Soul perdida | 420 |
| Destruição | 380 |
| Vitória | 1200 |

## Regras de implementação
- Animação nunca muda estado. Ela lê o evento e os retângulos do DOM.
- Animações WAAPI e rAF têm teto de tempo (`Promise.race`).
- Easing padrão `cubic-bezier(.2,.8,.2,1)`.

## Golpes em pixel art
- Efeitos do Sprite Fusion (MIT) em `playtest/divine/vendor/sprite-fusion/`, com a licença junto. Para trazer um novo, baixar o ZIP, tirar os tipos do TypeScript e criar uma receita.
- `playtest/divine/pixel-vfx.js` desenha em dois canvas acima dos VFX WebGL e nunca segura a fila. Celular, Low e "reduzir clarões" ficam sem a camada de luz. Os efeitos de clima (chuva, neve, névoa, brasas, vaga-lumes, folhas, bolhas) não terminam sozinhos: aparecem em volta da carta e saem com fade em 3 s, o limite de todo efeito.
- As escolhas ficam em `data/card-animations.json`: linha da habilidade, carta, facção (`faccao-<nome>`) e padrão do jogo (`padrao`), nessa ordem; `false` é sem animação. `efeitos` guarda ligado, tamanho, velocidade e cor de cada efeito. Só visual.
- Edição: Star Hill, página Animações, e Card Forge, aba Som, ao lado do som de cada habilidade. O ▶ abre um pop-up com o efeito.
- `tools/vfx-lab/` mostra cada efeito sobre a arena real. O deploy não publica essa pasta.
