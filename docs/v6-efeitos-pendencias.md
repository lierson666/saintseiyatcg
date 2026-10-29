# Efeitos V6 na engine — interpretações e dúvidas para o autor

Status: implementado em 29/10/2026 — Hades 77 completas/11 parciais/2 puladas; Poseidon 65/14/11; Ares 84/4/2; Artemis 77/11/2 (de 90 por facção). 221 testes e 160 partidas simuladas sem erro. Código: `playtest/engine-v3/v6/` (contrato em `registry.js`, ações em `kit.js`).
Cada facção tem o seu arquivo (`hades.js`, `poseidon.js`, `ares.js`, `artemis.js`). Nada aqui vira regra sem o autor.

## Decisões de implementação comuns (provisórias, valem até o autor confirmar)

- **Alvos e escolhas** são perguntados na resolução do efeito, no modal de decisão (não ao jogar a carta).
- **Spells V6:** ✅ resolvido (autor, 29/10/2026): Moment joga como AÇÃO (Base) ou resposta (só Latent); Technique exige AÇÃO. Guia §54 invertido; bate com a D194 das cartas da Athena.
- **"Until end of turn"** = fim do turno atual da engine (`this_turn`). O guia §64 pede revisão contextual de "turn"; confirmar carta a carta.
- **+1/+1 e -1/-1 counters** = marcadores no objeto, somados aos atributos enquanto ele estiver em campo (como o Training counter, §48A).
- **Exhaust** = tornar Unprepared.
- **Sacrifice** = o controlador derrota o próprio Devotee; conta como "defeated" para gatilhos.
- **Retorno do Tartarus ao campo:** Prepared e sem dano, salvo texto (§62); limite de 1 retorno por carta física por rodada.
- **Armor e portador derrotado:** a engine ainda manda a Armor ao Tartarus junto com o portador; o guia §61 diz que equipamentos ficam em campo sem portador. **Divergência antiga, fora deste trabalho.**

## Dúvidas gerais (afetam várias cartas)

- **Trample** ✅ resolvido: igual a Pierce, não somam (guia §46A). Engine ajustada.
- **Engage** ✅ resolvido: "engaged with X" = estar num Strike com X; "Engage that Devotee" força o Strike (guia §63). Falta implementar 363 e 384 com essa leitura.
- **Contra-mágicas em Moment** ✅ Moment agora é resposta. Parcial (gancho `watchSpell`, 29/10/2026): Poseidon 119 Sacred Interdiction implementada; 133, 136, 154, 156, 159, 167, 171 (Moments que contrariam) continuam abertas — ver "Ganchos novos" no fim.
- **"Would take Strike damage"** (Poseidon 096, 099, 100, 104, 110, 122, 131, 145): virou escudo de 1 criado na declaração do Strike.
- **{T} em Equipment** ✅ resolvido: uma vez por rodada (guia §61). Já implementado assim.
- **"Once per turn" × "once each round"**: implementado por turno onde o texto diz turn. O guia §64 pede revisão de "turn".
- **"Cosmo spend only to cast a Devotee"** (Artemis 397, 407, 414) e **{C} temporário** (386): sem rastreio de origem do Latent.
- **Tokens** ✅ (guia §63; `kit.summonToken`): Artemis 444 Forest Guardian 3/3 já implementado.
- **"With N HP or less"** = HP restante (HP − dano). **"Rest on the bottom in any order"** = ordem atual.
- **"The defending God"** (Ares 271, 291, 336) = God adversário, mesmo com Strike em Devotee.
- **Warplate** tem `armor: false` nos dados, mas o guia §61 diz que ocupa o espaço de armadura.
- **Gatilho de entrada sem alvo legal** não vai para a cadeia (Ares 271, 279, 281, 283, 285, 287, 297).

## Dúvidas por carta

