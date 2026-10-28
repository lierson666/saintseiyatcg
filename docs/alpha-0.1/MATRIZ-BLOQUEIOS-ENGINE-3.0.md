# Alpha 0.1: matriz de bloqueios do turno completo da engine 3.0

Auditoria de 28/10/2026. Este documento não cria regra nem aprova decisão. D269 é proposta e fica fora da matriz.

## Fontes e classificação

| Sigla | Fonte | Peso |
| --- | --- | --- |
| **C** (canônico) | Texto integral aprovado: D191 (doc 06) e D192–D268 (JSON do doc 04 e doc 03) | Autoridade |
| **C\*** (citação canônica) | Uma decisão de D1–D191 citada *dentro* de um registro aprovado de D192–D268. O conteúdo vem da citação; o texto original não foi recuperado | Vale só o que a citação diz |
| **S** (secundário) | Recapitulação do doc 05 ("não normativo", "CONFIRMAR") | Pista; não autoriza implementar |
| **H** (hipótese) | Nenhuma fonte; nada da 2.2 nem da Vanilla 1.0 é usado | Não implementar |

Fontes primárias procuradas sem resultado: o repositório (todos os branches e mensagens de commit), arquivos locais (`mdfind`) e o Drive (busca por texto: "Turno Livre", "Fatigue", "D171", "D186", "Handbook_3_0"). Não há transcrição de D1–D190 fora das citações abaixo.

## Matriz por mecânica do turno

| # | Mecânica | O que existe | Fonte | Estado | Bloqueia o turno 3.0? |
| --- | --- | --- | --- | --- | --- |
| 1 | Definição de Round | Um turno completo de cada jogador, na ordem do jogador inicial. "Once each round" renova no Round seguinte, e "until end of round" cobre os dois turnos | D191 | **C** | Não |
| 2 | Checkpoint de fim de Round | No 2º turno: após os efeitos normais da End Phase e antes do Cleanup, os gatilhos entram em APNAP e LIFO, com respostas normais; depois vem o Cleanup e o novo Round | D204 (resolve a nota em aberto da D191) | **C** | Não |
| 3 | Turno livre (ações em sequência, sem microações alternadas) | Opção A, "Turno Livre" | D1 (doc 05) + princípio do Handbook 3.0 | **S** | **Sim**: falta o texto. A direção é clara, mas não há a regra exata |
| 4 | Preparação no início do turno | "Preparação Automática", opção A. Não diz o que prepara (Devotees, Bases, Gods) nem em que ordem | D2 (doc 05) | **S** | **Sim** |
| 5 | Compra no turno | 2 cartas por turno a partir do 2º turno próprio | D3 (doc 05) | **S** | **Sim** (falta confirmar) |
| 6 | Sem compra no 1º turno de cada jogador | Citada no texto integral da D191 | D170 | **C\*** | Não, para esse ponto específico |
| 7 | Mão inicial e mulligan | Nada aprovado para a 3.0. A 2.0 tem procedimento, mas o doc 05 diz que isso não prova aprovação | — | **H** | **Sim** |
| 8 | Cosmo Base | 1 Base Cosmoble por turno; Bases preparadas no início do turno | D4 (doc 05) | **S** | **Sim** (falta confirmar) |
| 9 | Latent: conversão | Cosmo Base não usado vira Latent ao encerrar o turno. O timing exato falta | D5 (doc 05) | **S** | **Sim** |
| 10 | Latent: limite 3 | `max_latent: 3`; "up to the normal limit of 3" | D198, D226 | **C** | Não |
| 11 | Velocidade padrão | Sorcery Speed por padrão | D173 (citado na D195) | **C\*** | Não |
| 12 | Moment e Technique | Moment usa Latent e Instant Speed; Technique usa Base e Sorcery Speed (18 cartas listadas) | D194 | **C** | Não |
| 13 | Limite de Strike | Um Strike por Devotee por turno próprio. Preparar de novo não renova | D22 (citado nos registros da D212 e das decisões de Ares, D210–D244) | **C\*** | Não, para o limite |
| 14 | Declaração, alvo e retaliação do Strike | Só citações: "do not prevent defender retaliation" (D202); retaliação de God (D248, D249). Falta o procedimento: quem pode ser alvo, custo de declarar, como funcionam a retaliação e o dano | — | **H** | **Sim**: sem isso não há combate |
| 15 | Guardian | Nenhum texto de D1–D191 recuperado; a 2.x tem a regra própria dela | — | **H** | **Sim**, se os decks usarem Guardian |
| 16 | Seal | A D212 diz só que Seal sozinho não impede o Strike; a D211 trata o gatilho de "becomes Sealed" | D211, D212 | **C** (parcial) | Parcial |
| 17 | LIFO | "Stack LIFO preserved"; o gatilho entra na cadeia normal na declaração do Strike | D186 (citado na D202 e na D204) | **C\*** | **Sim**: falta a mecânica da pilha (quem recebe prioridade, quando fecha) |
| 18 | APNAP e indivisibilidade | Sem janela de prioridade dentro de um Strike em resolução nem dentro de objeto indivisível da cadeia | D187 (citado na D204 e na D210) | **C\*** | **Sim**: mesma lacuna da linha 17 |
| 19 | End Phase e Cleanup | "Reactions de End Phase antes do Cleanup preservadas". As 4 cláusulas não foram recuperadas | D60–D63 | **C\*** (só existência) | **Sim** |
| 20 | Prevenção e substituição | Avaliadas imediatamente antes do evento, sem janela de prioridade; ordem de substituições concorrentes | D199, D53, D150 | **C** + **C\*** | Não |
| 21 | Defeat | Defeat de Devotee = Destroy; "can't be prevented" | D197, D205, D161, D178 | **C** + **C\*** | Não |
| 22 | Armor ao sair o Devotee | Vai para o Tartarus do Owner, salvo instrução explícita | D40, D90 (citados na D207) | **C\*** | Não |
| 23 | {T} de Equipment | O Equipment concede o {T}; o Devotee precisa estar Prepared e vira Unprepared como custo | D192, D24 | **C** + **C\*** | Não |
| 24 | Mill com deck curto | Sequência canônica | D233 | **C** | Não |
| 25 | Vitória: Soul 0 | Encerra imediatamente, antes de efeitos pendentes | D52 (citado na D204) | **C\*** | Não |
| 26 | Empate e loop | Os dois Gods em 0 empatam; loop obrigatório empata | D174 (doc 05) | **S** | Não para Soul 0; **sim** para empate |
| 27 | Deck vazio | "Fatigue", sem derrota automática. Valor e procedimento da Fatigue ausentes | D174 (doc 05) | **S** | **Sim**: o Alpha pede vitória por esgotamento, e a Vanilla 1.0 diz que perde |
| 28 | Limite de cópias | 3 por identidade mecânica (D171) contra 4 (Rulebook 2.x, Vanilla 1.0) | D171 (doc 05) | **S** + conflito | **Sim** para validar os decks |
| 29 | God e Domain fora do deck | Domains sem custo e sem Cosmoble no texto exibido | D196 | **C** | Não |

