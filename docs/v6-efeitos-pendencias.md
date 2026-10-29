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
- **Contra-mágicas em Moment** ✅ Moment agora é resposta. Falta o gancho de engine "Spell inimiga na pilha" para Poseidon 133, 136, 154, 156, 159, 167, 171.
- **"Would take Strike damage"** (Poseidon 096, 099, 100, 104, 110, 122, 131, 145): virou escudo de 1 criado na declaração do Strike.
- **{T} em Equipment** ✅ resolvido: uma vez por rodada (guia §61). Já implementado assim.
- **"Once per turn" × "once each round"**: implementado por turno onde o texto diz turn. O guia §64 pede revisão de "turn".
- **"Cosmo spend only to cast a Devotee"** (Artemis 397, 407, 414) e **{C} temporário** (386): sem rastreio de origem do Latent.
- **Tokens** (Artemis 444 Forest Guardian 3/3): não existem nas regras.
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
- hades-v6-255 Gemini Saga: o exilado volta em qualquer saída de Saga? Em que estado?
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

Dano recebido e "survives combat"; "would be defeated" para todo dano; alvo de habilidade inimiga e contra-mágica na pilha;
"when you cast a Moment/Technique"; redução de custo; mudança de controle; saída de campo genérica e destruição de Equipment;
remoção de Seal; Soul como custo de ativada; ativada de Domain; mill/retorno à mão de qualquer fonte; tokens; embaralhar após busca.

## Athena — Spells e Domains

- Subtipos **Event** e **Miracle** (athena-v6-055, 079, 080, 083, 086, 089, 090): o guia só define Technique e Moment. Qual a velocidade (Sorcery/Instant) e o custo como resposta? Hoje `v6Spell` (hooks.js) não os reconhece e `playSpell` recusa; o `spell.run` está pronto.
- 080 The Return of the Phoenix / 090 The Will of Athena: "cannot declare a Strike this round" não tem gancho na engine (só a D22). Falta um efeito que proíba declarar Strike.
- 080: "Exhausted" implementado como volta Unprepared; Rebirth é só marcador nomeado (sem efeito). Qual o efeito de Rebirth?
- 083 The Twelve Flames: "Saints with Flame counters get +1 ATK until the end of the round" implementado como +1 ATK nos Saints que recebem o contador na resolução (não segue Saints que ganhem Flame de outra fonte). Final Hour: por contador removido, "may remove 1 damage" pergunta uma vez por contador.
- 086 Deprived of Senses: "At the end of the round, defeat that Saint" roda no fim do Round (checkpoint de fim de Round), não no fim do turno.
- 089 The Wall of Lamentation: derrota até três Saints primeiro e depois escolhe o modo de cada um (alvo do dano escolhido por modo). "Remaining friendly Saints" = Saints amigos ainda em campo depois das derrotas.
- 090 The Will of Athena: "5 or less Soul" é checado após os buffs e a prevenção, na resolução. Saint retornado entra Prepared (sem a restrição de Strike, ver acima).
- 063 Jamir Tower: Cloth Restoration ({2}{C}, {T}) é habilidade ativada de Domain; a engine não ativa Domain (`play.activate` exige carta no campo) nem tem estado Prepared/{T} para Domain. A resolução está em `activate` da entrada, não ligada.
- 065 The Stairway to the Twelve Temples: Twelve Temples precisa do gancho "a friendly Saint survives a Strike" (mesmo faltante de Poseidon). Não implementado.
- 057 Kiki's Telekinesis: "If you control Kiki" checado após devolver o Equipment.

## Athena — Devotees

Implementados em `playtest/engine-v3/v6/athena-devotees.js`. Interpretações e lacunas:

