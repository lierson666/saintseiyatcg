# Gods 3.0 — registro suplementar (G3)

Decisões complementares aprovadas pelo autor na especificação **Olympus Arena V1 + Divine Powers + Competitive Clock** (28/10/2026) e nas respostas da mesma data. **Não** fazem parte de D1–D268, **não** são a D269 (que segue pendente e fora do escopo) e ainda não estão no Handbook. Numeração própria: `G3-NNN`.

Hierarquia: texto canônico D1–D268 > G3 > procedimento técnico > proposta. Em conflito com D1–D268, vale o canônico e o G3 vira pendência.

Legenda de estado: **Impl** (implementado e testado), **Parcial**, **Pendente** (sem implementação), **Lacuna** (falta decisão).

## Registro

| ID | Decisão | Origem | Depende de | Estado | Código / teste |
| --- | --- | --- | --- | --- | --- |
| G3-001 | Cada gatilho gerado é uma instância própria com origem, controlador e dados do evento | Spec §5.1–5.2 | D186, D187 | Parcial: itens da cadeia têm `controller`, `uid`, `ability` | `core.js pushTriggers` |
| G3-002 | Controlador fixado na entrada na cadeia; mudança de controle depois não transfere | Spec §5.3–5.4 | — | Impl (não há troca de controle no Alpha) | `core.js` |
| G3-003 | Awaken reavaliado entre resoluções completas e nas passagens de turno; nunca no meio de uma resolução atômica | Spec §4.2 | D187, D204 | Impl | `runCheckpoint`; teste "G3-003" |
| G3-004 | Awaken dinâmico: ativo com Soul ≤ limite, inativo acima, religa sozinho, sem custo nem ação; não reinicia limites | Spec §4.2 | — | Impl | `gods.js refreshAwaken`; teste "G3-004" |
| G3-005 | Ultimate independe de Awaken; Sorcery; turno próprio, fase de ações, cadeia vazia; um por God por partida | Spec §4.3 | D229 | Impl (Athena) | `ultimateBlock`; testes "G3-005", "D229" |
| G3-006 | Uso consumido no anúncio legal pago; anulação ou falha não devolve uso nem custo; anúncio ilegal não gasta nada | Spec §4.3 | D230 | Impl | `announceExclamation`; teste "G3-006/D230" |
| G3-007 | Divine Power segue a natureza: Activated (manual), Triggered (automático na cadeia), Passive (contínuo); opcional pergunta, obrigatório não | Spec §4.1 | D198, D225 | Parcial: Cosmo of Hope (Triggered) e Divine Protection (Passive + opcional pago) | `effects.js` |
| G3-008 | Limite Awaken é numérico e independe do Soul máximo | Spec §6.1 | — | Impl | `state.divine[k].awakenAt` |
| G3-009 | Soul máximo em camadas: impresso → fixos → somas → precedências → mínimo 1; fixos sem precedência = lacuna | Spec §6.3 | — | Impl | `computeSoulMax`; teste "G3-009" |
| G3-010 | Reduzir Soul máximo ajusta o atual sem ser dano; aumentar não devolve Soul | Spec §6.2 | — | Impl | `addSoulMaxEffect` |
| G3-011 | Recuperação acima do máximo é ignorada | Spec §6.2 | — | Impl | `gainSoul` |
| G3-012 | Soul atual mínimo 0; o dano/perda registrado é o valor integral | Spec §6.5 | D52 | Impl | `loseSoul` |
| G3-013 | Deal Damage ≠ Lose Soul; prevenção de dano não previne perda direta | Spec §6.6 | D150 | Impl: `soul_lost.cause` = damage / loss / payment | `strike.js`, `gods.js` |
| G3-014 | Custo misto validado inteiro antes; pagamento atômico; Soul letal pode ser pago e encerra | Spec §6.7 | D219, D221, D222 | Impl (genérico) | `payMixed`; teste "G3-012/014" |
| G3-015 | Soul 0 encerra na hora; nada pendente resolve depois | Spec §6.5 | D52, D174 | Impl | teste "G3-015" |
| G3-016 | Eventos simultâneos de Soul e Soul máximo calculados juntos | Spec §6.4 | — | Pendente: nenhuma carta do Alpha gera | — |
| G3-017 | Histórico com id estável de anúncio, custo, uso, cadeia, resolução, falha, Soul, Cosmo, Awaken e fim | Spec §7 | — | Impl: `seq` + eventos `ultimate_*`, `awaken_changed`, `soul_*`, `cosmo_spent`, `judgment_*` | `core.js emit` |
| G3-018 | Once Each Round renova no início do Round seguinte, não no turno adversário | Spec §5.10 | D191, D204 | Impl (já existia) | `cleanup` |
| G3-019 | Custos pagos são públicos; informação privada não vaza ao adversário | Spec §7 | — | Impl: `eventsFor` esconde a carta comprada | teste "G3-019/020" |
| G3-020 | Reconexão recupera o estado oficial e nunca repete efeitos | Spec §8 | — | Parcial: cursor por `seq` e `resumeFor`; estado completo serializável pendente (a cadeia guarda funções) | `sync.js` |
| G3-021 | Animação nunca decide; engine não espera animação; falha de animação não repete efeito | Spec §8 | — | Impl | `playtest/divine/director.js` |
| G3-022 | Identidade de personagem = nome impresso da carta | Procedimento técnico | D229, D230 | **Substituída pela G3-029** | — |
| G3-023 | O "Cosmo" do custo de Ultimate é pago com **Base preparada** | Autor, 28/10/2026 | D229 | Impl | `announceExclamation` |
| G3-024 | Relógio Alpha: 60 s básicos por turno, reserva inicial 90, teto 180, +50% do básico não usado | Spec §9 | — | Impl | `clock.js`; teste "Relógio Alpha" |
| G3-025 | Animações não consomem tempo de decisão | Spec §9 | — | Impl: `clockPause/Resume` | idem |
| G3-026 | Decisão usa o relógio do responsável; fora do próprio turno só existe a reserva dele | Spec §9 (leitura literal) | G3-024 | Impl; confirmada e detalhada pela G3-031 | `clockHandTo` |
| G3-027 | Timeouts: opcional → `TIMEOUT_DECLINED`; janela → `TIMEOUT_PASS_PRIORITY`; fase de ações → `TIMEOUT_END_TURN`; obrigatória → `TIMEOUT_AUTO_CHOICE` | Spec §9 | — | Impl; critério da escolha obrigatória pela G3-030 | `timeoutAction`, `applyTimeout` (clock.js); escolhas pendentes em `decision.js`; testes em `test-engine-v3-decisions` e `test-engine-v3-playtest` |
| G3-028 | 12 tochas dividem os 3 minutos: 1 acesa por 15 s restantes (arredonda para cima), teto 12 | Autor, 28/10/2026 (revisto: era 60 s) | G3-024 | Impl | `torchesLit` |
| G3-029 | **Identidade de personagem** = personagem canônico, separado do ID da carta. Seiya V1/V2 são a mesma identidade; arte, subtítulo, Cloth ou reimpressão não criam identidade nova; personagens distintos nunca se fundem. Mapeamento explícito e verificável (não por remoção de palavras do título); identidade não confirmada = lacuna sinalizada | Homologação complementar, 28/10/2026 | D229, D230 | Impl | `shared/character-identity.js`; `gods.js identity`; testes "G3-029" |
| G3-030 | **Timeout em escolha obrigatória**: lê as opções legais no momento, ordena pelo id estável do objeto (ordem natural) e escolhe o menor; em escolha múltipla repete sobre as restantes revalidando a legalidade a cada passo; registra `TIMEOUT_AUTO_CHOICE` com opções elegíveis, critério e resultado; sem avaliação estratégica | Homologação complementar, 28/10/2026 | G3-027 | Impl | `clock.js timeoutAutoChoice`; testes "G3-030" |
| G3-031 | **Relógio fora do turno**: os 60 s básicos pertencem só ao turno próprio; responder no turno adversário consome só a reserva; não reduz o básico do turno seguinte; reserva máxima 180; reserva zerada aplica os timeouts homologados; sem decisão atribuída o relógio pausa; cinemáticas não são cobradas | Homologação complementar, 28/10/2026 | G3-024–G3-027 | Impl | `clock.js clockIdle`, `clockHandTo`; testes "G3-031" |
| G3-032 | **"Seal that Devotee"** adiciona exatamente 1 marcador Seal; aplicações sucessivas acumulam (responde P-SEAL-1) | Autor, 28/10/2026 (opção A) | D211, D212 | Impl | `gods.js SEAL_THAT_DEVOTEE`; teste "G3-032" |
| G3-033 | **Prepare redundante**: Devotee já Prepared que recebe Prepare não perde marcadores Seal (Prepared com 2 marcadores continua Prepared com 2). Unprepared segue a D211 (responde P-SEAL-2) | Autor, 28/10/2026 (opção A) | D211 | Impl | `core.js prepareUnit`; teste "G3-033" |
| G3-034 | **Descarte do Great Flood**: o jogador cuja mão é afetada escolhe as cartas, na quantidade da D232; o controlador de Poseidon não escolhe. Timeout dessa escolha obrigatória: G3-030 (responde P-FLOOD-1) | Autor, 28/10/2026 (opção A) | D232, G3-030 | Impl | `gods.js resolveGreatFlood`; testes "G3-034" |
| G3-035 | **Cosmo Base entra Prepared**: a carta colocada como Cosmo Base (D4) já entra Prepared e pode pagar custo no mesmo turno; o limite de uma Base por turno não muda | Autor, 28/10/2026 | D4 | Impl | `core.js placeBase`; teste "G3-035" |
| G3-036 | **Strike anulado**: se o atacante ou o Devotee alvo sai do campo antes do dano (ex.: Moment na janela de resposta), o Strike é anulado — sem dano e sem retaliação; o Strike continua contado como usado | Autor, 28/10/2026 | P04, P06 | Impl | `strike.js resolveStrike` (`strike_fizzled`); teste "G3-036" |
| G3-037 | **Compra de 1 carta por turno**: a partir do 2º turno próprio, o jogador compra 1 carta no início do turno (antes: 2). Sem compra no 1º turno, como antes | Autor, 28/10/2026 | D3 | Impl | `core.js DRAWS_PER_TURN`; teste "G3-037" |
| G3-038 | **Guardian protege sempre**: qualquer Devotee inimigo com Guardian em campo, Prepared ou não, obriga o Strike a mirar um Guardian (antes, só Guardian Prepared). Nimble continua ignorando; Cheater ignora só contra God (P05 A) | Autor, 28/10/2026 | P05 A, guia §12 | Impl | `strike.js checkStrike`; teste "G3-038" |
| G3-039 | **Training counter é +1/+1**: cada Training counter dá +1 ATK / +1 HP ao Devotee, acumulando (2 = +2/+2), com ou sem Eagle Marin. Master's Guidance (021) continua somando +1/+1 aos Bronze Saints com Training counter enquanto Marin estiver no campo | Autor, 28/10/2026 | guia §48A | Impl | `effects.js mods`; teste "G3-039" |
| G3-040 | **Lendário só para guerreiros**: a regra de um Devotee por personagem (guia §63) vale só para Saints, Marines, Satellites, Specters e Berserkers. Warrior, Support e Devotees sem classe podem ter várias cópias no campo | Autor, 28/10/2026 | guia §63 | Impl | `effects.js namedCharacter`; teste "G3-040" |

