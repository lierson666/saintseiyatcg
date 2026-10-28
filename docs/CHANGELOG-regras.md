# Changelog de regras

Toda mudança em `docs/guia-do-jogo.md` entra aqui, mais recente no topo.

Formato: `AAAA-MM-DD — Seção — antes → depois — motivo — pendências (cartas/engine/UI)`

## 2026-10-28 — §63 e Handbook 3.0 G3-040 — lendário só para as classes de guerreiros

- **Seção:** `docs/guia-do-jogo.md` §63 e `docs/alpha-0.1/GODS-3.0-SUPPLEMENT.md` G3-040.
- **Antes:** todo personagem nomeado era único por jogador (ex.: só um Tatsumi ou um Sanctuary Guard nomeado em campo).
- **Depois:** a unicidade vale só para Saints, Marines, Satellites, Specters e Berserkers; Warrior, Support e Devotees sem classe podem repetir no campo.
- **Motivo:** decisão do autor em 28/10/2026 ("os minions de classe baixa não recebem lei de lendário").
- **Pendências:** nenhuma carta alterada; engine 3.0 ajustada; engine 2.x não alterada.

## 2026-10-28 — §48A e Handbook 3.0 G3-039 — Training counter é +1/+1

- **Seção:** `docs/guia-do-jogo.md` §48A (nova) e `docs/alpha-0.1/GODS-3.0-SUPPLEMENT.md` G3-039.
- **Antes:** Training counter não tinha efeito próprio; só Master's Guidance (Eagle Marin no campo) dava +1/+1 aos Bronze Saints com o marcador.
- **Depois:** cada Training counter dá +1 ATK / +1 HP, acumulando (2 = +2/+2), com ou sem Marin. Master's Guidance soma mais +1/+1 enquanto Marin estiver no campo (texto impresso inalterado).
- **Motivo:** decisão do autor em 28/10/2026 ("esse Training counter é um marcador +1/+1"); acumular e manter a Marin escolhidos no questionário.
- **Pendências:** nenhuma carta alterada; engine 3.0 ajustada; engine 2.x não alterada.

## 2026-10-28 — Handbook 3.0 G3-028 (revisto) — 12 tochas dividem os 3 minutos

- **Seção:** `docs/alpha-0.1/GODS-3.0-SUPPLEMENT.md`, G3-028.
- **Antes:** 1 tocha acesa por 60 s restantes (12 tochas só acendiam com 12 minutos).
- **Depois:** 1 tocha acesa por 15 s restantes, arredondando para cima, teto 12 (12 tochas = 180 s, o teto do relógio).
- **Motivo:** pedido do autor em 28/10/2026 ("divida os 12 fogos pelos 3 minutos do timing"), repassado pela sessão XEPA OS.
- **Pendências:** nenhuma. Só exibição; os tempos do relógio (G3-024..G3-031) não mudam.

## 2026-10-28 — Handbook 3.0 G3-038 — Guardian protege sempre

- **Seção:** `docs/alpha-0.1/GODS-3.0-SUPPLEMENT.md`, registro G3-038 (altera a P05 A; alinha com o guia §12).
- **Antes:** só Guardian Prepared obrigava a mirá-lo; Guardian recém-entrado ou que já atacou não protegia.
- **Depois:** qualquer Guardian em campo, Prepared ou não, obriga o Strike a mirar um Guardian. Nimble ignora; Cheater ignora só contra God.
- **Motivo:** decisão do autor em 28/10/2026, no playtest ("Guardian não está seguindo a regra de tank").
- **Pendências:** a 3.0 continua permitindo mirar Devotee inimigo Prepared sem Guardian (P05 A); o guia §11 da 2.1 restringe a alvos abertos. Não alterado.

## 2026-10-28 — §(compra) e Handbook 3.0 G3-037 — compra de 1 carta por turno

- **Seção:** `docs/guia-do-jogo.md` (início da partida e compra) e `docs/alpha-0.1/GODS-3.0-SUPPLEMENT.md` (G3-037, substitui a quantidade da D3).
- **Antes:** a partir da segunda rodada, 2 cartas por turno.
- **Depois:** 1 carta por turno, a partir do 2º turno próprio. Primeiro turno continua sem compra.
- **Motivo:** decisão do autor em 28/10/2026: "2 cartas tá muito roubado".
- **Pendências:** engine 3.0 ajustada; engine 2.x não foi alterada; ritmo a medir no playtest.

