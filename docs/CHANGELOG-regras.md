# Changelog de regras

Toda mudança em `docs/guia-do-jogo.md` entra aqui, mais recente no topo.

Formato: `AAAA-MM-DD — Seção — antes → depois — motivo — pendências (cartas/engine/UI)`

## 2026-11-03 — Cartas (sem mudança no guia) — Ultimates dos cinco Gods

- **Athena Exclamation:** custo {5}{C} → {10}{C}. Os 3 Saints podem estar Prepared ou não. Sem Divine Judgment e sem +3 por Gold. O dano é a soma do Power, dividido entre o God inimigo e Devotees inimigos.
- **Great Flood (Poseidon):** segue custo 8 e devolve Devotees e Equipment inimigos. Sai a perda de Base, o descarte e o Mill 3 por descarte. Agora, Mill 2 por carta devolvida; token não conta.
- **Great Eclipse (Hades):** custo {7}{C} → {8}{C}.
- **Moon Awakening (Artemis):** sem os {2}{S} adicionais por acerto no God. Máximo de 15 com 5 Moon Spirits.
- **Obliteration (Ares):** custo {6}{C} → {7}{C}; +3 → +2 de Power.
- **Motivo:** decisão do autor, 03/11/2026: Ultimate vira a partida, não ganha sozinha.
- **Engine/dados:** `data/cards.json`, `card-forge/art-web/cards.json`, `playtest/engine-v3/gods.js`, `strike.js`, `playtest/divine/ai.js`, `app.js`, `shared/i18n-pt.js`.
- **Pendência:** não medido. A Exclamation divide por alvo: Devotee recebe o que falta para cair, God recebe o resto, sem valor parcial à escolha. O código e a tela de Divine Judgment ficaram sem uso. A IA manda o dano sempre que o God vem primeiro.

## 2026-11-03 — G3-024 — Sem tempo contra a IA

- **Antes:** o relógio de 90 s por ação valia em toda partida, inclusive contra a IA, com os efeitos de timeout (G3-027, G3-030).
- **Depois:** contra a IA o relógio continua na tela, mas não conta e não há timeout. Duelo online e hot-seat não mudam.
- **Motivo:** autor, 03/11/2026: "tira o tempo de jogo contra IA ok, o povo ta aprendendo a joga"; "deixa o relogio la na UX mas nao conte o tempo ok?".
- **Pendências:** nenhuma. Interface: `playtest/divine/app.js` (`vsAI`).

## 2026-11-03 — §56 — Habilidade ativada em velocidade de Moment

- **Antes → depois:** "Só Moment responde" → Moment e habilidade ativada em velocidade de Moment respondem. Technique continua só no próprio turno, com a pilha vazia.
- **Custo:** paga como Moment (turno do adversário, só Latent; próprio turno, Base e/ou Latent). Derivado de "velocidade de Moment"; confirmar com o autor.
- **Motivo:** decisão do autor, 03/11/2026, ao pedir combat tricks na janela do Strike.
- **Pendências:** nenhuma carta tem hoje essa velocidade. A engine aceita `speed: 'moment'` na habilidade; marcar cartas exige novo diff de `data/cards.json` aprovado. Na interface, o Strike sem resposta agora fica visível cerca de 1 s antes do dano.

## 2026-11-02 — §26 — Steel, Cracked, Kamui e armaduras especiais

- **Antes:** Steel, Lunar Vestment, Living Armor e Prototype não tinham família nem patente, e a partida não tratava Steel, Lunar Vestment e Prototype como Armor, apesar do `slot_equipamento`. Cracked e Kamui constavam só como marca da auditoria.
- **Depois:** Steel é patente de Cloth fora da progressão. Steel Cloth e Steel Armor Prototype são Cloth Steel; Lunar Vestment é Moonplate Full; Living Armor é Moonplate sem patente; Aries Surplice é Surplice Celestial. Todas ocupam o slot de Armor. Cracked só identifica. Kamui é God Cloth.
- **Motivo:** decisão do autor, 02/11/2026. Muda regra: um Devotee já não pode vestir uma dessas cartas junto de outra Armor.
- **Pendências:** nenhuma. Diff de `data/cards.json` aprovado e gravado.

## 2026-11-02 — §63 — Carta de God com duas faces

- **Antes:** todo o texto do God (Divine Power, Divine Command, Awaken e Ultimate) ficava em uma face só, com fonte pequena e a arte coberta.
- **Depois:** a frente traz Divine Power e Divine Command; o verso traz Awaken e Ultimate, com os poderes da frente que seguem ativos. O God vira ao despertar e volta se sair do Awaken.
- **Motivo:** pedido do autor, 02/11/2026, para dar leitura e mostrar a arte. Só apresentação: nenhum efeito muda.
- **Pendências:** nenhum texto de carta mudou em `data/cards.json`. O Layout Studio segue com o God de uma face, sem uso em tela de jogo por enquanto.

## 2026-11-02 — §56 — Moment e Technique no lugar de Spell

- **Antes:** o guia, filtros e alguns textos diziam Spell (Magia em PT).
- **Depois:** só se diz Moment, Technique ou Moment or Technique (Momento, Técnica, Momento ou Técnica).
- **Motivo:** pedido do autor, 02/11/2026. Nenhum efeito muda.
- **Pendências:** `tipo: "Spell"` e `kind: 'Spell'` seguem como nome interno em `data/cards.json` e na engine; cartas com o texto antigo dependem do diff aprovado.

## 2026-11-02 — §26 — Equipment System V1: linha de tipo e subtipos

- **Antes:** `Armor` era impresso junto da família (`ARMOR — CLOTH`), e os subtipos de objeto não tinham lista fechada.
- **Depois:** `EQUIPMENT — BRONZE CLOTH`, `EQUIPMENT — WEAPON SWORD`. Armor é grupo de consulta. A patente fica em campo próprio e é impressa; raridade e facção não. O spec tirava a patente da linha; o autor a devolveu no mesmo dia. Cada família tem a própria progressão, do nível I ao V (tabela do autor, 02/11/2026): Cloth, Bronze, Silver, Gold, God; Scale, Marine, Captain, General, Divine; Surplice, Terrestrial, Celestial, Judge, Divine; Warplate, Berserker, Elite, Warlord, Divine; Moonplate, Crescent, Half, Full, Divine.
- **Motivo:** especificação do autor, 02/11/2026. Nenhum efeito, custo ou slot muda.
- **Código:** `shared/equipment-types.js`, contrato em `docs/equipment-system-v1.md`.
- **Cartas:** 54 propostas firmes gravadas em `data/cards.json`, com aprovação do autor.
- **Pendências:** 28 classificações em revisão. Lunar Vestment, Steel Cloth e Prototype dependem de decisão, porque mudar o subtipo muda o slot na Engine.

## 2026-11-02 — Cap. IX e §53 — Sintaxe das keywords no texto da carta

- **Antes:** o guia não definia a linha de keywords, e o §53 pedia efeitos de entrada antes das keywords.
- **Depois:** Guardian, Pierce, Impulse, Nimble e Long Range ficam na primeira linha do texto, separadas por vírgula. Cada habilidade inteira tem linha própria. Hidden Cosmo, Afterlife e Imune seguem em linha própria. O §53 continua valendo para os atributos.
- **Motivo:** decisão do autor, 02/11/2026. A apresentação das cartas já usava essa ordem; nenhum efeito muda.
- **Card Forge:** caixa de habilidade só com essas keywords grava `keywords_en`. A caixa própria de keywords saiu.
- **Pendências:** nenhuma carta foi alterada.

## 2026-11-02 — Athena Exclamation (D229) — Taxa de Bronze e Silver passa de Cosmo a Soul

- **Antes:** 5 Cosmo, mais 3 Cosmo por Bronze Saint e 2 por Silver Saint, tudo em Base preparada.
- **Depois:** 5 Cosmo em Base preparada, mais {3}{S} por Bronze Saint e {2}{S} por Silver Saint, pagos do Soul do próprio God. Gold Saint não paga taxa. Soul letal pode ser pago e encerra a partida (G3-014).
- **Motivo:** decisão do autor, 02/11/2026.
- **Engine/IA/UI:** `engine-v3/gods.js`, `divine/ai.js`, `divine/app.js`, `shared/i18n-pt.js`. A IA não paga com Soul letal.
- **Dados:** texto de `athena-001` em `data/cards.json`, diff aprovado pelo autor em 02/11/2026.
- **Pendência:** não medido em partida: a Ultimate fica bem mais barata em Cosmo, o que pode alterar a meta de 45% do deck Combo.

## 2026-11-02 — §27/§28/§33 — Arma e acessório com Resonance funcionam como Armor

- **Antes:** arma ou acessório entrava sempre sem portador. Prender custava o Equip impresso, e o Devotee nomeado pagava o custo impresso. O personagem nomeado não prendia nada ao entrar. Seis cartas ainda mostravam “Auto-Equip”.
- **Depois:** com o Devotee Resonant em campo, jogar a carta pode prendê-la nele sem Equip. Quando o Devotee Resonant entra, pode prender sem Equip uma carta dele que você controla, mesmo de outro Devotee seu. Fora desses dois momentos, todos pagam o Equip impresso. O texto dessas cartas passa a “Resonance — Nome”.
- **Motivo:** autor, 02/11/2026, em partida no celular: Libra Sword “não equipou Shiryu quando ele entrou”; escolheu “Igual à Armor”. Substitui parte da mudança de 01/11/2026 no §33.
- **Cartas:** athena-v6-045, 046, 047, 048, 049 e 050.
- **Engine/UI:** `engine-v3/play.js`, `engine-v3/v6/hooks.js`, `divine/ai.js`, `divine/app.js`, `shared/card-visual-values.js`, Como Jogar.
- **Armas de Libra (mesma data, autor):** Libra Sword e Libra Shield (athena-v6-048, 049) deixam de ter Resonance com Dragon Shiryu e passam a ter com qualquer Gold Saint. O §27 ganha Resonance por classe. Valem também os Gold Saints de outras facções. Diff de `data/cards.json` aprovado pelo autor.
- **Pandora (mesma data, diff aprovado):** Pandora's Trident e Pandora's Harp (hades-v6-196, 228) passam a ter Resonance com Pandora; sai o Equip 1 próprio dela.

## 2026-11-02 — Cartas (sem mudança no guia) — Corpo dos doadores de Treinamento de Artemis

- **Antes → depois (ATK/HP):** Sacred Stag 2/2 → 1/2; Lunar Nymph 1/3 → 1/2; Chandra 2/4 → 2/3; Moon Temple Acolyte 2/3 → 1/3; Moonlit Wolf 2/1 → 1/1.
- **Motivo:** decisão do autor, 02/11/2026, após partida no celular: Lobo a 4/2 no início do jogo e marcador grátis em corpo já dentro da curva.
- **Engine/dados:** `data/cards.json`, `card-forge/art-web/cards.json`.
- **Pendência:** não medido em partida.

## 2026-11-02 — Cartas (sem mudança no guia) — Nerf de The Ancient Grove

- **Antes:** Devotees aliados com marcador de Treinamento têm +0 ATK / +1 HP, sempre. Resonance paga {1}{C} por 1 marcador ao sobreviver a um Strike.
- **Depois:** ao declarar Strike, Devotee aliado com marcador recebe +0 ATK / +1 HP até o fim do turno. Resonance paga {2}{C}.
- **Motivo:** decisão do autor, 02/11/2026, após partida no celular com Artemis forte no início do jogo.
- **Engine/dados:** `data/cards.json`, `card-forge/art-web/cards.json`, `playtest/engine-v3/v6/artemis.js`.
- **Pendência:** não medido com este texto. Tirar o +1 PV por inteiro levou The Silver Hunt de cerca de 70% para 65% (IA × IA, 240 partidas). Não publicado.

## 2026-11-02 — §41, §43A — Keyword Imune e armas de Libra

- **Antes:** 7 keywords. Libra Sword: +2 ATK, 1 de dano extra em Shiryu. Libra Shield: +2 HP, previne 1 de dano de Strike (2 em Shiryu). Equip 4 nas duas.
- **Depois:** 8ª keyword, **Imune a X** (§43A). Libra Sword: +2 ATK / +2 HP e Nimble; Imune a Devotees de custo 3 ou menos; ao causar dano de Strike a um God, o jogador dele descarta 1 carta e você prepara todas as Bases. Libra Shield: +2 ATK / +2 HP; Imune a Hades e Poseidon; ao causar dano de Strike a um God, ganha {2}{S} e compra 1 carta. Custo 3, Equip 5, grátis em Shiryu. Sem limite por rodada.
- **Motivo:** decisão do autor, 02/11/2026, no molde das espadas de duas cores do Magic.
- **Cartas de Artemis:** Lunar Nymph e Chandra passam a mirar "another target friendly Devotee". O autor aprovou no mesmo grill, depois da partida no celular.
- **Engine/dados:** `data/cards.json`, `card-forge/art-web/cards.json`, `data/canon/d268.json` (o `original_text` não muda), `playtest/engine-v3/`, `shared/card-model.js`, `card-forge/forge.js`, `shared/i18n-pt.js`.
- **Pendência:** efeitos fora da cadeia não têm fonte conhecida e não são bloqueados. Dano de Pierce que passa por um Devotee não dispara os efeitos no God. Não publicado.

