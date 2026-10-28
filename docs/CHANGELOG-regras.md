# Changelog de regras

Toda mudança em `docs/guia-do-jogo.md` entra aqui, mais recente no topo.

Formato: `AAAA-MM-DD — Seção — antes → depois — motivo — pendências (cartas/engine/UI)`

## 2026-10-28 — Handbook 3.0 / Alpha 0.1 — Jogar Equipment e Spell da mão

- **Antes:** D192–D268 não definiam a relação entre Casting Cost, Auto-Equip e Equip {N}, nem o destino de uma Spell resolvida.
- **Depois (decisões do autor nesta data):**
  - Equipment: no Devotee nomeado em Auto-Equip, paga o Casting Cost; em outro Devotee permitido por "Equip {N}", paga N no lugar do Casting Cost. Sem portador legal, não pode ser jogado. É ação comum: não abre janela (P06).
  - Spell: Technique é Sorcery e paga Base; Moment é Instant e paga Latent (D194). Depois de resolver, a Spell vai para o Tartarus do Owner.
- **Motivo:** escolha do autor entre as opções apresentadas (custo alternativo; Tartarus do Owner).
- **Pendências:**
  - Spells sem categoria na D194 (por exemplo 053 e 060 da Pegasus Rush) não podem ser jogadas; a engine para com aviso;
  - 020 não tem Auto-Equip nem Equip {N}; a engine para com aviso;
  - os efeitos das cartas, incluindo "When you cast" (019), bônus de Equipment e HP de Armor, ainda não estão na engine 3.0;
  - o recurso de Equip {N} segue o do Casting Cost (Base em todas as cartas atuais).
- Vale para a engine 3.0 (`playtest/engine-v3/`); o `docs/guia-do-jogo.md` (2.x) não muda.

## 2026-10-28 — Handbook 3.0 / Alpha 0.1 — ALPHA-P07 opção A (Fatigue)

- **Antes:** D174 dizia que deck vazio causa Fatigue, sem derrota automática; a D233 citava Fatigue cumulativa de Soul, sem valor.
- **Depois:** toda vez que o jogador compraria de um deck vazio, o God dele perde Soul igual ao número de vezes que isso já lhe aconteceu na partida (1, 2, 3…). O contador nunca zera. Mill não causa Fatigue (D233). Soul 0 encerra na hora (D52).
- **Motivo:** aprovação do autor, opção A de `docs/alpha-0.1/PROPOSTAS-ALPHA-P01-P07.md`.
- **Pendências:** nenhuma deste item.
- Vale para a engine 3.0 (`playtest/engine-v3/`); o `docs/guia-do-jogo.md` (2.x) não muda.

## 2026-10-28 — Handbook 3.0 / Alpha 0.1 — ALPHA-P03 opção A (conversão de Base em Latent)

- **Antes:** D5 dizia que Base não usada vira Latent ao encerrar o turno, sem fixar o momento nem a forma do ganho.
- **Depois:** no início da End Phase, antes de qualquer efeito de End Phase, o jogador ganha 1 Latent por Base ainda Prepared, num único evento de ganho (D226). O excesso acima de 3 se perde.
- **Motivo:** aprovação do autor, opção A de `docs/alpha-0.1/PROPOSTAS-ALPHA-P01-P07.md`.
- **Pendências:** a interação com Moonlight Blessing (D226) só pode ser testada quando os efeitos de carta entrarem na engine 3.0.
- Vale para a engine 3.0 (`playtest/engine-v3/`); o `docs/guia-do-jogo.md` (2.x) não muda.

## 2026-10-28 — Handbook 3.0 / Alpha 0.1 — ALPHA-P01 opção A (setup)

- **Antes:** a 3.0 não tinha texto para mão inicial, mulligan e jogador inicial; a D170 só pressupunha uma mão.
- **Depois:** o jogador inicial é sorteado. Cada jogador compra 7. Começando pelo jogador inicial, cada um pode, uma vez, devolver ao deck quantas cartas quiser da mão, embaralhar e comprar o mesmo número. O 1º turno começa depois dos dois mulligans.
- **Motivo:** aprovação do autor, opção A de `docs/alpha-0.1/PROPOSTAS-ALPHA-P01-P07.md`.
- **Pendências:** nenhuma deste item. Com deck de 53 após a mão, a Fatigue chega no 28º turno próprio do jogador inicial.
- Vale para a engine 3.0 (`playtest/engine-v3/`); o `docs/guia-do-jogo.md` (2.x) não muda.