## Conflito de cópias (D171)

- **Doc 05:** "limite 3 cópias por carta distinta/identidade mecânica no deck de 60 … CONFIRMAR contra decisão original".
- **`docs/guia-do-jogo.md:44`** (2.x): "O limite é de 4 cópias por identidade de carta".
- **Efeito nos decks escolhidos** (`data/bronze-decks-v6.json`):
  - Pegasus Rush (`rulebook2-athena`) tem 7 cartas com 4 cópias: 001, 002, 021, 028, 053, 054, 060.
  - Dragon Fortress (`rulebook2-shiryu`) tem 9 cartas com 4 cópias: 003, 004, 011, 037, 040, 041, 042, 045, 058.
- Com limite 3, as duas listas ficam **inválidas**. Faltariam 7 e 9 cartas para fechar 60. Escolher quais cartas entram é decisão de deckbuilding; não é regra, mas também não vou inventar.

## Bloqueios reais para um turno completo

Sem resolver os itens abaixo, não dá para simular uma partida 3.0 sem inventar regra:

1. Texto aprovado de D1–D5: turno livre, preparação, compras, Cosmo Base e conversão para Latent.
2. Mão inicial e mulligan da 3.0.
3. Procedimento do Strike: alvo, declaração, retaliação e Guardian.
4. Mecânica da pilha: D186, D187 e D60–D63.
5. Deck vazio, com a Fatigue da D174.
6. Limite de cópias da D171.

## Trabalho técnico seguro, isolado

Nada disto toca `playtest/engine-v2.js`, `data/cards.json` nem as mudanças de outras sessões. Tudo vai em branch próprio, criado com `git worktree`, sem reset nem stash.