## 2026-11-01 — Cartas (sem mudança no guia) — Draw engines em Ares, Athena e Artemis

- **Antes → depois:** 19 cartas, em `docs/draw-engines-2026-11-01/cards.diff.md`.
- **Motivo:** pedido do autor, 01/11/2026, com a compra de 1: dar compra de carta a Ares e Athena, que ficavam sem mão, e efeitos do mesmo tema a Artemis. Adaptados de Magic: wheels, Seasoned Pyromancer, Goblin Ringleader, Light Up the Stage, Sram, Stoneforge Mystic, Mentor of the Meek, Esper Sentinel, Wall of Blossoms, Wirewood Savage, Shamanic Revelation, Gaea's Blessing, Garruk's Uprising e Sylvan Library.
- **Engine/dados:** `data/cards.json`, texto aprovado de `data/canon/d268.json`, `playtest/engine-v3/v6/` e listas de `decks-ultra.json`.
- **Pendência:** o autor testa jogando; a medição completa foi interrompida a pedido dele. Enyo (Embercleave) não entrou: pede engine nova. Moonstone Amulet não reordena o topo do deck. O token do Disciple usa o Sanctuary Soldier, não um Berserker. Publicado.

## 2026-11-01 — §7, Cap. XI, §55 — Compra volta a 1 carta por turno

- **Antes:** compra de 2 cartas por turno. Quem começa não compra no 1º turno dele.
- **Depois:** compra de 1 carta por turno. A exceção de quem começa e o limite de 7 na mão não mudam.
- **Motivo:** decisão do autor, 01/11/2026, para reduzir a vantagem de quem começa. Em IA × IA (900 partidas por nível), quem começa foi de 78% / 74% (`normal` / `hard`) para 65% / 65%, e a vitória por deck vazio de 12% / 26% para 7% / 12%. Revoga a compra de 2 da mesma data, adotada porque decks agressivos ficavam sem mão.
- **Engine/UI:** `engine-v3/core.js` (`DRAWS_PER_TURN`), `playtest/divine/app.js`, How to Play e `shared/i18n*`.
- **Pendência:** cartas de compra em Ares e Athena, com diff a aprovar; medir mão vazia; quem começa segue acima da meta de 60%; `docs/decks-ultra.md` foi medido com compra de 2; ajustar listas. Publicado junto com as draw engines.

## 2026-11-01 — Cartas (sem mudança no guia) — Quatro Gold Saints custam 1 a menos

- **Antes → depois (Casting Cost):** Leo Aiolia (`athena-v6-015`) 5 → 4; Aquarius Camus (`athena-v6-017`) 5 → 4; Aries Mu (`athena-v6-011`) 5 → 4; Gemini Saga (`athena-v6-013`) 6 → 5.
- **Motivo:** diff aprovado pelo autor, 01/11/2026, para deixar o deck Combo (Athena Exclamation) em 45% nos dois níveis de IA. O Combo foi de 42% / 40% (`normal` / `hard`) para 49% / 43%, em 360 partidas por deck (±5 pontos): a meta fica atingida no `normal` e 2 pontos abaixo no `hard`. Detalhes em `docs/decks-ultra.md`.
- **Arquivos:** `data/cards.json`, texto aprovado de `data/canon/d268.json` (o `original_text` não muda), `gallery/cards.json`, registro e hash em `tools/test-d268-integrity.mjs`. Diff em `docs/custo-golds-2026-11-01/cards.diff.md`.
- **Pendência:** afeta todos os decks de Athena; playtest humano. Não publicado.

## 2026-11-01 — §55, Cap. XI — Limite de mão cai de 9 para 7 cartas

- **Antes:** ao passar o turno, descarta o excesso acima de 9 cartas.
- **Depois:** ao passar o turno, descarta o excesso acima de 7 cartas. Momento, escolha livre e destino Tartarus não mudam.
- **Motivo:** pedido do autor, 01/11/2026.
- **Engine/UI:** `engine-v3/core.js` (`HAND_LIMIT`), `engine-v3/actions.js`, How to Play e `shared/i18n-pt-site.js`.
- **Pendência:** medir IA × IA; `docs/decks-ultra.md` foi medido com limite de 9. Não publicado.

## 2026-11-01 — God (Artemis) — Huntress Training perde o marcador permanente antes do Awaken

- **Antes:** {1}{C}: 1 Training counter no Devotee aliado alvo; Awakened: 2.
- **Depois:** {1}{C}: o Devotee aliado alvo recebe +1 ATK / +1 HP até o fim do Round; Awakened: 1 Training counter em vez disso. EN e PT.
- **Motivo:** autor, 01/11/2026: o Command estava "roubadíssimo"; no turno 2 fazia Lunar Nymph 3/6 e, sendo permanente, crescia todo turno. Os Commands dos outros Gods não deixam bônus permanente.
- **Awakened:** cair de 2 para 1 marcador foi aprovado pelo autor em 01/11/2026.
- **Pendência:** medir IA × IA.

## 2026-11-01 — §5 e capítulo XII — Moment como resposta no próprio turno paga em Base e/ou Latent

- **Antes:** Moment como resposta pagava só com Latent, em qualquer turno.
- **Depois:** só com Latent no turno do adversário. No próprio turno, inclusive como resposta, paga em Base e/ou Latent.
- **Motivo:** decisão do autor, 01/11/2026.
- **Mantido:** Afterlife (§40) como resposta continua só com Latent; o autor não pediu mudança nessa habilidade.
- **Engine e UI:** `playSpell` e `playSpellV6` em `playtest/engine-v3/play.js`, `playableReason` e a dica de resposta em `playtest/divine/app.js`.

## 2026-11-01 — Cartas (Artemis) — 381 Sacred Stag só dá Training em outro Devotee

- **Antes:** *you may put a Training counter on target friendly Devotee* (podia mirar a si mesmo).
- **Depois:** *you may put a Training counter on another target friendly Devotee*, em EN e PT.
- **Motivo:** autor, 01/11/2026: Stag + The Ancient Grove + Divine Command fazia um 4/5 no turno 2 por 2 Bases e 1 Latent.
- **Engine:** Training num campo só (`units[uid].training`), como manda o §48A. Antes as cartas V6 gravavam em `counters` e o Divine Command, Athena e Eagle Marin em `training`: o selo mostrava só parte dos marcadores, e cartas que olham Training, como The Ancient Grove, ignoravam o do Command.

## 2026-11-01 — Termo em PT-BR — Cosmobase → Cosmo Base

- **Antes:** "Cosmobase", junto.
- **Depois:** "Cosmo Base", separado, igual ao inglês (guia, glossário e texto da interface). Não muda regra.
- **Motivo:** autor, 01/11/2026: "a sintaxe do Cosmo Base é separada e não junto".
- **Pendente:** as 19 ocorrências de "Base de Cosmo"/"Cosmo de Base" no texto em PT de `data/cards.json` passam a virar "Cosmo Base", com diff aprovado.

## 2026-11-01 — Termo em PT-BR — Base de Cosmo → Cosmobase

- **Antes:** "Base de Cosmo" e "Cosmo de Base" no português.
- **Depois:** "Cosmobase" (guia, glossário e texto da interface). Não muda regra.
- **Motivo:** autor, 01/11/2026: "o termo é cosmobase".
- **Pendente:** 19 ocorrências no texto em PT de `data/cards.json`, que dependem de diff aprovado; inglês ("Cosmo Base") sem mudança.

## 2026-11-01 — §7, Cap. XI, §55 — Só quem começa não compra no 1º turno

- **Antes:** nenhum jogador comprava no próprio primeiro turno.
- **Depois:** só quem começa a partida não compra no primeiro turno dele. O outro jogador compra 2 cartas já no primeiro turno dele.
- **Motivo:** autor, 01/11/2026: "quem ganha o coinflip escolhe se começa ou se o oponente começa ok. quem começa não compra ok? nova lei".
- **Engine/UI:** `engine-v3/core.js` (`startTurn`), How to Play.
- **Balanceamento:** muda a vantagem de começar (cerca de 74% em IA × IA antes desta regra); simulação ainda não refeita.

## 2026-11-01 — §55 — Cara ou coroa na abertura; quem vence escolhe

- **Antes:** o primeiro jogador era sorteado, sem escolha, e cada um já via a mão inicial.
- **Depois:** antes de qualquer compra, uma moeda define quem vence. Cada jogador já tem uma face e ninguém a escolhe. Quem vence decide começar ou passar o início ao adversário. Só então cada um compra 7 e faz o mulligan.
- **Motivo:** autor, 01/11/2026: "cara e coroa na abertura do jogo, mostra quem começa e aí mostra as mãos, como Pokémon"; o autor escolheu a opção em que o vencedor decide.
- **Engine/UI:** `engine-v3/match.js` (`coin`, `chooseFirst`), `engine-v3/actions.js`, `arena-server/arena.mjs`, `playtest/divine/app.js`, How to Play. Sem a opção `coin`, `createMatch` segue sorteando sem moeda para simuladores e testes.
- **Padrões de implementação, a confirmar com o autor:** no duelo online, quem vence e não escolhe em 30 s começa; a IA sempre escolhe começar.
- **Moeda:** 3D, com face de cada jogador trocável por cosmético (autor, 01/11/2026). Preço: 1000 Moedas de Cosmo, o dobro para Deuses (autor, 01/11/2026). Fora do set.
- **Balanceamento:** em IA × IA recente, o primeiro jogador vence cerca de 74%. Esta mudança não compensa isso.

## 2026-11-01 — §48, tabela de keywords — Seal deixa Unprepared na hora

- **Antes:** Seal só agia quando o Devotee ficaria Prepared; um Devotee Prepared que recebia Seal seguia Prepared e podia agir.
- **Depois:** receber Seal deixa o Devotee Unprepared e põe o marcador. No início do turno do dono, ele tira 1 marcador e não prepara. Os textos explicam a sintaxe com exemplo.
- **Motivo:** autor, 01/11/2026: "deixa o devoto despreparado, e ganha um marcador de selo. no início do turno do dono do devoto, ele tira um marcador de selo, mas não prepara".
- **Engine/UI:** `addSeal` em `engine-v3/core.js`, teste novo, dica do marcador, glossário de keywords, How to Play. Cartas sem mudança de texto.
- **Efeito que prepararia** fora do início do turno tira 1 marcador em vez de preparar (autor, 01/11/2026). 15 textos de 14 cartas ganham o lembrete, com diff aprovado pelo autor em `docs/selo-2026-11-01/cards.diff.md`. Pegasus God Cloth (Kamui) fica de fora por estar congelada (D268).

## 2026-11-01 — Cap. IX, §12, §40, §43, §44, §49, §59 — Lista final de keywords

- **Antes:** listas diferentes no guia, Forge e jogo. Cheater: só alvo de Cheater. Nimble: ignora Guardian. Afterlife: marca ativada ou de gatilho, carta fica no Tartarus. Unfaith ativa sem cartas.
- **Depois:** 7 keywords: Guardian, Pierce, Impulse, Nimble, Long Range, Hidden Cosmo, Afterlife. Nimble é o “voar”: só Nimble mira Nimble e ignora Guardian sem Nimble. Cheater sai, absorvida por Nimble. Unfaith fica reservada. Afterlife é ativada, do Tartarus, no próprio turno ou como resposta; depois vai para o Void. Seal, Sealed e Training são marcadores; Cosmoble, Equip, Resonance e Awaken são mecânicas.
- **Motivo:** grill do autor, 01/11/2026.
- **A confirmar com o autor:** Afterlife como resposta paga só com Latent, seguindo o Moment.
- **Cartas:** diff em `docs/keywords-2026-11-01/cards.diff.md`. Phoenix Ikki não tem Afterlife. Hidden Cosmo só entra em mais cartas depois do teste do Afterlife.
- **Engine/UI:** `engine-v3/strike.js`, `engine-v3/play.js` (`activateAfterlife`), `engine-v3/v6/afterlife.js`, IA, Tartarus do duelo, listas de keyword, glossários, How to Play.

## 2026-11-01 — §7, Cap. XI, §55 — Compra volta a 2 por turno; limite de 9 cartas na mão

- **Antes:** compra de 1 carta por turno (30/10/2026); sem limite de mão.
- **Depois:** compra de 2 cartas por turno, nada no primeiro turno próprio. Limite de 9 cartas na mão: na End Phase do próprio turno, depois da conversão das Bases em Latent, o jogador escolhe e descarta o excesso para o Tartarus.
- **Motivo:** autor, 01/11/2026: em partida real, dois decks agressivos ficaram sem mão com Soul alto, só em trocas de Devotees.
- **Engine/UI:** `engine-v3/core.js` (`DRAWS_PER_TURN`, `HAND_LIMIT`), `engine-v3/actions.js` (descarte no END TURN e no timeout), textos da partida e How to Play.
- **A confirmar com o autor:** momento do descarte, escolha livre e destino Tartarus seguem o padrão de TCG; o autor só definiu "limite de 9 na mão".
- **Pendência:** medir IA × IA; deck-out e vitória do primeiro jogador podem mudar. Não publicado.

