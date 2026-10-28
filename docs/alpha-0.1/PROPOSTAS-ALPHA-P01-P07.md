# Alpha 0.1 — propostas ALPHA-P01 a ALPHA-P07

**Status: cada proposta precisa da confirmação individual do autor.** Aprovadas até agora: P04 (opção A). As demais: NÃO APROVADAS. A numeração é provisória e não usa a faixa D. A D269 fica de fora.

Se o autor achar o texto original (D1–D190) de algum item, esse texto substitui a proposta.

Busca final feita em 28/10/2026:
- Drive: busca por texto de "mulligan", "Guardian", "retaliation" e "Cleanup" desde 01/10. Só apareceram as pastas do pacote D268 e documentos 2.x.
- Repositório: todos os branches e mensagens de commit.
- Texto das 95 cartas.

Nenhum texto 3.0 primário foi encontrado para os sete itens. O que as cartas e a D233 indicam está citado em cada proposta como **evidência**.

Para comparar, as fontes legadas foram consultadas **só como referência histórica**:
- **Vanilla 1.0** (`12EQX…`);
- **guia 2.x** (`docs/guia-do-jogo.md` do branch `codex/arena-experience-v3`).

Nenhuma delas vale como regra 3.0.

Nos decks aprovados (Pegasus Rush × Dragon Fortress), as keywords em uso são:
- **Guardian:** 003, 011, 034, 040, 056;
- **Nimble:** 021;
- **Cheater:** 019;
- **Pierce:** 077.

---

## ALPHA-P01 — Mão inicial, mulligan e quem começa

- **Comprovado:** nada da 3.0. A D170 tira a compra do 1º turno, o que pressupõe uma mão inicial.
- **Referência histórica:** Vanilla 1.0 e 2.x usam mão de 7, com troca de cartas.
- **A:** mão de 7. Mulligan parcial e gratuito, uma vez: cada jogador escolhe quantas cartas devolver, embaralha o deck e compra o mesmo número. Quem começa é sorteado. O jogador inicial decide primeiro e os dois fazem o mulligan antes do 1º turno.
- **B:** mão de 5, com mulligan total uma vez (devolve a mão inteira e compra 5).
- **Recomendação: A.** Com D170 e D3, quem começa fica 2 turnos sem comprar. Uma mão de 5 deixaria o início pobre demais para jogar Base e Devotee.
- **Redação proposta (A):** "Each player draws 7 cards. Starting with the first player, each player may once put any number of cards from their hand on the bottom of their deck, shuffle, and draw that many. The first player is chosen at random."
- **Escopo:** só o setup. **Não muda:** D170 e D3.
- **Testes:** cada jogador termina o setup com 7 cartas; só um mulligan por jogador; o número de cartas se conserva.
- **Risco:** baixo.

## ALPHA-P02 — Preparação, estado de entrada e ordem do início do turno

- **Comprovado:**
  - D2 confirma preparação automática, sem dizer o que prepara.
  - D4: as Bases preparam no início do turno.
  - D22: um Strike por turno.
  - **Evidência nas cartas:**
    - Hades e Great Eclipse: "They enter **Unprepared** and lose Impulse".
    - Ares e Obliteration: "can declare Strikes **as though they had Impulse**".
    - Isso indica que, sem Impulse, um Devotee não ataca no turno em que entra.
- **A:**
  1. No início do turno, o jogador ativo prepara todos os seus Devotees, Equipment e Bases.
  2. Depois, resolvem os gatilhos de início de turno, em APNAP e LIFO.
  3. Por último, ele compra (D3).
  4. Devotee e Base entram **Unprepared**. Um Devotee só declara Strike no turno em que entrou se tiver Impulse.
- **B:** a mesma ordem, mas o Devotee entra Prepared, e uma marca de "chegou neste turno" o impede de atacar (exceto com Impulse). A Base nova entra preparada.
- **Recomendação: A.** Bate com o texto de Hades, entra Unprepared, e com Impulse. Uma regra só resolve as duas coisas.
- **Redação (A):** "At the start of your turn, Prepare all Devotees, Equipment and Cosmo Bases you control; then start-of-turn triggers; then draw (D3). Devotees and Cosmo Bases enter the battlefield Unprepared. Impulse lets a Devotee declare a Strike the turn it enters."
- **Escopo:** início do turno e estado de entrada. **Não muda:** D22, D170 e D3.
- **Testes:**
  - Devotee jogado neste turno não declara Strike, a não ser com Impulse;
  - no turno seguinte, ele está Prepared;
  - Base nova não gera Cosmo no turno em que entra.
- **Risco:** com 2 compras por turno, a curva fica mais lenta. Medir no playtest.

