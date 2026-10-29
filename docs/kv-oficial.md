# KV oficial — Saint Seiya TCG

Aprovado pelo autor em 29/10/2026 ("deixe ele como o KV oficial do jogo"). Vale para todas as telas fora da partida: home, login, lobby, deckbuilder, coleção e menus. A partida em si (mesa, cartas em jogo, efeitos) não muda.

## Arquivos

| Arquivo | O que tem |
|---|---|
| `shared/kv.css` | Cores, tipos e componentes (`kv-*`) |
| `shared/kv-sky.js` | `mountKV({anchor})`: céu de estrelas, constelações e ponteiro com cosmo |
| `index.html` | Home de referência |

## Direção

- **Céu à noite.** Degradê azul-noite até um horizonte que brilha, Via Láctea, estrelas com cor e as constelações dos Cavaleiros de Bronze (Pegasus, Andromeda, Cygnus, Draco, Phoenix) em traço fino com nome. A constelação mais próxima do ponteiro acende em dourado.
- **Um único sinal: o dourado.** `#e6c36a` e `#ffe7a3`, com brasa `#ff8a2b` só em brilhos. O resto é neutro: tinta `#f5f1e6`, cinza `#a8a397`, fundo `#05060c`. Não criar outra cor de destaque.
- **Linhas finas no lugar de sombras.** Bordas de 1 px em `#f5f1e626`; vidro com blur. Nada de sombra pesada nem borda grossa.
- **Ponteiro com cosmo.** Seta dourada com rastro fino de brasas, só com mouse. No toque, cursor do sistema.

## Tipografia

| Uso | Fonte | Estilo |
|---|---|---|
| Momentos de destaque ("Burn your") | Cormorant Garamond itálico | grande, `letter-spacing: -.03em`; nunca abaixo de 28 px |
| Palavra-chave dourada ("Cosmo") | Cinzel 700 | degradê dourado com brilho |
| Carimbos (seções, rótulos, botões) | Cinzel 600 | 11–14 px, maiúsculas, `letter-spacing: .32–.42em` |
| Texto corrido | Jost 300/400 | 16–20 px, alinhado à esquerda |

## Componentes

- `kv-nav`: barra de vidro no topo, com borda inferior fina.
- `kv-card`: cartão de vidro, raio 20 px, brilho dourado suave no canto.
- `kv-input`: campo em pílula; foco com borda dourada.
- `kv-button`: ação principal, pílula dourada. Uma por tela.
- `kv-ghost`: ação secundária, pílula transparente com borda fina.
- `kv-stamp`: rótulo em carimbo; `kv-stamp--gold` para o rótulo principal.
- `kv-footer`: rodapé com linha fina.

## Regras

- Raios: 20 px em cartões e painéis; pílula em botões e campos.
- A frase "Made with lots of love by Brazilian fans ♥" aparece só na home.
- O logo aparece grande na home e no login; nas outras telas, pequeno na barra.
- `prefers-reduced-motion`: céu parado, sem rastro nem ponteiro.