- hades-v6-181 Wyvern Rhadamanthys: "defeat target Devotee" pode mirar os próprios? (implementado: sim)
- hades-v6-188/198/246/247/249 Surplices: Resonances de entrada/derrota nunca disparam (a Surplice não está equipada nesse momento). Intencional?
- hades-v6-214 Minotaur Gordon: Executioner só no Strike? (implementado: sim)
- hades-v6-232/259/270: "cannot Strike this round" bloqueia só o turno atual.
- hades-v6-240/259: sem alvo, 240 não perde Soul; 259 ("up to") perde 3 mesmo sem retornar nada.
- hades-v6-241 The Will of Hades: perde 1 Soul nos dois modos? (implementado: sim)
- hades-v6-245 Gates of the Underworld: "+1/+1 ao entrar" virou gatilho, não substituição.
- hades-v6-255 Gemini Saga: o exilado volta em qualquer saída de Saga? Em que estado? ✅ (gancho leaves): volta em qualquer saída; entra Prepared e sem dano (§62), dispara "When enters". Confirmar o estado.
- hades-v6-262: Armor que vai ao Tartarus com o portador conta para "2 Soul por Equipment"? (implementado: conta)
- hades-v6-263 Three Judges: "up to 2" faz duas buscas seguidas.
- poseidon-v6-096 Wall of Air: só com Baian defendendo, atacante com ATK > 0.
- poseidon-v6-101 Julian Solo: "remove 1 damage from your God" = ganha 1 Soul até o máximo?
- poseidon-v6-118 Banner of the Emperor: +1 ATK quando o Strike inimigo mira Marina amigo.
- poseidon-v6-151 Final Note: compra sempre; descarta só se selou alguém.
- poseidon-v6-174: "cannot be Prepared until end of round" só vale se o turno do inimigo ainda vem na rodada.
- poseidon: custos {N}{C} de gatilhos pagos só com Base preparada. Latent também paga?
- ares-v6-286 Anfista Warplate: +2 se o alvo já tem dano quando o gatilho resolve.
- ares-v6-310/323: "gains Impulse until end of turn" agora conta (keywordsOf) — confirmar efeito desejado.
- ares-v6-317 Spear of the Fallen: o Pierce impresso no Equipment vale para o portador? (implementado: sim)
- ares-v6-342: recusar um "once per turn… you may" gasta o uso? (implementado: gasta)
- ares-v6-353: "those Berserkers gain Pierce" = todos os Berserkers amigos.
- artemis-v6-422/443: "fights" = dano simultâneo igual ao ATK, fora de Strike.

## Gods V6 (fora deste trabalho; `gods.js` só tem Athena e Poseidon)

- **Hades** (`hades-001`) Offering of Life: uma vez por rodada, quando um Devotee é destruído, pode perder 2 Soul para comprar 1 e ganhar 1 Latent.
- **Ares**: não há texto V6; o D268 `god-ares` (Soul 30) diverge do guia §65 (20).
- **Artemis** (`artemis-001`) Moon Harvest: uma vez por rodada, ao pôr uma Base, pode ignorar Cosmoble perdendo 2 Soul.

## Ganchos que faltam na engine (cláusulas marcadas `// pendente:` no código)

Ainda abertos após os ganchos de 29/10/2026 (ver "Ganchos novos" no fim): alvo de habilidade/Spell inimiga e contra-mágica de Moment
(exige janela a cada conjuração); redução de custo; mudança de controle; remoção de Seal; Soul como custo de ativada;
perda de habilidades ativadas; imunidade a retorno à mão; origem do Cosmo gasto; Engage; embaralhar após busca.

## Athena — Spells e Domains