## 2026-11-01 — Cartas (Athena) — 082 The Golden Arrow sem condição de Strike

- **Antes:** *Send target enemy Devotee that declared a Strike this turn to the Void…*; a engine só aceitava esse alvo, e a Spell resolvia sem efeito contra quem não atacou.
- **Depois:** *Send target enemy Devotee to the Void. Its controller's God gains Soul equal to that Devotee's ATK.* Qualquer Devotee inimigo é alvo, em EN e PT.
- **Motivo:** autor, 01/11/2026: texto novo no Forge, e a carta "não está exilando". É a versão incondicional do Swords to Plowshares.
- **Engine:** `v6/athena-spells.js` sem o filtro `s.strikes`. `docs/rebalance-athena-premodern.md` fica como histórico do texto de 31/10/2026.

## 2026-11-01 — §13, §60, composição do set — Sai a Rivalidade e o Latent por dano; God Armor adiada

- **Antes:** Rivalidade (§13) e ganho de Latent por dano (§60) suspensas, aguardando decisão. Vanilla Set com uma God Armor por facção, Ares a definir.
- **Depois:** as duas regras saem de vez. Latent vem das Bases Prepared e de cartas. Uma God Armor por facção vira meta do próximo set; o Divine Artifact por facção segue como estava.
- **Motivo:** autor, 01/11/2026 (grill): nenhuma das duas regras está no engine-v3 nem faz falta ao sistema de turnos; só Pegasus God Cloth existe hoje.
- **Engine/cartas:** sem mudança. "Rival" nas cartas é só nome ou subtítulo. Fecha também a pendência da carta de descarte de Athena: Ikki só vai ao Tártaro morrendo, sem carta nova.

## 2026-11-01 — §63 — Domains: linha geral + Ressonância com o God

- **Antes:** Domain com linha simples (sem compra) e linha forte Once per game; 28 Domains (Athena 5, Poseidon 9, Hades 4, Ares 5, Artemis 5).
- **Depois:** 30 Domains, 6 por God. Linha geral para qualquer God; linha Resonance — <God> forte, uma vez por turno, {1}{C} a {3}{C}, só com o God da mesma facção. Um Domain por facção compra 1 carta com drawback. Saem poseidon-v6-146, 147 e 148; entram athena-v6-520, hades-v6-521, hades-v6-522, ares-v6-523 e artemis-v6-524. Textos em `docs/domains-rebalance-proposta.md`.
- **Motivo:** autor, 01/11/2026: Domain fora da facção do God deve ter drawback; a linha geral fica ok para todos, sem quebrar a color pie, e a Ressonância corrige isso. Fechado por grill e aprovado.
- **Pendências:** engine e testes dos 30 Domains; decks que usavam 146/147/148 trocam para 149/144/502.
- **Domain fora da cor** (autor, 01/11/2026, mesma data): saem a restrição de estáticas e o custo extra de {1}{S} da regra de 31/10; fora da cor só se perde a Ressonância. Continua o limite de 15 cartas da facção do Domain. Sai o marcador de Once per game (Domain virado de lado).

## 2026-11-01 — §24, §49, §63 — Gods sem retaliação; Divine Command

- **Antes:** Strike contra God causava dano simultâneo: o God retaliava com o Attack dele, mesmo Unprepared. Gods tinham Soul e Attack e agiam só por Divine Power, Awaken e Ultimate.
- **Depois:** Gods não retaliam e perdem o Attack; só o board protege o God. A retaliação entre Devotees continua. Cada God ganha um Divine Command ({1}{C}, no próprio turno, pilha vazia, uma vez por turno), com versão melhor quando Awakened:
  - Athena: remove 1 dano de Devotee aliado (Awakened: 2 e ganha {1}{S}).
  - Poseidon: Seal em Devotee inimigo de custo 2 ou menos (Awakened: qualquer custo).
  - Hades: -1/-1 até o fim da rodada (Awakened: -2/-2).
  - Ares: 1 dano a Devotee inimigo e Ares perde {1}{S} (sem versão Awakened).
  - Artemis: 1 Training counter (Awakened: 2).
  Saem as cláusulas sobre retaliação do God (Unfaith, Ultimate de Artemis).
- **Motivo:** autor, 01/11/2026: a retaliação do God deixava o jogo "muito ruim no board"; o God passa a agir taticamente sem atacar. Fechado por grill.
- **Pendências:** `data/cards.json` (textos dos 5 Gods, Ultimate de Artemis, campo de ataque), engine (`strike.js`, `gods.js`), IA, interface e arena-server.

## 2026-11-01 — §24, §55 — Deck vazio derrota; sai a Fatigue

- **Antes:** comprar de deck vazio aplicava Fatigue (ALPHA-P07 opção A): o God perdia Soul 1, 2, 3… a cada compra falha. Mill não causava Fatigue (D233).
- **Depois:** quem precisa comprar com o deck vazio perde a partida na hora (compra do turno ou por efeito). Deck vazio sozinho não derrota; a derrota vem na próxima compra. Mesmo efeito com os dois comprando de deck vazio: empate. A Fatigue sai do jogo. Mill vira condição de vitória.
- **Motivo:** autor, 01/11/2026: "quando o deck acaba, o jogo acaba imediatamente. mill é win condition"; derrota na compra, sem Fatigue, empate se os dois.
- **Engine/UI:** `draw` em `playtest/engine-v3/core.js` chama `loseGame(..., 'deck_out')`; testes de core e match atualizados. A tela de fim mostra o motivo. Pendente: o arena-server precisa reiniciar para o online.

## 2026-11-01 — §2, §63 — Deck de 50 cartas

- **Antes:** deck principal de 60 cartas.
- **Depois:** deck principal de 50 cartas (God e Domain fora). Continua o limite de 3 cópias e de até 15 cartas da facção do Domain fora da cor. A Fatigue (deck vazio) chega 10 cartas antes.
- **Motivo:** autor, 01/11/2026, depois de um duelo Athena × Poseidon Control travado na rodada 10 com 44 cartas no deck: "deck de 50 cartas, perfeito! igual star wars!".
- **Decks:** ficam 5 starters (1 por God) e 8 competitivos (dos 15 anteriores ao rebalanceamento Premodern), todos refeitos com 50; os outros saem. Decks salvos pelos jogadores com 60 aparecem inválidos até o ajuste.
- **Engine/UI:** `shared/deck-v3.js` (`DECK_SIZE`), textos do site e do Star Hill.

## 2026-11-01 — Cartas (Fênix) — Sai o marcador de Renascimento

- **Antes:** Phoenix Ikki (009) custo 5, Hidden Cosmo {6}, com Phoenix Rebirth (substituía a derrota uma vez e punha 1 marcador de Renascimento). Phoenix Cloth V2 (010) e Esmeralda (038) removiam marcadores; The Return of the Phoenix (080) punha 1 marcador; Leo Gold Cloth (016) deixava Ikki ativar Lightning Plasma sem {T}.
- **Depois:** Ikki custo 4, Hidden Cosmo {5}, sem Phoenix Rebirth: ele morre e volta pelo Tártaro (Arise from the Ashes, estilo Arclight Phoenix). 010: Ikki equipado derrotado → compre 1 carta. 038: Esmeralda derrotada → pode devolver um Phoenix Ikki do Tártaro à mão. 080: alvo Ikki traz também cada outro Ikki do Tártaro (Unprepared, sem Strike no Round). 016: sempre que um Phoenix Ikki volta do seu Tártaro, 1 de dano num Devotee inimigo alvo. O marcador de Renascimento sai do jogo.
- **Motivo:** autor, 01/11/2026: Ikki resiliente demais; "eliminar essa habilidade de ikki e repensar as cartas que interagem com esse token", com o novo Ikki Arclight Phoenix. Diff do `cards.json` aprovado.
- **Engine:** `v6/athena-devotees.js`, `v6/athena-gear.js`, `v6/athena-spells.js`. Leitura de 016: vale com a Cloth solta ou presa a um Ikki. Pendente: carta de descarte em Athena para mandar Ikki ao Tártaro.

## 2026-11-01 — §28/§33 — Armas e acessórios entram sem portador

- **Antes:** jogar arma ou acessório exigia um portador: pagava o Equip impresso (ou o custo, no Devotee nomeado) e já entrava preso ("auto equip").
- **Depois:** jogar custa o custo impresso, só Base, e a carta entra em campo sem portador. Prender é outra ação, no próprio turno, pagando o Equip impresso em Base e/ou Latent (o nomeado na Resonance paga o custo impresso). Igual à Armor sem Devotee Resonant.
- **Motivo:** autor, 01/11/2026: "ainda tá dando auto equipe, resolva esse problema do equip de uma vez por todas"; escolheu "Entra sem portador".
- **Engine:** `engine-v3/play.js` (`playEquipment`, `reequip`), IA (`divine/ai.js`), UI (`divine/app.js`). Itens globais não mudam.

## 2026-11-01 — G3-024/G3-028/G3-031 — 90 segundos por ação

- **Antes:** 60 s básicos + reserva inicial 180 (teto 240), +50% do básico não usado, +5 s por ação; 12 tochas de 20 s.
- **Depois:** 90 s por ação. O tempo volta cheio a cada ação feita e a cada decisão que chega ao jogador, inclusive resposta no turno do adversário e depois de um timeout. Sem básico, sem reserva guardada; 12 tochas de 7,5 s. Os efeitos de timeout (G3-027, G3-030) não mudam.
- **Motivo:** autor, 01/11/2026: "O tempo ta muito longo por acao de jogador, deixe com 1 minuto e meio".
- **Engine:** `engine-v3/clock.js` (`ALPHA_CLOCK.perAction`, `TORCH_SECONDS`); o arena-server usa o mesmo módulo. Rótulo do relógio em `divine/app.js`: `Turn` ou `Response`.

## 2026-11-01 — G3-024/G3-028 — Relógio de 4 minutos

- **Antes:** 60 s básicos + reserva inicial 90 (teto 180); 12 tochas de 15 s.
- **Depois:** 60 s básicos + reserva inicial 180 (teto 240): 4 minutos no começo do turno; 12 tochas de 20 s. Ainda vale G3-031 (o básico só no turno próprio) e +50% do básico não usado.
- **Bônus por ação (como no MTG Arena):** cada ação ou resposta do jogador (não timeout) devolve 5 s à reserva dele, até o teto (`clockBonus`).
- **Motivo:** autor, 01/11/2026: "aumente o tempo para 4 minutos, está atrapalhando muito" e "a cada ação do jogador o timer aumenta um pouco".
- **Engine:** `engine-v3/clock.js` (`ALPHA_CLOCK`, `TORCH_SECONDS`); o arena-server usa o mesmo módulo.

## 2026-11-01 — §63 — Phoenix Ikki não é lendário

- **Antes:** Phoenix Ikki (athena-v6-009), Saint, seguia a regra de lendário: uma cópia por jogador no campo.
- **Depois:** exceção no §63: o jogador pode controlar qualquer número de Phoenix Ikki. Texto da carta: *Eternal Phoenix — Phoenix Ikki is not legendary: you may control any number of them.*
- **Motivo:** autor, 01/11/2026 ("a regra de lendário não se aplica a Ikki"), para o Rebirth estilo Arclight Phoenix trazer mais de um.
- **Engine:** `effects.js` `namedCharacter` devolve null para 009.

## 2026-11-01 — Cartas — "If you control a Domain" vira Domain da facção

- **Antes:** 106 Ocean Temple Guard e 173 The Fall of Atlantis diziam "if you control a Domain", sempre verdadeiro (todo jogador tem Domain; pendência de 31/10/2026).
- **Depois:** "if you control a Poseidon Domain" (PT: "um Domínio de Poseidon"). Regra de Card Craft: condição de Domain sempre nomeia o Domain do Deus da cor da carta.
- **Motivo:** autor, 01/11/2026: "quando for assim, coloque quando o domínio for o do deus da cor da carta".
- **Engine:** `v6/poseidon.js` (`poseidonDomain`). A 158 já não tinha a condição.

## 2026-10-31 — Cartas (Poseidon) — Cantrips baratas

- **Antes:** Poseidon não tinha Spell de custo 1; a seleção mais barata era 135 (c2, olhar 3 e pegar 1). 135, 138, 139 e 158 tinham textos de Seal/Domain.
- **Depois:** 135 Beneath the Surface c1 Moment (Opt: olhe o topo, pode pôr no fundo, compre 1); 138 The Ocean's Embrace c1 Moment (Brainstorm: compre 3, ponha 2 da mão no topo); 139 Whispers from the Abyss c1 **Technique** (Ponder: olhe 3, devolva em qualquer ordem ou embaralhe, compre 1); 158 The Awakening of Atlantis c2 Moment (compre 1 + 1 por cópia no seu Tartarus). Todas Cosmoble; texto EN e PT.
- **Motivo:** autor, 31/10/2026: faltavam Opt, Brainstorm e cantrips baratas em Poseidon (meta Premodern). Mapeamento aprovado na mesma data.
- **Engine e listas:** `v6/poseidon.js` (helpers `putBack`, a primeira escolhida fica por cima, e `shuffleDeck`, sorteio determinístico pelo estado); perguntas traduzidas em `shared/i18n-pt.js`. Brainstorm ×3 em Poseidon Control, Counter Control e Azorius (saem 137 ×2 e 132 ou 150 ×1).