## 2026-10-28 — §63 Deck, identidade, mulligan, Gods e Domains — regra de personagem nomeado

- **Antes:** "Não permitir jogar da mão uma segunda versão de personagem que já controla"; a escolha de qual manter só valia para duplicidade criada por efeito.
- **Depois:** a segunda versão pode ser jogada da mão normalmente (paga custo; habilidades de entrada valem). Em qualquer duplicidade, o controlador escolhe qual manter; as outras vão ao Tartarus sem ser destruição.
- **Motivo:** decisão do autor em 28/10/2026, no playtest do Olympus Arena (modelo de regra de lendário).
- **Pendências:** engine 3.0, HUD e IA ajustados na mesma data; engine 2.x não foi alterada.

## 2026-10-28 — Handbook 3.0 / Alpha 0.1 — G3-036, Strike anulado

- **Seção:** `docs/alpha-0.1/GODS-3.0-SUPPLEMENT.md`, registro G3-036 (complementa P04/P06).
- **Antes:** Strike cujo atacante ou alvo saía do campo antes do dano lançava `NotSpecified` (a partida travava na janela).
- **Depois:** o Strike é anulado: sem dano, sem retaliação; continua contado como usado.
- **Motivo:** decisão do autor em 28/10/2026 (opção recomendada), após o playtest simulado chegar ao caso.
- **Pendências:** nenhuma. Na mesma data, a engine 3.0 passou a aplicar o guia §63, que já estava no guia: segunda versão de personagem nomeado não sai da mão; duplicata vinda de efeito faz o controlador escolher qual manter, e as outras vão ao Tartarus sem ser destruição (a Armor presa acompanha, como na D40/D90).

## 2026-10-28 — Handbook 3.0 / Alpha 0.1 — G3-035, Cosmo Base entra Prepared

- **Seção:** `docs/alpha-0.1/GODS-3.0-SUPPLEMENT.md`, registro G3-035 (complementa a D4).
- **Antes:** a engine 3.0 punha a Base nova Unprepared (leitura literal da D4: Bases preparam só no início do turno), com a dúvida anotada no código.
- **Depois:** a Base nova entra Prepared e já paga custo no mesmo turno. Continua uma Base por turno.
- **Motivo:** decisão do autor em 28/10/2026, durante o playtest do Olympus Arena.
- **Pendências:** nenhuma.

## 2026-10-28 — Handbook 3.0 / Alpha 0.1 — G3-032 a G3-034 (Seal e Great Flood)

- **Antes:** P-SEAL-1, P-SEAL-2 e P-FLOOD-1 abertas; a engine lançava `NotSpecified` e os testes usavam parâmetros de fixture.
- **Depois (autor, opção A nas três):**
  - G3-032: "Seal that Devotee" adiciona exatamente 1 marcador; aplicações sucessivas acumulam;
  - G3-033: Prepare redundante em Devotee já Prepared não remove marcadores Seal;
  - G3-034: no Great Flood, quem tem a mão afetada escolhe o descarte; timeout pela G3-030.
- **Motivo:** respostas homologadas do autor em 28/10/2026.
- **Pendências:** D269 continua não aprovada (`NotSpecified`); catálogo Poseidon V6 continua PARCIAL.

## 2026-10-28 — Handbook 3.0 / Alpha 0.1 — G3-029 a G3-031, Seal e God Poseidon

- **Antes:** identidade de personagem pelo nome impresso (G3-022); timeout de escolha obrigatória sem critério; relógio fora do turno só por leitura literal (G3-026); sem Seal nem Poseidon na engine 3.0.
- **Depois:**
  - G3-029: identidade de personagem por tabela explícita, separada do ID da carta;
  - G3-030: timeout escolhe o menor id estável, revalidando cada passo, e registra `TIMEOUT_AUTO_CHOICE`;
  - G3-031: básico só no turno próprio; resposta fora do turno gasta só a reserva; pausa sem decisão atribuída;
  - Seal implementado como na D211/D212 (marcadores que atrasam o Prepare);
  - Water Prison, Pressure of the Deep e Great Flood implementados como nas D198, D207, D211, D212, D231–D234, D253, D263–D268.
