# SAINT SEIYA TCG

OFFICIAL RULEBOOK — VERSION 2.1

Core Rules · Combat · Cosmo · Armor · Resonance · Tartarus

Status: regras aprovadas em 23–24/10/2026, consolidadas na versão 2.1. **Atualização de 31/10/2026:** o fluxo do jogo é por **turnos dentro de cada Round** (regras Alpha ALPHA-P01 a P07, aprovadas em 28/10/2026, e decisões G3 seguintes), como implementado no `playtest/engine-v3`; o sistema de AÇÕES alternadas foi retirado. Valores de cartas continuam sujeitos a balanceamento. Este guia é a única referência de regra vigente.

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
* 1 deck principal com 60 cartas.

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

Equipment — Armor (Cloth / Scale / Surplice / Warplate / Moonplate), armas e acessórios

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

### 5. Utilização de Cosmo

Uma Base Prepared paga 1 Base Cosmo e fica indisponível até a renovação. Soul não substitui Cosmo.

| Utilização | Base | Latent |
| --- | --- | --- |
| Jogar Devotee | Sim | Não |
| Jogar qualquer Armor | Sim | Não |
| Ativar Ultimate | Sim | Não |
| Moment no próprio turno | Sim | Sim |
| Moment como resposta | Não | Sim |
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

A partida é jogada em **Rounds**. Cada Round tem **dois turnos**, um de cada jogador. O primeiro jogador é sorteado e começa todos os Rounds.

Estrutura de um turno

1. Início do turno

* O jogador ativo prepara todos os seus Devotees, Equipment e Bases.
* Resolvem-se os gatilhos de início de turno (APNAP, LIFO, com janela).
* O jogador ativo compra **1 carta** (nada no seu primeiro turno).

2. Fase principal

O jogador ativo faz, em qualquer ordem e quantas vezes puder pagar, as jogadas da seção 8. O adversário só age respondendo nas janelas de prioridade (capítulo XII).

3. End Phase (END TURN)

* Bases ainda Prepared viram Latent (seção 5).
* Resolvem-se os gatilhos de fim de turno.
* No segundo turno do Round, resolvem-se também os gatilhos de fim de Round.
* Cleanup: expiram os efeitos “until end of turn”; no segundo turno do Round, também os de “this round” e renovam-se os limites “once each round”. O dano marcado não sai.

Depois do Cleanup, o turno passa ao outro jogador ou começa um novo Round.

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

* **Nimble** ignora essa exigência.
* Um Guardian que o atacante não pode mirar (ex.: Guardian com **Cheater** contra atacante sem Cheater) não conta para essa exigência (autor, 31/10/2026).
* Efeitos de carta podem criar exceções expressas (ex.: La Scoumoune, 363).

### 13. Rivalidade

**Suspensa no sistema de turnos (31/10/2026).** O `engine-v3` não cria Rivals, e as regras Alpha aprovadas não a incluem. Pendente decisão do autor: retirar de vez ou reintroduzir adaptada aos turnos. Cartas que citem Rival aguardam essa decisão.

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

Quando um Devotee realiza Strike contra um God:

* O Devotee causa dano ao Soul do God igual ao seu Power.
* O God causa dano ao Devotee igual ao seu Attack.

Esse dano é simultâneo.

A retaliação do God:

* não custa nada;
* não exige Prepared;
* acontece mesmo que o God esteja Unprepared.

Gods não utilizam HP como os Devotees.

Sua condição de derrota é determinada pelo Soul.

### 25. Long Range

Quando um Devotee com Long Range inicia um Strike, seu dano é resolvido antes da retaliação do alvo.

Se o alvo for destruído por esse dano, ele não causa a retaliação daquele Strike.

Long Range não concede essa vantagem quando o Devotee está defendendo um Strike.

---

## CAPÍTULO VI — ARMOR, EQUIPMENT E RESONANCE

### 26. Armor e equipamentos

