# SAINT SEIYA TCG

OFFICIAL RULEBOOK — VERSION 2.1

Core Rules · Combat · Cosmo · Armor · Resonance · Tartarus

Status: regras aprovadas em 23–24/10/2026, consolidadas na versão 2.1. **Atualização de 31/10/2026:** **cada turno de um jogador é um Round** (autor, 04/11/2026; §64); antes, o fluxo era por **turnos dentro de cada Round** (regras Alpha ALPHA-P01 a P07, aprovadas em 28/10/2026, e decisões G3 seguintes), como implementado no `playtest/engine-v3`; o sistema de AÇÕES alternadas foi retirado. Valores de cartas continuam sujeitos a balanceamento. Este guia é a única referência de regra vigente.

Princípio fundamental: Saint Seiya TCG é um jogo de cartas estratégico em que cada jogador controla um God e seus Devotees. Os jogadores desenvolvem Cosmo, estabelecem confrontos individuais, despertam o poder de seus Cavaleiros e procuram derrotar o God adversário.

O jogo deve transmitir quatro sensações:

1. Cada confronto importa.
2. Personagens poderosos podem ser contidos por sacrifícios.
3. O Cosmo e as armaduras permitem superar adversários superiores.
4. Derrotar um God é uma conquista extraordinária.

---

## CAPÍTULO I — FUNDAMENTOS

### 1. Objetivo do jogo

Cada jogador controla um God.

O objetivo principal é reduzir o Soul do God adversário a zero.

Quando o Soul de um God chega a zero, seu controlador perde a partida.

Se ambos os Gods chegarem a zero simultaneamente, a partida termina empatada, salvo efeito que determine outro resultado.

### 2. Construção do deck

Cada jogador utiliza:

* 1 God;
* 1 Domain;
* 1 deck principal com 50 cartas.

O God e o Domain começam a partida em suas respectivas posições de jogo, fora do deck principal.

O jogador começa com uma mão de 7 cartas.

O limite é de 3 cópias por identidade de carta. O deck aceita a facção do God, cartas neutras e, se o Domain for de outra facção, até 15 cartas dessa facção (Domain fora da cor: ver §63). Há um mulligan parcial gratuito, uma vez por jogador; o procedimento completo está no capítulo XII (§55).

### 3. Tipos de cartas

God

Representa a divindade comandada pelo jogador.

Possui, entre outras propriedades:

* Soul;
* Attack;
* facção;
* habilidades próprias.

Domain

Representa o domínio associado ao God.

Começa em jogo e possui habilidades específicas.

Devotee

Representa Cavaleiros, Marinas, Specters e outros personagens.

Possui:

* Power;
* HP;
* facção;
* habilidades;
* possíveis keywords.

Equipment — Armor (Cloth / Scale / Surplice / Warplate / Moonplate / Glory), armas e acessórios

Equipamentos que modificam os atributos e as habilidades de um Devotee.

Algumas habilidades de Armor só funcionam com seu personagem Resonant.

Support

Permanente de apoio com efeitos contínuos, gatilhos ou habilidades ativadas conforme seu texto. Não ocupa slot de equipamento.

Technique

Carta que representa uma técnica ou habilidade especial.

Moment

Carta que representa um acontecimento ou intervenção.

Moment pode ser jogado no próprio turno ou como resposta em uma janela de prioridade, inclusive no turno do adversário. Technique só é jogada no próprio turno. Custos, prioridade e resolução estão definidos no capítulo XII (autor, 29/10/2026; turnos, 31/10/2026).

---

## CAPÍTULO II — COSMO

### 4. Cosmo Base

O Cosmo é o principal recurso utilizado para jogar cartas e pagar habilidades.

Cartas com a propriedade Cosmoble podem ser utilizadas como Cosmo Base.

Uma vez por turno, no próprio turno e com a pilha vazia, o jogador ativo pode colocar uma carta Cosmoble da mão como Cosmo Base.

A Base nova entra Prepared e já paga custos no mesmo turno (G3-035, autor, 28/10/2026).

Uma carta utilizada como Cosmo Base deixa de funcionar como sua carta original enquanto permanecer nessa zona, salvo efeito explícito.

### 4A. Hidden Cosmo

**Hidden Cosmo {X}** (PT: Cosmo Oculto) é uma keyword impressa (autor, 31/10/2026). Uma carta com Hidden Cosmo que está como sua Cosmo Base pode ser jogada da Base, pagando **{X}** no lugar do custo impresso.

- Momento e forma de pagar: os mesmos da carta (§5). Devotee e Technique no próprio turno, com a pilha vazia; Moment como ação ou como resposta, e na resposta no turno do adversário só com Latent. Vai à pilha normalmente e pode ser respondida.
- A própria carta pode pagar 1 do {X} antes de sair, se estiver Prepared e se Base puder pagar aquele custo (não na resposta).
- Ao sair da Base, a carta do topo do seu deck entra no lugar como Cosmo Base, virada para baixo e Unprepared. O número de Bases não cai. Deck vazio: nada entra no lugar.
- Reduções de custo valem sobre {X}. Cartas com Hidden Cosmo são sempre Cosmoble.

### 5. Utilização de Cosmo

Uma Base Prepared paga 1 Base Cosmo e fica indisponível até a renovação. Soul não substitui Cosmo.

| Utilização | Base | Latent |
| --- | --- | --- |
| Jogar Devotee | Sim | Não |
| Jogar qualquer Armor | Sim | Não |
| Ativar Ultimate | Sim | Não |
| Moment no próprio turno, inclusive como resposta | Sim | Sim |
| Moment como resposta no turno do adversário | Não | Sim |
| Technique e Equipment que não seja Armor | Sim | Sim |
| Equip, transferência, evolução e habilidades comuns | Sim | Sim |

Custos expressamente restritos na carta continuam restritos. A proibição de usar Latent para jogar Devotee/Armor ou Ultimate não pode ser contornada por um custo genérico de Cosmo.

Latent Cosmo é um banco persistente com limite de 3. No início da End Phase do seu turno, cada Base sua ainda Prepared vira 1 Latent, num único evento de ganho, antes dos efeitos de fim de turno (ALPHA-P03); o excesso acima de 3 se perde. As Bases convertidas ficam Unprepared até o início do seu próximo turno; não são sacrificadas. Assim o jogador tem Latent para responder no turno do adversário. Cosmo temporário não é Base armazenável, salvo efeito explícito.

### 6. Limite de Cosmo Base

Cada jogador pode adicionar normalmente uma Cosmo Base por turno próprio.

Efeitos específicos podem modificar esse limite.

---

## CAPÍTULO III — ROUNDS E TURNOS

Revisado em 31/10/2026. O sistema de AÇÕES alternadas foi retirado: o jogo segue as regras Alpha (ALPHA-P01 a P07, aprovadas em 28/10/2026), implementadas no `playtest/engine-v3`.

### 7. Estrutura geral

A partida é jogada em **Rounds**. **Cada Round é o turno de um jogador**: o primeiro joga o Round 1, o outro o Round 2, e assim por diante (autor, 04/11/2026). O primeiro jogador é definido na §55.

Estrutura de um turno

1. Início do turno

* O jogador ativo prepara todos os seus Devotees, Equipment e Bases.
* Resolvem-se os gatilhos de início de turno (APNAP, LIFO, com janela).
* O jogador ativo compra **1 carta** (quem começa a partida não compra no primeiro turno dele).

2. Fase principal

O jogador ativo faz, em qualquer ordem e quantas vezes puder pagar, as jogadas da seção 8. O adversário só age respondendo nas janelas de prioridade (capítulo XII).

3. End Phase (END TURN)