- **Motivo:** homologação complementar do autor (28/10/2026) e recuperação do Poseidon V6.
- **Pendências:**
  - perguntas P-SEAL-1, P-SEAL-2 e P-FLOOD-1 (a engine lança `NotSpecified`);
  - D269 não aprovada;
  - catálogo Poseidon V6 sem cartas canônicas (4 fichas PARCIAL);
  - HUD Olympus sem Poseidon.
  - Ver `docs/alpha-0.1/POSEIDON-V6-RECUPERACAO.md`.
- O `docs/guia-do-jogo.md` (2.x) não muda. A §48 (Sealed como status) conflita com a D211/D212; a engine 3.0 segue o D268.

## 2026-10-28 — Handbook 3.0 / Alpha 0.1 — Gods 3.0 (registro suplementar G3)

- **Antes:** a engine 3.0 não tinha Awaken, Ultimate, Soul máximo nem relógio competitivo; God Athena só retaliava.
- **Depois:** decisões complementares aprovadas pelo autor ficam em `docs/alpha-0.1/GODS-3.0-SUPPLEMENT.md` (G3-001 a G3-028), fora de D1–D268 e sem ocupar a D269. Implementados: Awaken dinâmico, Ultimate (Athena Exclamation pago com Base preparada), Divine Judgment, Cosmo of Hope, Divine Protection, Soul máximo em camadas, Damage × Lose Soul, custo misto atômico, relógio Alpha (60 + reserva 90/180, 1 tocha por 60 s).
- **Motivo:** especificação Olympus Arena V1 + respostas do autor de 28/10/2026.
- **Pendências:** identidade de personagem (G3-022), critério de `TIMEOUT_AUTO_CHOICE`, Seal e Poseidon V6. O `docs/guia-do-jogo.md` (2.x) não muda.

## 2026-10-28 — Handbook 3.0 / Alpha 0.1 — Categoria de 053, 060, 082 e 085

- **Antes:** a D194 classificava 18 Spells; 053, 060, 082 e 085 ficavam sem categoria e não podiam ser jogadas.
- **Depois:** as quatro são Technique: pagam Base e usam Sorcery Speed, como o custo {B} indica.
- **Motivo:** decisão do autor nesta data.
- **Pendências:** 057, 078 e 084 (fora dos decks D171) continuam sem categoria.
- Vale para a engine 3.0 (`playtest/engine-v3/`); o `docs/guia-do-jogo.md` (2.x) não muda.

## 2026-10-28 — Handbook 3.0 / Alpha 0.1 — Gatilhos, {T}, dano direto e Resonance

- **Antes:** sem gatilhos de entrada, de cast e de sobreviver a Strike; sem habilidades {T}; sem dano que não é de Strike.
- **Depois (decisões do autor nesta data):**
  - {C} se paga com Base preparada;
  - Resonance de Equipment só vale com o Equipment preso ao Devotee nomeado;
  - dano que não é de Strike também passa pela Armor; prevenções escritas "Strike damage" não se aplicam a ele;
  - dano redirecionado pela Resonance da 004 é dano de Strike em Shiryu.
