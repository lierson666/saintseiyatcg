# COSMO BALANCE ENGINE 1.1 + BALANCE-PATCH-001-EXPERIMENTAL

Ferramenta interna do ambiente Developer, em `CARD FORGE > COSMO BALANCE` (`card-forge/balance.html`). Não é regra do jogo, não altera cartas e não publica nada. Toda sugestão é proposta para o autor; a precedência continua `guia-do-jogo.md` > `cards.json` > código.

## Como rodar

```bash
python3 card-forge/serve.py
```

Abra `http://localhost:8765/card-forge/balance.html`. A tela calcula no navegador e não grava. Fora de máquina local ou de host `dev.`, ela só mostra um aviso.

```bash
node tools/cosmo-balance-index.mjs
```

Refaz `card-forge/cosmo-balance/engine-index.json` quando a Engine de partida mudar.

```bash
node tools/cosmo-balance-report.mjs
```

Imprime o resumo e grava `card-forge/out/cosmo-balance-report.json` e `card-forge/out/cosmo-balance-1.1.csv` (fora do git). `--calibrate` imprime o `effectScale` que zera a mediana de cada classe, sem gravar.

```bash
node tools/cosmo-balance-patch.mjs validate
```

Valida o patch. `status <STATUS> --by <nome>` muda o estado; `record-sim --by <nome>` registra a simulação no patch.

```bash
node tools/cosmo-balance-sim.mjs --games 20 --level hard --seed 1 --scenarios A,B,C
```

Roda os cenários e grava `card-forge/out/cosmo-balance-sim.json`. `--ablations 001,002` acrescenta a ablação de cada proposta; `--dry-run` só mostra o plano.

```bash
node --test tools/test-cosmo-balance.mjs
```

## Estrutura

| Arquivo | Papel |
| --- | --- |
| `card-forge/cosmo-balance/config.js` | Parâmetros experimentais, versão e hash estável |
| `card-forge/cosmo-balance/normalize.js` | Inventário e leitura estruturada dos textos; frase desconhecida vira `UNRESOLVED`, frase lida pela metade vira `PARTIAL` |
| `card-forge/cosmo-balance/engine.js` | `CosmoBalanceEngine`: dimensões, custo efetivo, desvios, classificação, confiança, ledger |
| `card-forge/cosmo-balance/effect-library.js` | Biblioteca de equivalências: efeito, regra, chamadas da Engine e contexto |
| `card-forge/cosmo-balance/proposals.js` | Propostas testadas numa cópia da carta |
| `card-forge/cosmo-balance/patches.js` | Validação, aplicação em memória, reversão e fluxo de estados dos patches |
| `card-forge/cosmo-balance/patches/balance-patch-001.json` | As 12 propostas do patch experimental |
| `card-forge/cosmo-balance/panels.js`, `dashboard.js`, `card-forge/balance.html` | Painéis |
| `card-forge/cosmo-balance/export.js` | Exportação Excel |
| `card-forge/cosmo-balance/engine-index.json` | Gerado: ganchos e chamadas que cada carta tem em `playtest/engine-v3`, e decks de teste que a usam |
| `tools/cosmo-balance-sim.mjs`, `tools/cosmo-balance-overrides.mjs` | Simulação pela Engine 3.0, com mudanças só na memória do processo |

## Fontes de verdade dos efeitos

A estrutura canônica de efeito não existe nos dados: `data/cards.json` só traz texto e campos numéricos. A Engine resolve efeitos por id, em `playtest/engine-v3/v6/*.js`, e parte da Athena por número em `effects.js`. Por isso o motor cruza as duas fontes:

1. O texto gera habilidades normalizadas: tipo, gatilho, frequência, custo, efeitos, alvo, duração e condição.
2. `engine-index.json` diz o que está implementado. Cada efeito fica `confirmado`, `nao_confirmado`, `tabela_numerica`, `god` ou `sem_engine`.
3. A frase sem padrão conhecido fica `UNRESOLVED`, com valor zero na soma, e entra no ledger. O valor nunca é chutado. Frase com verbo reconhecido e efeito não lido fica `PARTIAL`, com penalidade, e a carta vai para Análise inconclusiva.

## Modelo

`PowerScore = Body + Keyword + Effect + Synergy + Timing + Interaction - Restriction`. `ConsistencyScore` fica fora da soma e alimenta confiança e incerteza.

