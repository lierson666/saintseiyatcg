# Three.js Architecture

```
ENGINE (playtest/engine-v3)  ──muta──▶  STATE  ──registra──▶  EVENT STREAM (state.events, seq)
                                                                   │
                                     app.js lê events.slice(from)  ▼
                                                     ORCHESTRATOR (director.js)
                                                       │                    │
                                              VFX (scene.js, WebGL)   UI (DOM, app.js)
```

- **Engine** não conhece a apresentação. A regra nunca lê `state.events`.
- **app.js**: captura `from = events.length`, chama a engine, avança o que não exige escolha (início de turno, auto-pass), toca `director.play(novos)` com o DOM **anterior** e só então `render()`.
- **director.js**: um handler por tipo de evento; usa o adaptador `ui` (posições, textos, voos de carta) e `fx` (WebGL). Se `fx` faltar, tudo vira DOM.
- **scene.js**: um `WebGLRenderer`, duas cenas.
  - Mundo (perspectiva): céu em shader, piso em shader (fbm + anéis + cáusticas), colunas instanciadas, raios aditivos, poeira em `Points`.
  - VFX (ortográfica em pixels do DOM, y para baixo): pool fixo de 6000 partículas e malhas efêmeras (feixe, onda de choque, flash). Coordenadas vêm de `getBoundingClientRect`, então o efeito cai exatamente sobre a carta HTML.
- Three.js 0.160.0 via jsDelivr (mesma versão do `fx3d.js` existente). Sem build.
- Ciclo de vida: `ResizeObserver`, pausa com aba oculta, `webglcontextlost/restored`, `dispose()`.
- Toda Promise de animação tem teto de tempo de parede: aba oculta não trava a fila.