## ALPHA-P03 — Conversão de Base em Latent

- **Comprovado:**
  - D5: Base não usada vira Latent ao encerrar o turno.
  - Teto de 3 (D198, D226).
  - D226: um ganho de N é **um único evento**.
- **A:** 1 Latent por Base preparada não usada, convertidas em **um único evento** no início da End Phase, antes dos efeitos de End Phase. O excesso acima de 3 se perde.
- **B:** a mesma quantidade, só que no Cleanup, depois dos efeitos de End Phase.
- **Recomendação: A.** Assim o jogador não ativo tem Latent no turno seguinte para Moments em Instant Speed (D194). Fazer a conversão antes dos efeitos de End Phase também evita conflito com o checkpoint da D204.
- **Redação (A):** "At the beginning of your End Phase, gain 1 Latent Cosmo for each of your Cosmo Bases that is still Prepared, as a single gain event (max 3)."
- **Escopo:** só a conversão. **Não muda:** o teto 3 nem a D198.
- **Testes:**
  - 4 Bases não usadas com Latent 1 → Latent 3 e 2 perdidos;
  - Moonlight Blessing conta um só evento (D226);
  - Base gasta não converte.
- **Risco:** baixo. O núcleo já implementa a A, com a posição marcada como pendente.

## ALPHA-P04 — Procedimento de Strike, dano, retaliação e Cleanup

**Status: APROVADA, opção A, pelo autor em 28/10/2026** (dano simultâneo, retaliação do God, dano persistente). Implementada em `playtest/engine-v3/strike.js`. Guardian (P05) e a janela de reação (P06) continuam pendentes.

- **Comprovado:**
  - D22: um Strike por turno.
  - D202: gatilhos na declaração entram na cadeia antes do dano.
  - D187: sem prioridade dentro de um Strike em resolução.
  - D199: prevenção avaliada antes do evento.
  - D197: Defeat = Destroy.
  - **Evidência nas cartas:**
    - "retaliatory Strike damage" (005), "retaliation damage from Gods" (Artemis), D248/D249: o Devotee defensor **e o God** retaliam.
    - Cura: "Remove up to 2 damage" (041). Prevenção futura em Armor (042, 050).
    - Isso indica que o **dano persiste** entre turnos.
- **A (recomendada):**
  1. **Declaração:** um Devotee Prepared que pode atacar neste turno (D22, P02) escolhe como alvo o God inimigo ou um Devotee inimigo, respeitando Guardian (P05). Ao declarar, ele fica Unprepared.
  2. **Reações:** gatilhos "when … declares a Strike" e respostas em Instant (P06).
  3. **Dano:**
     - o atacante causa dano igual ao seu ATK;
     - um Devotee alvo causa dano de retaliação igual ao seu ATK, ao mesmo tempo;
     - um God alvo perde Soul igual ao dano (1:1) e retalia com o seu ATTACK.
  4. **Verificação de estado:** um Devotee com dano maior ou igual ao HP é destruído e vai para o Tartarus do Owner. A Armor dele vai para o Tartarus do Owner (D40/D90).
  5. **Dano marcado:** persiste até ser removido por efeito. O Cleanup **não** limpa dano.
- **B:** o mesmo, mas o dano de Devotee é limpo no Cleanup de cada turno.
- **Recomendação: A.** Com B, as cartas de cura e reparo, como a 041 ("Remove up to 2 damage"), quase perderiam a função.
- **Escopo:** Strike e verificação de destruição. **Não muda:** D22, D187, D199, D202 nem D248/D249.
- **Testes:**
  - Strike Devotee contra Devotee com dano simultâneo, em que os dois morrem;
  - Strike contra o God tira Soul e o God retalia com ATTACK;
  - declarar deixa o atacante Unprepared;
  - um segundo Strike do mesmo Devotee no turno é recusado;
  - o dano continua no turno seguinte;
  - a prevenção da 003 ("prevent 1") se aplica antes do dano.
- **Risco:** médio. Com a retaliação do God, atacar o God custa vida ao atacante. Medir.

## ALPHA-P05 — Guardian, Cheater, Nimble e Pierce (as keywords dos decks)

- **Comprovado:** as cartas só nomeiam as keywords; não há definição 3.0. A Memória Mestre diz, como **resumo**, que Cheater "ignora Guardian ao atacar um God".
- **A:**
  - **Guardian:** enquanto você controla um Devotee Prepared com Guardian, Strikes inimigos contra o seu God ou contra Devotees seus sem Guardian são ilegais. Eles precisam mirar um Devotee com Guardian.
  - **Cheater:** ao declarar Strike contra um God, ignora Guardian.
  - **Nimble:** ao declarar Strike, ignora Guardian.
  - **Pierce:** num Strike contra Devotee, o dano acima do HP restante do alvo vai para o Soul do God dele.
