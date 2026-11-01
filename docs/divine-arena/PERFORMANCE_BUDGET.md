# Performance Budget

| Perfil | Pixel ratio máx. | Poeira ambiente | Teto VFX | Colunas | AA | Raios |
| --- | --- | --- | --- | --- | --- | --- |
| LOW | 1 | 0 | 600 | 8 | não | não |
| MEDIUM | 1,25 | 500 | 1500 | 12 | sim | sim |
| HIGH (padrão) | 1,75 | 1400 | 3000 | 16 | sim | sim |
| ULTRA | 2 | 2800 | 5000 | 20 | sim | sim |

## Orçamento de quadro (proposta de 01/11/2026, aguarda o autor)
- Desktop, HIGH: 60 fps, 16,7 ms por quadro. Tablet e celular (Redmi Pad 2): 30 fps, 33 ms, perfil `phone`.
- Nenhum efeito pode derrubar o quadro abaixo da meta: `dense()` em `scene.js` corta a densidade de partículas a partir de metade do teto e pela metade se o rAF cair abaixo de 45 fps; no máximo 32 formas vivas.
- Ajuste automático: 3 s seguidos abaixo de 40 fps tiram um degrau (resolução −20% até 1 pixel de CSS, depois o perfil de baixo). Vale só para a partida, não muda a opção salva.
- LOW e `phone` param também as animações CSS das cartas (`.is-calm`).

## Metas
- 60 fps em HIGH num notebook integrado recente; 30 fps mínimos em LOW.
- 1–3 draw calls de mundo + 1 de partículas; sem texturas carregadas na cena (tudo em shader).
- Pool de partículas fixo (sem alocação por frame).
- Pausa total com aba oculta.

## Fallback 2D
Sem WebGL ou sem CDN, `createScene` devolve `null`: a arena vira gradiente CSS do tema, o orquestrador usa só DOM (voos de carta, números, banners). A partida continua jogável.

## Medição
`window.__divine.scene.stats()` → `{fps, rafRate, pixelRatio, level, calls, particles, alive, geometries, textures}`; também visível em Settings.
`window.__divine.scene.bench()` → ms reais de GPU por quadro (`world`, `fx`). O trace do navegador não enxerga o tempo de shader com Metal. Animação CSS decorativa pesa mais que o WebGL: teste com A/B antes de culpar o 3D.
