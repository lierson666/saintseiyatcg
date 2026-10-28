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