## 2026-10-31 — §56 — Gatilho opcional impossível não dispara

- **Antes:** o guia não dizia; a engine punha na pilha (com janela e log) gatilhos opcionais impossíveis de usar e só descobria na resolução.
- **Depois:** §56: gatilho opcional que não pode ser usado no disparo (custo não pagável, "once each round" já usado, sem alvo válido) não dispara: não vai à pilha, não abre janela, não aparece no log. Checa no disparo e de novo na resolução.
- **Motivo:** autor, 31/10/2026, em playtest: "muitos gatilhos triggam mesmo que não seja possível usar o gatilho, principalmente de base e deus". Regra aprovada na mesma data.
- **Engine:** `pushTriggers` (`playtest/engine-v3/core.js`) só põe na cadeia o gatilho que tem efeito agora: `hooks.idleTrigger` (`v6/hooks.js`) ensaia o corpo do gatilho numa cópia do estado; se ele não pergunta nada e não muda nada, não dispara, e o "once each round" gasto ao gerá-lo volta. Vale para gatilhos de carta e de Domain (`collect`/`own`) e dos Gods (Water Prison, Offering of Life, King of Tartarus, Obliteration, Butchery, Pressure of the Deep). Ultimate, Bloodlust e Divine Judgment (`activated`) sempre vão à cadeia. 380 Bone Reclamation passou a checar a Soul antes de perguntar. Teste: `tools/test-trigger-impossible.mjs`.
- **Gatilho obrigatório sem efeito (autor, 31/10/2026):** gatilho obrigatório que não teria efeito nenhum (ex.: "deal 1 damage to target enemy Devotee" sem inimigo) também não dispara; acrescentado ao §56. A engine já fazia assim.

## 2026-10-31 — §4A — Hidden Cosmo (keyword nova)

- **Antes:** carta na Cosmo Base só pagava Cosmo; não havia como jogá-la de lá.
- **Depois:** §4A *Hidden Cosmo {X}*: a carta pode ser jogada da sua Base pagando {X}; pode pagar 1 de si mesma se estiver Prepared e Base valer para o custo; o topo do deck entra no lugar como Base Unprepared. Momento e forma de pagar seguem a carta (§5). Cinco cartas, uma por facção: 009 Phoenix Ikki {6}, 157 The Frozen Depths {5}, 209 Worm Raimi {4}, 295 Bloodthirsty Berserker {3}, 394 Black Satellite Soldier {3}.
- **Motivo:** autor, 31/10/2026: mecânica do tipo Smuggle (Star Wars Unlimited), com nome próprio; regras e cartas aprovadas na mesma data.
- **Engine e UI:** `castHidden` em `playtest/engine-v3/play.js` (ação `hidden`), botão na tela das Bases da arena, IA e How to Play.

## 2026-10-31 — Convenção de idioma — Jogo em PT-BR e EN

- **Antes:** todo texto visível ao jogador era só em inglês (CLAUDE.md).
- **Depois:** o jogo inteiro (site, lobby, duelo, Card Forge, How to Play, Termos e Privacidade) tem PT-BR e EN. Abre em PT-BR quando o navegador está em português; senão em EN. Troca em Options › Language (lobby e duelo) e na chave PT/EN do cabeçalho do site; uma configuração só (`ssTcgOlympusArena.lang`). Online, cada jogador vê o próprio idioma. Termos de jogo: `docs/glossario-pt-br.md` (Golpe, ATQ/PV, Magia, Despreparado, Alma, Base de Cosmo, Tártaro, Vazio, Pilha…). Nomes de cartas e personagens seguirão a dublagem clássica (Seiya de Pégaso).
- **Motivo:** autor, 31/10/2026: "é um jogo feito por brasileiros". Escopo, glossário e fases aprovados na mesma data.
- **Código:** `shared/i18n.js` traduz o texto na entrada da página (MutationObserver), sem mudar a engine nem o servidor; o guia de regras não muda.
- **Pendências:** fase 3 — texto das cartas em campos `*_pt` (rascunho meu, diff para aprovação), nomes dos decks iniciais, notas de keyword e PT/EN na exportação do Forge. Termos e Privacidade em PT são rascunho para o autor revisar.

## 2026-10-31 — Cartas (Cosmoble) — Rebalanceamento de Cosmoble

- **Antes:** 499 das 509 cartas eram Cosmoble (98%); toda carta podia virar Cosmo Base.
- **Depois:** 144 cartas perdem Cosmoble; cada facção e as neutras ficam com cerca de 70% Cosmoble. Perdem as cartas acima da curva e as de ramp. Lista completa e critério em `docs/rebalance-cosmoble.md`. A regra do §4 (Cosmo Base) não muda.
- **Motivo:** autor, 31/10/2026: a escolha de quais cartas viram Cosmo é o que deixa o deckbuild interessante, como no Lorcana. Aprovado na mesma data.
- **Engine e UI:** `shared/preview-cards.js` lê o Cosmoble do Forge também para Athena (o D268 dizia "Yes"); o construtor mostra "Cosmoble X / 60" e avisa abaixo de 60% (aviso, não regra); a IA (`playtest/divine/ai.js`) põe como Base a cópia repetida e depois a carta que não cabe no próximo turno; How to Play explica que nem toda carta é Cosmoble. Athena Seal Control, Ares Glorious Demise e Artemis Hunt reajustadas para 40–41 Cosmoble.
- **Pendências:** Moon Harvest (Artemis) fica mais forte com mais cartas sem Cosmoble; medir no round-robin.

## 2026-10-31 — §63 — Revisão dos Domains, How to Play

- **Antes:** 063 Jamir Tower tinha linha 1 ativada com {T} e {2}{C}, sem limite por rodada (o {T} conflita com o Domain que vira de lado no Once per game); 333 e 335 diziam "once per turn"; 332 dizia "gain +1 ATK"; 504 não dizia "once each round". Os Domains de Athena no D268 congelado tinham o texto antigo (062 comprava carta na linha 1). 501 Athena's Statue não existia na engine (fora do D268 e do filtro de prévia). O How to Play não explicava a forma dos Domains, o Once per game nem o Domain fora da cor.
- **Depois:** 063: *Once each round, you may pay {1}{C}. If you do, remove 1 damage from target friendly Devotee equipped with an Armor.*; 333 e 335: "once each round"; 332: "get +1 ATK"; 504: *Once each round, at the start of your turn…*. `shared/preview-cards.js` monta os Domains de Athena e as cartas de Athena fora do D268 a partir do Forge. How to Play: Domain no tipo de carta, "Your Domain" (duas linhas, Once per game) e "A Domain from another faction" (só a primeira habilidade, estáticas desligadas, {1}{S}, até 15 cartas); Seal não impede o Strike de Devotee Prepared.
- **Motivo:** autor, 31/10/2026: "as cartas não estão respeitando as regras novas de domain"; correções aprovadas na mesma data.
- **Engine:** `v6/athena-spells.js` (063 custa {1}). Auditoria: os 28 Domains têm linha 1 e Once per game implementados; fora da cor, `domainEntry` desliga estáticas e Once per game e cobra {1}{S} nos gatilhos; os do `effects.js` (062, 064, 335) e o 243 (`hades.js`) checam `offColor`. Suíte engine-v3 inteira passa (495 testes).
- **Pendências (para o autor):** 106, 158 e 173 dizem "if you control a Domain", sempre verdadeiro (todo jogador tem Domain); 147 e 245 têm linha 1 escrita como estática mas implementada como gatilho (fora da cor pede {1}{S} em vez de desligar); Domains cuja linha 1 é ganho de 1 Soul (142, 243, 428, 501) não rendem nada fora da cor ({1}{S} para ganhar {1}{S}); `star-hill/deck-builder.js` (editor antigo do Star Hill) ainda usa 4 cópias e não tem o limite de 15, enquanto o lobby e o editor Olympus usam 3 e 15; `tools/test-card-presentation.mjs` segue com 2 falhas antigas.

## 2026-10-31 — Decks — Duplas do meta Premodern

- **Antes:** o meta tinha as 6 listas das facções solo.
- **Depois:** 4 listas duplas em `data/alpha-0.1/decks-competitivos.json`: Athena Enchantress (`comp-enchantress`, Domain 504), Hades Reanimator (`comp-reanimator`, Domain 144), Ares Rakdos (`comp-rakdos`, Domain 244) e Poseidon Azorius (`comp-azorius`, Domain 501). Cada uma tem 45 cartas da facção do God e 15 da facção do Domain fora da cor (§2, §63). Nenhuma carta mudou.
- **Motivo:** meta Premodern aprovado pelo autor em 31/10/2026 (`docs/meta-premodern.md`); listas aprovadas em 31/10/2026 (`docs/duplas-premodern.md`). Com elas, o meta tem as 10 listas de referência.
- **Validação:** as 10 listas passam em `colorErrors` (`shared/deck-v3.js`) e têm 60 cartas.
- **Pendências:** round-robin de bots (meta 45–55%); planos de IA por arquétipo; o Domain fora da cor rende pouco (só a primeira linha, gatilhos com {1}{S}), e o 501 do Azorius quase não dispara sem Saints.

## 2026-10-31 — Cartas de Artemis — Verde (Elves: ramp + tribal, meta Premodern)

- **Antes:** dano fixo em 388 (1), 435 (3 no ETB) e 379 (2 a cada Strike); 397 Sacred Grove Dryad c2; 449 c7 e 450 c8; textos com "+1/+1 counter", "Once per round" e "once per turn".
- **Depois:** 388 dá Training counter num Devotee seu; 435 tem fight opcional no ETB; 379 dá +2 ATK quando o portador declara Strike contra Devotee. 397 c1, 449 c5 (Overrun), 450 c6. Fight e bite ficam como a remoção do Verde. Em todas as cartas de Artemis, "+1/+1 counter" virou "Training counter" (§48A) e "once per round/turn" virou "once each round" (§64); só texto, sem mudar efeito (60 cartas no total).
- **Motivo:** meta Premodern aprovado pelo autor em 31/10/2026 (`docs/meta-premodern.md`); diff aprovado em 31/10/2026 (`docs/rebalance-artemis-premodern.md`).
- **Engine:** `playtest/engine-v3/v6/artemis.js` (379, 388, 435; perguntas dizem "Training counter"). Testes novos em `tools/test-engine-v3-v6-artemis.mjs`. Suíte engine-v3 inteira passa (494 testes).
- **Decks:** "Artemis Hunt" (`comp-artemis-hunt`) em `data/alpha-0.1/decks-competitivos.json`. Os decks Artemis antigos não foram retunados.
- **Pendências:** round-robin de bots (meta 45–55%); playtest do autor; lista Enchantress na etapa das duplas.

## 2026-10-31 — Cartas de Hades — Preto (Midrange + Reanimator, meta Premodern)

- **Antes:** Seal em 11 cartas (papel do Azul); reanimação com teto de custo (240 ≤4); remoção dura a c5 (194, 262); discard a c2–c3 (239, 257); 265 era o Threaten (papel de Ares); topo de c7 a c9 (199, 269, 270).
- **Depois:** 16 cartas. O Seal fica só em Hypnos (191, 192, 268). Nas outras: 183, 184, 209, 229 e 258 dão −X/−X; 216 e 254 impedem o Strike do alvo no próximo turno dele; Puppet Master (183) e Aurora Execution (254) disparam quando um Devotee inimigo é derrotado; Underground Ambush (209) mira Devotee com dano. 240 vira o Animate Dead (Technique c3, qualquer custo, sem Strike neste Round, {3}{S}). 265 reanima do Tartarus do oponente (Technique c5). 194 c3, 262 c4, 239 c1, 257 c2, 269 c6, 270 c7 (sem o sacrifício final), 199 c5.
- **Motivo:** meta Premodern aprovado pelo autor em 31/10/2026 (`docs/meta-premodern.md`); diff aprovado em 31/10/2026 (`docs/rebalance-hades-premodern.md`).
- **Engine:** `playtest/engine-v3/v6/hades.js` (`weakenOnEnter`, `lockOnEnter`/`lockNextTurn` via `forbidStrike`; o gancho de fim de Round do Threaten saiu). Testes em `tools/test-engine-v3-v6-hades.mjs`; os testes de pilha que usavam o 258 como sonda de Seal passaram a usar o 192 (Hypnos). Suíte engine-v3 inteira passa (490 testes).
- **Decks:** "Hades Midrange" (`comp-hades-midrange`) em `data/alpha-0.1/decks-competitivos.json`. Os decks Hades antigos não foram retunados.
- **Atalhos do motor:** Stone Curse (216) dá −2 ATK até o fim do Round, como antes.
- **Pendências:** round-robin de bots (meta 45–55%); playtest do autor; lista Reanimator na etapa das duplas.

