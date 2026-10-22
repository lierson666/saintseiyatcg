# REA de UX/UI — MTG Arena → Saint Seiya TCG

Engenharia reversa **de experiência** (layout, fluxos, estados, feedback, ritmo) do MTG Arena,
traduzida para as **nossas regras** (`docs/guia-do-jogo.md`). Nada de código, arte, som ou marca
da Wizards é copiado: só padrões de interação, que reimplementamos com assets próprios.

Escopo: tela de partida do `playtest/`. Textos visíveis ao jogador em inglês; este documento em português.

---

## 1. Dicionário Arena → nosso jogo

| Arena | Nosso jogo | Observação |
| --- | --- | --- |
| Avatar + Life total | God (retrato) + Soul | Soul começa em 30 (Athena). Attack do God revida quem atacar. |
| Lands / mana | Cosmo Base (cartas viradas com símbolo Cosmoble) | 1 por turno, igual a "1 land por turno". |
| Mana pool flutuante | Pool de Cosmo + **Latent Cosmo** | Latent não existe no Arena: orb azul próprio, some no fim do **seu** turno. |
| Creature | Devotee | Power / Resistance. Dano some no fim de cada turno (igual ao Arena). |
| Sorcery | Moment | Só no seu turno, fora de resposta. |
| Instant | Technique | Qualquer momento, em resposta. Resolve antes. |
| Artifact/Equipment | Relic | Fica em campo se o portador morre; destruída vai para Void. |
| Aura/Equipment exclusiva | Cloth | 1 por Devotee; Damage counters quando o portador morre. |
| Graveyard | Tartarus | |
| Exile | Void | |
| Companion/Emblem fixo | Domain | Sempre em campo, ao lado do God. |
| Summoning sickness | "ZZZ" / Unprepared | Impulse ignora. |
| Tap | Virar (tapped/Unprepared) | |
| Planeswalker ultimate | God Ultimate (1x por jogo) e Awaken | Awaken dispara sozinho no limiar de Soul. |

**Diferença crítica de combate:** no Arena o defensor declara bloqueios. **No nosso jogo não existe
bloqueio** — o atacante escolhe o alvo (God ou Devotee). Guardian obriga a atacar o Guardian antes do
God; Cheater ignora Guardian; Nimble só pode ser alvo de Nimble/Guardian (regra a confirmar no manual).
Por isso o fluxo de "declare blockers" do Arena vira **"declare alvo por atacante"**.

---

## 2. Layout (canvas 1920×1080, mesmo grid que já usamos)

Arena coloca tudo em faixas horizontais espelhadas; seguimos igual:

```
y 0     ┌───────────────────────────────────────────────────────────────┐
        │ [mão do oponente: costas, leque invertido, topo-centro]       │
        │ Domain◄  (God oponente + Soul)  ►piles      ⚙ (canto sup. dir.)│
        │ Cosmo Base oponente (esq.)              Relics/Cloths soltas   │
        │ ── Devotees oponente (fila da frente) ──                       │
y 470   │══════════════ linha central (banner de turno aparece aqui) ═══│
        │ ── Devotees jogador (fila da frente) ──                        │
        │ Cosmo Base jogador (esq.)   Latent orb       piles (dir.)     │
        │ Domain◄  (God jogador + Soul)                  phase ladder   │
        │ [mão: leque, 60% visível, cresce no hover]     [BOTÃO GRANDE] │
y 1080  └───────────────────────────────────────────────────────────────┘
```

Regras de layout tiradas do Arena:
- **Mão** fica cortada pela borda inferior (~60% visível). Hover sobe a carta e aumenta ~1.4×; vizinhas se afastam (não só sobrepõem).
- **Botão principal** sempre no mesmo lugar (canto inferior direito). Nunca muda de posição, só de rótulo/cor.
- **Ladder de fases** logo acima do botão, pequena, clicável.
- **Campo**: Devotees centralizados, auto-organizados (sem posição livre por padrão). Equipamentos (Cloth/Relic) aparecem **presos atrás** do Devotee, deslocados para cima.
- **Recursos** (Cosmo Base) à esquerda, agrupados por tipo com contador quando > 5 (Arena empilha lands iguais com "×N").
- **Piles** (Deck, Tartarus, Void) à direita, clicáveis para abrir o navegador de zona.

---

## 3. Gramática de interação

### 3.1 Jogar carta
| Ação | Arena | Nosso |
| --- | --- | --- |
| Arrastar da mão para o campo | joga | joga (já existe drag) |
| Clique duplo na carta da mão | joga | **adicionar** |
| Soltar fora de zona válida | volta para a mão com animação elástica | adicionar animação de retorno |
| Carta jogável agora | contorno azul pulsante | **azul** = jogável com recursos atuais |
| Carta não jogável | sem contorno, levemente escura | escurecer 25% |