* Bases ainda Prepared viram Latent (seção 5).
* Resolvem-se os gatilhos de fim de turno.
* Resolvem-se também os gatilhos de fim de Round.
* Cleanup: expiram as durações vencidas (§64) e renovam-se os limites “once each round”. O dano marcado não sai.

Depois do Cleanup, o outro jogador começa o Round seguinte.

### 8. O que o jogador ativo pode fazer

No próprio turno, com a pilha vazia, o jogador ativo pode:

* Colocar uma Cosmo Base (uma vez por turno).
* Jogar Devotees e Equipment (inclusive Armor).
* Jogar Techniques e Moments.
* Vestir, transferir ou desequipar equipamentos.
* Ativar habilidades.
* Declarar Strike com cada Devotee Prepared, **uma vez por Devotee por turno** (D22).
* Encerrar o turno (END TURN).

Não há limite de jogadas por turno além do Cosmo, das condições impressas e dos limites de uso.

### 9. Prepared e Unprepared

Um Devotee pode estar em dois estados:

Prepared: disponível para declarar Strike.

Unprepared: indisponível para declarar Strike (salvo Impulse no turno de entrada).

Declarar Strike deixa o atacante Unprepared. O jogador prepara os seus Devotees no início do próprio turno.

Um Devotee Unprepared continua podendo:

* causar dano de retaliação;
* receber dano;
* beneficiar-se de habilidades passivas.

Prepared não protege o Devotee de ser alvo (capítulo IV).

---

## CAPÍTULO IV — ALVOS E GUARDIAN

Revisado em 31/10/2026 (ALPHA-P05 e G3-038, aprovadas em 28/10/2026). O Engage foi removido em 24/10/2026; a guarda por Prepared e a Rivalidade da versão 2.1 não fazem parte do sistema de turnos.

### 10. Conceito

O alvo é escolhido no momento da declaração do Strike. Não existe vínculo prévio.

### 11. Alvos de Strike

Ao declarar Strike, o atacante escolhe como alvo:

* o God inimigo; ou
* qualquer Devotee inimigo, Prepared ou Unprepared,

respeitando Guardian (seção 12). Se não houver alvo legal, o Devotee não pode declarar Strike.

### 12. Guardian

Enquanto o adversário controlar ao menos um Devotee com Guardian em campo, **Prepared ou não** (G3-038), os Strikes devem mirar um Devotee com Guardian. Exceções:

* **Nimble** ignora Guardian sem Nimble: só um Guardian com Nimble obriga um atacante com Nimble (autor, 01/11/2026).
* Um Guardian que o atacante não pode mirar (Guardian com **Nimble** contra atacante sem Nimble) não conta para essa exigência.
* Efeitos de carta podem criar exceções expressas (ex.: La Scoumoune, 363).

### 13. (retirada)

A Rivalidade saiu do jogo (autor, 01/11/2026). "Rival" em nome ou subtítulo de carta é só tema, sem efeito de regra.

### 14–18. (reservado)

Seções do Engage, ENG, Disengage e Multiguard removidas; a numeração foi mantida para preservar as referências.

### 19. Entrada em campo

Devotees entram **Unprepared** (ALPHA-P02) e não podem declarar Strike no turno em que entraram. **Impulse** permite declarar Strike nesse turno, contra qualquer alvo legal, inclusive o God (§47).

---

## CAPÍTULO V — STRIKE E COMBATE

### 20. Strike

Strike é a ação utilizada para causar dano.

Para realizar Strike, o Devotee deve:

1. Ser o seu turno, com a pilha vazia.
2. Estar Prepared (ou ter Impulse no turno em que entrou).
3. Não ter declarado Strike neste turno.
4. Não estar impedido por efeito.
5. Escolher um alvo legal (capítulo IV).

O alvo é escolhido na declaração. Após declarar Strike, o atacante fica Unprepared. Se o alvo deixar de ser válido antes da resolução, o Strike não causa dano.

### 21. Dano simultâneo

Quando um Devotee realiza Strike contra outro Devotee:

* O atacante causa dano igual ao seu Power.
* O defensor causa dano igual ao seu Power.

O dano é simultâneo.

O defensor não precisa estar Prepared.

A retaliação não custa nada ao defensor.

Mesmo que um combatente seja destruído durante o confronto, ele ainda causa o dano simultâneo correspondente.

### 22. Dano persistente

O dano recebido por Devotees permanece marcado.

Ele não desaparece automaticamente ao final do turno nem do Round.

O dano também permanece quando:

* o Devotee fica Prepared;
* o Devotee fica Unprepared;
* uma Cloth evolui.

Efeitos de cura ou remoção de dano podem alterar essa condição.

### 23. Destruição

Um Devotee é destruído quando o dano acumulado sobre ele é igual ou superior ao seu HP máximo.

Devotees destruídos são enviados ao Tartarus, salvo efeito que determine outro destino.

### 24. Strike contra Gods

Quando um Devotee realiza Strike contra um God, o Devotee causa dano ao Soul do God igual ao seu Power.

Gods não retaliam e não têm Attack (autor, 01/11/2026). Quem protege o God é o board: Devotees com Guardian e os que podem defender. A retaliação entre Devotees continua igual (§20).

Gods não utilizam HP como os Devotees.

Sua condição de derrota é determinada pelo Soul. Há uma segunda: quem precisa comprar uma carta com o deck vazio perde a partida na hora (§55).

### 25. Long Range

Quando um Devotee com Long Range inicia um Strike, seu dano é resolvido antes da retaliação do alvo.

Se o alvo for destruído por esse dano, ele não causa a retaliação daquele Strike.

Long Range não concede essa vantagem quando o Devotee está defendendo um Strike.

---

## CAPÍTULO VI — ARMOR, EQUIPMENT E RESONANCE

### 26. Armor e equipamentos

Armor é a categoria universal de armadura: Athena — Cloth; Poseidon — Scale; Hades — Surplice; Ares — Warplate; Artemis — Moonplate. Moonplate é nomenclatura original do TCG; o exército de Artemis é formado pelas Satellites.

**Glory** (Artemis V2.0, autor, 06/11/2026) é a sexta família: a armadura dos Anjos Celestes (subtipo de Devotee **Angel**), que servem os deuses do Olimpo e pertencem mecanicamente à facção Artemis. Glory não é Moonplate nem Cloth, ocupa o slot de Armor como as outras famílias e **não tem progressão de patentes**: imprime só `EQUIPMENT — GLORY`.

Linha de tipo (Equipment System V1, autor, 02/11/2026): Armor é o grupo de consulta dessas seis famílias e não é impresso junto delas, como em `EQUIPMENT — CLOTH`. Armadura fora das famílias imprime `EQUIPMENT — ARMOR`. Patente não é subtipo, mas é impressa junto dele: `EQUIPMENT — BRONZE CLOTH`, `EQUIPMENT — GENERAL SCALE`. Cada família tem a própria progressão, do nível I (família sem patente) ao V: Cloth — Bronze, Silver, Gold, God; Scale — Marine, Captain, General, Divine; Surplice — Terrestrial, Celestial, Judge, Divine; Warplate — Berserker, Elite, Warlord, Divine; Moonplate — Crescent, Half, Full, Divine. Raridade e facção não entram na linha. Arma imprime `EQUIPMENT — WEAPON SWORD`. Relic, Artifact e Instrument são classificações próprias. Nenhum subtipo concede poder, bônus ou restrição por si só.

**Steel** (autor, 02/11/2026) é patente de Cloth fora da progressão: não vale mais nem menos que outra patente, e imprime `EQUIPMENT — STEEL CLOTH`. Steel Cloth, Steel Armor Prototype, Lunar Vestment e Living Armor ocupam o slot de Armor; as duas últimas passam a Moonplate. **Cracked** só identifica a carta, sem regra própria. **Kamui** é God Cloth: Cloth com patente God, sem marca extra. Armor fora das seis famílias, como Skeleton Armor, não tem patente.