## 2026-10-31 — Cartas de Poseidon — Azul (Control + Marina, meta Premodern)

- **Antes:** counters de c4 (154, 159, 167) não podiam responder, porque a resposta paga só com Latent (teto 3); todo counter anulava só Moment/Technique; discard do oponente em 093, 094, 155, 162, 163, 167, 173, 175 e 180; dano direto em 165 e 174; 101 Julian ganhava Soul; Herald (103) dava +0/+1; Spells de c7 a c10.
- **Depois:** 26 cartas. Escada de counters até c3, cada um com alcance: 133 e 136 (Moment/Technique, c2), 156 (Equipment na pilha, c2), 159 (Devotee na pilha, c3), 154 (c3) e 167 (qualquer carta ou habilidade na pilha, c3, com custo adicional: o God perde {3}{S} e você descarta 1 carta). O discard virou mill ou compra. 165 vira Seal com −2 ATK (c3) e 174 vira Seal em todo Devotee inimigo (c6). 101 dá loot. 103 (+1/+1) e 118 (+1 ATK) são lordes Marina; 107 custa 1 (2/1). 109 e 120 dizem "target player" (self-mill). 135 c2, 158 c4, 177/178/179 c6, 180 c7; "discard pile" virou Tartarus.
- **Motivo:** meta Premodern aprovado pelo autor em 31/10/2026 (`docs/meta-premodern.md`); diff aprovado em 31/10/2026 (`docs/rebalance-poseidon-premodern.md`).
- **Engine:** `playtest/engine-v3/v6/poseidon.js` (counter por alcance: `onStack`, `cancelOnStack`; habilidade anulada sai da cadeia e a fonte fica no campo; `targetPlayer`; custo adicional do 167 pelo gancho `spell.cost`). Testes em `tools/test-engine-v3-v6-poseidon.mjs`. Suíte engine-v3 inteira passa (487 testes).
- **Decks:** "Poseidon Control" (`comp-poseidon-control`) e "Poseidon Marina" (`comp-poseidon-marina`) em `data/alpha-0.1/decks-competitivos.json`. Os decks Poseidon antigos não foram retunados.
- **Atalhos do motor:** "target player" sem resposta escolhe o oponente; os counters de Devotee (117, 119, 121, 124) seguem só contra Moment/Technique.
- **Pendências:** round-robin de bots (meta 45–55%); playtest do autor; IA não sabe usar o 167 contra habilidades.

## 2026-10-31 — Cartas de Athena — Branco (Saints + Enchantress, meta Premodern)

- **Antes:** truques defensivos (054, 056, 058, 061, 076, 079, 081) eram Technique; Seal em Shaina, Dante e Perseus Silver Cloth; The Golden Arrow (082) c5; Healer (041) e 035 só curavam; magias caras de c7 a c10 (020 The Last Miracle, 087 The Last Hope, 088 The Path, 089, 090).
- **Depois:** 20 cartas. Os sete truques e The Golden Arrow viram Moment (081 c3; 082 Moment c1: Devotee inimigo que declarou Strike neste turno vai ao Void e o God dele ganha Soul igual ao ATK). O Seal fica só nos Saints do gelo; 022 e 069 dão −1 ATK e 075 impede o Strike. 042 (c2) e 043 compram 1 quando você joga Equipment que não é Armor (1x por turno). 035 e 041 escolhem: curar ou ganhar {1}{S} / {2}{S}. 020 é o anthem c4 sem The Last Miracle; 087 c5 e 088 c5 sem preparar; 089 c6 com "up to two"; 090 c6 com +2/+2.
- **Motivo:** meta Premodern aprovado pelo autor em 31/10/2026 (`docs/meta-premodern.md`); diff aprovado em 31/10/2026 (`docs/rebalance-athena-premodern.md`).
- **Engine:** `v6/athena-devotees.js` (`healOrSoul`, `enchantress`), `v6/athena-gear.js`, `v6/athena-spells.js` (082 novo), legado em `effects.js` e conjuntos `MOMENTS`/`TECHNIQUES` em `core.js`. Athena lê o D268 congelado: `shared/preview-cards.js` sobrepõe custo e Moment/Technique do Forge. Suíte engine-v3 inteira passa (484 testes).
- **Decks:** "Athena Saints" (`comp-athena-saints`) em `data/alpha-0.1/decks-competitivos.json`. Os decks Athena antigos não foram retunados.
- **Pendências:** round-robin de bots (meta 45–55%); playtest do autor; lista Enchantress na etapa das duplas; `tools/test-card-presentation.mjs` tem 2 falhas que já existiam antes desta mudança.

## 2026-10-31 — Cartas de Ares — Sligh (meta Premodern), 2ª passada

- **Antes:** Fear Legion fazia o oponente descartar; wraths de 6 a 8 (352, 358, 359); pings de entrada em 281, 287 e 343; Promethean Fire (271); Mind Reading (273); Flame of Annihilation (289).
- **Depois:** 24 cartas (271, 273, 277, 278, 281, 283, 285, 287, 289, 294, 296, 300, 321, 322, 327, 328, 339, 343, 344, 348, 351, 352, 358, 359). O discard vira perda de Latent ("loses {1}{L}"), os wraths viram alcance (352: 4 no God; 359: 1 por Devotee no seu Tartarus, até 5), First Blood vira o Bolt (3 em Devotee ou 1 no God), saem os pings de entrada em excesso, Alcmenes passa a c5 5/4 Impulse e Arionte ganha Impulse.
- **Motivo:** meta Premodern aprovado pelo autor em 31/10/2026 (`docs/meta-premodern.md`); diff aprovado em 31/10/2026 (`docs/rebalance-ares-premodern.md`).
- **Desvio do diff:** 277 e 294 usam "loses {1}{L}" em vez da keyword Unfaith, porque o `engine-v3` não implementa Unfaith.
- **Engine:** `playtest/engine-v3/v6/ares.js` (helper `drainLatent`, observador novo `watchLatentLoss`, `distribute`) e `tools/test-engine-v3-v6-ares.mjs` (23 testes). Suíte engine-v3 inteira passa (484 testes).
- **Decks:** "Ares Sligh" (`comp-ares-sligh`) em `data/alpha-0.1/decks-competitivos.json`. Berserker Blitz e Glorious Demise não foram retunados.
- **Pendências:** round-robin de bots (meta 45–55%); playtest do autor.

## 2026-10-31 — §63 — Forma dos Domains e Once per game

- **Antes:** Domains com uma a três habilidades, várias com compra de carta recorrente.
- **Depois:** duas linhas: efeito simples (teto de 1 ponto, até 1x por rodada, sem compra) + habilidade **Once per game** (ativada no próprio turno, vai à pilha, Domain vira de lado ao declarar). Compra de carta só na Once per game.
- **Motivo:** autor, 31/10/2026: "Domains devem ser coisas simples; os poderosos taxados ou com uso uma vez na partida".
- **Cartas:** os 28 Domains reescritos em `data/cards.json` (`habilidades_en`), diff aprovado pelo autor em 31/10/2026 (`docs/rebalance-domains-2026-10-31.diff.md`).
- **Engine (31/10/2026):** `playtest/engine-v3` aplica os 28 textos novos, a Once per game (`domain:${key}:opg` em `play.activate`; `state.domainUsed`) e o Domain fora da cor (`v6/registry.js` `domainEntry`/`offColor`/`payOffColor`: estáticas e Once per game desligadas, {1}{S} opcional nos gatilhos e +{1}{S} na ativada). Resonances de Domain em Kanon (091), Sorrento (093), Isaac (097) e Baian removidas. Interface (`playtest/divine/app.js`): botão da Once per game e Domain virado de lado depois do uso. `card-forge/art-web/cards.json` recebeu os mesmos 28 textos.
- **Atalhos do motor:** o "once each round" do gatilho fora da cor é gasto mesmo se o jogador recusar o {1}{S}; os custos de sacrifício (503) e de Base ao Tartarus (504) da Once per game são pagos na resolução.
- **Pendências:** IA não usa habilidades de Domain; `star-hill/deck-builder.js` sem o limite de 15; interface não verificada no navegador.

## 2026-10-31 — §2 e §63 — Domain fora da cor do God

- **Antes:** o deck aceitava, sem limite, cartas da facção do God, da facção do Domain e neutras; o Domain funcionava inteiro qualquer que fosse a facção do God. Na prática, qualquer deck podia escolher o Domain com melhor compra de cartas.
- **Depois:** Domain de facção diferente da do God usa só a primeira habilidade impressa; estáticas não funcionam; disparadas e ativadas pedem custo adicional opcional de {1}{S} (sem pagar, não é usada). O deck pode ter até 15 cartas da facção do Domain; neutras não contam. Domain da mesma facção funciona inteiro.
- **Motivo:** autor, 31/10/2026 (grilling): evitar que todos usem os Domains de draw engine e dar ressonância a Deus + Domain da mesma cor.
- **Pendências:** deckbuilder (`shared/deck-v3.js`, `playtest/lobby.js`) e motor do playtest. Rebalanceamento dos 28 Domains pedido pelo autor na mesma data (Domains simples; os poderosos taxados ou de uso único na partida) — exige diff aprovado em `data/cards.json`.

## 2026-10-31 — §12, §40, §42, §44 e §62 — Cheater e Afterlife novos

- **Antes:** Cheater ignorava Guardian ao mirar o God e anulava o Long Range de quem o atacava. Afterlife era keyword universal: todo Devotee no Tartarus tinha Afterlife.
- **Depois:** Cheater só pode ser alvo de Strike de outro Devotee com Cheater (ele ataca qualquer alvo legal); um Guardian que o atacante não pode mirar não conta para a exigência de Guardian. Afterlife marca habilidade impressa que só funciona com a carta no Tartarus do dono, em qualquer tipo de carta; ativada usa AÇÃO e vai à pilha; gatilho dispara no Tartarus. Estar no Tartarus não dá Afterlife.
- **Motivo:** autor, 31/10/2026 (grilling).
- **Pendências:** motor (strike.js), lembretes de keyword (shared/keyword-glossary.js) e How to Play ajustados nesta data. Nenhuma carta usa Afterlife ainda; habilidades Afterlife no motor ficam para quando a primeira carta existir.

## 2026-10-31 — Caps. II–V, IX, XI, XII (§§2–9, 10–13, 19–20, 28, 42–47, 55–58, 59, 60–65) — Guia passa a turnos dentro do Round

- **Antes:** o guia (2.1) descrevia AÇÕES alternadas (uma AÇÃO por oportunidade, Pass, iniciativa alternando), Devotee entrando Prepared, guarda por Prepared (alvo aberto só se Unprepared, Guardian ou Rival), Rivalidade, conversão opcional de Bases em Latent no encerramento do Round, ganho de 1 Latent por AÇÃO adversária com dano, Cheater só anulando Long Range e a tabela de Sealed impedindo Strike.
- **Depois:** o guia segue as regras Alpha aprovadas (ALPHA-P01 a P07, 28/10/2026; G3-035, G3-038; compra de 1 carta, 30/10/2026; Seal D211, 31/10/2026), como no `playtest/engine-v3`:
  - Round = um turno de cada jogador; o primeiro jogador é sorteado e começa todos os Rounds; o ativo faz quantas jogadas puder pagar e encerra com END TURN.
  - Início do turno: preparar Devotees, Equipment e Bases; gatilhos; comprar 1 (nada no primeiro turno próprio). Mulligan parcial único (P01).
  - Uma Base por turno, entra Prepared e paga no mesmo turno (G3-035). Bases Prepared viram Latent no início da End Phase, num único evento, teto 3 (P03).
  - Devotee entra Unprepared; Impulse ataca no turno de entrada (P02). Um Strike por Devotee por turno (D22).
  - Alvo: God inimigo ou qualquer Devotee inimigo; Guardian em campo, Prepared ou não, obriga a mirar Guardian; Nimble ignora; Cheater ignora contra o God e mantém a anulação de Long Range (P05, G3-038).
  - Não ativo só age em janelas: Moment pago só com Latent e habilidades marcadas como resposta.
  - Tabela de keywords alinhada a Guardian, Cheater, Impulse e Sealed (§48). Textos voltam a usar “turn” (turno de um jogador) e “round” (par de turnos).
- **Motivo:** autor, 31/10/2026 (“o turno agora é por ROUND, não existem mais actions”); o guia tinha ficado para trás do que foi aprovado e implementado.
- **Pendências (decisão do autor):**
  - **Rivalidade (§13, §58):** suspensa; o engine-v3 não cria Rivals. Retirar de vez ou adaptar aos turnos? Cartas que citam Rival aguardam.
  - **Ganho de Latent por dano (§60):** suspenso; não está no engine-v3.
  - O capítulo XII mantém o título “Consolidação 2.1”; renomear a versão do rulebook quando o autor decidir.
  - Página pública `/how-to-play/` já segue estas regras.