**Desvios:**

- `absoluteDeviation = PowerScore - effectiveCost`
- `relativeDeviation = absoluteDeviation / max(effectiveCost, epsilon)`, com `epsilon` configurável (`bands.epsilon`, hoje 0,5)
- Custo zero usa faixas próprias, em Cosmo (`bands.zeroCost`).
- A classe vem só de `relativeDeviation`. Desvio negativo nunca classifica como excesso: a 1.1 tem 0 conflitos de sinal.
- `normalizedDeviation` (relativo à mediana do grupo) ficou só como contexto.

**Corpo de Devotee:** `0.60 × Attack + 0.40 × HP`, configurável. A régua do §65 (custo N, Power N, HP N+1) vale N + 0,4, e `cardOpportunity = 0.4` faz esse vanilla dar desvio zero. Logo, 0.60/0.40 não contradiz o §65.

**`effectScale`:** multiplica o valor de efeito por classe, para compensar que os valores da biblioteca não tinham a mesma escala nos tipos. Foi ancorado na mediana do catálogo, não em partidas: **Devotee 0,47, Moment 1,7, Technique 1,91, Equipment 2,5**. Equipment pediria 3,44 para zerar a mediana; o autor confirmou o teto de 2,5, por isso a mediana fica em −13,6%. Isso assume que o catálogo, na média de cada classe, está na curva: não mede se uma classe inteira é forte ou fraca.

**Domain:** avaliador próprio. Custo efetivo = entrada + custo adicional + `slotOpportunity`, a mediana de Power dos outros Domains da facção (§63: um slot por Domain). A entrada vem de `domain.entryCostSource`: `'guide'` (0, §63) ou `'printed'`.

**God:** sem custo artificial, sempre Análise inconclusiva, sem proposta de ajuste. O Power aparece só como informação. §24: God não tem Attack.

**Sinergias não aditivas:** `synergy.interactions` trata Impulse+Pierce, Guardian+buffs defensivos, Training+efeitos globais, Training+Cosmo Base, Reanimação+ETB, Seal+combate, Equipamentos+múltiplos bônus e Sacrifício+Tartarus, com saturação. Interações não somam linearmente.

**Soul:** sai da carta de cada God. Pagar Soul pesa conforme o seu God; causar dano pesa conforme a média dos adversários.

**Frequência (§64):** "once each round" renova nos dois Rounds do ciclo; "once each cycle", uma vez.

**Raridade:** é lida e nunca pontua.

**Reprodutibilidade:** o resultado não tem sorteio nem data. Cada análise registra `engineVersion`, `catalogVersion`, `catalogHash`, `configHash`, `engineIndexHash` e `seed`.

## Balance patches

Fluxo: `DRAFT → READY_FOR_TEST → TESTED → APPROVED → PUBLISHED`.

- `PUBLISHED` está bloqueado nesta versão.
- `APPROVED` exige autor humano.
- `TESTED` exige simulação registrada.
- A mudança de estado é por CLI; a tela só mostra.
- `applyPatch` lança erro fora de `env: 'developer'`, trabalha numa cópia e nunca grava em `data/cards.json`.

Cada proposta passa por 6 passos em `validateProposal`. Divergência entre proposta e catálogo vira `NEEDS_REVIEW`.

As propostas 003, 004, 005 e 009 mudam número que está no código da carta. Na simulação entram por override em memória (`tools/cosmo-balance-overrides.mjs`). Publicá-las exigiria mudar a Engine.

## Resultado do motor (04/11/2026)

Motor `1.1.0`, catálogo hash `db306e8c`, parâmetros `bc4753d6`, índice `99956838`, seed 1.

O catálogo lido é o `data/cards.json` da árvore de trabalho, com mudanças não commitadas de outras sessões. Este trabalho não tocou nesse arquivo.

- **Cartas:** 529, sendo 3 cortadas.
- **Não resolvidas:** 20 cartas `UNRESOLVED` (24 frases) e 1 `PARTIAL` (ares-v6-330). Ledger com 25 itens.
- **Sem Engine:** 12 cartas com texto. Texto sem entrada na Engine não tem efeito em partida.

| Classificação | 1.0 | 1.1 |
| --- | --- | --- |
| Muito fraca | 92 | 116 |
| Abaixo da curva | 90 | 77 |
| Balanceada | 152 | 125 |
| Acima da curva | 68 | 62 |
| Potencialmente quebrada | 116 | 123 |
| Análise inconclusiva | 11 | 26 |