Cada Devotee possui um slot de Armor. Armas e acessórios usam slots separados e mantêm suas regras anteriores. Qualquer Devotee elegível pode vestir qualquer Armor, independentemente de patente; custos e requisitos expressos continuam obrigatórios.

A V1 está incorporada à identidade do Devotee: não é Equipment independente, não ocupa slot, não pode ser transferida nem destruída separadamente. V2 e posteriores são cartas independentes. O Vanilla Set prioriza V2; não exige criar todas as versões de todas as armaduras.

### 26A. HP da Armor

Revisado em 30/10/2026. O HP impresso na Armor é um **bônus de HP máximo do portador**. A Armor não tem HP próprio, não recebe dano, não fica Broken e não é reparada. Todo dano fica marcado no Devotee. Quando a Armor deixa o Devotee, o HP máximo dele é recalculado e a destruição é verificada normalmente (§34).

Living Armor, Broken e Repair foram retirados. Cartas que citam Repair aguardam revisão individual.

### 27. Resonance

Resonance é o único termo que liga uma Armor, arma ou acessório a personagens: “Resonance — Aries Mu”. Owner e Auto-Equip deixaram de existir; em cartas antigas, Owner e Auto-Equip valem como Resonance para o mesmo personagem. Uma carta pode ter mais de um personagem Resonant. A identidade precisa corresponder exatamente. Uma Resonance também pode nomear uma classe (“Resonance — Gold Saint”): vale para qualquer Devotee dessa classe (autor, 02/11/2026).

Resonance faz duas coisas: equipa automaticamente, sem Equip, nos momentos do §28 e do §33; e ativa as habilidades marcadas “Resonance — Nome”. As demais habilidades da carta (“Equipped Devotee…”, “This Armor…”) funcionam com qualquer portador. Vestir a carta não transforma outro Devotee naquele personagem.

### 28. Custo da Armor

Revisado em 30/10/2026.

1. **Jogar** uma Armor, no próprio turno, custa o custo impresso, pago exclusivamente em Base. Se você controla um Devotee Resonant dela, você pode vesti-la nele na mesma AÇÃO, sem Equip; com mais de um, escolha um. Caso contrário — inclusive Armor sem personagem Resonant — ela entra sem portador.
2. **Vestir** uma Armor que já está em campo, sem portador ou tirada de outro Devotee seu vivo, no próprio turno, custa o **Equip impresso** da carta, pago em Base e/ou Latent. Vale para qualquer Devotee, inclusive o Resonant.
3. **Resonance ao entrar:** sempre que um Devotee Resonant entra em campo (jogado da mão, retornado do Tartarus ou por efeito), você pode vestir nele, sem Equip, uma Armor dele que você controla, mesmo que outro Devotee seu a esteja vestindo. Quem perde a Armor recalcula o HP máximo (§34).

Se o novo portador já vestia outra Armor, a anterior fica em campo sem portador.

Armas e acessórios seguem o §33. Itens globais (“Equip: None — Global”, como Athena’s Shield) não se prendem: pagam o Casting Cost e ficam no campo sem portador, sem reequipar (autor, 29/10/2026).

### 29. Versões de Armor

Revisado em 30/10/2026. A Armor é o que está impresso: não há estágios, estado Vanilla nem Evolve por regra geral. Versões mais fortes (V2, V3, God Cloth) são cartas separadas. Uma Armor só evolui se a própria carta descrever como.

Não é necessário possuir ou ter vestido versões anteriores para jogar uma Armor mais forte, salvo requisito expresso na carta.

Athena progride por proteção, superação e transcendência; Poseidon por controle e domínio; Hades por persistência, morte e retorno; Ares por agressividade e conquista; Artemis por precisão e caça.

### 30. Evolve

Retirado em 30/10/2026 (§29).

### 31. Vínculo de evolução

Retirado em 30/10/2026 (§29).

### 32. Morte do portador

Quando o portador morre, ele vai ao Tartarus e a Armor fica em campo sem portador. Outro Devotee pode vesti-la pelo procedimento do §28.

Armor sem portador não tem efeito. Ela só sai do campo por um efeito explícito que destrua, exile ou devolva Equipment ou Armor.

### 33. Equip de armas e acessórios

Revisado em 02/11/2026. **Jogar** uma arma ou acessório, no próprio turno, custa o custo impresso, pago exclusivamente em Base. Se você controla um Devotee Resonant dela, você pode prendê-la nele na mesma AÇÃO, sem Equip; com mais de um, escolha um. Caso contrário, ela entra em campo **sem portador**. **Prender** a carta num Devotee seu depois de jogada é outra AÇÃO, no próprio turno, e custa o **Equip impresso**, pago em Base e/ou Latent, para qualquer Devotee, inclusive o Resonant. A mesma ação move a carta solta de volta a um Devotee quando o portador sai. **Resonance ao entrar:** sempre que um Devotee Resonant entra em campo, você pode prender nele, sem Equip, uma arma ou acessório dele que você controla, mesmo que outro Devotee seu a esteja usando (como no §28). Arma ou acessório sem portador não tem efeito. Habilidades universais funcionam com qualquer portador; apenas habilidades “Resonance — Nome” exigem aquele personagem.

### 34. Bônus de atributos

Quando uma Armor aumenta o HP máximo de um Devotee, o dano já marcado permanece inalterado.

Quando o Devotee perde o bônus de HP, o HP máximo é recalculado.

### 35. God Armor e God Cloth

God Cloth representa uma evolução divina disponível apenas para equipamentos específicos.

Nem toda Cloth possui God Cloth.

God Cloth pode conceder:

* bônus de Power;
* bônus de HP;
* habilidades especiais;
* proteção contra Gods;
* novas interações de combate;
* acesso a Ultimates específicas.

O estágio God Cloth não torna o Devotee automaticamente invencível.

---

## CAPÍTULO VII — AWAKEN E ULTIMATE

### 36. Awaken

Awaken representa o despertar de habilidades próprias de um Devotee.

Awaken pertence ao personagem, não ao equipamento.

Um Devotee pode possuir Awaken mesmo sem estar equipado com uma Cloth.

Os requisitos e efeitos são determinados pelo texto da carta.

### 37. Seventh Sense

Seventh Sense é uma habilidade temática individual, não uma keyword universal obrigatória. Cartas já definidas podem usar o nome em um estágio, sem impor a mesma estrutura a todos os personagens. Awaken e evolução de Armor são independentes, salvo relação expressa na carta.

### 38. Ultimate

Ultimate representa uma habilidade extraordinária.

As condições de utilização são determinadas pela carta.

Algumas Ultimates podem exigir:

* Awaken;
* uma Cloth específica;
* 7th Sense;
* God Cloth;
* outra condição especial.

Ultimate exige exclusivamente Base Cosmo e não exige universalmente uma God Cloth.

---

## CAPÍTULO VIII — TARTARUS

### 39. Tartarus

Tartarus é a zona para onde Devotees destruídos são enviados normalmente.

Cartas e habilidades podem interagir com Devotees nessa zona.

### 40. Afterlife

AFTERLIFE é uma habilidade ativada que só funciona enquanto a carta está no Tartarus do dono (autor, 01/11/2026). Vale para qualquer tipo de carta.

Escrita: “Afterlife {custo}: efeito”.

* Pode ser usada no próprio turno, com a pilha vazia, ou como resposta, quando o jogador tem prioridade. Como resposta, o custo é pago só com Latent.
* Entra na pilha como as outras ativações. Depois de resolver, a carta vai para o Void.
* Fora do Tartarus (campo, mão, deck, Void), a habilidade não funciona. A mesma carta não pode ter duas ativações de Afterlife na pilha.
* Gatilho de derrota não é Afterlife, mesmo que devolva a carta do Tartarus (ex.: Deadly Beetle Stand, Underworld Skeleton, Phoenix Ikki).