- ✅ Resolvido (autor, 29/10/2026: jogam como Technique, guia §54). Subtipos **Event** e **Miracle** (athena-v6-055, 079, 080, 083, 086, 089, 090): o guia só define Technique e Moment. Qual a velocidade (Sorcery/Instant) e o custo como resposta? Hoje `v6Spell` (hooks.js) não os reconhece e `playSpell` recusa; o `spell.run` está pronto.
- 080 The Return of the Phoenix / 090 The Will of Athena: "cannot declare a Strike this round" ✅ (gancho cannotStrike: `effects.forbidStrike`, vale os dois turnos do Round).
- 080: "Exhausted" implementado como volta Unprepared; Rebirth é só marcador nomeado (sem efeito). Qual o efeito de Rebirth?
- 083 The Twelve Flames: "Saints with Flame counters get +1 ATK until the end of the round" implementado como +1 ATK nos Saints que recebem o contador na resolução (não segue Saints que ganhem Flame de outra fonte). Final Hour: por contador removido, "may remove 1 damage" pergunta uma vez por contador.
- 086 Deprived of Senses: "At the end of the round, defeat that Saint" roda no fim do Round (checkpoint de fim de Round), não no fim do turno.
- 089 The Wall of Lamentation: derrota até três Saints primeiro e depois escolhe o modo de cada um (alvo do dano escolhido por modo). "Remaining friendly Saints" = Saints amigos ainda em campo depois das derrotas.
- 090 The Will of Athena: "5 or less Soul" é checado após os buffs e a prevenção, na resolução. Saint retornado entra Prepared (sem a restrição de Strike, ver acima).
- 063 Jamir Tower: Cloth Restoration ({2}{C}, {T}) ✅ (gancho activate de Domain: `play.activate(state, ctx, key, 'domain:A')`). O {T} do Domain virou "uma vez por Round" (como Equipment, §61). Confirmar.
- 065 The Stairway to the Twelve Temples: Twelve Temples ✅ (gancho watchSurvive). Uso do Round gasto ao pagar.
- 057 Kiki's Telekinesis: "If you control Kiki" checado após devolver o Equipment.

## Athena — Devotees

Implementados em `playtest/engine-v3/v6/athena-devotees.js`. Interpretações e lacunas:

- ✅ (gancho survive) athena-v6-024 Stone Gaze, 039 Guilty (Training Through Pain; Guilty só pode ferir o Saint se ele continuar em campo), 073 Million Ghost Attack, 074 Crow's Escape. "Survives a Strike" = ainda em campo depois do dano do Strike, atacante ou defensor; contra o God só o atacante conta.
- **athena-v6-009 Phoenix Rebirth** ✅ (gancho wouldBeDefeated, em `checkDefeats`): tira todo o dano, Exhausted, +1 Rebirth, sem Strike no Round. Só vale sem Rebirth; derrotas fora de `checkDefeats` (efeito "defeat"/sacrifício) não são substituídas.
- **athena-v6-013 Another Dimension** ✅ (gancho leaves): devolve o alvo em qualquer saída de Saga (derrota, mão, exílio). Ao voltar, o Devotee entra Prepared e sem dano (§62)? Dispara os "When enters" dele? (implementado: sim)
- **athena-v6-023 Untouchable** ✅ (gancho damagePrevented, `full`): lê a prevenção real do Strike. O {1}{C} do Marble Wall continua pago na declaração (atalho), então Untouchable só dispara se aquele escudo existiu e preveniu tudo.
- **athena-v6-024 Medusa Shield** ✅ (ganchos cannotPrepare + cannotStrike): o atacante não é Prepared (nem pelo Prepare Phase; Seal não é gasto) nem declara Strike até o fim do Round. O pagamento {2}{C} é na declaração.
- **"cannot declare another Strike this round" (029 Hanging Bear)** ✅ (gancho cannotStrike): marca exata até o fim do Round, nos dois turnos. Substituiu o atalho `strikes.set(turn + 1)`.
- **Pagamentos de "{N}{C}" em reação a Strike (023, 025, 073, 074)**: pagos e aplicados na declaração, não na resolução do dano (mesmo atalho de poseidon.js). O escudo/penalidade vale só naquele Strike.
- **athena-v6-007 Nebula Chain**: "that Strike deals no damage" = nenhum dano, inclusive a retaliação (escudo infinito nos dois lados). Exhaust exige Shun Prepared. Correto?
- **athena-v6-015 Aiolia**: Long Range ainda não tem regra de Strike (ALPHA-P05): a engine recusa o Strike dele; os efeitos estão prontos mas sem teste de ponta a ponta.
- **athena-v6-022 Shaina Thunder Claw**: "had a Seal when the Strike began" é lido no evento (antes de Serpent Constriction resolver). Se Serpent Constriction e Thunder Claw se aplicam ao mesmo Strike, o Seal novo não conta para Thunder Claw.
- **"Once each round … you may" (023, 025, 073, 074, 007)**: só gasta o uso se o jogador aceitar/pagar (diferente do ares-v6-342, que gasta ao recusar). Qual vale?

