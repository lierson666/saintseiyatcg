# COSMO BALANCE ENGINE 1.0: entrega inicial

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

Imprime o resumo e grava `card-forge/out/cosmo-balance-report.json` (fora do git).

```bash
node --test tools/test-cosmo-balance.mjs
```

## Estrutura

| Arquivo | Papel |
| --- | --- |
| `card-forge/cosmo-balance/config.js` | Parâmetros experimentais, versão e hash estável |
| `card-forge/cosmo-balance/normalize.js` | Inventário e leitura estruturada dos textos; frase desconhecida vira `UNRESOLVED` |
| `card-forge/cosmo-balance/engine.js` | `CosmoBalanceEngine`: dimensões, custo efetivo, grupos, classificação, confiança |
| `card-forge/cosmo-balance/proposals.js` | Propostas testadas numa cópia da carta |
| `card-forge/cosmo-balance/engine-index.json` | Gerado: ganchos e chamadas que cada carta tem em `playtest/engine-v3`, e decks de teste que a usam |
| `card-forge/cosmo-balance/dashboard.js`, `card-forge/balance.html` | Dashboard |
| `tools/cosmo-balance-sim.mjs` | Ponte preparada para simulação headless |

## Fontes de verdade dos efeitos

A estrutura canônica de efeito não existe nos dados: `data/cards.json` só traz texto (`habilidades_en`, `habilidade_awaken_en`, `ultimate_en`) e campos numéricos. A Engine resolve efeitos por id, em `playtest/engine-v3/v6/*.js` (ganchos do contrato de `v6/registry.js`, ações de `v6/kit.js`), e parte da Athena por número em `effects.js`. Por isso o motor cruza as duas fontes:

1. O texto gera habilidades normalizadas: tipo, gatilho, frequência, custo, efeitos, alvo, duração e condição.
2. `engine-index.json` diz o que está implementado. Cada efeito fica `confirmado`, `nao_confirmado`, `tabela_numerica`, `god` ou `sem_engine`. Isso entra na confiança e aparece na tela.
3. A frase sem padrão conhecido fica `UNRESOLVED`, com valor zero na soma, e é listada. O valor nunca é chutado. Quando o texto diz "equal to …", usa-se um valor provisório e a carta é marcada como estimada.

## Modelo

`PowerScore = Body + Keyword + Effect + Synergy + Timing + Interaction - Restriction`. `ConsistencyScore` fica fora da soma: é a chance ponderada de os efeitos acontecerem e alimenta confiança e incerteza.

- **Corpo de Devotee:** `0.60 × Attack + 0.40 × HP` (configurável).
- **Âncora:** a régua do §65 (custo N, Power N, HP N+1) vale N + 0,4 pelo corpo. `cardOpportunity = 0.4` faz esse vanilla dar desvio zero. É a única calibragem com base no guia.
- **Custo efetivo:** custo impresso + oportunidade + custo adicional + Equip esperado (peso menor com Resonance, §28 e §33). A faixa de incerteza vem da confiança.
- **God e Domain:** não têm custo de entrada (§63) e são comparados à mediana dos pares. O campo `custo` que Domains têm nos dados é ignorado.
- **Soul:** sai da carta de cada God (Athena 25, Poseidon 26, Hades 24, Artemis 25, Ares 21). A tabela do §65 está desatualizada, e o próprio guia aponta a carta como fonte. Pagar Soul pesa conforme o seu God; causar dano pesa conforme a média dos adversários.
- **Frequência (§64):** "once each round" renova nos dois Rounds do ciclo; "once each cycle", uma vez. "Activate only during your round" conta como uma vez por ciclo.
- **Moment:** ganha prêmio de resposta só com custo até 3, porque no turno adversário paga só em Latent, com limite de 3 (§5 e §56).
- **Raridade:** é lida e nunca pontua.

**Classificação:** usa o desvio relativo à mediana do grupo (classe × faixa de custo; grupo com menos de 8 cartas usa a classe). `|desvio| ≤ 10%` Balanceada; até 25% Acima ou Abaixo da curva; além disso, Potencialmente quebrada ou Muito fraca. Diferença menor que 0,25 de Cosmo conta como ruído. Vai para Análise inconclusiva a carta cortada, sem atributo ou custo canônico, com menos de 60% das frases lidas ou com confiança abaixo de 0,25.

**Reprodutibilidade:** o resultado não tem sorteio nem data. Cada análise registra `engineVersion`, `catalogVersion`, `catalogHash`, `configHash`, `engineIndexHash` e `seed` (a seed ainda não é usada pelo motor; fica para a simulação).

## Resultado desta entrega (04/11/2026)

