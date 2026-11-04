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
- Edição: Star Hill, página Animações, e Card Forge, aba Animações, com uma linha por habilidade e por momento. O ▶ abre um pop-up com o efeito.
- Criador (`star-hill/criador.html`, aba Criador de Animações): o autor monta o pedido em `shared/anim-request.js`, cola na conversa com o Claude, e `tools/vfx-criar.mjs` entrega o efeito do PixelFX como rascunho. O teste usa a mesa real (`?demo=criador`); o efeito fica no banco sem precisar de carta; rascunho só aparece nas listas depois de "Guardar no banco".
- Registro central (VFX Forge 2.0): `tools/vfx-inventario.py` varre o repositório e gera `data/vfx-inventario.json`, com id estável, tecnologia, origem, arquivos, limite e os cinco critérios de migração que dependem de verificação. A aba Todas mostra o registro. O teste falha se surgir animação sem registro; exceção precisa de motivo em `data/vfx-excecoes.json`.
- Catálogo com todas as fontes: os efeitos em código e os importados de `data/vfx-catalog.json`, cada um com fonte, licença, acesso, origem, hash, tipo, facções e gatilhos. Só entra efeito gratuito.
- `card-forge/vfx_import.py` converte PNG, sprite sheet com JSON, GIF, WebP, APNG e ZIP de PNGs em um sprite sheet local em `playtest/divine/vfx/`. O hash é dos pixels: o mesmo efeito em outro formato não duplica. O jogo não chama serviço externo.
- `tools/vfx-bake-particlr.mjs` recria os presets CC0 do Particlr com o servidor `@particlr/mcp`. Para efeito novo do Particlr, gerar o `.prt` e converter em sheet; o runtime PixiJS não entra no jogo.
- `tools/vfx-lab/` mostra cada efeito sobre a arena real. O deploy não publica essa pasta.

## Animações CSS antigas (adapter)

`shared/anim-css-adapter.js` liga, desliga e muda a velocidade de um `@keyframes` pelo nome, sem reescrever o CSS. O ajuste fica em `data/card-animations.json`, chave `css`, e é editado em Star Hill, Animações, aba Interface. Sem ajuste salvo, o adapter não instala nada. As páginas que o carregam são a mesa (`playtest/divine/index.html`) e o lobby (`playtest/index.html`).

Limites conhecidos:

- Forma, distância e cor seguem no CSS.
- O atraso (`animation-delay`) não escala, e o primeiro quadro da animação pode aparecer antes do ajuste.
- Uma animação desligada termina na hora, com o estado final dela. Infinitas são canceladas.
- O teste toca o `@keyframes` real numa carta da mesa, que pode não ser o elemento original. Por isso essas animações ficam como parciais no registro.
- Transições CSS não têm nome e não passam pelo adapter.

## Céu e moeda

Os dois laços próprios do jogo se ajustam em Star Hill, Animações, aba Céu e moeda. Ficam em `data/card-animations.json`, chaves `ceu` (`ligado`, `estrelas`) e `moeda` (`ligado`, `duracao`, `giros`). Giros são sempre inteiros: é o que mantém a face do vencedor no fim. O resultado do cara ou coroa continua vindo da engine.

Os outros laços e canvases estão em `data/vfx-excecoes.json`, cada um com o motivo: ferramentas que não animam, agendamento de redesenho ou motores que tocam efeitos já editáveis em outra aba.

## Gerador Sprite Fusion

Star Hill, Animações, aba Sprite Fusion. Gera os 14 tipos de combate definidos em `COMBAT`, em `playtest/divine/pixel-vfx.js`: Physical Hit, Energy Hit, Slash, Projectile, Explosion, Shockwave, Cosmo Burst, Aura, Shield, Block, Dodge, Pierce, Defeat e Divine Impact.

Cada tipo é uma composição dos efeitos em código de `vendor/sprite-fusion` (MIT). O resultado entra em `data/vfx-catalog.json` como rascunho com o campo `receita`, sem PNG e sem carta. Em Efeitos, o rascunho é testado, guardado no banco ou descartado.

O que se ajusta: cor, escala, velocidade, posição, camadas ligadas e atraso de cada camada. A cor só aparece onde o efeito aceita paleta; os outros mantêm as próprias cores, e a tela diz quais.

Limites conhecidos:

- A integração usa só o código já no repositório. O servidor MCP citado no cabeçalho dos arquivos do Sprite Fusion não foi integrado nem verificado.
- O Sprite Fusion não tem efeito próprio para Shockwave, Block, Dodge, Pierce nem Defeat: esses tipos são composições aproximadas.
- Por ser código ao vivo, a receita registra duração e transparência; quadros, FPS e dimensões não se aplicam.
- O marcador de HIT e a timeline ficam para o Combat Composer.

## Gerar animação no formulário

