# Changelog de regras

Toda mudança em `docs/guia-do-jogo.md` entra aqui, mais recente no topo.

Formato: `AAAA-MM-DD — Seção — antes → depois — motivo — pendências (cartas/engine/UI)`

## 2026-10-31 — Cartas (visual) — selo EQUIP em armas e Relics; Blessing fica para o futuro

- **Antes:** só as Armors mostravam o Equip; armas, Relics e acessórios que se prendem tinham Equip no catálogo (1 a 4), mas sem selo na carta.
- **Depois:** o selo EQUIP do canto inferior esquerdo aparece em todo Equipment com Equip impresso. Equipment Global (sem Equip) continua sem selo. Nenhuma regra muda. A linha “Equip N — Any friendly Devotee.” sai do texto (o selo já mostra).
- **Texto das cartas:** regras em branco; só títulos de habilidade e keywords em negrito na cor do tema, como nas Armors (autor, 31/10/2026). Keywords sempre em MAIÚSCULA e negrito (lista única em `shared/card-text.js`, usada também pelo Card Forge): Long Range, Multiguard, Guardian, Nimble, Cheater, Pierce, Impulse, Seal, Sealed, Unfaith, Afterlife, Prepare, Prepared, Unprepared, Training.
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
