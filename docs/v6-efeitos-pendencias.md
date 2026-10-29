# Efeitos V6 na engine — interpretações e dúvidas para o autor

Status: implementado em 29/10/2026 — Hades 77 completas/11 parciais/2 puladas; Poseidon 65/14/11; Ares 84/4/2; Artemis 77/11/2 (de 90 por facção). 221 testes e 160 partidas simuladas sem erro. Código: `playtest/engine-v3/v6/` (contrato em `registry.js`, ações em `kit.js`).
Cada facção tem o seu arquivo (`hades.js`, `poseidon.js`, `ares.js`, `artemis.js`). Nada aqui vira regra sem o autor.

## Decisões de implementação comuns (provisórias, valem até o autor confirmar)

- **Alvos e escolhas** são perguntados na resolução do efeito, no modal de decisão (não ao jogar a carta).
- **Spells V6:** a categoria vem do subtipo impresso. Moment exige AÇÃO e paga Base. Technique joga como AÇÃO (Base) ou como resposta numa janela de prioridade, pagando só Latent (guia §XII, cap. 54 e 61). As Spells do D268 continuam pela D194, que diz o contrário (Moment instantâneo). **Conflito a resolver.**
- **"Until end of turn"** = fim do turno atual da engine (`this_turn`). O guia §64 pede revisão contextual de "turn"; confirmar carta a carta.
- **+1/+1 e -1/-1 counters** = marcadores no objeto, somados aos atributos enquanto ele estiver em campo (como o Training counter, §48A).
- **Exhaust** = tornar Unprepared.
- **Sacrifice** = o controlador derrota o próprio Devotee; conta como "defeated" para gatilhos.
- **Retorno do Tartarus ao campo:** Prepared e sem dano, salvo texto (§62); limite de 1 retorno por carta física por rodada.
- **Armor e portador derrotado:** a engine ainda manda a Armor ao Tartarus junto com o portador; o guia §61 diz que equipamentos ficam em campo sem portador. **Divergência antiga, fora deste trabalho.**

## Dúvidas gerais (afetam várias cartas)

- **Trample** (Artemis 369, 370, 373, 380, 383, 385, 392, 400, 411, 419, 426, 433, 439, 440): o guia não define. Hoje é só rótulo.
- **Engage** (Artemis 363, 365, 384): mecânica removida. Reescrever os textos ou mapear para Rivalidade (§58)?
- **Contra-mágicas em Moment** (Poseidon 133, 136, 154, 156, 159, 167, 171): Moment exige AÇÃO com pilha vazia, então nunca há Spell inimiga para mirar. Podem ser resposta?
- **"Would take Strike damage"** (Poseidon 096, 099, 100, 104, 110, 122, 131, 145): virou escudo de 1 criado na declaração do Strike.
- **{T} em Equipment** (Hades 200, 227; Poseidon 092, 098, 126–128; Artemis 414): Equipment não tem Prepared. Tratado como "uma vez por rodada".
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