Estar no Tartarus não dá Afterlife a uma carta: só têm Afterlife as cartas com habilidade Afterlife impressa.

Nomenclatura oficial

* Afterlife: habilidade ativada usada do Tartarus; depois a carta vai para o Void.
* Arayashiki: não é keyword da engine.
* Meikai: não é keyword da engine.

### 41. Retorno do Tartarus

Devotees podem retornar do Tartarus apenas por efeitos que permitam essa movimentação.

O custo, as condições e o estado de entrada são determinados pelo efeito.

Uma habilidade Afterlife só devolve a carta ao campo se o texto disser.

---

## CAPÍTULO IX — KEYWORDS DE COMBATE

Keyword é uma palavra que resume uma habilidade da carta (autor, 01/11/2026). A lista oficial tem 8: **Guardian, Pierce, Impulse, Nimble, Long Range, Hidden Cosmo, Afterlife e Imune**. Seal, Sealed e Training são marcadores. Cosmoble, Equip, Resonance e Awaken são mecânicas.

**Sintaxe no texto da carta (autor, 02/11/2026):** Guardian, Pierce, Impulse, Nimble e Long Range ficam juntas na primeira linha do texto, separadas por vírgula e terminadas em ponto: “GUARDIAN, PIERCE.”. Cada habilidade inteira ocupa a própria linha abaixo. Hidden Cosmo, Afterlife e Imune têm valor ou efeito: seguem em linha própria, como habilidades. É regra de apresentação, não muda nenhum efeito.

### 42. Guardian

Enquanto houver Devotee inimigo com Guardian em campo, Prepared ou não, os Strikes devem mirar um Guardian (exceto Nimble contra Guardian sem Nimble; um Guardian que o atacante não pode mirar não conta). Ver §12.

### 43. Nimble

É o “voar” do jogo (autor, 01/11/2026). Só pode ser alvo de Strike de um Devotee com Nimble, e ignora Guardian sem Nimble ao declarar Strike. Efeitos que não são Strike o alcançam normalmente. PT: Ágil.

### 43A. Imune

Escreve-se **Imune a X** (EN: Immune to X), em que X é um atributo, como uma facção ou "Devotees de custo 3 ou menos" (autor, 02/11/2026). Fontes inimigas X não podem mirar o Devotee, nem com Strike. O dano delas é prevenido, inclusive a retaliação, e nenhum efeito delas o afeta, mesmo sem alvo. Isso inclui God e Domain da facção X. Efeitos de X aplicados antes de ele ficar Imune continuam até acabar. Um Guardian Imune a X não obriga atacantes X a mirá-lo (§12). Fontes aliadas não são afetadas.

### 44. (Removida)

Cheater saiu do jogo em 01/11/2026 e foi absorvida por Nimble (§43).

### 45. Long Range

O dano do Devotee atacante é resolvido antes da retaliação.

Se o defensor for destruído, não retaliará.

### 46. Pierce

Ao iniciar Strike contra um Devotee, o dano excedente ao HP restante do alvo é causado ao Soul do God que o controla. Não se aplica à retaliação.

### 46A. (Removida)

Trample não existe: a keyword é Pierce (§46). Cartas que diziam Trample foram corrigidas para Pierce (autor, 29/10/2026).

### 47. Impulse

Pode declarar Strike no turno em que entra em campo, contra qualquer alvo legal, inclusive o God. Pierce continua funcionando normalmente.

### 48. Seal e Sealed

Revisado em 01/11/2026 (autor).

**Receber Seal.** O Devotee fica **Unprepared** e ganha o marcador. Vale para qualquer forma de receber: "Seal that Devotee" põe 1 marcador; "Put N Seal counters" põe N. Os marcadores se acumulam.

**Início do turno do dono.** O Devotee tira 1 marcador e **não prepara** naquele turno. Só no início de um turno em que já não tem marcador é que ele prepara.

**Exemplo.** Um Devotee recebe 2 marcadores no seu turno. No próximo turno do dono: tira 1, fica com 1, não prepara. No turno seguinte: tira 1, fica com 0, não prepara. No outro: prepara normalmente.

**Enquanto Unprepared por Seal.** Ele não declara Strike nem paga custo {T}. Ainda retalia, ainda conta como Guardian e ainda usa habilidades sem {T}. Seal não cancela um Strike já declarado (D212).

**Sealed** = ter 1 ou mais marcadores Seal; "becomes Sealed" é passar de 0 para 1 ou mais. Os marcadores somem se o Devotee sai do campo.

**Outro efeito que prepararia** um Devotee com Seal tira 1 marcador em vez de preparar (autor, 01/11/2026).

### 48A. Training counter