## 2026-10-31 — §54 e cartas — Event vira Moment; motor segue os subtipos vigentes

- **Antes:** o guia dizia que Event joga como Technique; o motor jogava 052, 055 e 083 como Technique e ainda tratava os ex-Miracles 054, 056, 058, 061, 076 e 079 como Moment (lista D194), permitindo jogá-los no turno do oponente.
- **Depois:** Event deixa de ser subtipo. 052 The Galaxian Wars, 055 The Masked Saint’s Oath e 083 The Twelve Flames são **Moment**, como já estava em `data/cards.json` (custo impresso em Base; como resposta, paga Latent). Os ex-Miracles são Technique: só como AÇÃO, pagos com Base.
- **Motivo:** autor, 31/10/2026 (Technique estava liberada no turno do oponente; conflito Moment × Event × Technique entre cards.json, Card Forge e motor).
- **Pendências:** `card-forge/art-web/cards.json` alinhado (Event → Moment). `data/cards.json` não mudou. Detalhes em `docs/event-technique-2026-10-31/cards.diff.md`.

## 2026-10-31 — §56 — Gatilhos simultâneos (APNAP) e interface de triggers

- **Antes:** o guia não dizia a ordem de gatilhos simultâneos; a engine empilhava os do jogador ativo primeiro, na ordem em que disparavam.
- **Depois:** APNAP como no Magic: os do jogador ativo entram primeiro (resolvem por último); cada jogador ordena os próprios antes de qualquer passe.
- **Motivo:** autor, 31/10/2026 (grilling da interface de triggers).
- **UI decidida:** painel lateral único para decisões e triggers, fila “Trigger N of M” com ordenação, auto-pass sem resposta possível + “Full control”, linha de energia e número no alvo ao resolver, faixa não bloqueante para triggers do oponente, painel até 38% da largura no celular, brilho do rodapé do dono do turno.
- **Pendências:** implementado no playtest local, não publicado. O duelo online só aceita a ordenação depois que o arena-server receber a engine nova (ação `orderTriggers`).

## 2026-10-31 — §54 e cartas — Miracle vira Technique

- **Antes:** 15 Spells da Athena com subtipo “Miracle” (o motor já as jogava como Technique).
- **Depois:** subtipo “Technique” (`data/cards.json`; diff aprovado em `docs/miracle-technique-2026-10-31/cards.diff.md`). Miracle fica só como pilar temático da Athena (§54).
- **Motivo:** autor, 31/10/2026.
- **Pendências:** nenhuma. Não publicado.

## 2026-10-31 — §48 — Seal e Sealed seguem a D211; lembretes de keyword

- **Antes:** §48 “Sealed” impedia Strike e ativação de habilidades até o fim da rodada; a engine seguia a D211 (marcador que atrasa o Prepare). Conflito registrado em 23/10.
- **Depois:** §48 “Seal e Sealed”: o marcador Seal impede o próximo Prepare (remove 1 em vez de preparar); Sealed = ter 1+ marcadores; não bloqueia Strike nem habilidades.
- **Motivo:** autor, 31/10/2026: vale o comportamento da engine.
- **UI:** fichas de keyword no inspetor do duelo e na ficha do lobby, estilo MTG Arena (`shared/keyword-glossary.js`; textos aprovados em `docs/keyword-reminders-2026-10-31.md`).
- **Pendências:** nenhuma de engine. Não publicado.

## 2026-10-31 — Cartas (visual) — selo EQUIP em armas e Relics; Blessing fica para o futuro

- **Antes:** só as Armors mostravam o Equip; armas, Relics e acessórios que se prendem tinham Equip no catálogo (1 a 4), mas sem selo na carta.
- **Depois:** o selo EQUIP do canto inferior esquerdo aparece em todo Equipment com Equip impresso. Equipment Global (sem Equip) continua sem selo. Nenhuma regra muda. A linha “Equip N — Any friendly Devotee.” sai do texto (o selo já mostra).
- **Texto das cartas:** regras em branco; só títulos de habilidade e keywords em negrito na cor do tema, como nas Armors (autor, 31/10/2026). Keywords sempre em MAIÚSCULA e negrito (lista única em `shared/card-text.js`, usada também pelo Card Forge): Long Range, Multiguard, Guardian, Nimble, Cheater, Pierce, Impulse, Seal, Sealed, Unfaith, Afterlife, Prepare, Prepared, Unprepared, Training. Nomes de golpe/habilidade (“Garuda Flap — …”, “Eternal Binding: …”) viram título em MAIÚSCULA e negrito na cor do tema. Bônus de atributo (“+1 ATK / +1 HP”, “+2/+2”) em MAIÚSCULA e negrito: verde quando só “+”, vermelho quando só “−”. O bloco de texto fica centralizado na vertical da área de regras. O inspetor do duelo e a ficha do lobby usam as mesmas regras de texto da carta.
- **Motivo:** autor, 31/10/2026: os valores de Equip do catálogo são dele; equipamento deve mostrar o custo de Equip.
- **Pendências:** **Blessing** (tipo novo, equivalente à Aura do Magic) fica para um set futuro, por decisão do autor; nada entra no guia por enquanto. Não publicado.

## 2026-10-30 — Cartas — hades-v6-221 vira Styx Soul Herder

- **Antes:** RIVER STYX FERRYMAN (“The Keeper of the Crossing”; Price of Passage, Final Crossing).
- **Depois:** STYX SOUL HERDER (“Shepherd of Lost Souls”; Gather the Lost, Last Herding). Custo, stats e efeito iguais.
- **Motivo:** autor, 30/10/2026: o barqueiro do Styx e Acheron Charon (189) são o mesmo personagem no cânone; a 189 fica.
- **Pendências:** arte nova (a referência do barqueiro não vale). Diff aprovado em `docs/styx-soul-herder-2026-10-30/cards.diff.md`. Não publicado.

## 2026-10-30 — Cartas (§64) — “until end of turn” → “until end of round”

- **Antes:** 74 textos em 68 cartas diziam “until end of turn”.
- **Depois:** “until end of round” (`data/cards.json`, só `habilidades_en`; diff aprovado em `docs/until-end-of-round-2026-10-30/cards.diff.md`).
- **Motivo:** autor, 30/10/2026; aplica ao texto o que o §64 já definia. A engine já usa a duração do Round.
- **Pendências:** nenhuma. “Once per turn” continua no texto e vale como uma vez por Round (§64). Não publicado.

## 2026-10-30 — §§61, 64 e engine — leituras confirmadas pelo autor (grilling)

- **“Until end of turn” (§64):** o guia já dizia “until end of round” desde 29/10; a engine usava o fim do turno nas neutras V6. Agora dura até o fim do Round. Isso inclui 497 Last Moment Defense, que passa a proteger no turno do adversário.
- **Distribuir dano (§64, novo):** cada alvo escolhido recebe pelo menos 1 (Galaxian Explosion 014). A engine já fazia assim.
- **{T} de Domain (§61):** uma vez por Round, como Equipment (Jamir Tower 063). A engine já fazia assim.
- **“Destroyed” (§61, novo):** só a saída do campo para o Tartarus conta; mão e exílio não. A engine já fazia assim.
- **Hades 255 Gemini Saga:** o Devotee exilado volta **Unprepared** e sem dano (antes: Prepared).
- **Hades Offering of Life:** **um gatilho por Devotee** derrotado (antes: um por lote). O limite de uma vez por Round continua, e recusar não gasta o uso: quem recusa o primeiro pode aceitar o segundo.
- **Leituras que viram regra:** “Soul pago para ativar habilidade” = qualquer “you may pay N Soul” de Hades; reações a “target of an enemy ability” só veem Spells (habilidade ativada não anuncia alvo); Illusory Escape só contraria a Spell quando Lotis é o único alvo; Emperor's Dominion e Eternal Allegiance reduzem o custo sem piso.
- **Sintaxe de Armor (§64):** o bônus volta às gemas de ATK/HP na linha de tipo (sai a faixa); a Resonance aparece num bloco só, “Resonance — Nome completo” e o efeito embaixo, no duelo e no Studio do Forge.
- **Pendências:** nenhuma. Não publicado.

## 2026-10-30 — Cartas e engine — Cosmo Disruption, Moon Awakening e inspetor do Forge

- **476 Cosmo Disruption (`data/cards.json`):** Technique, custo 5 → **Moment, custo 3**. Texto: “Cosmo Interruption — As an additional cost to cast Cosmo Disruption, discard a card. Counter target Moment or Technique.” “Energy Backlash — You lose 2 Soul.” continua.
- **Motivo:** autor, 30/10/2026 (grilling): Technique não acha alvo na pilha; como Moment de resposta paga só Latent (teto 3), o custo cai para 3, com o descarte e a perda de Soul como desvantagem.
- **Engine:** gancho `spell.cost` (custo adicional pago ao conjurar, depois do Cosmo) em `playSpellV6`. 476 só conjura com uma Spell na cadeia e outra carta na mão; o alvo é escolhido na resolução.
- **Moon Awakening (Artemis, Ultimate):** antes, a Base escolhida guardava o Prepared que tinha (D268/D215). **Depois:** as Moon Spirits entram **Prepared**. Desvio aprovado do D268 (autor, 30/10/2026). O texto da carta não muda.
- **Card Forge:** a prévia/inspetor (`card-forge/studio-preview.js`) sai da engine-v2 e usa a conta de ATK/HP/keywords da engine-v3. Bônus de Armor agora inclui o `bonus_vida` (§26A): Pegasus Seiya + Pegasus Cloth V2 mostra 9 HP máximo, não 5. God e Domain ficam com os valores impressos.
- **Pendências:** nenhuma de regra. Não publicado.

## 2026-10-30 — §56 — Tudo vai à pilha (estilo Magic)

- **Antes:** só Spells iam à pilha com janela; Devotee e Equipment entravam direto; habilidades ativadas resolviam na hora.
- **Depois:** Devotee, Equipment (inclusive Armor), Spells e habilidades ativadas ({T}, {N}{C}, Domain, poder divino, Ultimate) entram na pilha e abrem janela de resposta. Só Moment responde. Devotee/Equipment entram em campo ao resolver; contrariados vão ao Tartarus. Colocar Base continua fora da pilha.
- **Motivo:** autor, 30/10/2026 (grilling): “tudo deve ir pra pilha, tudo é cast igual Magic”.
- **Cartas (mesma rodada, diff aprovado, `docs/pilha-e-pendencias-2026-10-30/cards.diff.md`):** 458 “cannot retaliate”; 492 o dono do Devotee derrotado perde 2 Soul; 224 “When equipped Devotee is defeated”; 363 ignora Guardian contra Devotee Unprepared; 397 primeiro Devotee do turno em que a Dryad gerou Cosmo; 014 sem Resonance de Shiryu; 016 Ikki ativa Lightning Plasma sem {T}; 018 Hyoga põe 1 Seal antes do dano.
- **Só engine:** 482 Ohko impede o END TURN enquanto puder atacar; 483 leitura confirmada; 493 sem uso no Round seguinte; 496 Base Unprepared; 459 confirmado; Water Prison em Devotee já Sealed soma +1 Seal; 265 troca de controle até o fim do Round (controlador = campo onde está o objeto); Moon Awakening pelo D268 (até 5 Bases viram Moon Spirit 3/3 com Impulse, Long Range e Pierce; God não causa dano de retaliação; +2 Soul ao ferir o God; derrotada vai ao Tartarus como a carta real; volta a ser Base Unprepared no fim do Round); 384 luta na entrada; 461 Sky Defender redireciona a Technique.
- **Pendências:** 476 Cosmo Disruption e Moon Awakening resolvidos na entrada acima. Não publicado.

## 2026-10-30 — Engine v3 — regras e ganchos pendentes implementados (sem mudança de regra)