Jogabilidade calculada por: fase (Moment só no seu Main, Technique sempre que houver prioridade),
custo vs. Cosmo disponível (Base desvirada + Pool + Latent), alvos válidos existentes.

### 3.2 Pagamento (auto-tap)
- Arena paga sozinho com a melhor combinação. **Padrão nosso:** pagar automático
  na ordem **Latent primeiro** (some no fim do turno) → Pool → Cosmo Base.
- Modal de pagamento **só** quando: o jogador segura **Shift** ao jogar, ou "Full Control" está ligado,
  ou existe escolha que muda o jogo (ex.: pagar Soul).
- Ao pagar, as Cosmo Base usadas viram com animação (90°, 180 ms) e o contador do orb Latent desce.

### 3.3 Alvos
- Carta com alvo: ao soltar, nasce uma **seta curva** saindo da carta até o ponteiro.
- Alvos válidos pulsam (azul = efeito, vermelho = ataque); inválidos escurecem.
- Clique no alvo confirma; **Esc** ou botão "Cancel" devolve a carta à mão sem custo.

### 3.4 Combate (adaptado: sem bloqueio)
Estado do botão principal no Main com atacantes disponíveis: **"Attack"**.

1. Clicar "Attack" → entra em **Declare Attackers**. Todos os Devotees aptos ganham borda vermelha suave.
2. Clicar um Devotee alterna atacante (inclina 10°, avança 30 px em direção ao oponente, igual ao Arena).
3. Para cada atacante, escolher o alvo: clique no God ou num Devotee inimigo. Seta vermelha fica desenhada.
   - Guardian em campo: alvos ilegais mostram tooltip "Guardian must be attacked first".
   - Atalho "All Attack" (canto do botão) = todos os aptos no God (ou no Guardian obrigatório).
4. Botão vira **"Confirm Attack (N)"**. Confirmar = sequência de combate.
5. Janela de resposta do defensor (Technique) — ver 3.5.
6. Resolução por atacante: carta voa até o alvo (300 ms), impacto, números de dano flutuam, mortos dissolvem para o Tartarus.

### 3.5 Prioridade e respostas (Technique)
- Arena mostra "Opponent's Turn" e só pede ação quando o jogador **pode** responder.
- Nosso: quando o oponente declara ataque/joga carta/usa habilidade **e** você tem Technique jogável,
  o botão vira **"Respond?"** azul por até N segundos (configurável), com Techniques destacadas na mão.
  Sem Technique jogável → **auto-pass** (sem perguntar), igual ao Arena.
- **Pilha** visível: coluna à direita do campo com as cartas aguardando resolução, a de cima resolve primeiro.

### 3.6 Botão principal — máquina de estados

| Situação | Rótulo | Cor | Ação (Espaço) |
| --- | --- | --- | --- |
| Seu Upkeep/Draw | "Next" | laranja | avança fase |
| Seu Main, sem atacantes | "End Turn" | laranja | vai para End |
| Seu Main, com atacantes aptos | "Attack" | laranja | entra em Declare Attackers |
| Declare Attackers, 0 selecionados | "No Attacks" | cinza | volta ao Main |
| Declare Attackers, N selecionados | "Confirm Attack (N)" | laranja | confirma |
| Escolhendo alvo | "Cancel" | cinza | cancela |
| Pilha com algo seu esperando | "Resolve" | azul | resolve topo |
| Oponente agiu e você pode responder | "Respond? / Pass" | azul | passa prioridade |
| Turno do oponente, nada a fazer | "Opponent's Turn" | cinza escuro, desabilitado | — |

Atalhos (como Arena): **Espaço/Enter** = botão principal · **Esc** = cancelar · **Z** = desfazer seleção
(antes de confirmar) · **Ctrl** segurado = segurar prioridade · **Shift**+jogar = pagar manualmente.

### 3.7 Ladder de fases (phase stops)
- Pílulas: Upkeep · Draw · Main · Combat · End (Combat é sub-estado do nosso Main; mostrar como pílula para clareza).
- Clique em pílula futura = "avançar até aqui".
- Clique-direito/long-press = ligar/desligar **stop** (o jogo para ali para você agir). Padrão: stop em Main e Combat.

### 3.8 Hover, zoom e informação
- Hover em qualquer carta (campo, mão, piles): **zoom grande ao lado da carta**, nunca cobrindo a carta em si; lado escolhido pelo espaço livre.
- Zoom mostra estado atual: Power/Resistance modificados (verde = buff, vermelho = dano), counters, Cloth equipada, keywords com glossário em tooltip.
- Clique-direito / segurar = zoom em tela cheia + texto completo.
- Hover no God: Soul, Attack, Awaken (com barra até o limiar), habilidades e Ultimate (custo, disponível ou usada).