Armor é a categoria universal de armadura: Athena — Cloth; Poseidon — Scale; Hades — Surplice; Ares — Warplate; Artemis — Moonplate. Moonplate é nomenclatura original do TCG; o exército de Artemis é formado pelas Satellites.

Cada Devotee possui um slot de Armor. Armas e acessórios usam slots separados e mantêm suas regras anteriores. Qualquer Devotee elegível pode vestir qualquer Armor, independentemente de patente; custos e requisitos expressos continuam obrigatórios.

A V1 está incorporada à identidade do Devotee: não é Equipment independente, não ocupa slot, não pode ser transferida nem destruída separadamente. V2 e posteriores são cartas independentes. O Vanilla Set prioriza V2; não exige criar todas as versões de todas as armaduras.

### 26A. HP da Armor

Revisado em 30/10/2026. O HP impresso na Armor é um **bônus de HP máximo do portador**. A Armor não tem HP próprio, não recebe dano, não fica Broken e não é reparada. Todo dano fica marcado no Devotee. Quando a Armor deixa o Devotee, o HP máximo dele é recalculado e a destruição é verificada normalmente (§34).

Living Armor, Broken e Repair foram retirados. Cartas que citam Repair aguardam revisão individual.

### 27. Resonance

Resonance é o único termo que liga uma Armor a personagens: “Resonance — Aries Mu”. Owner e Auto-Equip deixaram de existir; em cartas antigas, Owner e Auto-Equip valem como Resonance para o mesmo personagem. Uma Armor pode ter mais de um personagem Resonant. A identidade precisa corresponder exatamente.

Resonance faz duas coisas: equipa automaticamente, sem Equip, nos momentos do §28; e ativa as habilidades marcadas “Resonance — Nome”. As demais habilidades da Armor (“Equipped Devotee…”, “This Armor…”) funcionam com qualquer portador. Vestir a Armor não transforma outro Devotee naquele personagem.

### 28. Custo da Armor

Revisado em 30/10/2026.

1. **Jogar** uma Armor, no próprio turno, custa o custo impresso, pago exclusivamente em Base. Se você controla um Devotee Resonant dela, você pode vesti-la nele na mesma AÇÃO, sem Equip; com mais de um, escolha um. Caso contrário — inclusive Armor sem personagem Resonant — ela entra sem portador.
2. **Vestir** uma Armor que já está em campo, sem portador ou tirada de outro Devotee seu vivo, no próprio turno, custa o **Equip impresso** da carta, pago em Base e/ou Latent. Vale para qualquer Devotee, inclusive o Resonant.
3. **Resonance ao entrar:** sempre que um Devotee Resonant entra em campo (jogado da mão, retornado do Tartarus ou por efeito), você pode vestir nele, sem Equip, uma Armor dele que você controla, mesmo que outro Devotee seu a esteja vestindo. Quem perde a Armor recalcula o HP máximo (§34).

Se o novo portador já vestia outra Armor, a anterior fica em campo sem portador.

Armas e acessórios mantêm o Equip impresso. Itens globais (“Equip: None — Global”, como Athena’s Shield) não se prendem: pagam o Casting Cost e ficam no campo sem portador, sem reequipar (autor, 29/10/2026).

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

Toda arma ou acessório que se prende a um Devotee tem custo de Equip impresso. O custo de jogar é Base-only; Equip e transferência aceitam Base e/ou Latent. Habilidades universais funcionam com qualquer portador; apenas habilidades “Resonance — Nome” exigem aquele personagem.

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

AFTERLIFE marca uma habilidade que só funciona enquanto a carta está no Tartarus do dono (autor, 31/10/2026). Vale para qualquer tipo de carta.

Escrita: “Afterlife — {custo}: efeito” (ativada) ou “Afterlife — When…/Whenever…” (gatilho).

* A habilidade Afterlife ativada usa AÇÃO no próprio turno, com a pilha vazia, e entra na pilha como as outras ativações.
* A habilidade Afterlife de gatilho dispara normalmente enquanto a carta está no Tartarus.
* Fora do Tartarus (campo, mão, deck, Void), habilidades Afterlife não funcionam.

