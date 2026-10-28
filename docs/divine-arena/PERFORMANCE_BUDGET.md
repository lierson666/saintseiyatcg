# Performance Budget

| Perfil | Pixel ratio máx. | Poeira ambiente | Teto VFX | Colunas | AA | Raios |
| --- | --- | --- | --- | --- | --- | --- |
| LOW | 1 | 0 | 600 | 8 | não | não |
| MEDIUM | 1,25 | 500 | 1500 | 12 | sim | sim |
| HIGH (padrão) | 1,75 | 1400 | 3000 | 16 | sim | sim |
| ULTRA | 2 | 2800 | 5000 | 20 | sim | sim |

## Metas
- 60 fps em HIGH num notebook integrado recente; 30 fps mínimos em LOW.
- 1–3 draw calls de mundo + 1 de partículas; sem texturas carregadas na cena (tudo em shader).
- Pool de partículas fixo (sem alocação por frame).
- Pausa total com aba oculta.

## Fallback 2D
Sem WebGL ou sem CDN, `createScene` devolve `null`: a arena vira gradiente CSS do tema, o orquestrador usa só DOM (voos de carta, números, banners). A partida continua jogável.

## Medição
`window.__divine.scene.stats()` → `{fps, calls, particles, geometries, textures}`; também visível em Settings.