1. **Snapshot canônico**: gravar o JSON D268 em `data/canon/d268.json` (somente leitura), com o SHA-256 da projeção.
2. **Verificador de integridade**: script mais teste que confere `original_sha256` dos 95 registros, garante a 019 inalterada e compara o `data/cards.json` vigente com o D268, campo a campo, só como relatório.
3. **Validador de deck parametrizado**: 60 cartas, Domain fora, limite de cópias configurável (3 ou 4 até a D171 ser confirmada) e Legendary separado.
4. **Núcleo 3.0 só com regras C e C\*, com testes**:
   - contador de Round e turno (D191);
   - durações "once each round", "until end of (this/next) round" (D191);
   - checkpoint de fim de Round (D204);
   - Soul 0 imediato (D52);
   - Mill (D233);
   - teto de Latent em 3;
   - classificação Moment/Technique (D194);
   - limite de Strike por turno (D22).

   Os pontos bloqueados ficam como erro explícito ("não especificado"), nunca com comportamento padrão.
5. **Variantes de deck com 3 cópias** preparadas como rascunho, sem aplicar. Dependem da sua escolha das cartas.

## Respostas do autor (28/10/2026)

1. **Os resumos do doc 05 estão confirmados como aprovados para o Alpha 0.1:**
   - D1: turno livre;
   - D2: preparação automática;
   - D3: 2 compras a partir do 2º turno próprio;
   - D170: sem compra no 1º turno;
   - D4: 1 Base Cosmoble por turno, com as Bases preparadas no início;
   - D5: Base não usada vira Latent ao fim do turno, teto 3;
   - D171: limite de 3 cópias;
   - D174: deck vazio causa Fatigue.

   Com isso, as linhas 3, 5, 8, 26 e 28 passam a valer como **confirmação do autor**.
   Continuam sem texto: o que a preparação automática prepara (linha 4), o momento exato da conversão em Latent (linha 9), a mão inicial e o mulligan (linha 7) e o valor e procedimento da Fatigue (linha 27).
2. **Strike, Guardian e pilha** (linhas 14, 15, 17, 18 e 19): o autor vai redigir e aprovar o texto. A engine implementa só o que estiver escrito. A 2.x não preenche essas lacunas.

Consequência imediata: as duas listas de deck estão **inválidas** com limite 3 e precisam de versões experimentais corrigidas. As cartas de reposição dependem de escolha do autor ou de um critério que ele aprovar.

## Ainda não verificado

- O manual Vanilla 1.0, de 10 MB, não foi lido inteiro; ele não preenche lacunas.
- O Rulebook 2.1 legado no Drive não foi lido.
- O SHA-256 do arquivo fonte original não pode ser verificado: o doc 04 é uma projeção.

## Trabalho isolado entregue (branch `alpha-0.1`, 28/10/2026)

| Arquivo | O que faz | Teste |
| --- | --- | --- |
| `data/canon/d268.json` | Snapshot do doc 04 (projeção, SHA-256 `4cd05f98…4433`) | `tools/test-d268-integrity.mjs` |
| `tools/test-d268-integrity.mjs` | Confere os 95 hashes originais, a Kamui 019 congelada, a D268 como última e a D269 ausente | 5 testes |
| `shared/deck-v3.js` | Valida 60 cartas, Domain e God fora do deck e até 3 cópias (D171) | `tools/test-deck-v3.mjs`, 3 testes |
| `data/alpha-0.1/decks-experimentais.json` | Pegasus Rush e Dragon Fortress copiadas sem alteração; **inválidas** com 3 cópias | idem |
| `playtest/engine-v3/core.js` | Núcleo 3.0: D1, D3, D4, D5, D22, D52, D170, D174 (empate), D191, D194, D204, D233 e teto de Latent 3 | `tools/test-engine-v3-core.mjs`, 11 testes |

Lacunas que lançam `NotSpecified` em vez de inventar:
- o que a D2 prepara;
- a mão inicial e o mulligan;
- a Fatigue (D174);
- as respostas aos gatilhos de fim de Round (D186).

Dentro do núcleo, a Base nova entra **não preparada**. Essa é uma leitura literal da D4: só o início do turno prepara Bases. Precisa de confirmação.

O núcleo **ainda não está ligado** ao `/playtest`. `engine-v2.js` e o catálogo não foram tocados.