Estar no Tartarus não dá Afterlife a uma carta: só têm Afterlife as cartas com habilidade Afterlife impressa.

Nomenclatura oficial

* Afterlife: marca de habilidade que funciona no Tartarus.
* Arayashiki: não é keyword da engine.
* Meikai: não é keyword da engine.

### 41. Retorno do Tartarus

Devotees podem retornar do Tartarus apenas por efeitos que permitam essa movimentação.

O custo, as condições e o estado de entrada são determinados pelo efeito.

Uma habilidade Afterlife só devolve a carta ao campo se o texto disser.

---

## CAPÍTULO IX — KEYWORDS DE COMBATE

### 42. Guardian

Enquanto houver Devotee inimigo com Guardian em campo, Prepared ou não, os Strikes devem mirar um Guardian (exceto com Nimble; um Guardian que o atacante não pode mirar não conta). Ver §12.

### 43. Nimble

Ignora a exigência de escolher um Guardian ao declarar Strike. Pode ser atacado normalmente.

### 44. Cheater

Só pode ser alvo de Strike de um Devotee que também tenha Cheater (autor, 31/10/2026). O Devotee com Cheater ataca qualquer alvo legal. Substitui a versão anterior (ignorar Guardian contra o God e anular Long Range).

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

Seal é um marcador num Devotee (autor, 31/10/2026, seguindo a D211/D212). Sempre que um Devotee com Seal ficaria Prepared, em vez disso remove 1 marcador Seal e continua Unprepared. **Sealed** = ter 1 ou mais marcadores Seal; “becomes Sealed” é passar de 0 para 1 ou mais. Seal não impede Strike nem habilidades: um Devotee Sealed e Prepared pode agir. Os marcadores somem se o Devotee sai do campo.

### 48A. Training counter