O botão Gerar animação, no formulário do Criador, chama o comando `claude` do Mac em segundo plano (`card-forge/vfx_generate.py`, rotas `/api/star-hill/vfx-gerar`). Roda um trabalho por vez, com o modelo Sonnet, a conta do autor e limite de 15 minutos. O preview aparece no próprio formulário, em loop sobre a carta, na proporção da mesa.

O Claude só escreve em `tools/vfx-criador/fx` e só entrega por `tools/vfx-criar.mjs`, que cria rascunho sem ligar a nenhuma carta. As referências com link são baixadas pelo servidor (só `https` público e só imagem) e lidas como imagem. Só funciona onde o servidor local do Star Hill roda, nunca no site.

## Combat Composer

Star Hill, Animações, aba Combate. Monta a coreografia de um Strike em dez fases (Anticipation, Charge, Movement, Projectile, Contact, Impact, Hit Stop, Knockback, Sound, Aftermath), com linha do tempo e marcador de HIT. Entra no banco como rascunho (`coreografia` em `data/vfx-catalog.json`), sem carta, e vale quando for escolhida no momento Golpe do Strike.

O director agenda as fases quando recebe `strike_resolve` e devolve no HIT. Acerto, dano, revide e bloqueio continuam vindo dos eventos da engine. Fases vazias caem no comportamento padrão do jogo: sem Impact, toca o impacto normal; sem Knockback, o recuo normal.

O teste usa a mesa real e eventos no formato da engine, nos cenários Devotee com revide, dano na Soul, bloqueado, sem dano e área.

Limites conhecidos:

- Uma faixa por fase.
- Área, e qualquer momento fora do Strike, tocam só o Impact em cada alvo.
- A câmera lenta alcança a fila do director e os efeitos em pixel, mas não as partículas WebGL nem o recuo em CSS.
- Pausa, passo a passo, comparação de versões e métricas ficam para o Live Preview.

## Live Preview

A barra embaixo da mesa, no Criador, vale para todos os modos: pausar, avançar quadro a quadro, velocidade até 0,1×, ligar e desligar camadas (pixel, luz, partículas, arena), mostrar âncoras de origem e alvo, comparar dois efeitos e ver métricas. Em Tela se escolhe computador ou celular.

`playtest/divine/preview-clock.js` troca `setTimeout`, `requestAnimationFrame` e `performance.now` da página do teste e segue as animações CSS, então o director, a cena e os efeitos rodam sem mudar. Só instala quando o Criador pede. Som e `setInterval` seguem no tempo real.

A comparação é em sequência, A e depois B, na mesma mesa: duas mesas ao mesmo tempo mediriam mal o desempenho. As métricas são do Mac em que o teste roda, não do aparelho do jogador.

## Publicação segura

Um efeito novo passa por quatro estados, no campo `estado` de `data/vfx-catalog.json`: rascunho, teste (tocou na mesa), aprovado (guardado no banco) e publicado (faz parte de uma versão). Efeito antigo, sem o campo, conta como publicado. Rascunho e teste não podem ser escolhidos em carta, facção nem padrão.

O Star Hill edita `data/card-animations.json` e `data/vfx-studio.json`. O jogo online lê só `*.publicado.json` (`shared/anim-data.js`); no Mac lê a edição, e `?publicado=1` mostra a publicada. Na aba Publicação se vê o que mudou e se cria uma versão, guardada em `data/vfx-historico/`. Voltar a uma versão antiga cria uma versão nova e não mexe na edição.

Criar uma versão não põe nada no ar: isso é o deploy do site. Referência quebrada, arquivo ausente ou efeito não aprovado impedem a versão. `tools/vfx-publicacao.py` roda em `tools/test-pixel-vfx.mjs`, e o deploy para se esse teste falhar.

## Verificação de cobertura

`tools/vfx-inventario.py --check` roda em `tools/test-pixel-vfx.mjs`, portanto trava o deploy. Ele varre CSS, JS, HTML e SVG atrás de `@keyframes`, transições, `requestAnimationFrame`, Web Animations, Canvas, SMIL, View Transitions, Three.js, Pixi, Lottie, GSAP e arquivos animados.

Animação nova sem controle no Forge não passa, nem refazendo o registro: é preciso ligá-la ao Forge ou escrever o motivo em `data/vfx-excecoes.json`. A dívida antiga fica em `data/vfx-pendentes.json`, que só encolhe. Animação feita à mão com `setInterval` não é detectada, porque não dá para distinguir de um temporizador comum.

Migrada é a linha com os oito critérios. Inventariada e id estável valem por existir no registro, que recusa id repetido; os outros seis ficam em `criterios`: `forge`, `edita`, `aplica`, `preview`, `restaura` e `testes`. Esses seis são declarados no próprio `tools/vfx-inventario.py` a partir do que foi verificado, então um `true` depende de quem o escreveu. O número sai em `resumo.criterios` e aparece na aba Todas.