Cada Training counter num Devotee dá +1 ATK / +1 HP a ele. Os marcadores se acumulam (2 marcadores = +2/+2) e ficam enquanto o Devotee estiver no campo. Efeitos que citam Training counters (ex.: Master's Guidance, de Eagle Marin) somam ao bônus do próprio marcador.

### 49. (Reservada: Unfaith)

Fora do jogo atual (autor, 01/11/2026); nenhuma carta usa. Ideia guardada para um set futuro: ao declarar Strike contra um God, remover até 2 Latent Cosmo do adversário em lugar do dano ao Soul.

### 50. (reservado)

Multiguard foi removida do jogo junto com o Engage.

---

## CAPÍTULO X — REGRAS GERAIS

### 51. Texto das cartas

Quando o texto de uma carta contradiz uma regra geral, o texto da carta prevalece, desde que o efeito seja válido e não viole uma proibição expressa.

### 52. Identidade das cartas

Uma carta só é considerada um personagem específico quando corresponde à identidade exigida pelo efeito.

Exemplo:

Uma habilidade que exige Pegasus Seiya não é ativada por outro Devotee que esteja equipado com Pegasus Cloth.

### 53. Efeitos de entrada

Habilidades ativadas quando uma carta entra em jogo devem aparecer antes das informações de atributos no padrão de Card Craft. As keywords ficam sempre na primeira linha do texto (Cap. IX, autor, 02/11/2026).

Essa é uma regra de apresentação das cartas, não uma alteração da ordem de resolução.

### 54. Facções e Card Craft

Athena — **THE UNBREAKABLE WILL**. “No Saint fights alone.” Pilares: Voltron, Anthem, Brotherhood e Miracle. As cartas que eram “Miracle” são **Technique** (autor, 31/10/2026); Miracle segue só como pilar temático, não como tipo. Anthems tribais priorizam Saint, sem beneficiar genericamente todos os Devotees.

Afinidades aprovadas: Pegasus Seiya → Sagittarius; Dragon Shiryu → Libra; Cygnus Hyoga → Aquarius; Andromeda Shun → Virgo; Phoenix Ikki → Leo. Cada um também tem afinidade com sua própria Cloth; essas relações serão materializadas nas cartas após revisão do catálogo.

Poseidon: controle, pressão progressiva e domínio. Hades: persistência, sacrifício e retorno. Ares: agressividade, combate e conquista. Artemis: caça, precisão e eliminação estratégica. Estas quatro identidades são preliminares; desenvolvimento e aprovação seguem uma facção por vez, começando por Athena.

No Vanilla Set haverá exatamente um Divine Artifact por facção: cinco no total. Uma God Armor por facção fica como meta do próximo set (autor, 01/11/2026); no conjunto atual só existe Pegasus God Cloth. Trata-se de composição editorial, não de limite de decks. Seleções de trabalho de God Armor: Athena — Pegasus Seiya; Poseidon — Sea Dragon Kanon; Hades — Wyvern Rhadamanthys; Artemis — Callisto. Nomes finais e cartas dependem do Card Craft; não criar automaticamente os dez itens. Respeitar a distinção narrativa entre God Cloth e Kamui e documentar criações do TCG.

Personagens usam classificação de origem: CANON — KURUMADA; SAINT SEIYA — OUTRAS OBRAS; MITOLOGIA ADAPTADA; ORIGINAL TCG. Referências mitológicas devem ser documentadas e não tornam personagens canônicos. Priorizar personagens disponíveis nas obras antes de criar originais; nenhum novo personagem é aprovado por este guia.

Card Craft: identidade e flavor; mecânica; habilidades; cartas e progressão; revisão de custos; balanceamento; aprovação; registro no catálogo. Propostas não são definitivas antes da aprovação.

---

## CAPÍTULO XI — PARÂMETROS DE PLAYTEST

Os valores desta seção são hipóteses iniciais, não resultados de testes concluídos.

Parâmetro	Valor experimental
Deck principal	50 cartas
Mão inicial	7 cartas
Cosmo Base por turno	1
Compra por turno	2 (quem começa a partida não compra no primeiro turno dele)
Limite de cartas na mão	7 (descarta o excesso na End Phase)
Strike	1 por Devotee por turno
Dano entre turnos	Persistente
Duração média desejada	8–10 Rounds

Os custos de God Cloth serão determinados no balanceamento das cartas.

---

## CAPÍTULO XII — TIMING E CONSOLIDAÇÃO 2.1

O autor aprovou a aplicação das recomendações de fechamento ao sistema do jogo. As seções seguintes consolidam as definições de timing, combate, recursos, equipamentos e construção. Exemplos de curva e custos são referências de playtest; não substituem valores impressos das cartas.

### 55. Round, turnos, compras e mulligan

Revisado em 31/10/2026 (ALPHA-P01, P02, P03 e P06, aprovadas em 28/10/2026; limite de mão, 01/11/2026; cara ou coroa e compra do segundo jogador, 01/11/2026; compra de 1 carta, 01/11/2026).

- O primeiro jogador é definido por **cara ou coroa** antes de qualquer compra (autor, 01/11/2026). Cada jogador já tem uma face da moeda; ninguém escolhe a face. Quem vence escolhe começar ou passar o início ao adversário.
- Os jogadores se alternam: cada Round é o turno de um deles (autor, 04/11/2026). O primeiro jogador joga os Rounds ímpares; o outro, os pares.
- Depois dessa escolha, ambos compram 7 cartas. Começando pelo primeiro jogador, cada um pode, uma vez, devolver qualquer quantidade de cartas da mão ao deck, embaralhar e comprar o mesmo número. O primeiro turno só começa depois dos dois mulligans.
- Início do turno: o ativo prepara seus Devotees, Equipment e Bases; resolvem-se os gatilhos de início de turno; ele compra **1 carta**. Só quem começa a partida não compra no primeiro turno dele; o outro jogador já compra no primeiro turno dele (autor, 01/11/2026).
- O ativo pode colocar uma Base Cosmoble por turno, com a pilha vazia. A Base entra Prepared e paga no mesmo turno (G3-035). Colocar Base não entra na pilha.
- O turno termina quando o ativo declara END TURN com a pilha vazia. End Phase: conversão das Bases Prepared em Latent (§5); gatilhos de fim de Round (D204); Cleanup.
- Limite de **7 cartas na mão** (autor, 01/11/2026): na End Phase do próprio turno, ao passar o turno, logo após a conversão das Bases em Latent, quem tem mais de 7 cartas escolhe e descarta o excesso para o Tartarus. Isso conta como descarte para efeitos de carta. Fora desse momento a mão pode passar de 7.
- Deck vazio: quem precisa comprar uma carta e não tem carta no deck perde a partida na hora. Vale para a compra do turno e para qualquer compra por efeito. Ficar com o deck vazio (por Mill, por exemplo) não derrota sozinho; a derrota vem na próxima compra. Por isso Mill é condição de vitória. Se um mesmo efeito fizer os dois jogadores comprarem de deck vazio, a partida empata. Não existe Fatigue (autor, 01/11/2026; `draw` no engine-v3).

**Por quê:** a compra de 2 manteve quem começa vencendo 74–78% em IA × IA; a compra de 1 reduz para 65% e corta as vitórias por deck vazio. O risco conhecido é a mão acabar em decks agressivos, como no playtest real que levou à compra de 2: a resposta prevista são cartas de compra em Ares e Athena, não mais compra para todos (autor, 01/11/2026). O limite de 7 continua.

### 56. Timing, respostas e resolução

- Fora de uma janela, só o jogador ativo joga cartas, ativa habilidades e declara Strike, sempre com a pilha vazia. O jogador não ativo só age respondendo nas janelas.
- **Moment** pode ser jogado no próprio turno ou como resposta em uma janela de prioridade, inclusive no turno do adversário. Como resposta no turno do adversário, paga integralmente seus custos exclusivamente em Latent Cosmo; no próprio turno, inclusive como resposta, paga em Base e/ou Latent (autor, 01/11/2026). **Technique** só é jogada no próprio turno, salvo texto explícito (autor, 29/10/2026). Event e Miracle não são subtipos: as cartas que eram Event (052, 055, 083) são **Moment** e as que eram Miracle são **Technique** (autor, 31/10/2026). Todo Moment ou Technique jogado entra na pilha e abre uma janela de resposta; só resolve depois que os dois jogadores passam em sequência (autor, 29/10/2026). Alvos de Moment ou Technique são escolhidos ao jogar a carta, antes da janela; respostas veem o alvo. Se o alvo não estiver mais disponível na resolução, a parte que dependia dele não acontece (autor, 29/10/2026).
- **Tudo vai à pilha, como no Magic (autor, 30/10/2026):** jogar Devotee ou Equipment (inclusive Armor) e ativar habilidade ({T}, {N}{C}, Domain, poder divino e Ultimate) também entra na pilha e abre janela de resposta, como Moment e Technique. Custos e alvos são pagos e anunciados ao declarar; o efeito acontece na resolução. Devotee e Equipment só entram em campo quando resolvem; se forem contrariados, vão ao Tartarus do dono. Só Moment e habilidade ativada em velocidade de Moment respondem (autor, 03/11/2026); colocar Base continua fora da pilha.
- **Gatilhos simultâneos (APNAP, autor, 31/10/2026):** quando vários gatilhos disparam ao mesmo tempo, os do jogador ativo entram na pilha primeiro e os do outro jogador por cima (resolvem antes). Cada jogador escolhe a ordem dos próprios gatilhos antes de qualquer passe de prioridade; sem escolha, vale a ordem em que dispararam.
- **Gatilho opcional impossível não dispara (autor, 31/10/2026):** um gatilho opcional (“you may”, custo a pagar, “once each round”) que não pode ser usado no momento do disparo — custo que o controlador não consegue pagar, limite por rodada já usado ou nenhum alvo válido — não dispara: não vai à pilha, não abre janela e não aparece no log. A condição é checada no disparo e de novo na resolução; se na resolução já não der para usar, ele resolve sem efeito. Vale também para gatilho obrigatório que não teria efeito nenhum (sem alvo ou efeito possível): não dispara.
- Habilidades ativadas são usadas no próprio turno por padrão; apenas as expressamente permitidas como resposta (**velocidade de Moment**, autor, 03/11/2026) podem ser ativadas na prioridade. Essas pagam como Moment: no turno do adversário, só Latent; no próprio turno, Base e/ou Latent. Passivas e gatilhos funcionam a qualquer momento. Uma carta que disser como e quando a habilidade funciona fornece a exceção.
- Ao jogar uma carta, ativar uma habilidade ou declarar Strike, anunciar escolhas e alvos e pagar custos. Strike deixa o atacante Unprepared nesse momento. O adversário recebe a primeira prioridade para responder.
- Cada resposta entra no topo da pilha e entrega prioridade ao adversário. Dois passes de prioridade resolvem apenas o item do topo. Havendo itens restantes, a prioridade volta ao jogador da oportunidade atual; o processo continua até esvaziar a pilha e resolver os gatilhos produzidos.
- Quando a pilha esvazia, o jogador ativo continua o seu turno. Respostas não encerram nem passam o turno.
- Gatilhos simultâneos entram primeiro na ordem escolhida pelo jogador ativo e depois na ordem escolhida pelo adversário (APNAP). O último colocado resolve primeiro.
- Ao resolver, verificar novamente os alvos. Um efeito com todos os alvos inválidos não produz efeito; custos não são devolvidos. Com alvos válidos restantes, resolver o que for possível, salvo exigência expressa de todos os alvos.
- Verificar HP, Soul e derrotas após cada resolução e cada etapa de dano. Processar destruições simultâneas em conjunto; depois colocar seus gatilhos na pilha. Repetir verificações até estabilizar.
- Strike resolve como uma sequência única, sem jogar Techniques entre dano inicial e retaliação. As respostas acontecem antes da resolução. Prevenção e substituição já aplicáveis continuam funcionando durante essa resolução.
- Perder Prepared depois de declarar não cancela um Strike já pago. Sair do campo ou deixar de ser alvo válido antes da resolução impede o combate. Sealed impede novas declarações, sem cancelar automaticamente uma já declarada.

**Por quê:** uma única lógica de resposta atende cartas, habilidades e combate, no turno de qualquer jogador.

### 57. Entrada em campo e Prepared

- Devotees entram **Unprepared** (ALPHA-P02) e não declaram Strike no turno em que entraram. **Impulse** remove essa restrição.
- A preparação normal acontece no início do próximo turno do controlador. Efeitos explícitos podem preparar antes disso ou impedir a preparação (ex.: 077, “cannot be Prepared during your next Prepare Phase”).
- Retaliação não usa Prepared.
- Cada Devotee declara no máximo um Strike por turno (D22), mesmo que um efeito o prepare de novo.

**Por quê:** bate com o texto das cartas (“They enter Unprepared and lose Impulse”, “as though they had Impulse”): sem Impulse, quem entra só ataca no turno seguinte.

### 58. Alvos, Guardian e controle

- Alvos e exigência de Guardian: capítulo IV. A validade do alvo é reavaliada na resolução.
- Retaliação: o defensor retalia mesmo Unprepared, enquanto sobreviver ao dano simultâneo.
- **Mudança de controle:** deixa o Devotee Unprepared, sem curar dano nem apagar Awaken. 
- Uma carta vai para as zonas de seu proprietário, salvo efeito explícito. “Resonance” da Armor indica personagem; não indica proprietário da carta.
- Equipamentos não mudam de controlador automaticamente. Como a ligação normal exige equipamento e portador do mesmo controlador, um equipamento incompatível fica em campo sem portador e perde a evolução. Um efeito pode transferir expressamente ambos.

### 59. Combate e textos das keywords

O dano é marcado separadamente do HP máximo. Power negativo causa zero dano. HP máximo zero ou negativo destrói o Devotee. Soul zero ou negativo derrota o jogador. O excesso de dano não é cura nem recurso.

| Keyword | Definição |
| --- | --- |
| Guardian | Enquanto estiver em campo, Prepared ou não, Strikes inimigos devem mirar um Guardian, exceto Nimble contra Guardian sem Nimble. Um Guardian que o atacante não pode mirar não conta. |
| Nimble | Só pode ser alvo de Strike de outro Devotee com Nimble. Ignora Guardian sem Nimble ao declarar Strike. |
| Long Range | Ao iniciar Strike, causa seu dano primeiro. Verificar destruição/derrota antes da retaliação; alvo destruído não retalia. Defender com Long Range não concede dano primeiro. |
| Pierce | Ao iniciar Strike contra um Devotee, o dano excedente ao HP restante daquele alvo é causado ao Soul do God que o controla. Não funciona por retaliação. Calcular depois de prevenção/modificação do dano e sem contar dano antigo como dano novo. |
| Impulse | Pode declarar Strike no turno em que entra em campo, contra qualquer alvo legal, inclusive o God. Pierce continua funcionando normalmente. |
| Sealed | Ter 1 ou mais marcadores Seal (§48). Receber Seal deixa o Devotee Unprepared. No início do turno do dono, ele tira 1 marcador e não prepara. |

Cheater e Unfaith saíram das keywords em 01/11/2026 (§44, §49).

Se um Strike causar Soul zero aos dois Gods simultaneamente por efeitos aplicáveis à mesma etapa, há empate. Se Long Range derrotar o God na etapa inicial, a partida termina antes da retaliação. Gatilhos futuros não desfazem uma derrota já verificada; substituições de derrota/dano precisam agir antes dessa verificação.

**Exemplo:** A tem Power 4, HP 5 e 2 de dano; B tem Power 3, HP 4 e 1 de dano. Em Strike normal, ambos são destruídos. Se A inicia com Long Range, destrói B antes da retaliação e continua com seus 2 de dano.

### 60. Cosmo, Latent e custos

- Uma Base disponível paga 1 Cosmo e fica indisponível até a renovação. Gastar Bases para pagar é parte do pagamento; não cria jogada adicional nem exige guardar um estoque de Cosmo gerado sem uso.
- Aplicar a matriz da seção 5: Devotee, Armor e Ultimate usam somente Base; Moment como resposta no turno do adversário usa somente Latent; os demais custos aceitam ambos, respeitando restrições expressas. Cosmo temporário só paga custos genéricos, salvo texto específico, e não é armazenado automaticamente.
- Receber dano não gera Latent (regra da 2.1 retirada pelo autor, 01/11/2026). Latent vem das Bases Prepared na End Phase e de cartas que o criem.
- Limite de **3 Latent por jogador**, persistente entre turnos. As Bases Prepared viram Latent no início da End Phase do seu turno (§5).
- Escolhas e custos são validados antes de gastar; pagamento insuficiente não produz gasto parcial. Recursos pagos em uma declaração válida não retornam se o efeito depois falhar.

**Por quê:** a conversão no fim do turno garante Latent para responder no turno do adversário. O limite do banco limita explosões.

### 61. Equipamentos, estágios e remoção

- Cada Devotee tem **um espaço de armadura**, ocupado por uma Cloth, Scale, Surplice, Warplate, Moonplate ou Glory. Essas armaduras não se acumulam. Armas, acessórios e outras Relics não têm limite geral de quantidade, respeitando restrições impressas e cartas únicas.
- Jogar uma Armor, no próprio turno, custa o custo impresso, só em Base. Com um Devotee Resonant seu em campo, você pode vesti-la nele sem Equip; senão ela entra sem portador (§28).
- Vestir uma Armor em campo (sem portador ou tirada de outro Devotee seu), no próprio turno, custa o Equip impresso, em Base e/ou Latent, inclusive para o Resonant. Ao entrar em campo, um Devotee Resonant pode puxar sua Armor sem Equip. Armas/acessórios entram sem portador e se prendem por outra ação, pagando o Equip impresso (§33, 01/11/2026). Trocar de armadura deixa a anterior em campo sem portador; não a destrói.
- Desequipar voluntariamente, no próprio turno, custa zero Cosmo. Não exige Prepared. Transferência e troca são concluídas antes de recalcular os atributos e verificar destruição, evitando mortes por um estado intermediário de interface.
- Equipment com {T} no custo (ex.: Pandora's Box, Kraken Scale, Lunar Amulet) usa a habilidade **uma vez por rodada**; Equipment não tem estado Prepared/Unprepared (autor, 29/10/2026). O mesmo vale para o {T} de Domain (ex.: Jamir Tower), confirmado em 30/10/2026.
- **“Destroyed”** em texto de Equipment/Armor é sair **do campo** para o Tartarus (destruída por efeito ou levada junto com o portador derrotado). Ir da mão ou do exílio para o Tartarus não conta (autor, 30/10/2026).
- Destruir equipamento envia ao Tartarus; exilar envia ao Void; desequipar mantém no campo. Equipamentos anexados não são enviados junto com o portador quando ele morre, retorna à mão ou é exilado, salvo texto explícito.
- **HP da Armor** é bônus de HP máximo do portador; a Armor não tem dano próprio, Broken nem Repair (§26A, revisado em 30/10/2026). Não há estágios nem Evolve por regra geral (§29).

**Por quê:** manter a armadura recuperável e simples de ler: um termo de vínculo (Resonance), custo e Equip impressos, nenhum marcador além do dano do Devotee.

### 62. Awaken, God Cloth, Ultimate e Afterlife

- **Awaken é do Devotee.** Padronizar o despertar ativável como uma habilidade do próprio turno, com o custo/requisito impresso, sem exigir ou alterar Prepared por regra geral. Um gatilho automático impresso é uma exceção. O estado dura enquanto a instância permanecer em campo, salvo texto diferente.
- **Seventh Sense é temático e individual**, não uma keyword universal. Awaken e evolução continuam independentes, salvo relação impressa.
- God Armor exige os custos e requisitos da própria carta; estágio anterior somente quando expressamente exigido. Nem toda armadura tem God Cloth, e o estágio não concede imunidade implícita contra Gods.
- Retirar o antigo limiar universal de Awaken dos Gods. Uma nova carta de God pode ter seu próprio despertar, inteiramente descrito no texto, sem depender de uma regra herdada.
- **Ultimate é usada no próprio turno, com uma utilização por identidade de personagem, por jogador e por partida**, além do pagamento exclusivamente em Base e dos requisitos impressos. Na ausência de personagem nomeado, usar a identidade da carta. Ressuscitar ou trocar a versão do mesmo personagem não recarrega essa utilização. Não exige God Cloth universalmente nem consome Prepared se isso não estiver no custo.
- Afterlife é uma habilidade ativada impressa, usada do Tartarus; depois a carta vai para o Void (§40, autor 01/11/2026). Estar no Tartarus não dá Afterlife.
- Retornar do Tartarus exige um efeito. Por padrão, a carta retorna sob controle de seu proprietário, Prepared, sem dano, sem seu Awaken anterior e sem equipamentos automaticamente anexados; o efeito pode especificar exceções.
- Limite experimental para evitar ciclos: **cada carta física pode retornar do Tartarus ao campo uma vez por rodada**. Hades pode retornar vários Devotees diferentes; exceções ao limite precisam estar explícitas. Sair de novo não renova o limite.

**Por quê:** três progressões distintas, com papéis claros: despertar do personagem, vínculo com a armadura e golpe extraordinário. O retorno continua relevante sem reciclar infinitamente a mesma entrada em campo.

### 63. Deck, identidade, mulligan, Gods e Domains

- **A carta de God tem duas faces** (autor, 02/11/2026). Frente: Divine Power e Divine Command. Verso: Awaken e Ultimate, com a lista dos poderes da frente que seguem ativos. O God vira ao despertar e volta se sair do Awaken; virar é só apresentação e não muda nenhum efeito. Como o God fica fora do deck, a impressão frente e verso não revela informação.
- Deck principal com 50 cartas (autor, 01/11/2026; eram 60), até **3 cópias da mesma identidade de carta**; artes alternativas e revisões da mesma carta não aumentam o limite. God e Domain ficam fora dessas 50.
- Permitir cartas da facção do God, da facção do Domain e neutras. Se God e Domain forem da mesma facção, o deck é monofacção mais neutras. Não criar cinco tipos de mana nesta base.
- **Domain fora da cor** (autor, 31/10/2026; revisto em 01/11/2026). Se a facção do Domain for diferente da facção do God:
  1. A linha geral funciona inteira, sem custo extra; a linha **Resonance** não funciona.
  2. O deck principal pode ter **até 15 cartas** da facção do Domain. Cartas neutras não contam nesse limite; God e Domain ficam fora das 50.
  - Domain da mesma facção do God funciona inteiro, com a Ressonância.
- **Forma dos Domains e Ressonância** (autor, 01/11/2026; substitui a forma de 31/10/2026). São 30 Domains, 6 por God. Cada um tem duas linhas. A **linha geral** vale com qualquer God: efeito pequeno (estática de +1 ATK ou +1 HP num subtipo, ou gatilho/ativada de 1 ponto no máximo uma vez por rodada) que não quebra a color pie. A linha **Resonance — <God>** só vale se o God do jogador for da facção do Domain: efeito forte, no máximo uma vez por turno, com custo de {1}{C} a {3}{C}. Usar Domain de outra facção continua permitido (§2); o preço é perder a Ressonância. Em cada facção, um Domain compra 1 carta na linha geral, só com um drawback (Athena: exilar 1 carta da mão e perder {2}{S}; Poseidon: descartar 1 e milar 4; Hades: perder {3}{S}; Ares: sacrificar um Devotee e perder {2}{S}; Artemis: zerar o Latent e devolver uma Cosmo Base à mão). Não existe mais linha Once per game em Domain.
- Um mulligan parcial gratuito: separar qualquer quantidade da mão inicial, comprar a mesma quantidade e só então embaralhar as separadas no deck. Apenas uma troca; sem penalidade de Latent ao adversário. Ver §55.
- Cada jogador pode controlar um Devotee de cada **personagem nomeado**, mesmo que existam versões diferentes da carta. Essa regra de lendário vale só para as classes de guerreiros: **Saints, Marines, Satellites, Specters, Berserkers e Angels** (Angels: autor, 06/11/2026). Devotees de classe baixa (Warrior, Support e sem classe) não são lendários e podem ter mais de uma cópia no campo. Unidades genéricas também não têm essa exclusividade. Exceção: **Phoenix Ikki** (athena-v6-009) não é lendário; o jogador pode controlar qualquer número de cópias dele (autor, 01/11/2026). Usar identidade estável de personagem para essa regra e para Resonance; título e ilustração não bastam.
- Uma segunda versão de personagem que já controla pode ser jogada da mão normalmente. Sempre que houver duplicidade (por jogada da mão ou por efeito), o controlador escolhe um para manter e envia os outros ao Tartarus, sem considerar isso destruição. Habilidades de entrada continuam seguindo o fato de a carta ter entrado; essa interação deve ser considerada no custo do efeito que a trouxe.
- Relics só são únicas se isso estiver expresso. Retirar o desconto geral de 2 Cosmo por repetir nome; versões de Armor são cartas separadas (§29), e uma carta específica pode autorizar substituir sua versão anterior.
- Gods não iniciam Strike, não retaliam e não equipam armaduras. Possuem Soul, sem Attack (autor, 01/11/2026). Custos de habilidades do God devem estar impressos, inclusive eventual esgotamento.
- **Divine Command / Comando Divino** (autor, 01/11/2026): cada God tem uma habilidade ativada de board, além do Divine Power. Custa {1}{C}, só no turno do controlador, com a pilha vazia, uma vez por turno; entra na pilha como as outras ativadas. A versão de Awaken, quando a carta tem, substitui a normal enquanto o God estiver Awakened.
- Domains permanecem em jogo, fora do deck, sem custo de entrada e protegidos de ataque, destruição, exílio, retorno à mão e mudança de controle adversária nesta base. Seus efeitos e limites de uso vêm do texto da carta. Galaxian Wars Arena (062), Tournament Spirit: conta quando o Bronze Saint amigo derrota o Devotee inimigo num Strike, tanto atacando quanto defendendo (dano de retaliação) (autor, 28/10/2026).
- **Engage** (texto antigo de algumas cartas de Artemis): "engaged with X" significa estar num Strike com X, atacando ou defendendo; "Engage that Devotee" força esse Devotee num Strike contra o seu (autor, 29/10/2026). A mecânica de Engage separada não existe.
- **Token** (ex.: Forest Guardian 3/3 de The Forest Invades Sanctuary): Devotee criado por efeito, sem carta. Entra Unprepared, não é lendário e deixa de existir quando sai do campo (não vai ao Tartarus, à mão nem ao Void). Não conta como carta para efeitos de deck, mão ou Tartarus (autor, 29/10/2026).
- **Cosmo gerado por efeito** (“Generate {C}”, “Cosmo Latente”) entra como Latent Cosmo comum, respeitando o limite de 3. Restrições impressas de uso (“only during your turn”, “only to cast a Devotee”) não se aplicam nesta versão (autor, 29/10/2026).
- Manter Tartarus e Void distintos. Void representa exílio; habilidades Afterlife não funcionam no Void. Efeitos só alcançam as zonas e tipos que identificam; “target Devotee” não alcança automaticamente uma carta no Tartarus.

### 64. Duração dos efeitos e Card Craft

- **Round e turno são a mesma coisa (autor, 04/11/2026; substitui as definições de 29 e 31/10/2026).** Cada Round é o turno de um jogador, e os textos só usam **round/rodada**.
- **“Until the end of your round” / “até o fim da sua rodada”:** termina no Cleanup do Round de quem criou o efeito. Criado no Round inimigo, vale até o fim do próximo Round de quem o criou.
- **“Until the end of your next round” / “até o fim da sua próxima rodada”:** termina no Cleanup do próximo Round de quem criou o efeito.
- **“Until the start of your next round” / “até o início da sua próxima rodada”:** termina no início do próximo Round de quem criou o efeito, antes da preparação.
- **“Until the end of this round” / “até o fim desta rodada”, “this round” / “nesta rodada”:** termina no Cleanup do Round em andamento, seja de quem for.
- **“Until the end of its controller's next round” / “até o fim da próxima rodada do controlador dele”:** termina no Cleanup do próximo Round do controlador daquele Devotee.
- **“Once each round” / “uma vez por rodada”:** renova em todo Cleanup, portanto pode ser usado de novo no Round do adversário.
- **“Once until the start of your next round” / “uma vez até o início da sua próxima rodada”** (antes “once each cycle” / “uma vez por ciclo”; o nome mudou em 08/11/2026, autor, a regra não): renova só no início do Round do dono da carta. Pode ser usado no Round de qualquer jogador, mas só uma vez entre um início e o outro. Vale para os efeitos fortes de compra, Latent, Selo, moagem e Preparar.
- Contagens de Round dobram em relação às antigas: o Round 12 de hoje corresponde ao antigo Round 6.
- “During your opponent's turn” volta a valer literalmente.
- **Distribuir dano** (“distribute N damage among …”): cada alvo escolhido recebe pelo menos 1 (autor, 30/10/2026).
- Habilidades de entrada aparecem primeiro na carta. A posição gráfica não antecipa a resolução de um gatilho em relação à pilha.
- **Sintaxe de Armor (autor, 30/10/2026):** o Equip universal fica no selo EQUIP do canto inferior esquerdo, fora do texto; a 1ª linha do texto é “Resonance — Nome” quando houver Resonant. O bônus ao portador fica nas gemas de ATK (esquerda) e HP (direita) na altura da linha de tipo, layout original das Cloths (autor, 30/10/2026), não no texto; keyword concedida fica como “Equipped Devotee has X.”. Habilidades específicas usam “Resonance — Nome: efeito” no catálogo; a carta mostra um bloco só, com o título “Resonance — Nome completo” e o efeito embaixo, sem repetir o nome (autor, 30/10/2026). Campos: `bonus_poder`, `bonus_vida`, `equipar_custo_outros` (Equip) e `auto_equip_en` (Resonance).
- No Card Forge, separar: identidade e versão; custo e Cosmoble; Power/HP ou Soul; entrada; keywords; habilidades; Awaken/Ultimate; Resonance; custo e bônus da Armor. Cloth e Scale precisam de identificação mecânica própria, ainda que reutilizem uma moldura.
- Dados de partida como dano, Prepared, estágio atual e limites usados ficam fora da definição-base. A carta interativa recebe esses estados da engine. Impressão e jogo compartilham os mesmos textos, identidade e revisão.
- São obrigatórios os textos que definem alvos, custo, duração e limite das habilidades, evitando que o importador complete esses elementos silenciosamente. O editor deve sinalizar conflitos entre texto e campos estruturados.

### 65. Valores iniciais e o que medir

| Parâmetro | Parâmetro inicial |
| --- | --- |
| Soul / Attack de God de referência | 20 / 3; Soul entre 15 e 22 por God. Os valores de cada God (Soul, Attack, Awaken) são os da carta do God no Card Forge (`data/cards.json`, ids `<facção>-001`) desde 29/10/2026; em 29/10/2026: Athena 22/2/Awaken 5, Poseidon 22/1/4, Hades 18/2/7, Artemis 20/1/3, Ares 18/3/7 |
| Compras | 2 por turno; quem começa a partida não compra no primeiro turno dele; limite de 7 cartas na mão |
| Bases | 1 por turno próprio; entra Prepared |
| Latent | Limite de 3; Bases Prepared viram Latent no fim do seu turno; persiste |
| Retorno do Tartarus | Uma vez por carta física/rodada |
| Ultimate | Uma vez por personagem/jogador/partida |
| Partida desejada | 8–10 Rounds; medir, sem prometer que a curva já entrega isso |

Para Devotees **sem habilidades nem keywords**, usaria esta régua provisória; não é uma conversão automática das cartas:

| Custo | Power / HP de referência |
| --- | --- |
| 1 | 1 / 2 |
| 2 | 2 / 3 |
| 3 | 3 / 4 |
| 4 | 4 / 5 |
| 5 | 5 / 6 |
| 6 | 6 / 7 |

Guardian, Nimble, Impulse e, sobretudo, Long Range devem consumir parte dessa eficiência ou aumentar o custo. Não considero um Devotee com Long Range equivalente ao mesmo corpo sem a keyword: impedir retaliação conserva HP para rodadas futuras. Começaria comparando +1 Cosmo ou redução de atributo, e mediria antes de fixar uma tabela universal de preços.

Exemplo de Cloth para testar, sem impor esses valores a todas: custo 2, Equip 3, +1 ATK e +1 HP ao portador, uma habilidade “Resonance — Nome”.

Medir pelo menos: duração e vencedor com iniciativa; cartas disponíveis na mão e uso de Bases; duração das partidas e partidas travadas por “tartaruga” (muros de Guardian); Strikes por turno; dano evitado por Long Range; Strikes forçados em Guardian; frequência de God Cloth/Ultimate; quantidade de retornos e vantagem de cartas de Hades. Usar partidas espelhadas com iniciativa invertida antes de atribuir uma diferença à facção.


---

## PRINCÍPIO FINAL DO JOGO

Saint Seiya TCG não deve ser decidido apenas pelo personagem com os maiores atributos.

Um Devotee fraco pode conter um adversário poderoso.

Um Cavaleiro ferido pode despertar seu Cosmo.

Uma Cloth pode reconhecer seu verdadeiro dono.

Um personagem derrotado pode continuar influenciando a partida através de habilidades Afterlife.

E um God pode ser derrotado quando seus adversários conseguem produzir o impossível.

Esse é o coração do Saint Seiya TCG.

Fim do Rulebook 2.1 — Core Rules, versão-base para playtest.
