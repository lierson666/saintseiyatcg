# Efeitos V6 na engine — interpretações e dúvidas para o autor

Status: em implementação (29/10/2026). Código: `playtest/engine-v3/v6/` (contrato em `registry.js`, ações em `kit.js`).
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

## Dúvidas por facção

(preenchido durante a implementação)