Confiança do modelo: 429 alta, 84 média, 16 baixa. Em 107 cartas a incerteza cobre a curva.

**Falsos positivos da 1.0:** 62 cartas (Equipment 39, Moment 15, Technique 8) tinham Power abaixo do custo e classe de excesso, mais 6 falsos negativos. Na 1.1 restam 0 por sinal. **Dessas 62, 37 seguem Potencialmente quebrada e 10 Acima da curva, agora com Power acima do custo, porque o `effectScale` subiu o Power.** Isso não prova que eram fortes.

Mediana do desvio relativo por classe: Devotee 0, Moment ~0, Technique ~0, Domain +4,8%, Equipment −13,6%. Por facção: Artemis +24%, Ares +3,1%, Athena +2,4%, Poseidon −5,5%, Hades −10,8%, Neutral −18,8%.

Domain: custo efetivo de 0,893 a 2,464. Os percentuais são altos porque o denominador é pequeno (Forge of War +307%).

Gods: Power informativo Hades 10,97, Poseidon 6,2, Athena 3,7, Ares 2,19, Artemis 2,13. Três deles têm frase `UNRESOLVED`.

## BALANCE-PATCH-001 (DRAFT, nada publicado)

Todas as 12 propostas estão `VALIDATED`. O desvio é só a pontuação do motor, antes e depois:

| Proposta | Antes | Depois |
| --- | --- | --- |
| 001 | +209% | +80% (quebrada) |
| 002 | +48% | −14% (Abaixo) |
| 003 | +60% | +50% |
| 004 | +37% | +29% |
| 005 | +51% | +42% |
| 006 | +97% | +15% (Acima) |
| 007 | +154% | +48% |
| 008 | +57% | +11% (Acima) |
| 009 | +107% | +78% |
| 010 | −71% | −50% |
| 011 | −40% | −29% |
| 012 | −95% | −93% |

Distribuição A/B/C: quebrada 123/120/120, Acima 62/64/64, Abaixo 77/78/78, demais iguais.

A proposta 009 reduz a perda de Soul do alvo: é nerf, embora esteja no grupo de ajustes.

## Decisões do autor (04/11/2026)

- **Domain:** segue o §63, sem custo de entrada.
- **God:** segue o §24, sem Attack. A análise específica fica para etapa própria.
- **`effectScale`:** fica provisório, com Equipment em 2,5. A classificação não é veredito até calibrar com partidas.
- **003, 004, 005 e 009:** ficam no patch, com aviso de que publicar depende de mudar a Engine.
- **009:** segue no grupo B, rotulada como nerf.
- **Patch:** segue em `DRAFT` até ordem do autor.

## Simulação

**Não executada nesta entrega, por decisão do autor (04/11/2026).** A rodada A/B/C com ablação foi interrompida antes de gravar resultado. Não há dado de partida para o patch: taxa de vitória, ablação e métricas dos cenários seguem sem medição, e os números acima vêm só do motor. O patch não pode passar de `READY_FOR_TEST` sem simulação registrada. A ferramenta segue pronta (`tools/cosmo-balance-sim.mjs`).

## Limitações

- **Sem medição em partida:** nenhuma proposta foi simulada nesta entrega.
- **`effectScale` não vem de partidas:** vem da mediana do catálogo. Uma classe inteira forte ou fraca fica escondida. Só o corpo tem âncora no guia.
- **Dispersão alta:** 239 cartas nas pontas não significa 239 cartas erradas. A proporção reflete tanto o modelo quanto o catálogo.
- **Leitura por padrões:** "resolvida" quer dizer que um padrão reconheceu a frase, não que captou todas as nuances.
- **Prova na Engine aproximada:** vem de análise de texto do código; pode confirmar a mais.
- **Carta isolada:** não mede combos reais, curva de deck, letal, tempo, nem o que o oponente faz.
- **Gods:** são 5, sem par comparável. Por isso ficam sem classificação.
- **Agentes da simulação não são competitivos:** IA heurística do playtest, sem aprendizado, sem deckbuilding, sem metagame. O resultado é sinal de calibragem.

## Fora desta entrega

Publicação de patch, aprovação pela tela e calibragem do `effectScale` com partidas. COSMO CODEX e `/alpha` não existem neste repositório: não há integração com eles.