## 2026-10-28 — Handbook 3.0 / Alpha 0.1 — ALPHA-P05 opção A (Guardian, Cheater, Nimble, Pierce)

- **Antes:** as cartas só nomeavam as keywords; não havia definição 3.0.
- **Depois:**
  - **Guardian:** enquanto você controla um Devotee Prepared com Guardian, Strikes inimigos contra o seu God ou contra Devotees seus sem Guardian são ilegais; precisam mirar um Devotee com Guardian.
  - **Cheater:** ao declarar Strike contra um God, ignora Guardian.
  - **Nimble:** ao declarar Strike, ignora Guardian.
  - **Pierce:** num Strike contra Devotee, o dano acima do HP restante do alvo vai para o Soul do God dele.
- **Motivo:** aprovação do autor, opção A de `docs/alpha-0.1/PROPOSTAS-ALPHA-P01-P07.md`.
- **Pendências:**
  - os efeitos que concedem Cheater (019 equipada) e Pierce (077) ainda não estão na engine 3.0;
  - Long Range segue sem definição; a engine para com aviso.
- Nenhum texto de carta mudou, nem a 019. Vale para a engine 3.0 (`playtest/engine-v3/`); o `docs/guia-do-jogo.md` (2.x) não muda.

## 2026-10-28 — Handbook 3.0 / Alpha 0.1 — ALPHA-P02 opção A (início do turno e entrada)

- **Antes:** D2 confirmava preparação automática sem dizer o que prepara. D4 preparava só as Bases. O estado de entrada de Devotee e de Base não tinha texto.
- **Depois:** no início do turno, o ativo prepara todos os seus Devotees, Equipment e Bases. Depois resolvem os gatilhos de início de turno (APNAP, LIFO, com janela). Por último, a compra (D3). Devotee e Base entram Unprepared. Um Devotee só declara Strike no turno em que entrou se tiver Impulse.
- **Motivo:** aprovação do autor, opção A de `docs/alpha-0.1/PROPOSTAS-ALPHA-P01-P07.md`.
- **Pendências:**
  - jogar Equipment, Technique e Moment da mão (a engine 3.0 só joga Devotee);
  - nenhuma carta dos dois decks tem Impulse; o teste usa uma cópia de carta só em memória.
- Esta entrada vale para a engine 3.0 (`playtest/engine-v3/`). O `docs/guia-do-jogo.md` (2.x) não muda.

## 2026-10-28 — Handbook 3.0 / Alpha 0.1 — ALPHA-P06 opção A (prioridade e End Phase)

- **Antes:** a 3.0 tinha só citações de LIFO (D186), APNAP (D187) e do checkpoint de fim de Round (D204). Não havia texto para quando abre prioridade nem para a End Phase (D60–D63).
- **Depois:**
  - Ação comum (jogar carta Sorcery, colocar Base, equipar) não abre janela.
  - Abre janela: gatilho que entra na cadeia, Strike declarado, Moment jogado e End Phase.
  - Na janela, o não ativo fala primeiro, só com Instant e habilidades reativas. Dois passes seguidos resolvem o topo (LIFO). Se a cadeia não estiver vazia, abre nova rodada de passes.
  - Gatilhos simultâneos entram em APNAP: o não ativo resolve primeiro.
  - End Phase: conversão D5; gatilhos "at end of turn", com janela; no 2º turno do Round, o checkpoint D204; Cleanup. O Cleanup expira "until end of turn" e, no 2º turno, os efeitos "this round", e renova o "once each round" (D191).
- **Motivo:** aprovação do autor, opção A de `docs/alpha-0.1/PROPOSTAS-ALPHA-P01-P07.md`.
- **Pendências:**
  - jogar Technique e Moment a partir da mão;
  - Strike cujo atacante ou alvo sai do campo antes do dano: nem P04 nem P06 definem; a engine para com aviso.