### 3.9 Feedback e animação (ritmo do Arena)
| Evento | Duração | Efeito |
| --- | --- | --- |
| Compra | 350 ms | carta sai do deck, vira no ar, entra no leque |
| Jogar Devotee | 450 ms | voa da mão até a vaga, "pousa" com sombra e poeira dourada |
| Jogar Moment/Technique | 600 ms | carta flutua no centro, brilha, efeito parte até o alvo, carta dissolve para Tartarus |
| Ataque | 300 ms ida + 200 ms volta | avança, impacto com shake leve (4 px), números de dano |
| Morte | 500 ms | dissolve em partículas, fantasma voa até o Tartarus |
| Dano no God | 400 ms | retrato treme, Soul pisca vermelho, número flutua |
| Awaken | 1200 ms | halo cresce, flash dourado, banner "AWAKENED" |
| Início de turno | 900 ms | banner "YOUR TURN" / "OPPONENT'S TURN" na linha central |
| Vitória/Derrota | 2–3 s | câmera aproxima do God perdedor, retrato racha, tela de resultado |

Easing padrão: `cubic-bezier(0.2, 0.8, 0.2, 1)`. Todas as animações respeitam `prefers-reduced-motion` (viram fades de 120 ms).

### 3.10 Configurações (menu ⚙)
- Full Control (desliga auto-pay e auto-pass).
- Auto-pass quando não houver resposta possível (padrão ligado).
- Velocidade da IA / animações (1×, 2×, instantâneo).
- Tempo da janela de resposta.
- Mostrar/ocultar log; Concede (render-se).

---

## 4. O que não tem no Arena e precisa de UI própria

| Mecânica nossa | Proposta de UI |
| --- | --- |
| **Latent Cosmo** | Orb azul ao lado da Cosmo Base, número grande; brilha quando > 0; ao fim do seu turno, "evapora" com partículas. Ganho no turno do oponente: +1 voa do Devotee atingido até o orb. |
| **Cloth Damage** | Cloth sem portador fica no campo com marcador vermelho (número) e cadeado; a cada Upkeep o número desce com tique. |
| **Awaken** | Barra fina sob a Soul mostrando distância até o limiar; ao cruzar, sequência da tabela 3.9. |
| **Evolution** | Ao arrastar um Devotee com mesmo nome de um em campo, o custo na carta muda para o valor reduzido (−2) em verde. |
| **Lendário** | Ao jogar duplicata, modal rápido "Choose which stays" com as duas cartas lado a lado. |
| **Domain 1x por jogo** | Medalhão com botão de ativar; após uso fica cinza e virado. |
| **Mulligan com penalidade** | Igual ao Arena, mais aviso "Opponent gains 1 Latent Cosmo". |

---

## 5. Arquitetura técnica recomendada (Three.js)

Objetivo: animações e profundidade de nível Arena sem reescrever as regras.

- **Camada DOM (atual)** continua dona do estado, dos cliques e da acessibilidade. Nenhuma regra muda.
- **Camada WebGL (Three.js, por cima e por trás do DOM)**:
  - *Fundo*: mesa em perspectiva real (câmera levemente inclinada ~30°), luz direcional + ambiente, partículas de cosmo.
  - *Efeitos*: cartas "fantasma" 3D que fazem as animações de voo/ataque/morte e depois somem, revelando a carta DOM no destino.
  - *Seta de alvo*: curva Bézier 3D com shader brilhante.
  - *Impactos*: partículas, shake de câmera, flashes.
- **Contrato**: `app.js` emite eventos (`cardMoved`, `attackDeclared`, `damageDealt`, `cardDied`, `turnStarted`) com `uid` + retângulos de origem/destino; a camada 3D anima e devolve `done`. Sem WebGL disponível → fallback CSS atual.
- Three.js via CDN fixo (`three@0.160.0` ou mais novo estável), módulo ES, sem build.
- Orçamento: 60 fps em notebook comum; texturas das cartas reduzidas (≤1100 px, já usado no VPS).

---

## 6. Ordem de implementação sugerida

1. Botão principal com máquina de estados + atalhos (3.6) — maior ganho de usabilidade.
2. Jogabilidade visível + clique duplo + auto-pay (3.1, 3.2).
3. Combate em Declare Attackers com setas (3.4).
4. Respostas/pilha/auto-pass (3.5).
5. Hover zoom posicionado (3.8).
6. Camada Three.js de animações (3.9, seção 5).
7. Phase stops e configurações (3.7, 3.10).
8. UIs próprias da seção 4.

Critério de aceite por etapa: partida completa contra a IA em 1600×900 e 800×600, zero erros no console,
regras inalteradas (mesmos resultados de combate e custos que antes).