- **Falta gancho "sobreviver a um Strike como defensor"**: athena-v6-024 Stone Gaze, 039 Guilty (Training Through Pain, "another friendly Saint survives a Strike"), 073 Million Ghost Attack, 074 Crow's Escape. Podemos criar `survivedStrike` no `afterStrike`?
- **athena-v6-009 Phoenix Rebirth**: "would be defeated" (qualquer dano) não tem gancho; o marcador `Rebirth` já existe (Esmeralda 038 o remove). Pode o gancho entrar em `checkDefeats`? Ikki também fica sem declarar Strike na rodada.
- **athena-v6-013 Another Dimension**: o alvo vai ao Void e volta quando Saga é derrotado. Saída por outro meio (voltar à mão, exílio) não devolve (sem gancho de saída). Ao voltar, o Devotee entra Prepared e sem dano (§62)? Dispara os "When enters" dele?
- **athena-v6-023 Untouchable**: precisa saber que Marble Wall preveniu todo o dano do Strike (a prevenção hoje nasce na declaração, como em poseidon.js).
- **athena-v6-024 Medusa Shield**: "cannot be Prepared this round" não tem marca na engine (`skipPrepare` vale só na próxima Prepare Phase). "Cannot declare another Strike" já vem da D22. Não implementado para não cobrar {2}{C} por metade do efeito.
- **"cannot declare another Strike this round" (029 Hanging Bear)**: se o dono do alvo ainda joga neste Round (o ativo é o primeiro do Round), bloqueia o turno seguinte; senão a D22 basta. Confirma essa leitura de "rodada"?
- **Pagamentos de "{N}{C}" em reação a Strike (023, 025, 073, 074)**: pagos e aplicados na declaração, não na resolução do dano (mesmo atalho de poseidon.js). O escudo/penalidade vale só naquele Strike.
- **athena-v6-007 Nebula Chain**: "that Strike deals no damage" = nenhum dano, inclusive a retaliação (escudo infinito nos dois lados). Exhaust exige Shun Prepared. Correto?
- **athena-v6-015 Aiolia**: Long Range ainda não tem regra de Strike (ALPHA-P05): a engine recusa o Strike dele; os efeitos estão prontos mas sem teste de ponta a ponta.
- **athena-v6-022 Shaina Thunder Claw**: "had a Seal when the Strike began" é lido no evento (antes de Serpent Constriction resolver). Se Serpent Constriction e Thunder Claw se aplicam ao mesmo Strike, o Seal novo não conta para Thunder Claw.
- **"Once each round … you may" (023, 025, 073, 074, 007)**: só gasta o uso se o jogador aceitar/pagar (diferente do ares-v6-342, que gasta ao recusar). Qual vale?

## Athena — Equipment

Implementado em `playtest/engine-v3/v6/athena-gear.js`. Perguntas e aproximações:

- athena-v6-006 Freezing Aura: "had a Seal counter when the Strike began" é lido de um instantâneo gravado na declaração (`state.sealAtStrike`); vale para o último Strike declarado. Aceitar essa leitura?
- athena-v6-008 Andromeda Cloth V2 / 068 Lizard Cloth (Resonance Misty) / 069 Perseus Cloth (Resonance Algol): dependem de "prevents damage" de habilidades do próprio Devotee (Nebula Chain, Marble Wall, Medusa Shield) e ficam com as cartas dos Devotees. Falta gancho "damage prevented".
- athena-v6-010 Phoenix Cloth V2, Resonance: só vale se a Cloth é jogada já equipada em Ikki (gancho `cast`); equipar depois (reequip) não dispara. "Once per game" guardado em `state.v6Game`. Sem Rebirth counters ele não pergunta nem gasta o uso (marcador 'Rebirth' via `addMarker`; alinhar o nome com o Phoenix Ikki). Confirmar.
- athena-v6-010 e 047 Burning Spirit/Burning Will: "damage marked on it" = dano marcado no Devotee (não na Armor).
- athena-v6-012/014/016/018/050/070 ({T} em Equipment): implementados como "uma vez por Round" (guia §61), sem exigir portador. Armor sem portador pode ativar? (implementado: sim).
- athena-v6-014 Galaxian Explosion: "distribute" sem regra de divisão no guia. Implementado: escolhe os alvos (até 5/7), cada um recebe ao menos 1, o resto é atribuído ponto a ponto. Confirmar o mínimo de 1 por alvo.
- athena-v6-014/016/018 Resonance de segundo Devotee (Dragon Shiryu, Phoenix Ikki, Cygnus Hyoga): o texto diz "Pending design and approval"; não implementado.
- athena-v6-018 Aurora Execution: os 2 de dano extra por Seal entram junto dos 3 (5 de uma vez). Com Camus: depois do dano, se o alvo sobrevive e ainda tem Seal, remove todos e causa 1 por Seal (máx. 3).
- athena-v6-020 Athena's Shield: The Last Miracle protege os Saints em campo na resolução (os que entrarem depois do cast não). Divine Sanctuary é reação: escudo de 3 criado na declaração do Strike contra o God, pagando {3}{C} ali (não há gancho "would take damage").
- athena-v6-046 Chain Defense: "another friendly Saint" = outro Saint que não o portador; funciona sem portador? (implementado: sim, qualquer Saint). Paga na resolução, uso do Round gasto ao pagar.
- athena-v6-047 Phoenix Feather (Resonance Ikki), 066 Eagle Silver Cloth (Resonance Marin), 069 Medusa's Curse: precisam de gancho "survives a Strike" (atacante ou defensor); não implementados.
- athena-v6-068 Air Barrier: mesma aproximação por escudo na declaração: o {1}{C} é pago antes de saber se haverá dano (inclusive ATK 0), e vale para Strike em que o portador ataca (retaliação) ou defende.
- athena-v6-067 Serpent's Fang: o uso do Round só é gasto se o alvo ainda estiver em campo na resolução.