- Esta entrada vale para a engine 3.0 (`playtest/engine-v3/`). O `docs/guia-do-jogo.md` (2.x) não muda.

## 2026-10-28 — Handbook 3.0 / Alpha 0.1 — ALPHA-P04 opção A (Strike)

- **Antes:** a 3.0 não tinha texto para declaração, dano e retaliação do Strike. Havia só citações (D22, D187, D199, D202, D248/D249) e as cartas.
- **Depois:** um Devotee Prepared declara Strike contra o God inimigo ou contra um Devotee inimigo e fica Unprepared. O dano é simultâneo: o atacante causa dano igual ao seu ATK; o Devotee defensor retalia com o seu ATK; o God alvo perde Soul 1:1 e retalia com o seu ATTACK. Devotee com dano maior ou igual ao HP é destruído e vai para o Tartarus do Owner, junto com a Armor (D40/D90). O dano persiste até ser removido por efeito; o Cleanup não limpa dano.
- **Motivo:** aprovação do autor, opção A de `docs/alpha-0.1/PROPOSTAS-ALPHA-P01-P07.md`.
- **Pendências:**
  - bônus de ATK e HP vindos de Equipment e de habilidades de carta, que ainda não estão na engine 3.0.
- Esta entrada vale para a engine 3.0 (`playtest/engine-v3/`). O `docs/guia-do-jogo.md` (2.x) não muda.

## 2026-10-24 — Fim do Engage; Guarda e Rivalidade (caps. III, IV, V, IX, XI, XII)

- **Antes:** Engage persistente entre combatentes, ENG compartilhado (3 por God/rodada), Disengage, troca de Engage, Multiguard X e Guardian por intercepção de declarações de Engage. Strike só contra o oponente vinculado.
- **Depois:** Engage, ENG, Disengage e Multiguard removidos. O alvo do Strike é escolhido na declaração. Deus inimigo é sempre alvo aberto; Devotee inimigo só se Unprepared, com Guardian ou Rival do atacante. Havendo Guardian aberto, o Strike deve escolhê-lo (exceto contra Rival ou com Nimble). Quando um Strike entre Devotees termina com ambos vivos, viram Rivals: vínculo mútuo e persistente que permite atacar o Rival mesmo em guarda e ignorando Guardian; termina se um sai do campo, se mudança de controle os une ou por efeito. Devotees entram Prepared (em guarda), mas não atacam na rodada de entrada; Impulse remove a restrição. Retaliação simultânea, Long Range, Cheater, Pierce, Unfaith e Sealed inalterados.
- **Motivo:** o autor pediu para tirar o Engage e criar um meio-termo entre Lorcana e Star Wars Unlimited com sabor de Saint Seiya (luta até a morte, rivalidade que persiste, milagre que intervém) e confirmou manter a Rivalidade. Autorização de aplicar em guia, cartas, engine, IA e UI: “pode rodar tudo vc tem autorizaao”.
- **Cartas (revisão 2, 13 cartas):** sst-02-010, 02-021, 02-026, 02-033, 02-038, 02-041, 02-042, 02-046, 02-047, 03-035, 03-040, 04-035, 04-040. Texto original preservado em `origem.texto_en`; revisões em `shared/card-revisions.js`.
- **Engine/UI:** `playtest/engine-v2.js` (rivals, alvos abertos, Rival automático, novos efeitos `rivalizar`, `encerrar_rivalidade`, `redirecionar_strike`, `dano_rivais`), IA, HUD sem ENG, selo de Rival, linhas de Rivalidade e textos de ajuda/guia de batalha. Testes: `test-rules-v2` (54), `test-battle-guide`, `test-guard-rivalry-ui.py`.
- **Medir:** simulação IA×IA (120 partidas): todas terminam por Soul, média de 9,5 rodadas (era 11,2). Poseidon segue fraco (25%). Riscos: “tartaruga” (todos em guarda), Glory in Ruin e Red Horizon mais fracas.
- **Pendências:** nenhuma de regra. Docs auxiliares que citam Engage receberam nota de histórico. `test-playtest.py` (cliente antigo, `__arenaTest`) foi removido; a cobertura de arena e guarda está em `test-ui-v2`, `test-arena-ui` e `test-guard-rivalry-ui`. `test-star-hill-ui`, `test-star-hill-editors-ui` e `test-designers-ui` exigem a biblioteca de áudio local (fora do repo) e falham igual na versão anterior.