## Athena — Equipment

Implementado em `playtest/engine-v3/v6/athena-gear.js`. Perguntas e aproximações:

- athena-v6-006 Freezing Aura: "had a Seal counter when the Strike began" é lido de um instantâneo gravado na declaração (`state.sealAtStrike`); vale para o último Strike declarado. Aceitar essa leitura?
- athena-v6-008 Andromeda Cloth V2 (Counterattack) ✅ (gancho damagePrevented, observador): metade (para baixo) do dano prevenido pelo Nebula Chain do Shun, contra o atacante; vale para o God e para outro Saint. 068 Lizard Cloth (Resonance Misty) ✅: remove 1 dano da Cloth quando o Marble Wall previne tudo. 069 Perseus Cloth (Resonance Algol) ✅: -1 ATK do atacante no Medusa Shield. Leitura: "Nebula Chain preveniu" = o Chain foi usado neste Strike (`nebulaOpen`).
- athena-v6-010 Phoenix Cloth V2, Resonance: ✅ (gancho attach): vale ao jogar já equipada em Ikki e ao equipar depois (reequip). "Once per game" guardado em `state.v6Game`. Sem Rebirth counters ele não pergunta nem gasta o uso (marcador 'Rebirth' via `addMarker`; alinhar o nome com o Phoenix Ikki). Confirmar.
- athena-v6-010 e 047 Burning Spirit/Burning Will: "damage marked on it" = dano marcado no Devotee (não na Armor).
- athena-v6-012/014/016/018/050/070 ({T} em Equipment): implementados como "uma vez por Round" (guia §61), sem exigir portador. Armor sem portador pode ativar? (implementado: sim).
- athena-v6-014 Galaxian Explosion: "distribute" sem regra de divisão no guia. Implementado: escolhe os alvos (até 5/7), cada um recebe ao menos 1, o resto é atribuído ponto a ponto. Confirmar o mínimo de 1 por alvo.
- athena-v6-014/016/018 Resonance de segundo Devotee (Dragon Shiryu, Phoenix Ikki, Cygnus Hyoga): o texto diz "Pending design and approval"; não implementado.
- athena-v6-018 Aurora Execution: os 2 de dano extra por Seal entram junto dos 3 (5 de uma vez). Com Camus: depois do dano, se o alvo sobrevive e ainda tem Seal, remove todos e causa 1 por Seal (máx. 3).
- athena-v6-020 Athena's Shield: The Last Miracle protege os Saints em campo na resolução (os que entrarem depois do cast não). Divine Sanctuary é reação: escudo de 3 criado na declaração do Strike contra o God, pagando {3}{C} ali (atalho mantido; o gancho `prevent` existe agora, mas a carta é uma reação opcional paga, não prevenção obrigatória).
- athena-v6-046 Chain Defense: "another friendly Saint" = outro Saint que não o portador; funciona sem portador? (implementado: sim, qualquer Saint). Paga na resolução, uso do Round gasto ao pagar.
- athena-v6-047 Phoenix Feather (Resonance Ikki), 066 Eagle Silver Cloth (Resonance Marin), 069 Medusa's Curse ✅ (gancho gearSurvive). 066: o Training vai para outro Bronze Saint amigo à escolha; o uso do Round só é gasto se houver alvo e o jogador escolher. 069: obrigatório, uso gasto no evento.
- athena-v6-068 Air Barrier: mesma aproximação por escudo na declaração: o {1}{C} é pago antes de saber se haverá dano (inclusive ATK 0), e vale para Strike em que o portador ataca (retaliação) ou defende.
- athena-v6-067 Serpent's Fang: o uso do Round só é gasto se o alvo ainda estiver em campo na resolução.

## Gods Hades, Ares, Artemis

Implementado em `playtest/engine-v3/gods.js` (testes: `tools/test-engine-v3-gods-v6.mjs`). Sem ganchos nativos de "Devotee destruído", "voltou do Tartarus", "kill em Strike" e "ganho de Latent", os gatilhos nascem no checkpoint (`scanGods` lê o log de eventos); o efeito só entra na cadeia depois da resolução em curso, não no instante do evento. A interface (`playtest/divine/app.js`) ainda não chama `announceGreatEclipse`, `announceObliteration`, `activateBloodlust` nem `placeBaseMoonHarvest`.

