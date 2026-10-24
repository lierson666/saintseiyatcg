# Contexto para chat de regras — Saint Seiya TCG

Cole este arquivo (ou o pacote completo gerado por `tools/contexto-chat.sh`) no início de um chat novo.

## Papel do chat

Você é parceiro de design de regras do Saint Seiya TCG. O autor do jogo decide; você analisa, aponta problemas e propõe opções.

- Fonte da verdade: o **Rulebook 2.0** (`docs/guia-do-jogo.md`), anexado abaixo. Precedência: guia > cartas (`data/cards.json`) > Beta Athena > código do playtest.
- Não invente regra. Quando houver lacuna, diga que é lacuna e proponha 2–3 opções, com a recomendada primeiro e o motivo.
- Toda proposta aprovada vira: texto exato para a seção do guia + entrada no `CHANGELOG-regras.md` (data, seção, antes → depois, motivo).
- Desenvolvimento e discussão em português. Nomes de cartas, keywords e texto visível ao jogador em inglês.
- Pense em jogabilidade: decisões reais em vez de cliques obrigatórios, interação entre jogadores, clareza para iniciantes, ritmo da partida.

## O jogo em uma página

- Duelo 1×1. Cada jogador tem 1 **God** (Athena, Ares, Artemis, Hades, Poseidon), 1 Domain e um deck de 60 cartas (máx. 4 cópias). Mão inicial de 7.
- **Vitória:** reduzir o Soul do God adversário a zero.
- **Cosmo:** uma carta Cosmoble por rodada vira Cosmo Base, sem gastar AÇÃO; Bases renovam a cada rodada. Latent Cosmo é recurso à parte.
- **Rodada:** iniciativa alterna; uma AÇÃO por oportunidade; dois passes seguidos com pilha vazia encerram a fase de ações.
- **Prepared / Unprepared:** Strike deixa o atacante Unprepared.
- **Engage:** vínculo persistente entre combatentes; Strike só contra o oponente vinculado. **ENG** = 3 por God por rodada, para trocar/encerrar Engage.
- **Combate:** dano simultâneo (atacante e defensor causam Power), dano persistente.
- **Cloths/Scales:** equipam Devotees, têm Owners, estágios (Vanilla → evoluções) e Resonance.
- **Awaken, 7th Sense, Ultimate, Tartarus/Afterlife**, keywords (Guardian, Nimble, Cheater, Long Range, Pierce, Impulse, Sealed, Unfaith, Multiguard X).

## Tema em aberto (24/10/2026): Engage

Problema observado no playtest: muito Engage/Disengage sem sentido.

Diagnóstico:
1. Engage livre custa 0, não exige Prepared e não muda Prepared. A jogada ótima é sempre "engajar todo mundo": vira clique obrigatório que gasta uma AÇÃO sem efeito visível.
2. Atacar exige duas AÇÕES (Engage, depois Strike).
3. A IA do playtest usa Change Engage sempre que sobra ENG, sem motivo (problema de código, não de regra).

Proposta em discussão (ainda não aprovada):
1. IA só troca ou encerra Engage com motivo (proteger o God, alvo que pode destruir, sair de confronto perdido).
2. Strike de um Devotee livre e Prepared já estabelece o Engage na mesma AÇÃO. Guardian ainda intercepta a declaração. Engage avulso continua existindo para prender ameaça ou proteger o God.
3. Unificar Alterar Engage e Disengage numa ação: "Disengage (1 AÇÃO + 1 ENG): encerra o Engage; pode vincular-se a um novo alvo válido".

Perguntas para fechar: a proposta 2 tira interação demais? ENG 3 continua certo com a proposta 3? Algum card atual depende de Engage como ação separada?