## Procedimentos canônicos implementados (God Athena)

| Habilidade | Tipo | Decisões | Implementação |
| --- | --- | --- | --- |
| Cosmo of Hope | Divine Power, Triggered | D225, D198 | Atacante ou defensor Athena que sobrevive; uma vez por Round; +1 Latent (teto 3); não resolve se a partida acabou |
| Divine Protection | Awaken 5: Passive +1/+1 e prevenção opcional | D200, D205, D199 | +1/+1 para Athena Devotees enquanto Awaken; Defeat prevenível: pode pagar 3 Latent, dano vira HP − 1 |
| Athena Exclamation | Ultimate | D229, D230, D228, D205, G3-005/006/023 | Escolha e pagamento no anúncio; validação na resolução; snapshot de ATTACK; Defeat imprevenível; Lose Soul |
| Divine Judgment | Contador + ação de remoção | D218, D206, D204 | Um por God, prazo fixo no checkpoint do Round seguinte; remoção Sorcery com 3 sacrifícios; guarda de identidade do contador |

## Conflitos e lacunas

| # | Item | Tipo | Efeito no Alpha |
| --- | --- | --- | --- |
| 1 | Poseidon: God e Seal implementados; **catálogo Poseidon V6 não existe como canônico** (4 fichas PARCIAL). Ver `POSEIDON-V6-RECUPERACAO.md` | Pendente | God Poseidon jogável só com deck fixture rotulado |
| 2 | Hades, Artemis, Ares | Fora do Alpha | Sem deck |
| 3 | Identidade de personagem | Resolvido (G3-029) | Tabela explícita; Devotees genéricos sem personagem = lacuna |
| 4 | Critério determinístico de `TIMEOUT_AUTO_CHOICE` | Resolvido (G3-030) | — |
| 5 | Ordenação de gatilhos próprios pelo jogador (Spec §5.7) | Pendente | Ordem atual: a de criação |
| 6 | Diálogo de escolha assíncrono ("you may") | Técnico | `ctx.decide` é síncrono; a UI usa diálogo do navegador |
| 7 | Estado completo serializável para reconexão remota | Técnico | Cadeia guarda funções |
| 8 | Duração de timeout em situações excepcionais, abandono, reserva após desconexão | Não homologado | Não implementado |