Cada Training counter num Devotee dá +1 ATK / +1 HP a ele. Os marcadores se acumulam (2 marcadores = +2/+2) e ficam enquanto o Devotee estiver no campo. Efeitos que citam Training counters (ex.: Master's Guidance, de Eagle Marin) somam ao bônus do próprio marcador.

### 49. Unfaith

Ao declarar Strike contra um God, o atacante pode escolher remover até 2 Latent Cosmo do adversário em lugar do dano ao Soul. O God retalia normalmente.

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

Habilidades ativadas quando uma carta entra em jogo devem aparecer antes das informações de atributos e keywords no padrão de Card Craft.

Essa é uma regra de apresentação das cartas, não uma alteração da ordem de resolução.

### 54. Facções e Card Craft

Athena — **THE UNBREAKABLE WILL**. “No Saint fights alone.” Pilares: Voltron, Anthem, Brotherhood e Miracle. As cartas que eram “Miracle” são **Technique** (autor, 31/10/2026); Miracle segue só como pilar temático, não como tipo. Anthems tribais priorizam Saint, sem beneficiar genericamente todos os Devotees.

Afinidades aprovadas: Pegasus Seiya → Sagittarius; Dragon Shiryu → Libra; Cygnus Hyoga → Aquarius; Andromeda Shun → Virgo; Phoenix Ikki → Leo. Cada um também tem afinidade com sua própria Cloth; essas relações serão materializadas nas cartas após revisão do catálogo.

Poseidon: controle, pressão progressiva e domínio. Hades: persistência, sacrifício e retorno. Ares: agressividade, combate e conquista. Artemis: caça, precisão e eliminação estratégica. Estas quatro identidades são preliminares; desenvolvimento e aprovação seguem uma facção por vez, começando por Athena.

No Vanilla Set haverá exatamente uma God Armor e um Divine Artifact por facção: cinco de cada. Trata-se de composição editorial do conjunto, não de limite de decks. Seleções de trabalho de God Armor: Athena — Pegasus Seiya; Poseidon — Sea Dragon Kanon; Hades — Wyvern Rhadamanthys; Ares — a definir; Artemis — Callisto. Nomes finais e cartas dependem do Card Craft; não criar automaticamente os dez itens. Respeitar a distinção narrativa entre God Cloth e Kamui e documentar criações do TCG.

Personagens usam classificação de origem: CANON — KURUMADA; SAINT SEIYA — OUTRAS OBRAS; MITOLOGIA ADAPTADA; ORIGINAL TCG. Referências mitológicas devem ser documentadas e não tornam personagens canônicos. Priorizar personagens disponíveis nas obras antes de criar originais; nenhum novo personagem é aprovado por este guia.

Card Craft: identidade e flavor; mecânica; habilidades; cartas e progressão; revisão de custos; balanceamento; aprovação; registro no catálogo. Propostas não são definitivas antes da aprovação.

---

## CAPÍTULO XI — PARÂMETROS DE PLAYTEST

Os valores desta seção são hipóteses iniciais, não resultados de testes concluídos.

Parâmetro	Valor experimental
Deck principal	60 cartas
Mão inicial	7 cartas
Cosmo Base por turno	1
Compra por turno	1 (nada no primeiro turno próprio)
Strike	1 por Devotee por turno
Dano entre turnos	Persistente
Duração média desejada	8–10 Rounds

Os custos de God Cloth serão determinados no balanceamento das cartas.

---

## CAPÍTULO XII — TIMING E CONSOLIDAÇÃO 2.1

O autor aprovou a aplicação das recomendações de fechamento ao sistema do jogo. As seções seguintes consolidam as definições de timing, combate, recursos, equipamentos e construção. Exemplos de curva e custos são referências de playtest; não substituem valores impressos das cartas.

### 55. Round, turnos, compras e mulligan

Revisado em 31/10/2026 (ALPHA-P01, P02, P03 e P06, aprovadas em 28/10/2026; compra de 1 carta, 30/10/2026).

- O primeiro jogador é sorteado e começa **todos** os Rounds. Cada Round tem um turno de cada jogador.
- Ambos compram 7 cartas. Começando pelo primeiro jogador, cada um pode, uma vez, devolver qualquer quantidade de cartas da mão ao deck, embaralhar e comprar o mesmo número. O primeiro turno só começa depois dos dois mulligans.
- Início do turno: o ativo prepara seus Devotees, Equipment e Bases; resolvem-se os gatilhos de início de turno; ele compra **1 carta**. Ninguém compra no próprio primeiro turno.
- O ativo pode colocar uma Base Cosmoble por turno, com a pilha vazia. A Base entra Prepared e paga no mesmo turno (G3-035). Colocar Base não entra na pilha.
- O turno termina quando o ativo declara END TURN com a pilha vazia. End Phase: conversão das Bases Prepared em Latent (§5); gatilhos de fim de turno; no 2º turno do Round, gatilhos de fim de Round (D204); Cleanup.
- Não há limite máximo de cartas na mão nesta base de regras.
- Tentar comprar sem cartas suficientes aplica Fatigue (ALPHA-P07, `draw` no engine-v3).

**Por quê:** comprar 2 cartas por turno gerava vantagem de cartas grande demais no playtest (autor, 28/10/2026; confirmado de novo em 30/10/2026). Com 1 compra, colocar Base passa a custar uma escolha real entre recurso e jogada.

### 56. Timing, respostas e resolução

- Fora de uma janela, só o jogador ativo joga cartas, ativa habilidades e declara Strike, sempre com a pilha vazia. O jogador não ativo só age respondendo nas janelas.
- **Moment** pode ser jogado no próprio turno ou como resposta em uma janela de prioridade, inclusive no turno do adversário. Como resposta, paga integralmente seus custos exclusivamente em Latent Cosmo. **Technique** só é jogada no próprio turno, salvo texto explícito (autor, 29/10/2026). Event e Miracle não são subtipos: as cartas que eram Event (052, 055, 083) são **Moment** e as que eram Miracle são **Technique** (autor, 31/10/2026). Toda Spell jogada (Technique ou Moment) entra na pilha e abre uma janela de resposta; só resolve depois que os dois jogadores passam em sequência (autor, 29/10/2026). Alvos de Spell são escolhidos ao jogá-la, antes da janela; respostas veem o alvo. Se o alvo não estiver mais disponível na resolução, a parte que dependia dele não acontece (autor, 29/10/2026).
- **Tudo vai à pilha, como no Magic (autor, 30/10/2026):** jogar Devotee ou Equipment (inclusive Armor) e ativar habilidade ({T}, {N}{C}, Domain, poder divino e Ultimate) também entra na pilha e abre janela de resposta, como as Spells. Custos e alvos são pagos e anunciados ao declarar; o efeito acontece na resolução. Devotee e Equipment só entram em campo quando resolvem; se forem contrariados, vão ao Tartarus do dono. Só Moment responde; colocar Base continua fora da pilha.
- **Gatilhos simultâneos (APNAP, autor, 31/10/2026):** quando vários gatilhos disparam ao mesmo tempo, os do jogador ativo entram na pilha primeiro e os do outro jogador por cima (resolvem antes). Cada jogador escolhe a ordem dos próprios gatilhos antes de qualquer passe de prioridade; sem escolha, vale a ordem em que dispararam.
- Habilidades ativadas são usadas no próprio turno por padrão; apenas as expressamente permitidas como resposta podem ser ativadas na prioridade. Passivas e gatilhos funcionam a qualquer momento. Uma carta que disser como e quando a habilidade funciona fornece a exceção.
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
- **Rivalidade:** suspensa no sistema de turnos (§13).
- **Mudança de controle:** deixa o Devotee Unprepared, sem curar dano nem apagar Awaken. 
- Uma carta vai para as zonas de seu proprietário, salvo efeito explícito. “Resonance” da Armor indica personagem; não indica proprietário da carta.
- Equipamentos não mudam de controlador automaticamente. Como a ligação normal exige equipamento e portador do mesmo controlador, um equipamento incompatível fica em campo sem portador e perde a evolução. Um efeito pode transferir expressamente ambos.

### 59. Combate e textos das keywords

O dano é marcado separadamente do HP máximo. Power negativo causa zero dano. HP máximo zero ou negativo destrói o Devotee. Soul zero ou negativo derrota o jogador. O excesso de dano não é cura nem recurso.

| Keyword | Definição |
| --- | --- |
| Guardian | Enquanto estiver em campo, Prepared ou não, Strikes inimigos devem mirar um Guardian, exceto com Nimble. Um Guardian que o atacante não pode mirar não conta. |
| Nimble | Ignora a exigência de mirar Guardian ao declarar Strike. Pode ser alvo normalmente. |
| Cheater | Só pode ser alvo de Strike de outro Devotee com Cheater. |
| Long Range | Ao iniciar Strike, causa seu dano primeiro. Verificar destruição/derrota antes da retaliação; alvo destruído não retalia. Defender com Long Range não concede dano primeiro. |
| Pierce | Ao iniciar Strike contra um Devotee, o dano excedente ao HP restante daquele alvo é causado ao Soul do God que o controla. Não funciona por retaliação. Calcular depois de prevenção/modificação do dano e sem contar dano antigo como dano novo. |
| Impulse | Pode declarar Strike no turno em que entra em campo, contra qualquer alvo legal, inclusive o God. Pierce continua funcionando normalmente. |
| Sealed | Ter 1 ou mais marcadores Seal (§48). Quando ficaria Prepared, remove 1 marcador e continua Unprepared. Não impede Strike nem habilidades de um Devotee Prepared. |
| Unfaith | Ao declarar Strike contra um God, pode escolher remover até 2 Latent Cosmo daquele jogador em lugar de causar dano ao Soul. A escolha é anunciada antes das respostas. O God retalia normalmente; sem Latent, o modo não causa dano ao Soul. |

**Unfaith foi confirmada pelo autor com este complemento:** cria uma decisão entre pressão no Soul e negação de recurso. Cheater mudou em 31/10/2026 (§44).

Se um Strike causar Soul zero aos dois Gods simultaneamente por efeitos aplicáveis à mesma etapa, há empate. Se Long Range derrotar o God na etapa inicial, a partida termina antes da retaliação. Gatilhos futuros não desfazem uma derrota já verificada; substituições de derrota/dano precisam agir antes dessa verificação.

**Exemplo:** A tem Power 4, HP 5 e 2 de dano; B tem Power 3, HP 4 e 1 de dano. Em Strike normal, ambos são destruídos. Se A inicia com Long Range, destrói B antes da retaliação e continua com seus 2 de dano.

### 60. Cosmo, Latent e custos

- Uma Base disponível paga 1 Cosmo e fica indisponível até a renovação. Gastar Bases para pagar é parte do pagamento; não cria jogada adicional nem exige guardar um estoque de Cosmo gerado sem uso.
- Aplicar a matriz da seção 5: Devotee, Armor e Ultimate usam somente Base; Moment como resposta usa somente Latent; os demais custos aceitam ambos, respeitando restrições expressas. Cosmo temporário só paga custos genéricos, salvo texto específico, e não é armazenado automaticamente.
- **Ganho de Latent por dano: suspenso no sistema de turnos (31/10/2026).** A regra da 2.1 (1 Latent uma vez por AÇÃO adversária com dano) dependia das AÇÕES e não está no engine-v3. Pendente decisão do autor. Cartas podem criar suas próprias fontes de Latent.
- Limite de **3 Latent por jogador**, persistente entre turnos. As Bases Prepared viram Latent no início da End Phase do seu turno (§5).
- Escolhas e custos são validados antes de gastar; pagamento insuficiente não produz gasto parcial. Recursos pagos em uma declaração válida não retornam se o efeito depois falhar.

**Por quê:** a conversão no fim do turno garante Latent para responder no turno do adversário. O limite do banco limita explosões e torna Unfaith útil sem decidir a partida sozinho.

### 61. Equipamentos, estágios e remoção

- Cada Devotee tem **um espaço de armadura**, ocupado por uma Cloth, Scale, Surplice, Warplate ou Moonplate. Essas armaduras não se acumulam. Armas, acessórios e outras Relics não têm limite geral de quantidade, respeitando restrições impressas e cartas únicas.
- Jogar uma Armor, no próprio turno, custa o custo impresso, só em Base. Com um Devotee Resonant seu em campo, você pode vesti-la nele sem Equip; senão ela entra sem portador (§28).
- Vestir uma Armor em campo (sem portador ou tirada de outro Devotee seu), no próprio turno, custa o Equip impresso, em Base e/ou Latent, inclusive para o Resonant. Ao entrar em campo, um Devotee Resonant pode puxar sua Armor sem Equip. Armas/acessórios usam o Equip impresso ou 1. Trocar de armadura deixa a anterior em campo sem portador; não a destrói.
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
- Afterlife é uma marca de habilidade impressa que funciona no Tartarus (§40, autor 31/10/2026); estar no Tartarus não dá Afterlife.
- Retornar do Tartarus exige um efeito. Por padrão, a carta retorna sob controle de seu proprietário, Prepared, sem dano, sem seu Awaken anterior e sem equipamentos automaticamente anexados; o efeito pode especificar exceções.
- Limite experimental para evitar ciclos: **cada carta física pode retornar do Tartarus ao campo uma vez por rodada**. Hades pode retornar vários Devotees diferentes; exceções ao limite precisam estar explícitas. Sair de novo não renova o limite.

**Por quê:** três progressões distintas, com papéis claros: despertar do personagem, vínculo com a armadura e golpe extraordinário. O retorno continua relevante sem reciclar infinitamente a mesma entrada em campo.

### 63. Deck, identidade, mulligan, Gods e Domains

- Deck principal com 60 cartas, até **3 cópias da mesma identidade de carta**; artes alternativas e revisões da mesma carta não aumentam o limite. God e Domain ficam fora dessas 60.
- Permitir cartas da facção do God, da facção do Domain e neutras. Se God e Domain forem da mesma facção, o deck é monofacção mais neutras. Não criar cinco tipos de mana nesta base.
- **Domain fora da cor** (autor, 31/10/2026). Se a facção do Domain for diferente da facção do God:
  1. Só a **primeira habilidade impressa** do Domain funciona; as demais são ignoradas.
  2. Habilidades **estáticas** do Domain não funcionam.
  3. Habilidade disparada ou ativada do Domain tem custo adicional de **{1}{S}** (o God do controlador perde 1 Soul), pago quando ela iria para a pilha. O pagamento é opcional: sem pagar, a habilidade não é usada. Disparo obrigatório passa a ser opcional.
  4. O deck principal pode ter **até 15 cartas** da facção do Domain. Cartas neutras não contam nesse limite; God e Domain ficam fora dos 60.
  - Domain da mesma facção do God funciona inteiro, sem custo extra; o bônus de ressonância é não sofrer essas restrições.
- **Forma dos Domains e Once per game** (autor, 31/10/2026). Um Domain tem duas linhas: a primeira é um efeito simples e contínuo (estática de +1 ATK ou +1 HP num subtipo, ou gatilho/ativada de 1 ponto no máximo uma vez por rodada), sem compra de carta; a segunda é forte e marcada **Once per game**. Compra de carta em Domain só aparece na habilidade Once per game.
  - **Once per game:** habilidade ativada que o controlador usa no próprio turno, pagando o custo impresso; vai à pilha. Ao declará-la, o Domain fica marcado como usado (vira de lado) até o fim da partida; se for contrariada, continua usada.
  - Domain fora da cor perde a segunda linha pela regra acima; o poder forte fica para quem é da cor.
- Um mulligan parcial gratuito: separar qualquer quantidade da mão inicial, comprar a mesma quantidade e só então embaralhar as separadas no deck. Apenas uma troca; sem penalidade de Latent ao adversário. Ver §55.
- Cada jogador pode controlar um Devotee de cada **personagem nomeado**, mesmo que existam versões diferentes da carta. Essa regra de lendário vale só para as classes de guerreiros: **Saints, Marines, Satellites, Specters e Berserkers**. Devotees de classe baixa (Warrior, Support e sem classe) não são lendários e podem ter mais de uma cópia no campo. Unidades genéricas também não têm essa exclusividade. Usar identidade estável de personagem para essa regra e para Resonance; título e ilustração não bastam.
- Uma segunda versão de personagem que já controla pode ser jogada da mão normalmente. Sempre que houver duplicidade (por jogada da mão ou por efeito), o controlador escolhe um para manter e envia os outros ao Tartarus, sem considerar isso destruição. Habilidades de entrada continuam seguindo o fato de a carta ter entrado; essa interação deve ser considerada no custo do efeito que a trouxe.
- Relics só são únicas se isso estiver expresso. Retirar o desconto geral de 2 Cosmo por repetir nome; versões de Armor são cartas separadas (§29), e uma carta específica pode autorizar substituir sua versão anterior.
- Gods não iniciam Strike nem equipam armaduras. Possuem Soul e Attack; retaliação permanece disponível independentemente de Prepared. Custos de habilidades do God devem estar impressos, inclusive eventual esgotamento.
- Domains permanecem em jogo, fora do deck, sem custo de entrada e protegidos de ataque, destruição, exílio, retorno à mão e mudança de controle adversária nesta base. Seus efeitos e limites de uso vêm do texto da carta. Galaxian Wars Arena (062), Tournament Spirit: conta quando o Bronze Saint amigo derrota o Devotee inimigo num Strike, tanto atacando quanto defendendo (dano de retaliação) (autor, 28/10/2026).
- **Engage** (texto antigo de algumas cartas de Artemis): "engaged with X" significa estar num Strike com X, atacando ou defendendo; "Engage that Devotee" força esse Devotee num Strike contra o seu (autor, 29/10/2026). A mecânica de Engage separada não existe.
- **Token** (ex.: Forest Guardian 3/3 de The Forest Invades Sanctuary): Devotee criado por efeito, sem carta. Entra Unprepared, não é lendário e deixa de existir quando sai do campo (não vai ao Tartarus, à mão nem ao Void). Não conta como carta para efeitos de deck, mão ou Tartarus (autor, 29/10/2026).
- **Cosmo gerado por efeito** (“Generate {C}”, “Cosmo Latente”) entra como Latent Cosmo comum, respeitando o limite de 3. Restrições impressas de uso (“only during your turn”, “only to cast a Devotee”) não se aplicam nesta versão (autor, 29/10/2026).
- Manter Tartarus e Void distintos. Void representa exílio; habilidades Afterlife não funcionam no Void. Efeitos só alcançam as zonas e tipos que identificam; “target Devotee” não alcança automaticamente uma carta no Tartarus.

### 64. Duração dos efeitos e Card Craft

- Textos usam **turn** para o turno de um jogador e **round** para o par de turnos (31/10/2026). “Once each round” renova no fim do Round; “until end of turn” acaba no Cleanup do turno.
- Em textos existentes, **“once per turn” vale “once each round”** e **“until end of turn” vale “until end of round”** (autor, 29/10/2026).
- “Until end of round” termina no encerramento atual; “until the beginning of the next round” termina no início da seguinte, antes da preparação. Uma duração diferente deve identificar precisamente o evento.
- “During your opponent's turn” volta a valer literalmente.
- **Distribuir dano** (“distribute N damage among …”): cada alvo escolhido recebe pelo menos 1 (autor, 30/10/2026).
- Habilidades de entrada aparecem primeiro na carta. A posição gráfica não antecipa a resolução de um gatilho em relação à pilha.
- **Sintaxe de Armor (autor, 30/10/2026):** o Equip universal fica no selo EQUIP do canto inferior esquerdo, fora do texto; a 1ª linha do texto é “Resonance — Nome” quando houver Resonant. O bônus ao portador fica nas gemas de ATK (esquerda) e HP (direita) na altura da linha de tipo, layout original das Cloths (autor, 30/10/2026), não no texto; keyword concedida fica como “Equipped Devotee has X.”. Habilidades específicas usam “Resonance — Nome: efeito” no catálogo; a carta mostra um bloco só, com o título “Resonance — Nome completo” e o efeito embaixo, sem repetir o nome (autor, 30/10/2026). Campos: `bonus_poder`, `bonus_vida`, `equipar_custo_outros` (Equip) e `auto_equip_en` (Resonance).
- No Card Forge, separar: identidade e versão; custo e Cosmoble; Power/HP ou Soul/Attack; entrada; keywords; habilidades; Awaken/Ultimate; Resonance; custo e bônus da Armor. Cloth e Scale precisam de identificação mecânica própria, ainda que reutilizem uma moldura.
- Dados de partida como dano, Prepared, estágio atual e limites usados ficam fora da definição-base. A carta interativa recebe esses estados da engine. Impressão e jogo compartilham os mesmos textos, identidade e revisão.
- São obrigatórios os textos que definem alvos, custo, duração e limite das habilidades, evitando que o importador complete esses elementos silenciosamente. O editor deve sinalizar conflitos entre texto e campos estruturados.

### 65. Valores iniciais e o que medir

| Parâmetro | Parâmetro inicial |
| --- | --- |
| Soul / Attack de God de referência | 20 / 3; Soul entre 15 e 22 por God. Os valores de cada God (Soul, Attack, Awaken) são os da carta do God no Card Forge (`data/cards.json`, ids `<facção>-001`) desde 29/10/2026; em 29/10/2026: Athena 22/2/Awaken 5, Poseidon 22/1/4, Hades 18/2/7, Artemis 20/1/3, Ares 18/3/7 |
| Compras | 1 por turno, nada no primeiro turno próprio |
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