Motor `1.0.0-inicial`, catálogo `athena-vanilla-v6` hash `ec8c3f53`, parâmetros `b3e59094`, índice `99956838`, seed 1.

O catálogo lido é o `data/cards.json` da árvore de trabalho, com mudanças ainda não commitadas de outras sessões (38 linhas a mais, 31 a menos). Este trabalho não tocou nesse arquivo.

- **Cartas analisadas:** 529 (3 cortadas: poseidon-v6-146, 147 e 148).
- **Efeitos não resolvidos:** 20 cartas com frase `UNRESOLVED` (24 frases de 1352).
- **Engine:** 482 cartas no registro V6, 28 em tabela numérica, 5 Gods, 14 sem entrada: as 3 cortadas, 9 de Hades com texto (186, 188, 190, 196, 198, 246, 247, 248, 249) e 2 sem habilidade (athena-v6-040, neutral-v6-457). Texto sem entrada na Engine não tem efeito em partida.

| Classificação | Cartas |
| --- | --- |
| Muito fraca | 92 |
| Abaixo da curva | 90 |
| Balanceada | 152 |
| Acima da curva | 68 |
| Potencialmente quebrada | 116 |
| Análise inconclusiva | 11 |

Confiança do modelo: 430 alta, 84 média, 15 baixa. Essa confiança mede leitura e prova na Engine, não acerto contra partidas.

Mediana do desvio por facção: Artemis +22,8%, Athena −1,0%, Ares −1,5%, Hades −4,8%, Poseidon −5,6%, Neutral −15,2%. O sinal de Artemis coincide com a medição sem rigor, em que Artemis Hunt ficou em 62%; o de Ares não coincide (Legions 71%, Rush 66%), o que indica que o modelo não captura a força de Ares em partida.

Maiores discrepâncias, para cima: The Hunter's Moon, Hades (God), Primal Growth, Huntress's Net, Sacred Hunting Knife, Marina Spearman. Para baixo: Fuel the Rage, Unleash the Fury, Jango, Black Phoenix, Divine Judgment, The Eighth Sense. A lista completa está na tela. Nada disso é veredito: Unleash the Fury, por exemplo, mata o próprio Devotee e o modelo não enxerga o letal.

## Limitações

- **Sem calibragem:** valores de efeito, chances de gatilho e vida em ciclos são hipóteses. Só o corpo tem âncora no guia.
- **Dispersão alta:** 208 cartas nas pontas não significa 208 cartas erradas. Em 103 cartas a incerteza cobre a curva, e a tela avisa. A proporção alta reflete tanto o modelo quanto o catálogo.
- **O desvio bruto não compara tipos:** Equipment e Spell ficam abaixo do custo de forma sistemática. A normalização por grupo compensa, mas também esconde um tipo inteiro forte ou fraco.
- **Leitura por padrões:** "resolvida" quer dizer que um padrão reconheceu a frase, não que captou todas as nuances. "Sem erro de leitura" não foi verificado carta a carta; houve auditoria por amostra.
- **Prova na Engine aproximada:** vem de análise de texto do código e de ajudantes por nome; pode confirmar a mais. Tabela numérica e Gods só provam que existem.
- **Carta isolada:** não mede combos reais, curva de deck, letal, tempo, nem o que o oponente faz. Sinergia só conta cartas da tribo no catálogo.
- **Gods:** são 5 pares, e a classificação fica com confiança baixa ou média.
- **Parâmetros do guia desatualizados:** §65 ainda cita Attack de God e Soul antigos, e o cap. XI cita compra 2; vale o texto mais recente (§24, §55, §63).

## O que está pronto e o que depende de calibragem

Pronto: inventário, normalização, motor configurável, classificação preliminar, dashboard, propostas não destrutivas, 26 testes, ponte de simulação.

Depende de calibragem: pesos de efeito e keyword, probabilidades de gatilho, vida esperada, faixas por tipo.

Calibragem prevista, não executada:

```bash
node tools/cosmo-balance-sim.mjs --games 50 --level hard --seed 1
```

A ponte joga partidas espelhadas com iniciativa invertida (§65), com semente fixa e intervalo de Wilson por deck. **Os agentes não são competitivos:** são a IA heurística do playtest, sem aprendizado, sem deckbuilding e com vantagem conhecida de quem começa. O resultado é sinal de calibragem, não metagame real. Só foi feito um teste de fumaça (6 partidas), sem valor estatístico. Há um bug aberto em Poseidon × Ramp, `TypeError … reading 'cardId'`, que a ponte conta como erro.

## Fora desta entrega

Métricas combativas, simuladores de alteração, histórico, exportação, governança e publicação versionada. COSMO CODEX não existe neste repositório, só menções em documentos (`docs/equipment-system-v1.md`); a governança fica sem destino até que ele exista.