- **Long Range (§25/§45):** implementado. Quem inicia o Strike com Long Range causa o dano primeiro; a derrota é verificada antes da retaliação; alvo derrotado não retalia; contra o God, Soul 0 encerra antes da retaliação; Cheater no alvo volta ao dano simultâneo. Corrige um bug: com um Devotee de Long Range em campo (Baian, Aiolia), a engine recusava todo Strike do adversário. Nos bots, Poseidon Counter Control 70,7% → 61,4% e Marina Tempo 61,1% → 47,0% (perderam essa imunidade indevida).
- **Custo misto (§5):** a engine cobrava só Base em Moment como AÇÃO, Technique, Equipment que não é Armor, Equip/transferência e habilidades {N}{C}. Agora paga Base e/ou Latent (gasta Base primeiro e completa com Latent; o jogador ainda não escolhe a divisão). Devotee, Armor e Ultimate seguem só Base; Moment como resposta, só Latent.
- **Ganchos novos:** `costLess` (redução de custo: neutral 464 e 470, Poseidon 170 e 178, Hades 242 Eternal Allegiance); efeito `noAbilities` (Poseidon 160 e 169); `skipDraw` lido na compra (neutral 453 Frozen Sacrifice); Seal removido e Soul pago lidos no checkpoint (Hades 183 Puppet Master, 191 Eternal Slumber, 254 Aurora Execution, 187 Dead End Symphony, 228 Pandora's Harp); `noBounce` (Poseidon 176 Unshaken Loyalty); reações a alvo de Spell inimiga via `watchSpell` (Hades 207 Coward's Escape, Ares 277 Illusory Escape, neutral 465 Aerial Interception, 471 Deceptive Presence, 486 Spiritual Barrier); `watchEquipCast` (neutral 470 Steel Production conta Equipment sem portador).
- **Interpretações (o autor confirma):** "Soul pago para ativar habilidade" = qualquer "you may pay N Soul" de Hades; reações a "target of an enemy ability" só veem Spells (habilidade ativada não anuncia alvo); Illusory Escape contraria a Spell só quando Lotis é o único alvo; Emperor's Dominion e Eternal Allegiance sem piso de custo.
- **Pendências que dependem do autor:** Sky Defender (461, redirecionar Spell), Cosmo Disruption (476, Technique não pode responder), Uncontrolled Rage (482, Strike obrigatório), False Wings (458, "cannot block"), Twin Chains (483), Forbidden Power (492), Overloaded Circuits (493), Cosmo Extraction (496), troca de controle (Hades 265), Moon Awakening (Artemis), Engage (Artemis 363, 384), Resonance "Pending design" (Athena 014, 016, 018), Water Prison em Devotee já Sealed (D269), Cracked Surplice 224 (Broken não existe mais), origem do Cosmo (Artemis 397).

## 2026-10-30 — §§19, 47, 57, 59 — Impulse volta a mirar o God

- **Antes:** o Strike na rodada de entrada (Impulse) não podia ter um God como alvo (entrada de 29/10/2026).
- **Depois:** Impulse declara Strike na rodada de entrada contra qualquer alvo legal, inclusive o God. Pierce segue normal.
- **Motivo:** autor, 30/10/2026: “com o balanceamento ares perdeu muita força”.
- **Engine/IA:** filtro removido de `playtest/engine-v3/strike.js` (`checkStrike`); `strikeTargets` (IA e UI) passa a oferecer o God. `cannotStrikeGod` de cartas específicas continua valendo. Testes ajustados. Não publicado.

## 2026-10-30 — data/cards.json — Cloth Restoration (Aries Mu 011, Jamir Tower 063)

- **Antes:** 011 “{2}{C}, {T}: Once each round, remove up to 2 damage from target friendly Armor.”; 063 “{2}{C}, {T}: Remove 1 damage from target friendly Armor.”; engine da 011 e da 042 punha escudo na Armor.
- **Depois:** 011 “Cloth Restoration — {1}{C}, {T}: Remove 1 damage from target friendly Devotee equipped with an Armor.”; 063 “Cloth Restoration — {2}{C}, {T}: Remove 1 damage from target friendly Devotee equipped with an Armor.” Engine de 011, 042, 050, 063 e 128 remove dano do Devotee que veste a Armor/Scale.
- **Motivo:** Armor não tem dano próprio (§26A); autor pediu cura de 1 HP no Mu “pra ficar mais fácil” (grilling, 30/10/2026). 050 mantém o bônus de Resonance do Mu (até 2).
- **Pendências:** não publicado.

## 2026-10-30 — §64 e data/cards.json — sintaxe e layout das Armors

- **Antes:** bônus escrito no texto em três formatos (“+1 ATK / +1 HP”, “+1 ATK”, “+N/+N”) e HP separado em `damage_cloth`; Resonance como Owner/Auto-Equip/“X Resonance — If equipped Devotee is …”; gemas de bônus no meio da carta.
- **Depois:** Equip universal no selo EQUIP do canto inferior esquerdo (peça `athena/gem_equip`, de volta ao layout `relic_cloth`; autor, 30/10/2026); 1ª linha do texto “Resonance — Nome” (sem Equip); faixa “+ATK / +HP” na base (layout `relic_cloth`); campos `bonus_poder`/`bonus_vida` (= `damage_cloth` + HP do texto); donos viram Resonance (10 Warplates de Ares); saem `damage_cloth`, `equipar_auto`, `equipar_custo_ressonante`. Repair (042, 050, 128) cura “target friendly Devotee equipped with an Armor/a Scale”.
- **Motivo:** decisão do autor em 30/10/2026 (grilling; referência visual: upgrades do Star Wars Unlimited).
- **Pendências:** `data/cards.json` gravado com diff aprovado (`docs/armor-sintaxe-2026-10-30/cards.diff.md`, 67 cartas). Engine, Card Forge, carta ao vivo e lobby ajustados; Warplates de grupo (“a Flame Legion Berserker”) seguem condicionais, sem Resonance. Inspetor do Forge (engine-v2) ainda calcula Armor pela regra antiga. Não publicado.

## 2026-10-30 — Cap. VI (§26–34), §61, §64, §65 — Armor simplificada

- **Antes:** três termos para o vínculo (Owner, Resonance, Auto-Equip); dois custos (jogar + Equip 1 Resonant / 5 outros); Armor viva com HP próprio, Broken e Repair; estados Vanilla e Evolve com estágios; Armor podia entrar sem portador.
- **Depois:**
  - Só **Resonance**. Owner e Auto-Equip deixam de existir; em cartas antigas valem como Resonance.
  - **Jogar:** AÇÃO + custo impresso (só Base). Com um Resonant seu em campo, pode entrar vestida nele sem Equip; senão entra sem portador (inclusive Armor sem Resonant).
  - **Vestir em campo** (sem portador ou tirada de Devotee vivo seu): AÇÃO + Equip impresso, Base e/ou Latent, para qualquer Devotee, inclusive o Resonant.
  - **Resonance ao entrar:** Resonant que entra em campo (mão, Tartarus ou efeito) pode puxar sua Armor sem Equip, mesmo de outro Devotee seu.
  - **HP da Armor** é bônus de HP máximo do portador. Sem dano próprio, Broken nem Repair.
  - **Portador morre:** a Armor fica em campo sem portador, sem efeito; só sai por efeito explícito.
  - **Sem Vanilla/Evolve:** a Armor é o que está impresso; versões mais fortes são cartas separadas; evolução só se a carta descrever.
  - Armas e acessórios: sem mudança (Equip impresso).
- **Motivo:** decisão do autor em 30/10/2026 (grilling: “as armaduras estão muito confusas”). Na segunda rodada o autor trocou a taxa fixa de +2 pelo Equip impresso de cada carta e definiu Resonance como auto-equip no cast e na entrada do Resonant. HP impresso mantido; medir com bots.
- **Pendências:**
  - Cartas para revisar (`data/cards.json`, só com diff aprovado): Evolve — poseidon-v6-152, poseidon-v6-180; Repair — athena-v6-042, athena-v6-050, poseidon-v6-128, neutral-v6-491; Broken — poseidon-v6-122, poseidon-v6-161, hades-v6-224, ares-v6-309, artemis-v6-415, artemis-v6-438, neutral-v6-482. Textos “Owner:” e “Auto-Equip — X. Equip 5 — Other Devotees.” das Armor (canon D268 e V6) viram “Resonance — X”.
  - Engine v3 (`play.js` playEquipment/reequip, `effects.js` HP de Armor, Evolve), Card Forge (campos Owner/Auto-Equip/Equip) e UI do duelo/deck builder (chips AUTO-EQUIP e EQUIP) ainda seguem a regra antiga.

## 2026-10-30 — Cartas de Hades — rebalanceamento, 3ª leva

- **Antes:** Devotees de Hades de custo ≥ 3 com o HP da 2ª leva; Hades Castle (Dark Authority): "target enemy God loses 1 Soul and your God gains 1 Soul".
- **Depois:** −1 HP em todos os Devotees de Hades de custo ≥ 3 (31 cartas, inclusive as já cortadas); Dark Authority: "target enemy God loses 1 Soul" (Hades não ganha).
- **Motivo:** decisão do autor em 30/10/2026, após diagnóstico por bots: o motor do Hades era o corpo (HP alto) e o Hades Castle; ETB, Spells e Offering of Life pesavam pouco. Detalhe em `docs/rebalanceamento-hades-2026-10-30/cards.diff.md`.
- **Pendências:** decks Carnage e Specter retunados (Carnage 57%). Hades Specter Midrange segue em ~67% nos bots; o autor aceitou por ora e ele volta numa próxima leva de cartas.

## 2026-10-30 — Cartas de Hades — rebalanceamento

- **Antes:** Devotees de Hades acima da curva (ATK+HP médio 6.4 no custo 3, 8.2 no 4, 9.3 no 5) e ETB de remoção, Seal, −X/−X e dreno de Soul sem custo.
- **Depois:**
  - −1 (de preferência HP) nos Devotees de custo 3 a 6 com ATK+HP ≥ 2×custo+1: 181, 208, 210, 211, 212, 214, 216, 219.
  - ETB viram "you may pay N Soul. If you do, …": 2 Soul em remoção/exílio/Seal em massa (181, 191, 193, 253, 255); 1 Soul em −X/−X, Seal e dreno (183, 187, 201, 204, 209, 213, 216, 251, 252, 254).
- **Motivo:** decisão do autor em 30/10/2026 (grilling: "ambos, leve", curva no meio-termo entre Athena e Ares, taxa de Soul como no Ares).
- **Pendências:** `data/cards.json` gravado (diff aprovado, `docs/rebalanceamento-hades-2026-10-30/cards.diff.md`); engine V6 e testes ajustados; round-robin de bots e retuno dos decks de Hades a seguir.

## 2026-10-30 — §55 — volta a compra de 1 carta por turno

- **Seção:** `docs/guia-do-jogo.md` §55 (compras) e tabela de valores iniciais (linha Compras).
- **Antes:** 2 cartas por turno a partir da segunda rodada (G3-041, 28/10/2026).
- **Depois:** 1 carta por turno a partir da segunda rodada. Primeira rodada continua sem compra.
- **Motivo:** decisão do autor em 30/10/2026 ("tá muito roubado com muita carta").
- **Pendências:** engine 3.0 (`DRAWS_PER_TURN`) e testes ajustados; `docs/alpha-0.1/GODS-3.0-SUPPLEMENT.md` G3-041 não atualizado; nenhuma carta alterada.

## 2026-10-30 — Cartas de Ares — rebalanceamento

- **Antes:** pings automáticos no God sem custo; Devotees de custo ≤ 2 com 3 de ATK; Bloodlust preparava o Devotee para um segundo Strike em qualquer alvo.
- **Depois:**
  - Gatilhos automáticos de dano no God (271, 275, 278, 281, 282, 291, 293, 313, 314, 317, 333, 335, 336, 338, 343) viram "you may pay N Soul. If you do, deal N damage…" (1 Soul por ponto; nas de alvo misto paga-se sempre).
  - −1 ATK em 291, 295, 297, 301, 304 e 313.
  - Bloodlust (God Ares, D268): "It can't declare a Strike against a God this round."
- **Motivo:** Ares agressivo demais (round-robin de bots: Berserker Blitz 73%, Glorious Demise 64%). Decisões do autor no grilling de 29/10/2026; diff aprovado em 30/10/2026: `docs/rebalanceamento-ares-2026-10-30/cards.diff.md`.
- **Pendências:**
  - Segunda leva (autor, 30/10/2026, "pode fazer"): mesma taxa em 289 Divine Destruction (3), 302 Unquenchable Fury (2), 316 Blood Hunger (1), 332 Eternal Bloodshed (2), 340 Champion's Ferocity (1), 341 Burning Pride (2) e, pela mesma regra de gatilho automático, 272 Scorching Impact (1) e 286 Anfista Resonance (1).
  - Spells 347, 348, 357 e a ativação 307 ficam sem taxa (decisão do autor).
  - Engine: `playtest/engine-v3/v6/ares.js` (taxa), `effects.js` (Harvest of the Fallen, `forbidGodStrike`), `gods.js` (Bloodlust), `strike.js` (filtro). IA não paga Soul com 6 ou menos.
  - Resonances de Ares agora comparam o id da carta: o Forge renomeou personagens (ex.: "Ethon Alcmenes").

## 2026-10-29 — God Hades (D268) — Offering of Life só com Devotee seu

- **Antes:** "Once each round, when a Devotee is defeated, you may lose 2 Soul…": qualquer Devotee, dos dois lados.
- **Depois:** "Once each round, when a Devotee you control is defeated, you may lose 2 Soul. If you do, draw a card and gain 1 Latent Cosmo."
- **Motivo:** decisão do autor em 29/10/2026 ("sempre que um Devotee SEU morrer, e não qualquer um").
- **Pendências:** engine (`playtest/engine-v3/gods.js`) e texto aprovado do D268 ajustados; snapshot do `tools/test-d268-integrity.mjs` atualizado. O texto da carta `hades-001` em `data/cards.json` (Forge, que ainda diz "is destroyed") aguarda aprovação do diff. "Seu" é lido pelo dono da carta até existir troca de controle.