Nenhum G3 contradiz D1–D268 nos pontos verificados (D52, D150, D186, D187, D191, D198–D200, D204–D206, D218, D225, D228–D230).

## Procedimentos canônicos implementados (God Poseidon)

| Habilidade | Tipo | Decisões | Implementação |
| --- | --- | --- | --- |
| Seal (mecânica) | Marcadores | D211, D212 | `core.js addSeal`, `prepareUnit`: cada Prepare remove 1 marcador em vez de preparar; N marcadores atrasam N Prepares; não é stun nem cancela Strike |
| Water Prison | Divine Power, Triggered | D198, D212, D263, D268 | Strike legal de Devotee inimigo; 2 Latent opcional; recusar não gasta uso; pagar gasta mesmo sem Seal |
| Pressure of the Deep | Awaken 4 | D211, D233, D234, D264–D267 | Um gatilho por Devotee em transição 0 → ≥1 Seal, inimigo no instante; Mill 2 do controlador gravado; compra 1 |
| Great Flood | Ultimate, 8 Cosmo (Base, G3-023) | D207, D231, D232, D253, G3-005/006 | Retorno simultâneo de Devotees e Equipment; uma Base por Devotee escolhida por quem a controla; descarta metade (para cima); Mill 3 por descarte |

P-SEAL-1, P-SEAL-2 e P-FLOOD-1 foram respondidas pelo autor (G3-032, G3-033, G3-034). Continua `NotSpecified`: Water Prison em atacante já Sealed (D269, não aprovada).
