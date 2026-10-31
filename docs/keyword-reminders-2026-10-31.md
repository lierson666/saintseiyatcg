# Lembretes de keyword (estilo MTG Arena) — proposta, 31/10/2026

**Aprovado pelo autor em 31/10/2026.** Texto visível ao jogador, em inglês, tirado do guia (capítulo IX, §40 e §§21–23). Nada aqui cria regra.

## UX proposta

- **Onde:** no inspetor do duelo (clique direito / toque longo) e na ficha da carta no lobby e no deck builder. Ao lado do texto da carta aparece uma pilha de “fichas de keyword”, uma por keyword presente, como no Arena.
- **Quais:** keywords impressas (`keywords_en`) e as citadas no texto (ex.: “gains **PIERCE**”, “put 1 **SEAL** counter”). Cada uma aparece uma vez só.
- **Visual:** título em MAIÚSCULA e negrito na cor da facção; regra em branco, 14 px, uma ou duas linhas. Fundo escuro translúcido, borda fina na cor da facção.
- **Celular deitado:** as fichas ficam abaixo do texto, dentro do mesmo painel com rolagem; nada depende de passar o mouse (a regra já aparece aberta).
- **Na mesa:** nada muda nas cartas pequenas; a explicação vem ao abrir o inspetor.
- **Fonte única:** `shared/keyword-glossary.js`, usado por duelo e lobby.

## Textos (inglês)

| Keyword | Texto | Fonte |
| --- | --- | --- |
| GUARDIAN | While an enemy Guardian can be targeted, Strikes must target it, except against a Rival or with Nimble. | §42 |
| NIMBLE | Ignores Guardian when declaring a Strike. It can still be targeted normally. | §43 |
| CHEATER | Can only be targeted by Strikes from Devotees that also have Cheater. It can Strike any legal target. | §44 |
| LONG RANGE | When it starts a Strike, its damage resolves before retaliation. If the defender is destroyed, it doesn't retaliate. | §45 |
| PIERCE | When it Strikes a Devotee, excess damage is dealt to that player's God Soul. Doesn't apply to retaliation. | §46 |
| IMPULSE | Can declare a Strike the round it enters the battlefield, against any legal target, including the God. | §47 |
| SEAL | Whenever this Devotee would become Prepared, remove a Seal counter from it instead. | §48 |
| SEALED | Has one or more Seal counters. It can still Strike and use abilities while Prepared. | §48 |
| UNFAITH | When it Strikes a God, you may remove up to 2 of that player's Latent Cosmo instead of dealing Soul damage. The God still retaliates. | §49 |
| TRAINING | Each Training counter gives +1 ATK / +1 HP. Counters stack while the Devotee stays on the battlefield. | §48A |
| AFTERLIFE | Abilities marked Afterlife work only while this card is in its owner's Tartarus. Being in the Tartarus doesn't grant Afterlife. | §40 |
| PREPARED | On guard: can declare a Strike and protects itself and its God. | §§21–23 |
| UNPREPARED | Open: can be chosen as a Strike target. | §§21–23 |
| PREPARE | Make it Prepared. | §§21–23 |

## Seal

Resolvido em 31/10/2026: vale a D211 (motor); §48 do guia reescrito.