- **Valores impressos**: a engine lê o D268 (`god-ares` Awaken 7 desde 29/10/2026, `god-hades` Awaken 7, `god-artemis` Awaken 3; Soul pela G3-042). `cards.json` diz Ares `awaken: 7` no campo, mas "BUTCHERY — Awaken 5" no texto. Qual vale?
- **D268 vs cards.json**: Hades "defeated" (D268) vs "destroyed" (cards.json); Ares "defeat" vs "destroy"; "ATTACK" vs "Power". Implementado como Devotee destruído ou sacrificado (a engine trata sacrifício como derrota). Sacrifício deve contar?
- **Hades Offering of Life**: "lose 2 Soul" é efeito (não custo), então pode ser letal. Uma vez por Round vale só se aceitar (recusar não gasta). Vários Devotees destruídos juntos geram um só gatilho. Confirmar.
- **Hades King of Tartarus**: só "returns" via `putOntoField` (evento `card_played` com `from: 'tartarus'`). Awaken é lido no checkpoint, não no instante do retorno.
- **Hades Great Eclipse**: "lose Impulse" = `units[uid].entered = null`. O Soul ganho usa o que o inimigo realmente perdeu (não o nominal). O limite de uma volta do Tartarus por carta/Round (kit) pode impedir um retorno. Mantém?
- **Ares Bloodlust**: "Cost: 3 Cosmo" lido como 3 Latent (como Water Prison e Divine Protection). Pode ser 3 Base? Divine Power ativado como Sorcery (turno próprio, cadeia vazia), alvo escolhido no anúncio, entra na cadeia.
- **Ares Butchery**: conta kill do atacante e do defensor (retaliação) no Strike; o Devotee morto junto também conta. "Enemy God" = God do adversário do dono do Devotee.
- **Ares Obliteration**: Long Range ainda é `NotSpecified` no Strike (`PENDING_KEYWORDS`), então qualquer Strike de Devotee com o bônus lança erro até o Long Range ser especificado. Os bônus valem só para os Devotees em campo na resolução (os que entrarem depois no Round não recebem); "as though Impulse" só vale no turno de entrada (regra atual do Impulse). "Completes a Strike" = Strike que resolveu (não conta anulado); destrói o atacante, sem retaliação extra.
- **Artemis Moon Harvest**: função separada `placeBaseMoonHarvest` (o `placeBase` normal continua exigindo Cosmoble). Só para carta não Cosmoble; perde 2 Soul (efeito, pode ser letal). Respeita 1 Base por turno.
- **Artemis Moonlight Blessing**: lido como +1 Latent logo depois do primeiro evento de ganho do Round (no checkpoint), até o teto. Ganho que não entrou nenhum Latent (já no teto) não conta. "Once each round" gasta no primeiro ganho com Awaken.
- **Artemis Moon Awakening (Ultimate, 9)**: não implementado (`moonAwakeningBlock` devolve `'pendente'`). Falta um modelo de objeto que seja Base e Devotee ao mesmo tempo (zona dupla; `checkInvariants`, derrota do Spirit e da Base, 3/3 sem carta). Perguntas: o que acontece com a Base quando o Moon Spirit é derrotado? Entra no Tartarus? Spirits podem ser alvo de Equipment/Seal?

## Ganchos novos (29/10/2026)

Ganchos adicionados em `playtest/engine-v3/` para completar cartas V6 (contrato em `v6/registry.js`): `survive`/`gearSurvive`/`watchSurvive`,
`damagePrevented` (+gear/watch), `wouldBeDefeated` (+gear/watch; `effects.save(..., {anyDamage: true})` para Spells), `leaves`/`watchLeaves`,
`attach`/`watchAttach`, `watchSpell` (+ `kit.counterSpell`), `effects.forbidStrike` (cannotStrike), `effects.forbidPrepare` (cannotPrepare),
activate de Domain (`domain:${key}`). Extras não pedidos, necessários para fechar cartas: `tookDamage` (+gear/watch) e `prevent`/`gearPrevent`
(prevenção obrigatória). Perguntas ao autor (a engine segue a leitura literal até a resposta):