- **Implementado conforme o texto D268:** Miracle e Seventh Sense (001); Resonance da 002, 004, 019 e 048; 019 (ao jogar, Divine Protection, Divine Cosmo); Eagle Marin (Training e Master's Guidance); Seika, Hope of Reunion; Star Hill Acolyte; {T} da 041, 042 e 011 (Cloth Restoration); Spells 059, e os efeitos de 053, 060, 082 e 085. Gatilhos entram na cadeia com janela (P06). Verificação de derrota roda depois de cada Strike, Spell e habilidade.
- **Pendências:**
  - Master's Guidance soma +1/+1 por Eagle Marin em campo (leitura da implementação).
- Vale para a engine 3.0 (`playtest/engine-v3/`); o `docs/guia-do-jogo.md` (2.x) não muda.

## 2026-10-28 — Handbook 3.0 / Alpha 0.1 — Modificadores com duração e prevenção de dano de Strike

- **Antes:** a engine 3.0 não aplicava efeitos de texto das cartas.
- **Depois:** implementados conforme o texto D268, sem alteração de carta:
  - modificadores até o fim do Round ou durante o Strike: 052, 058, 061, 077 (com Sacrifice no fim do Round), 081, 088, Unicorn Gallop (028) e Rising Dragon (003);
  - estáticas "While …": 034, 036, 037;
  - prevenção de dano de Strike: Dragon Shield (003/004, sem acumular), 044, 045 (com o escudo de Armor da Resonance), 049 (2 em Shiryu), Prayer of Rozan (037), Crystal Wall (011, também no God), Final Sacrifice (027), escudos de God (056, 061, 081, 087) e salvamento "would be defeated" (054, 076, 088).
- **Motivo:** pedido do autor de implementar os efeitos das cartas dos dois decks.
- **Leituras confirmadas pelo autor nesta data:** ordem de aplicação entre prevenções; "cannot declare another Strike this round" coberto pela D22; parte de Spell cujo alvo saiu antes da resolução não faz nada.
- **Pendências:**
- Vale para a engine 3.0 (`playtest/engine-v3/`); o `docs/guia-do-jogo.md` (2.x) não muda.

## 2026-10-28 — Handbook 3.0 / Alpha 0.1 — Bônus de Equipment e dano em Armor

- **Antes:** D227 citava dano "absorbed by Armor" e "Armor priority", sem a regra (D1–D191 fora das fontes). Equipment não-Armor sem destino quando o portador sai.
- **Depois (decisões do autor nesta data):**
  - O bônus fixo impresso ("Equipped Devotee gets +A ATK / +H HP and <Keyword>") vale enquanto o Equipment está preso.
  - Dano de Strike num Devotee passa primeiro pelas Armor dele; Armor com dano maior ou igual ao HP vai para o Tartarus do Owner e o excesso segue ao Devotee. O dano na Armor persiste.
  - Sem limite de Armor por Devotee; elas absorvem na ordem em que foram equipadas.
  - Equipment que não é Armor fica no campo, solto, quando o portador sai; pode ser reequipado pagando Equip {N}.
- **Motivo:** escolha do autor entre as opções apresentadas.
- **Pendências:**
  - a ordem de absorção entre várias Armor foi escolhida na implementação; confirmar;
  - bônus condicionais (047, 051, Resonance) e demais efeitos de carta ainda não estão na engine 3.0;
  - no Pierce, o excesso é o que passa da Armor e do HP restante do Devotee.
- Vale para a engine 3.0 (`playtest/engine-v3/`); o `docs/guia-do-jogo.md` (2.x) não muda.

## 2026-10-28 — Handbook 3.0 / Alpha 0.1 — Jogar Equipment e Spell da mão

- **Antes:** D192–D268 não definiam a relação entre Casting Cost, Auto-Equip e Equip {N}, nem o destino de uma Spell resolvida.
- **Depois (decisões do autor nesta data):**
  - Equipment: no Devotee nomeado em Auto-Equip, paga o Casting Cost; em outro Devotee permitido por "Equip {N}", paga N no lugar do Casting Cost. Sem portador legal, não pode ser jogado. É ação comum: não abre janela (P06).
  - Spell: Technique é Sorcery e paga Base; Moment é Instant e paga Latent (D194). Depois de resolver, a Spell vai para o Tartarus do Owner.
- **Motivo:** escolha do autor entre as opções apresentadas (custo alternativo; Tartarus do Owner).
- **Pendências:**
  - Spells sem categoria na D194 (por exemplo 053 e 060 da Pegasus Rush) não podem ser jogadas; a engine para com aviso;
  - 020 não tem Auto-Equip nem Equip {N}; a engine para com aviso;
  - os efeitos das cartas, incluindo "When you cast" (019), ainda não estão na engine 3.0;
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

## 2026-10-24 — Living Armor & Persistence (seções 26A e 61)

- **Antes → depois:** equipamentos sem dano próprio na regra-base → Armor viva com HP e dano próprios, persistentes entre rodadas/portadores/desequipamento/reset Vanilla. Morte do portador deixa a Armor no Battlefield, sem portador e com dano preservado.
- **Broken:** ao atingir HP máximo permanece no Battlefield. O autor confirmou neste chat: suspender todos os bônus e habilidades concedidos pela Armor até Repair. Nomenclatura final sujeita a balanceamento.
- **Repair:** restaura HP próprio de Armor até o máximo impresso; cura de Devotee é separada. Engine suporta dano direcionado/Repair e estado Broken sem destruir automaticamente a Armor.
- **Pendências aprovadas para revisão:** valores de HP/resistência, distribuição do dano de combate, separação numérica da V1 na identidade do Devotee e custo/valor de Repair em Aries Mu. Nenhum número ou habilidade de carta foi inventado, e o diff anterior das 41 armaduras não foi ampliado.

## 2026-10-24 — Rulebook 2.1 integrado (caps. II, III, VI, VII, X e XII)

- **Antes → depois:** custos genéricos → Devotee/Armor/Ultimate Base-only; Technique resposta Latent-only; outros usos conforme matriz. Latent que expirava → banco persistente até 3, com conversão opcional de Bases não usadas no encerramento, sem perda das Bases; Cosmo temporário não é armazenado.
- **Pass:** entrega provisória da oportunidade → encerra AÇÕES comuns do jogador até a rodada seguinte, preservando respostas. O adversário pode continuar agindo. Pass de prioridade permanece separado.
- **Iniciativa:** vencedor escolhe quem começa; perdedor do sorteio recebe 1 Latent. Alternância e compras preservadas.
- **Armor:** categoria universal, incluindo Moonplate/Satellites; V1 incorporada no Devotee, V2+ independentes; um slot de armadura, armas/acessórios separados. Equip por portador exato (padrão ressonante 1 / outros 5), custos específicos preservados. Quatro estágios suportados por todas as facções, sequência apenas expressa; requisitos de Owner impressos preservados.
- **Catálogo:** o autor aprovou explicitamente o diff `rulebook-2.1/catalogo.diff` neste chat: 41 armaduras receberam categoria e custos explícitos de Equip. Os 357 IDs, nomes, textos, artes e programas foram preservados. Versões, afinidades faltantes, Moonplates e itens divinos aguardam Card Craft, sem criação automática.
- **Identidades:** Athena e afinidades Bronze/Gold documentadas; outras facções preliminares. Origem de personagem e referências mitológicas suportadas. Limites de God Armor/Divine Artifact validam composição editorial do conjunto, nunca decks.
- **Engine/STAR HILL:** política central de pagamentos, escolhas de banco e Equip, guia/log/ajuda e Card Forge integrados. Corrigido agendador da IA que impedia escolhas durante a resolução. Atualizador por texto aprovado gera diff pelo Claude Code, testa em cópia isolada e exige revisão/aprovação antes de aplicar; não publica sozinho.
- **Compatibilidade:** Guarda, Rivalidade, God, Domain, Soul, Guardian, Nimble, Long Range, Pierce, Sealed, retaliação e derrota preservados. Definição canônica de Sealed verificada nas seções 48/59; nenhuma alteração.
- **Evidências e pendências:** `rulebook-2.1/implementacao.md`, `rulebook-2.1/migracao-catalogo.md` e `rulebook-2.1/simulacoes.json`. Registro integral da aprovação preservado em `rulebook-2.1/decisoes-aprovadas.md`. Publicação restrita a branch/PR; sem merge/deploy.

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


## 24/10/2026 — STAR HILL

Motivo: Atualização do Rulebook 2.0 para 2.1, consolidando as decisões aprovadas sobre Base Cosmo, banco persistente de Latent Cosmo, iniciativa, Pass, Techniques como resposta, categoria universal Armor, Resonance, progressão Voltron de quatro estágios, nomenclatura Moonplate/Satellites e limites de uma God Armor e um Divine Artifact por facção no Vanilla Set. Inclui também diretrizes de identidade das facções e criação de personagens mitologicamente fundamentados para Ares e Artemis.

Diff integral preservado em `star-hill/historico/1792867524450714000.json`. Mudança aprovada no painel; revisar implementação do motor antes de considerar o comportamento atualizado.