- **B:** igual à A, mas Guardian protege mesmo Unprepared.
- **Recomendação: A.** Um Guardian que atacou fica Unprepared e abre a guarda. É uma decisão real para o jogador, sem janela nova.
- **Escopo:** só essas 4 keywords. **Não muda:** nenhum texto de carta, nem a 019.
- **Testes:**
  - com Guardian Prepared, Strike no God é recusado;
  - Cheater (019) no God passa;
  - Nimble (021) ignora Guardian;
  - Guardian Unprepared não protege;
  - Pierce: excesso de 2 vira 2 de Soul.
- **Risco:** Nimble e Cheater podem ficar parecidos demais. Conferir se Nimble não tem outro papel no design.

## ALPHA-P06 — Prioridade, LIFO, APNAP, End Phase e Cleanup (D60–D63, D186–D187)

- **Comprovado:**
  - LIFO (D186) e APNAP (D187), só por citação.
  - D187: sem prioridade dentro de um Strike em resolução ou de objeto indivisível.
  - Handbook 3.0 §3: "ações comuns não abrem passagens de prioridade obrigatórias".
  - D204: checkpoint de fim de Round.
  - D194: Moment = Instant.
  - D173: Sorcery é o padrão.
- **A (janelas mínimas):**
  1. Ação comum (jogar carta Sorcery, colocar Base, equipar) **não** abre janela.
  2. Uma janela abre quando: um gatilho entra na cadeia; um Strike é declarado; um Moment é jogado; e na End Phase.
  3. Na janela, o jogador não ativo responde primeiro, só com Instant e habilidades reativas. A vez alterna até **dois passes seguidos**. Então resolve o topo (LIFO) e, se a cadeia não estiver vazia, abre outra rodada de passes.
  4. Gatilhos simultâneos: o ativo coloca os seus primeiro, depois o não ativo (APNAP). Assim o não ativo resolve primeiro.
  5. **End Phase (no lugar de D60–D63):**
     1. conversão D5 (P03);
     2. gatilhos "at end of turn", com janela;
     3. no 2º turno do Round, o checkpoint da D204;
     4. **Cleanup:** expiram os efeitos "until end of turn" e, no 2º turno, os "this round"; renova o "once each round" (D191).
- **B:** prioridade para o oponente depois de **toda** ação, como na 2.x.
- **Recomendação: A.** A B contraria o princípio do Handbook 3.0 e a direção da D1.
- **Escopo:** janelas e End Phase. **Não muda:** D186, D187, D191, D199 nem D204.
- **Testes:**
  - colocar Base e jogar Technique não abrem janela;
  - Strike declarado abre janela e o não ativo pode jogar um Moment;
  - dois passes resolvem o topo;
  - três gatilhos resolvem em APNAP + LIFO;
  - o efeito "this round" sobrevive ao Cleanup do 1º turno e expira no do 2º.
- **Risco:** médio. Se o autor tiver o texto das D60–D63, ele prevalece.

## ALPHA-P07 — Fatigue

- **Comprovado:**
  - D174: deck vazio causa Fatigue, sem derrota automática.
  - **Evidência canônica na D233:** "failed Draw still follows **pre-existing cumulative Soul Fatigue**". Ela cita também a "missed-Draw **progression**".
  - Logo, a Fatigue é Soul perdido e é **cumulativa**. Falta o valor.
- **A:** cada compra que falha tira Soul igual ao número de compras falhas do jogador na partida (1, 2, 3…). O contador nunca zera.
- **B:** cada compra que falha tira 1 de Soul, valor fixo.
- **Recomendação: A.** "Cumulative" e "progression" no texto canônico descartam a B.
- **Redação (A):** "Whenever you would draw a card from an empty deck, instead your God loses Soul equal to the number of times this has happened to you this game."
- **Escopo:** só compra falha. **Não muda:** D233 (Mill não causa Fatigue) nem D52.
- **Testes:**
  - deck vazio, compra de 2 → perde 1 e depois 2 (total 3);
  - no turno seguinte → perde 3 e 4;
  - Mill com deck curto não conta (D233);
  - Soul 0 por Fatigue encerra na hora (D52).
- **Risco:** baixo.

---

## Ordem sugerida para aprovar

1. **P04 e P06**: travam o combate e a pilha.
2. **P02 e P05**: definem quem ataca e quem é alvo.
3. **P01, P03 e P07**: setup, Latent e fim de deck.