- **Conjurar abre janela de resposta?** Hoje uma Technique/Moment jogada como AÇÃO resolve na hora (P06 A: ação comum não abre janela), a menos que
  exista um observador `watchSpell` com efeito (contra-mágica, "when you cast…"): aí a Spell espera na cadeia e o adversário recebe prioridade (guia §56:
  "o adversário recebe a primeira prioridade"). Por isso os Moments que contrariam (Poseidon 133, 136, 154, 156, 159, 167, 171 Silence) ainda não têm
  Spell inimiga para responder. Toda conjuração deve abrir janela? (mudaria o ritmo do jogo e a IA/arena)
- **Alvo de Spell conhecido ao conjurar?** Poseidon 117 Tidal Rejection, 121 Countercurrent, 124 Living Reef e 115 Tidal Escape dependem de "targets your
  God/friendly Devotee". As escolhas das Spells V6 são perguntadas só na resolução (kit), então o alvo não existe quando o gatilho de conjuração nasce.
  Escolher os alvos ao conjurar (guia §56: "anunciar escolhas e alvos") para todas as Spells V6?
- **"Moment or Technique" inclui Event e Miracle?** O guia §54 diz que jogam como Technique; os gatilhos de conjuração (Poseidon 116, 142, 148, 170, 178;
  Ares 337) contam os dois. Confirmar.
- **"Survives a Strike":** implementado como "continua em campo depois do dano do Strike", atacante ou defensor; Strike contra o God conta só para o
  atacante (`foe: null`). Strike anulado (alvo saiu antes) não conta. Confirmar.
- **Phoenix Rebirth / Moonlight Protection (`wouldBeDefeated`):** só substituem derrotas que passam por `checkDefeats` (dano). Destruição por efeito
  ("defeat target…", sacrifício, §63) não é substituída. É isso? Em 362, "prevent that defeat" = o Devotee fica com 1 de HP (damage = HP − 1 depois de
  tirar o marcador), e todo dano a ele é prevenido no Round (Strike ou efeito).
- **`leaves` vale para Equipment** (Pandora's Box 200 "leaves", Torch of the Underworld 231 "destroyed" = foi para o Tartarus, Cracked Surplice 224
  "destroyed" = Armor quebrada por dano ou levada com o portador derrotado). Mão e exílio não contam como "destroyed" (só Tartarus). Confirmar.
- **Cannot declare a Strike / cannot be Prepared "this round"** = os dois turnos do Round, inclusive o do dono se ele joga depois. A marca sai se o Devotee
  deixa o campo. Prepare bloqueado não gasta Seal (o Prepare simplesmente não acontece).
- **Jamir Tower 063 / Sunken Temple 148 ({T} em Domain):** uma vez por Round, como Equipment (§61).
- **Ares 290 Unyielding Fury / 303 / 309 / 341 (`tookDamage`):** "is dealt damage" = dano que chegou ao Devotee (depois de prevenção e Armor), de Strike
  ou de efeito; 341 só conta dano de combate de Devotee inimigo (inclusive retaliação). "Until end of turn" do 290 e 337 segue o `buff` do arquivo
  (até o fim do Round).
- **Poseidon 119 Sacred Interdiction:** o Exhaust exige o Warden Prepared; o controlador da Spell responde "pagar {2}{C}?" ao ser contrariada. Uso do Round marcado no evento.
- **Ainda abertos (sem gancho):** redução de custo (Poseidon 170 Emperor's Authority, 178 Emperor's Dominion; Hades 393), mudança de controle (Hades 265),
  remoção de Seal (Hades 158, 180, 425), Soul como custo de habilidade ativada (Hades 172, 228), alvo de habilidade inimiga (Ares 277, Hades 258),
  perda de habilidades ativadas (Poseidon 160, 169), imunidade a retorno à mão (Poseidon 176), origem do Cosmo gasto (Artemis 397), Engage (Artemis 363, 384),
  Athena 014/016/018 Resonance de segundo Devotee ("Pending design and approval").