## 2026-10-29 — §§19, 47, 57, 59 — Impulse

- **Antes:** pode declarar Strike na rodada em que entra, contra qualquer alvo aberto.
- **Depois:** o Strike na rodada de entrada não pode ter um God como alvo; Pierce continua valendo (o dano excedente pode chegar ao Soul).
- **Motivo:** sem Engage, Impulse virou dano direto no God sem resposta; Ares ficou forte demais. Modelo Ambush + Overwhelm do Star Wars Unlimited, aprovado pelo autor.
- **Cartas:** Berserker of Flame, Warrior of Vengeance, Scylla Io (sem mudança de texto).
- **Engine/IA:** filtro de alvo em `playtest/engine-v3/strike.js` (`checkStrike`): Devotee que entrou nesta rodada não pode mirar God. A IA e a interface usam `strikeTargets`, que passa pelo mesmo filtro. Vale também para Impulse ganho por efeito.
- **Pendências:** os nomes de carta acima são do conjunto SST-04 (300 cartas); no catálogo V6 em jogo, Impulse está em ares-v6-295, 299, 308, 310, 313, 323, 343 e hades-v6-265 (o filtro vale para todas). War Cry (SST-04-023) depende da decisão sobre o rebalanceamento de Ares.

## 2026-10-29 — Tabela de parâmetros (G3-042) — Soul, Attack e Awaken dos Gods vêm do Card Forge

- **Antes:** Soul pela tabela G3-042 (Athena 20, Poseidon 18, Hades 22, Artemis 15, Ares 20); Attack e Awaken do D268.
- **Depois:** o jogo lê Soul, Attack e Awaken da carta do God no Forge (`<facção>-001`). Hoje: Athena 22/2/5, Poseidon 22/1/4, Hades 18/2/7, Artemis 20/1/3, Ares 18/3/7.
- **Motivo:** decisão do autor em 29/10/2026: editar o God no Card Forge deve mudar o jogo.
- **Pendências:** engine ajustada (`shared/preview-cards.js`). O D268 continua como está; textos de poder dos Gods seguem o D268/engine.

## 2026-10-29 — §46A, tabela de keywords — Trample removida; a keyword é Pierce

- **Antes:** §46A definia Trample como igual a Pierce (sem somar); 15 cartas V6 (Artemis 369–440, Neutral 499) imprimiam Trample.
- **Depois:** Trample não existe. As 15 cartas passam a dizer Pierce (`data/cards.json` e export do Forge); §46A fica como removida.
- **Motivo:** correção do autor em 29/10/2026 ("a keyword é PIERCE e não Trample").
- **Pendências:** engine ajustada (Strike, lista de keywords, efeitos de Artemis e Neutral). `data/cards.json` alterado no checkout do Olympus, sem commit (o arquivo tem mudanças de outras sessões).

## 2026-10-29 — §54 — Alvo de Spell escolhido ao jogar

- **Antes:** a engine V6 escolhia alvos de Spell na resolução; o guia não definia.
- **Depois:** alvos são escolhidos ao jogar a Spell, antes da janela de resposta; se o alvo sumir, a parte que dependia dele não acontece.
- **Motivo:** decisão do autor em 29/10/2026; Poseidon 115, 117, 121 e 124 reagem a "a Spell that targets…".
- **Pendências:** migrar as Spells V6 que escolhem alvo para a conjuração (engine).

## 2026-10-29 — §54 — Toda Spell abre janela de resposta; Bloodlust paga com Base ou Latent

- **Antes:** Technique (Sorcery) resolvia na hora, sem janela (P06); só Moment abria janela. Bloodlust ("Cost: 3 Cosmo") era lido como 3 Latent.
- **Depois:** toda Spell entra na pilha e abre janela; resolve depois de os dois passarem. Bloodlust paga 3 com Base preparada ou Latent (a engine usa Base primeiro e completa com Latent).
- **Motivo:** decisões do autor em 29/10/2026; contra-mágicas Moment de Poseidon (133, 136, 154, 156, 159, 167, 171) precisam responder a Spells.
- **Pendências:** engine ajustada (`play.js`, `gods.js`). Contra-mágicas de Poseidon ainda por implementar. God Ares: Awaken 5 → 7 no texto aprovado do registro canônico GOD-ARES (`data/canon/d268.json`; `original_text` intacto), autorizado pelo autor em 29/10/2026.

## 2026-10-29 — §54 — Event e Miracle jogam como Technique

- **Antes:** subtipos Event (3 cartas) e Miracle (15 cartas) sem regra; a engine recusava essas Spells.
- **Depois:** Event e Miracle só como AÇÃO, pagos com Base ou Latent, iguais à Technique.
- **Motivo:** decisão do autor em 29/10/2026 ao implementar os efeitos V6 de Athena.
- **Pendências:** engine ajustada (`v6Spell` em `playtest/engine-v3/v6/hooks.js`). Cartas Event/Miracle sem entrada V6 continuam sem efeito.

## 2026-10-29 — §63, §64 — “Turn” vira rodada; Cosmo gerado vira Latent; Token

- **Antes:** textos V6 com “once per turn”/“until end of turn” sem leitura definida; Cosmo restrito/temporário e tokens sem regra.
- **Depois:** “once per turn” = uma vez por rodada; “until end of turn” = até o fim da rodada. Cosmo gerado por efeito = Latent comum, sem restrição de uso. Token = Devotee sem carta, entra Unprepared, some ao sair do campo.
- **Motivo:** decisões do autor em 29/10/2026 sobre as dúvidas dos efeitos V6. Proteções “would take Strike damage” de Poseidon ficam como escudo criado na declaração do Strike (confirmado).
- **Pendências:** engine V6 ajustada (kit `onceTurn` por rodada, durações, Artemis 386 e 444, tokens no `destroyDevotee`).

## 2026-10-29 — §3, §5, §46A, §54, §61, §63 — Moment é a Spell instantânea; Trample; {T} de Equipment; Engage

- **Antes:** Technique jogava como AÇÃO ou resposta (Latent); Moment exigia AÇÃO. Trample, {T} em Equipment e Engage não tinham regra.
- **Depois:** Moment joga como AÇÃO ou resposta (como resposta, só Latent); Technique exige AÇÃO. Trample = Pierce (não somam). {T} em Equipment = uma vez por rodada. "Engaged with X" = estar num Strike com X; "Engage that Devotee" força o Strike.
- **Motivo:** decisões do autor em 29/10/2026 ao revisar as dúvidas dos efeitos V6 (`docs/v6-efeitos-pendencias.md`). Moment instantâneo bate com as cartas D268 da Athena e com as contra-mágicas de Poseidon.
- **Pendências:** engine 3.0 ajustada (Spells V6, Trample no Strike). Contra-mágicas de Poseidon ainda precisam do gancho de "Spell inimiga na pilha". Textos das cartas com Engage (Artemis 363, 365, 384) podem ser reescritos no Card Forge.

## 2026-10-29 — Handbook 3.0 / Alpha 0.1 — ALPHA-P02: Devotee com Impulse entra Prepared

- **Antes:** todo Devotee entrava Unprepared; o Impulse só liberava o Strike no turno de entrada.
- **Depois:** Devotee com Impulse entra Prepared, pronto para declarar Strike no turno em que entrou. Sem Impulse, segue entrando Unprepared.
- **Motivo:** decisão do autor em 29/10/2026 ("impulse não trigou; o devotee entra preparado e pronto pra atacar"). Na arena, arrastar para atacar exigia Prepared e travava o Impulse.
- **Pendências:** vale para a engine 3.0 (`playtest/engine-v3/play.js`). O `docs/guia-do-jogo.md` (2.x) já diz que todo Devotee entra Prepared e não muda.

## 2026-10-29 — §33 — Todo Equipment equipável tem Equip impresso; itens globais ficam sem portador

- **Seção:** `docs/guia-do-jogo.md`, §33 (Resonance e Equip). Substitui a entrada anterior do mesmo dia.
- **Antes:** Equipment ou Item sem Auto-Equip e sem Equip impresso equipava qualquer Devotee pelo Casting Cost.
- **Depois:** toda Cloth e todo Equipment que se prende a um Devotee tem Equip impresso. Itens globais (“Equip: None — Global”) pagam o Casting Cost e ficam no campo sem portador.
- **Motivo:** decisão do autor em 29/10/2026 ("todas cloths e equips devem ter custo de Equip; se não tiver, crie um que faça sentido"; itens globais continuam globais).
- **Cartas:** `data/cards.json` com diff aprovado: Equip {N} para 24 cartas de Ares — Warplates = Casting Cost + 1 (272, 274, 276, 278, 280, 282, 284, 286, 288, 336–340), Cracked Warplate 314 = 1, armas e War Gear = Casting Cost (315–321), Divine Relics 289 = 4 e 290 = 3. Globais sem mudança: Athena 020 (D268), Poseidon 170 e 178, Hades 200 e 227, neutras 470, 478, 491, 493 e 494.
- **Pendências:** engine 3.0 (`play.js`, `canon-cards.js`, `preview-cards.js`), arena e IA ajustadas. As habilidades escritas dos itens globais ainda não estão implementadas.

## 2026-10-29 — §33 — Equip sem custo impresso usa o Casting Cost

- **Seção:** `docs/guia-do-jogo.md`, §33 (Resonance e Equip).
- **Antes:** Equipment ou Item sem Auto-Equip e sem Equip {N} não tinha custo de Equip definido (engine: NotSpecified).
- **Depois:** equipa qualquer Devotee amigo pagando o próprio Casting Cost.
- **Motivo:** decisão do autor em 29/10/2026 ("Igual ao Casting Cost"), para os Equipment de Ares e os Items de Hades e neutros.
- **Pendências:** nenhuma carta alterada; engine 3.0 ajustada (`playtest/engine-v3/play.js`, `equipCost`).

## 2026-10-28 — §63 — Tournament Spirit (062) vale atacando e defendendo

- **Seção:** `docs/guia-do-jogo.md`, §63 (Gods e Domains).
- **Antes:** o texto "when a friendly Bronze Saint defeats an enemy Devotee with a Strike" não dizia se a retaliação contava.
- **Depois:** conta quando o Bronze Saint amigo derrota o Devotee inimigo num Strike, atacando ou defendendo (retaliação).
- **Motivo:** decisão do autor em 28/10/2026 ("pode ser defendendo também").
- **Pendências:** nenhuma carta alterada; engine 3.0 já implementa assim (`playtest/engine-v3/effects.js`, teste em `tools/test-engine-v3-effects.mjs`).

## 2026-10-28 — §55 e Handbook 3.0 G3-041 — volta a compra de 2 cartas por turno

- **Seção:** `docs/guia-do-jogo.md` §55 e `docs/alpha-0.1/GODS-3.0-SUPPLEMENT.md` G3-041 (revoga G3-037).
- **Antes:** 1 carta por turno a partir da segunda rodada.
- **Depois:** 2 cartas por turno a partir da segunda rodada.
- **Motivo:** decisão do autor em 28/10/2026 ("a mão está acabando muito rápido e o jogo dá stall").
- **Pendências:** nenhuma carta alterada; engine 3.0 e testes ajustados; engine 2.x não alterada.

## 2026-10-28 — §65 e Handbook 3.0 G3-042 — Soul dos Gods entre 15 e 22

- **Seção:** `docs/guia-do-jogo.md`, §65 (Valores iniciais, linha Soul / Attack de God) e `docs/alpha-0.1/GODS-3.0-SUPPLEMENT.md` G3-042.
- **Antes:** Soul impresso: Athena 30, Poseidon 27, Hades 32, Artemis 24, Ares 30.
- **Depois:** Alpha usa Athena 20, Poseidon 18, Hades 22, Artemis 15, Ares 20 (escala proporcional escolhida pelo autor). Awaken e Attack não mudam.
- **Motivo:** decisão do autor em 28/10/2026 ("está muito difícil matar; entre 15 e 22 de vida").
- **Pendências:** cartas de God no Card Forge (`data/cards.json`) atualizadas com diff aprovado em 28/10/2026. O texto do D268 (`data/canon/d268.json`) mantém o SOUL antigo por decisão do autor; a engine aplica a G3-042 por cima.

## 2026-10-28 — §2 e §63 — limite de 3 cópias

- **Seção:** `docs/guia-do-jogo.md`, §2 (Construção do deck) e §63 (Deck, identidade, mulligan, Gods e Domains).
- **Antes:** até 4 cópias da mesma identidade de carta.
- **Depois:** até 3 cópias da mesma identidade de carta; artes alternativas e revisões continuam sem aumentar o limite.
- **Motivo:** decisão do autor em 28/10/2026 ("mantém 3 cópias e corrige o guia"); alinha o guia ao D171 e à validação da engine 3.0 (`shared/deck-v3.js`, `COPY_LIMIT = 3`), já usada pelo criador de decks.
- **Pendências:** nenhuma carta alterada; engine 3.0 e criador de decks já usam 3; engine 2.x (só prévia do Card Forge) não alterada.

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