## 2026-10-23 — Seções 11, 18 e 58 — Assumir o confronto para proteger o God

- **Antes:** a implementação anterior mantinha o vínculo com o God e acrescentava um vínculo excepcional, apenas contra Unprepared. Isso não fazia o Devotee assumir a ameaça ao God.
- **Depois:** um Devotee pode assumir o confronto de um inimigo ligado ao seu God, Prepared ou Unprepared. Ao resolver, o vínculo inimigo–God é substituído por inimigo–Devotee; não há vaga extra. Engage inicial mantém 1 AÇÃO / 0 ENG, e uma troca mantém 1 AÇÃO / 1 ENG. Revalidar a legalidade e manter a substituição atômica preserva os vínculos em caso de falha ou anulação. Os outros inimigos continuam engajados com o God.
- **Motivo:** esclarecimento explícito do autor: Shion precisa poder “tankar” um dos inimigos que atacam seu God. A entrada anterior descreve a interpretação substituída e permanece apenas como histórico.
- **Engine/UI:** alvos, resolução, efeitos de troca, IA, guia, ajuda, inspetor e histórico seguem a substituição. Guardian mantém a intercepção normal por capacidade; a proteção ativa não exige a keyword.
- **Cartas:** nenhuma alteração em `data/cards.json`. Validação local e sem publicação remota.

## 2026-10-23 — Seções 11, 18 e 58 — Engage contra Unprepared vinculado a God

- **Antes:** Prepared não restringia quem recebia Engage, mas um Devotee com sua capacidade ocupada não recebia um novo vínculo, inclusive quando Unprepared e engajado com um God.
- **Depois:** alvo Unprepared vinculado a um God pode receber um confronto adicional de Devotee, além da capacidade normal/Multiguard. O vínculo com o God permanece; preparar depois preserva os vínculos. Uma vaga adicional por Devotee, identificada no vínculo; troca preserva a vaga enquanto houver vínculo com God, e seu encerramento reaplica os limites normais. A condição inicial é revalidada na resolução e também serve à intercepção de Guardian.
- **Motivo:** pedido do autor para permitir Engage contra Devotee virado, seguido da confirmação: “se ele tiver engajado com um deus sim”. Os procedimentos de persistência e capacidade tornam essa exceção consistente com os demais vínculos.
- **Cartas:** nenhuma alteração em `data/cards.json`.
- **Engine/UI:** filtro de alvos, resolução, efeitos de troca, capacidade, Guardian, guia e ajuda acompanham a exceção. IA utiliza o mesmo filtro de alvos e intercepção. Validação local por cenários e navegador; sem publicação remota.

## 2026-10-23 — Primeiro conjunto, hierarquia e token de vantagem

- **Tipos e slots:** autor confirmou Support como permanente de apoio e um único slot de armadura para Cloth, Scale, Surplice e Warplate; armas/acessórios permanecem separados. Guia §§3 e 61 atualizado; catálogo/importador/editor/motor integrados.
- **SST-03-010:** autor escolheu comprar uma carta e exilar a própria carta do Tartarus para Void, corrigindo o destino inválido no rascunho. Texto original preservado na proveniência.
- **Catálogo:** diff `docs/importacao-300-cartas/cards.diff` aprovado explicitamente e gravado: 57 → 357, sem alterar os 57 registros anteriores.
- **Apresentação:** hierarquia obrigatória compartilhada entre impressão e jogo; custo de jogar separado de EQUIP, com headings claros para Owners, Resonance e evolução. Cosméticos não mudam regras.
- **HUD:** pedido do autor implementado com token de vantagem que identifica a iniciativa da rodada; AÇÃO e prioridade têm indicadores distintos. Aparências, sleeves e emotes textuais locais.
- **Verificação:** engine 2.0, IA, arena e Card Forge integrados localmente; cenários e limites em `validacao-rulebook-2.0.md`. Sem deploy remoto.

## 2026-10-23 — Fechamento do 2.0 — aplicação aprovada

- **Antes:** timing, compras, keywords, equipamentos, despertar e construção ainda tinham lacunas no livro recebido.
- **Depois:** recomendações de `proposta-fechamento-rulebook-2.0.md` aprovadas pelo autor e incorporadas ao capítulo XII do guia. Incluem 2 compras por rodada desde a segunda, iniciativa alternada, passes e pilha distintos, Guardian por capacidade, textos das keywords, Latent limitado a 3, procedimentos de equipamentos, limites de evolução/retorno/Ultimate e construção/mulligan.
- **Motivo:** autorização explícita do autor: “pode aplicar isso no sistema do jogo e modificar todo o jogo”.
- **Implementação:** migração local integrada após a aprovação do catálogo de 357 cartas. Limitações reais, cobertura e referências estão em `implementacao-rulebook-2.0.md` e `validacao-rulebook-2.0.md`.
- **Escopo:** alteração local de `playtest/` autorizada; originais de arte e planilha preservados. Sem publicação remota nesta autorização.

## 2026-10-23 — Livro completo — Rulebook 2.0

- **Antes:** Vanilla 1.0, com turnos completos, ataques diretos, Resistance restaurada no fim do turno, Damage nas Cloths e Awaken geral dos Gods.
- **Depois:** substituição integral pelo livro 2.0 enviado pelo autor: rodadas com AÇÕES alternadas, Engage persistente, Strike separado, ENG compartilhado, HP e dano persistente; evolução vinculada a Cloth + Owner, Resonance distinta de Owner, Awaken próprio de Devotees e Afterlife universal para Devotees no Tartarus. Long Range concede precedência de dano apenas ao iniciar Strike. A vitória por Soul inclui empate quando ambos os Gods chegam a zero simultaneamente.
- **Motivo:** decisão do autor de reformular o livro e atualizar o jogo, seguida do fornecimento do Rulebook 2.0 neste chat. O texto foi preservado; apenas a hierarquia de títulos e os separadores receberam marcação Markdown.
- **Status:** versão-base para playtest e implementação. Os parâmetros experimentais continuam experimentais, incluindo 3 ENG por God/rodada e uma evolução por Cloth/rodada. Timing, Guardian, várias keywords, equipamentos e construção de decks têm pendências explícitas; a omissão de uma regra antiga não autoriza presumir sua continuidade nem sua remoção mecânica.
- **Pendências — cartas:** aguardar o novo conjunto que o autor enviará; comparar por identidade, revisar campos e apresentar diff antes de qualquer gravação em `data/cards.json`.
- **Pendências — engine/UI/Card Forge:** implementação ainda anterior ao 2.0. Nenhum comportamento de jogo, catálogo, template ou importador foi alterado nesta etapa documental. Impactos, lacunas e verificações futuras estão em `migracao-rulebook-2.0.md`.
- **Histórico:** a Vanilla 1.0 continua recuperável pelo Git no commit `e33dcd2494baccd8303e955966f9e85fdc7fd2cc`. As entradas abaixo descrevem decisões daquela versão e não resolvem automaticamente as pendências do novo livro.

## 2026-10-22 — Seção 24 — Guardian, Nimble e Cheater

- **Antes:** Guardian precisava ser atacado antes do Deus; Nimble usava linguagem de bloqueio; Cheater ignorava Guardian.
- **Depois:** Guardian exige escolher um Guardian antes do Deus ou de outros Devotees. Somente Nimble ignora essa exigência. Nimble pode ser atacado normalmente; Cheater não atravessa Guardian.
- **Motivo:** correção e confirmação explícitas do autor nesta conversa. A interpretação defensiva de Nimble discutida antes foi substituída pela decisão final acima.
- **Engine/UI:** filtro de alvos, escolhas, realce de Guardian e aviso de passagem Nimble atualizados; testes cobrem A/B, múltiplos Guardians e keywords de equipamentos/efeitos temporários.
- **Pendências:** texto antigo de Sanctuary Archer dizendo que pode atacar Nimble ficou redundante, mas não contradiz a permissão atual. Novo efeito para Cheater permanece apenas como proposta em `keyword-matchups.md`; não foi aplicado.

## 2026-10-22 — Vanilla 1.0

Base oficial: `docs/guia-do-jogo.md` vira a fonte da verdade das regras do projeto.
