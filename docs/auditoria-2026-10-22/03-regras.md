# Auditoria de regras — Saint Seiya TCG — Fase 0

Data de referência: 22/10/2026. Auditoria documental, sem implementação nem alteração de regras, cartas ou arquivos protegidos.

## Autoridade e estados

- **Confirmado-documentado (CD):** enunciado explícito numa fonte normativa atual, rastreado abaixo. Não significa que sua execução já esteja completa, que todos os casos estejam definidos ou que cada carta da fonte esteja aprovada.
- **Pendência (P):** definição ausente, ambiguidade, divergência entre fontes ou proposta que precisa de decisão explícita do criador. A implementação não deve preencher essas lacunas.
- **Diretriz atual do prompt (DP):** instrução expressa do pedido atual que ainda precisa ser incorporada ao manual/versionamento, quando mudar ou completar regra.
- Os identificadores `RULE-...` abaixo são **propostos para recuperação**, não um novo Rulebook aprovado. A versão recuperada é Vanilla 1.0 (`docs/guia-do-jogo.md:1-5`). Nenhum ID foi gravado no manual ou na engine.

A precedência vigente é manual > cards.json > beta > código (`CLAUDE.md:7-14`). Mudar regra exige confirmação do autor, edição do guia e changelog antes de adaptar engine/UI/cartas (`CLAUDE.md:16-23`). O changelog registra apenas a adoção da Vanilla 1.0 em 22/10/2026; não registra individualmente as normalizações da beta (`docs/CHANGELOG-regras.md:3-9`). Isso limita a reconstrução da cronologia.

O prompt mestre atual é o anexo `/Users/mac/.codex/attachments/a6569cae-55c0-4948-963e-0bb458ef98fa/Texto colado.txt` (adiante **PROMPT**). Ele manda preservar textos, separar propostas e pendências e não inventar regras (L24-43); proíbe aprovação automática de cartas (L234-250); exige auditoria e aprovação antes de iniciar a engine (L712-828). O bloco “Como usar” reconhece que conversas anteriores não chegam automaticamente ao Codex (L860-866).

## Inventário completo do manual — snapshot do commit 6b9b19d

As referências desta tabela são de `docs/guia-do-jogo.md`. Cada linha cobre um enunciado ou conjunto inseparável de cláusulas. As pendências não anulam o que está explicitamente documentado.

| Seção | ID proposto | Enunciado recuperado | Origem | Estado / limite |
| --- | --- | --- | --- | --- |
| 1 Objetivo | RULE-WIN-001 | Reduzir Soul do God adversário a 0 vence; o jogador cujo Soul chega a 0 perde. | L7-11; L139; L230; L464-469 | CD; empate simultâneo pendente. |
| 1 Objetivo | RULE-WIN-002 | Perde ao precisar comprar sem cartas no Baralho. | L11; L468-469 | CD; ordem de verificações simultâneas pendente. |
| 2 Componentes | RULE-SETUP-001 | Cada jogador usa 1 God, 1 Domain e Baralho de 60 cartas. | L13-19 | CD. |
| 2 Componentes | RULE-COUNTERS-001 | D6 para +1/+1 e Damage e D20 para Latent são recomendados, não obrigatórios. | L21-25 | CD; convenção física, não dispensa estado digital. |
| 3 Estrutura | RULE-ZONES-001 | God representa jogador; Domain base/segunda cor; Baralho, Mão, Campo, Tartarus, Void, Cosmo Base, Cosmo, Latent e Soul têm as funções listadas. | L27-43 | CD. |
| 4 Construção | RULE-DECK-001 | Baralho tem exatamente 60 cartas. | L45-49 | CD. |
| 4 Construção | RULE-DECK-002 | Máximo de 4 cópias de cada carta. | L50 | CD; identidade de cópia por nome/ID/versão não formalizada. |
| 4 Construção | RULE-DECK-003 | Deck respeita a cor do God e a cor do Domain. | L51-52 | CD; combinação/identidade de cor e multicolor pendentes. |
| 4 Construção | RULE-DECK-004 | Cartas cinza são permitidas em qualquer Baralho/por qualquer God. | L53-59 | CD. |
| 4 Construção | RULE-DESIGN-001 | Cinza cobre fraquezas, faz efeitos de outras cores e é mais fraco ou mais caro. | L60-62 | CD como orientação de design; não limite executável de balanceamento. |
| 5 Tipos | RULE-TYPE-001 | God e Domain começam em jogo; Devotee, Cloth e Relic usados no próprio turno; Moment no próprio turno; Technique a qualquer momento. | L64-74 | CD; janelas e fase exata dependem de RULE-TIMING-001 e pendências. |
| 5 Beta | RULE-BETA-001 | Sanctuary, Star Hill e Coliseum são Domains na beta v0.1. | L76-80 | CD; divergência com Locais do original registrada. |
| 5 Beta | RULE-BETA-002 | Local está fora do escopo ativo da beta. | L81 | CD; regra geral de Location ausente. |
| 5 Beta | RULE-BETA-003 | Cada deck beta começa com 1 God e 1 Domain fixos. | L82 | CD. |
| 6 Setup | RULE-SETUP-002 | Escolher God/Domain, colocá-los em campo, embaralhar, comprar 7, permitir mulligan e então decidir quem começa. | L84-95 | CD; método de escolha do primeiro jogador e compra do primeiro turno pendentes. |
| 7 Mulligan | RULE-MULLIGAN-001 | Trocar qualquer quantidade da mão inicial; embaralhar as escolhidas no deck e comprar o mesmo número. | L97-105 | CD; repetição/quantidade de rodadas pendente. |
| 7 Mulligan | RULE-MULLIGAN-002 | Fazer mulligan dá +1 Latent Cosmo inicial ao oponente, independentemente da quantidade trocada. | L107-109 | CD; sequência quando ambos fazem e eventual repetição precisa explicitação. |
| 8 God | RULE-GOD-001 | God tem Soul, Attack, Awaken, passivas, Awaken Ability e Ultimate. | L111-122 | CD; valores são dados da carta, nunca inferidos globalmente. |
| 8 God | RULE-GOD-002 | God não ataca, não vira, não equipa Cloth/Relic e só causa dano ao ser atacado. | L124-130 | CD; efeitos específicos que causam dano por God precisam exceção/hierarquia explícita. |
| 8 God | RULE-COMBAT-001 | Contra God, atacante vira/Unprepared, causa seu Power ao God e recebe o Attack dele, podendo morrer. | L132-139; L369-376 | CD; timing da retaliação e Long Range contra God pendente. |
| 9 Domain | RULE-DOMAIN-001 | Começa em campo, fora do deck, sem custo; não pode ser destruído, descartado ou devolvido à mão. | L141-150 | CD. |
| 9 Domain | RULE-DOMAIN-002 | Define segunda cor e possui habilidade. | L151-152 | CD; relação com Domain comum “apenas habilita cor” requer interpretação confirmada. |
| 9 Domain | RULE-DOMAIN-003 | Comum habilita cor; Incomum tem habilidade leve; Raro tem habilidade forte 1/jogo. | L154-158 | CD textual; classe versus raridade e vocabulário Raro pendentes. |
| 9 Domain | RULE-DOMAIN-004 | Virar Domain marca uso de habilidade 1/jogo. | L160 | CD; manutenção também manda desvirar tudo, logo contador persistente de uso não está explicado. |
| 9 Beta | RULE-DOMAIN-005 | Sanctuary: Devotees controlados recebem +0/+1. | L162-164 | CD. |
| 9 Beta | RULE-DOMAIN-006 | Star Hill: início do seu turno gera 1 Latent Cosmo. | L165 | CD; ordenação com manutenção e outros efeitos de início pendente. |
| 9 Beta | RULE-DOMAIN-007 | Coliseum: 1/jogo, alvo próprio recebe +1/+0 e Pierce até fim do turno. | L166 | CD; janela da ativação pendente. |
| 10 Áreas | RULE-ZONES-002 | Baralho, Mão, Campo, Tartarus, Void, Cosmo Base, God e Domain são áreas/funções discriminadas. | L168-179 | CD; publicidade, ordem e propriedade/controle entre zonas pendentes. |
| 11 Recursos | RULE-RESOURCE-001 | Quatro recursos: Cosmo Base gera Cosmo; Cosmo paga custos; Latent é temporário; Soul é vida. | L181-190 | CD; o prompt agrupa dois principais sem revogar Cosmo/Soul. |
| 12 Base Cosmo | RULE-COSMO-001 | Uma vez por turno, na Principal, colocar 1 carta da mão virada para baixo na área Base. | L192-196 | CD; entrada utilizável imediata não explicitada. |
| 12 Base Cosmo | RULE-COSMO-002 | Só carta com símbolo de Base pode ser Base, salvo habilidade. | L198 | CD; PROMPT L131-137 chama isso Cosmoble Yes/No. |
| 12 Base Cosmo | RULE-COSMO-003 | Virar 1 Base gera 1 Cosmo; permanece virada até próxima manutenção própria. | L200-203 | CD; janela, resposta e esvaziamento da pool pendentes. |
| 12 Base Cosmo | RULE-COSMO-004 | Bases próprias desviram na manutenção própria. | L205-207 | CD. |
| 13 Latent | RULE-LATENT-001 | Cada vez que Devotee próprio recebe dano no turno adversário, ganha 1 Latent. | L209-217 | CD; dano zero/prevenido, múltiplos alvos/eventos e morte imediata pendentes. |
| 13 Latent | RULE-LATENT-002 | Latent pode ser gasto como Cosmo normal. | L219-221 | CD; não decide se paga custo explicitamente Base Cosmo. |
| 13 Latent | RULE-LATENT-003 | Latent desaparece no fim do próprio turno. | L222 | CD; conflito de escopo com “todo Latent” no fim do turno, L348. |
| 14 Soul | RULE-SOUL-001 | Soul é vida e pode ser pago como custo de habilidade. | L224-230 | CD; pagar até 0/impedir pagamento letal e ordem de morte pendentes. |
| 15 Devotees | RULE-DEVOTEE-001 | Unidades têm custo, Power, Resistance, habilidades e keywords. | L232-242 | CD. |
| 15 Devotees | RULE-DEVOTEE-002 | Podem atacar Devotees/God inimigos, equipar Cloth/Relic e usar habilidades. | L244-250 | CD. |
| 15 Devotees | RULE-PREPARED-001 | Entrar em combate vira e deixa Unprepared. | L252-257 | CD; conflita potencialmente com §22 que só vira atacante e com Nimble/bloqueio. |
| 15 Devotees | RULE-PREPARED-002 | Unprepared não ataca novamente no mesmo turno. | L259 | CD; definição completa de Prepared, entrada e custo Tap ausente. |
| 16 Relics | RULE-RELIC-001 | Permanecem em campo; podem ser equipamentos ou artefatos de efeito contínuo. | L261-268 | CD; engine de efeitos contínuos não formalizada. |
| 16 Relics | RULE-RELIC-002 | Não são destruídas com portador e permanecem em campo. | L270-273 | CD; mudança de controle/estado ao perder portador não formalizada. |
| 16 Relics | RULE-RELIC-003 | Só saem do campo se destruídas; quando destruídas vão ao Void. | L274-275 | CD; contradiz bounce de Relics em cartas recuperadas, requer regra de exceção. |
| 16 Relics | RULE-EQUIP-001 | Devotee pode ter várias Relíquias. | L277 | CD; limite de Cloth é específico (§17). |
| 17 Cloths | RULE-CLOTH-001 | Devotee pode equipar apenas 1 Cloth. | L279-281 | CD; extensão para Scale/Kamui e troca de Cloth pendentes. |
| 17 Cloths | RULE-CLOTH-002 | Cloth permanece em campo quando o portador morre. | L283 | CD. |
| 17 Cloths | RULE-CLOTH-003 | Cada Cloth tem Damage; morte do portador coloca marcadores iguais a esse valor. | L285-291 | CD; casos com múltiplas mortes e substituição de destruição pendentes. |
| 17 Cloths | RULE-CLOTH-004 | Com Damage, não equipa, não concede bônus e não usa habilidades. | L293-297 | CD; efeitos desencadeados/passivos de fonte danificada precisam formalização. |
| 17 Cloths | RULE-CLOTH-005 | Na manutenção remove 1 Damage de cada Cloth; sem Damage volta a poder equipar. | L299-305 | CD; escopo controlador e ordem de efeitos pendentes. |
| 18 Turno | RULE-TURN-001 | Três fases: Manutenção → Principal → Fim do Turno. | L307-315 | CD; Draw/Combat nas notas de UX não viram fases oficiais. |
| 19 Manutenção | RULE-UPKEEP-001 | Desvirar cartas e Bases, remover efeitos temporários, curar 1 Damage de cada Cloth e resolver efeitos de manutenção. | L317-325 | CD; ordem e quais efeitos “temporários” expiram aqui pendentes. |
| 20 Principal | RULE-MAIN-001 | Em qualquer ordem: compra do turno, Base, geração de Cosmo, cartas, habilidades/Awaken e ataques. | L327-342 | CD; resumo sequencial e notas com Draw separado divergem. |
| 21 Fim | RULE-END-001 | Todo Latent desaparece no fim do turno. | L344-348 | CD textual; controlador versus ambos pendente frente a §13. |
| 21 Fim | RULE-END-002 | Efeitos “até fim do turno” terminam. | L349 | CD. |
| 21 Fim | RULE-END-003 | Todos os Devotees recuperam toda Resistance; dano não é permanente; turno passa. | L350-356 | CD; dano pode acumular dentro do turno? frase L356 precisa esclarecimento. |
| 22 Combate | RULE-COMBAT-002 | Atacante vira; Long Range causa primeiro; ambos causam seu Power; Resistance 0 mata e envia ao Tartarus. | L358-367 | CD; simultaneidade sem Long Range e ambos com Long Range pendentes. |
| 22 Combate | RULE-COMBAT-003 | Combate contra God repete RULE-COMBAT-001. | L369-376 | CD; referência duplicada preservada, não nova regra. |
| 23 Moment | RULE-TIMING-001 | Moment apenas no próprio turno; vai ao Tartarus após resolver. | L378-383 | CD; “sorcery speed” não formaliza principal/pilha vazia sozinho. |
| 23 Technique | RULE-TIMING-002 | Technique a qualquer momento, combate/turno adversário/resposta; após resolver vai ao Tartarus. | L385-391 | CD; “qualquer” continua sujeito a janela que precisa formalização. |
| 23 Resposta | RULE-PRIORITY-001 | Ataque declarado/carta jogada/habilidade usada dá resposta de Technique ao oponente; Technique resolve primeiro. | L393-403 | CD; cadeia de respostas, passes e habilidades acionáveis pendentes. |
| 24 Keywords | RULE-KEYWORD-001 | Guardian deve ser atacado antes do God. | L405-409 | CD; múltiplos Guardians, exceções e relação com Nimble pendentes. |
| 24 Keywords | RULE-KEYWORD-002 | Nimble só pode ser bloqueado por Nimble ou Guardian. | L410 | CD textual; “bloqueado” não tem procedimento no combate atual. |
| 24 Keywords | RULE-KEYWORD-003 | Cheater ignora Guardian. | L411 | CD. |
| 24 Keywords | RULE-KEYWORD-004 | Long Range causa dano primeiro. | L412 | CD; interação com dois Long Range/retaliação pendente. |
| 24 Keywords | RULE-KEYWORD-005 | Pierce manda dano excedente ao God. | L413 | CD; cálculo do excedente/efeitos de prevenção/qual God pendentes. |
| 24 Keywords | RULE-KEYWORD-006 | Impulse pode agir no turno de entrada. | L414 | CD; comportamento padrão de quem não tem Impulse não está explicitamente definido. |
| 24 Keywords | RULE-KEYWORD-007 | Sealed não pode atacar nem usar habilidades. | L415 | CD; Seal counter não é definido como Sealed nem tem ciclo de remoção. |
| 24 Keywords | RULE-KEYWORD-008 | Unfaith remove Latent, ou troca ataque ao Soul por remoção de Latent. | L416 | CD como texto recuperado; duas formulações alternativas, quantidade e combate não resolvidos. |
| 25 Unicidade | RULE-UNIQUE-001 | Devotees e Relíquias têm no máximo 1 com o mesmo nome em campo; cartas cinza são exceção. | L418-428 | CD; escopo por jogador/global e identidade por personagem/versão pendentes. |
| 25 Unicidade | RULE-UNIQUE-002 | Ao jogar duplicata, ETB acontece, escolhe a que fica e outra vai ao Tartarus. | L422-426 | CD; ordenação ETB/estado/resposta e conflito Relic→Void pendentes. |
| 26 Evolução | RULE-EVOLUTION-001 | Jogar Devotee de mesmo nome de um próprio em campo reduz custo em 2 Cosmo. | L430-436 | CD; piso 0, tipos de custo, múltiplas cópias e herança de estado pendentes. |
| 27 Awaken | RULE-AWAKEN-001 | Ao Soul chegar ao valor Awaken ou abaixo, desperta automaticamente, sem impedimento, até fim do jogo, liberando habilidades. | L438-454 | CD; timing da checagem frente a dano/Soul 0 e cura posterior pendente. |
| 28 Ultimate | RULE-ULTIMATE-001 | Cada God tem Ultimate, utilizável 1 vez por jogo. | L456-460 | CD; custo é da carta, janela e interação com Awaken pendentes. |
| 28 Ultimate | RULE-DESIGN-002 | Ultimate tem custo alto e normalmente muda o jogo. | L461-462 | CD como orientação de design, não valor default de custo. |
| 29 Vitória | RULE-WIN-003 | Reitera Soul 0 e tentativa de compra sem Baralho. | L464-469 | CD; referências RULE-WIN-001/002. |
| 30 Facções | RULE-FACTION-001 | Athena defesa; Poseidon controle; Ares agressivo; Hades cemitério; Artemis ramp. | L471-479 | CD como identidade de design; não efeito ou restrição executável automática. |
| 31 Duração | RULE-META-001 | Duração esperada 15–25 minutos. | L481-485 | CD como meta de playtest; não relógio/derrota por tempo. |
| 32 Resumo | RULE-TURN-002 | Resumo lista manutenção, compra, Base, cartas, combate, fim. | L487-494 | CD como resumo; ordem obrigatória conflita com “qualquer ordem” de §20 e precisa explicitação. |
| Conclusão | RULE-META-002 | Lista sistemas existentes e chama jogo completo/jogável. | L496-513 | CD como declaração editorial; não prova de completude de regras/testes. |
| Próximo passo | RULE-ROADMAP-001 | Balancear stats/keywords, criar comuns/Cloths/Técnicas/Moments e playtest. | L515-527 | CD como backlog; nenhuma proposta vira carta ou regra por esta lista. |

## Comparação com o documento original recuperado do Drive

Fonte preservada: `docs/auditoria-2026-10-22/fontes/drive-rules-original.txt` (adiante **ORIGINAL**). O manual está em L1-687; a grade de set em L689-980; Athena, decks e Poseidon vêm depois.

Os 32 títulos e os enunciados centrais do manual original foram comparados com o guia local. Não foi identificada mudança material nas regras gerais, além das adições explícitas de escopo/domains da beta nos §§5 e 9. Formatação, acentuação e a redação defeituosa de Unfaith foram normalizadas; o significado ambíguo de Unfaith permanece. O original tampouco contém procedimento global de Seal counter, remoção de Seal, pilha completa, evolução de estado ou pagamento Base Cosmo.

| Bloco do original | Linhas ORIGINAL | Correspondência local | Resultado |
| --- | --- | --- | --- |
| §§1–7 Objetivo, componentes, estrutura, deck, tipos, setup, mulligan | L8-152 | guia L7-109 | Mesmas regras gerais; guia acrescenta escopo beta e esclarece independência da quantidade trocada no +1 Latent. |
| §§8–14 God, Domain, zonas e recursos | L154-298 | guia L111-230 | Mesmos enunciados; guia acrescenta os três Domains oficiais e sua habilidade. |
| §§15–21 Devotees, Relics, Cloths e fases | L300-456 | guia L232-356 | Mesmos enunciados; mesmas lacunas de Prepared, equip e Latent. |
| §§22–26 Combate, timing, keywords, unicidade e evolução | L458-558 | guia L358-436 | Mesmos enunciados; Nimble ainda usa bloqueio, Unfaith mantém alternativa sem regra formal. |
| §§27–32 Awaken, Ultimate, vitória, facções e resumo | L560-636 | guia L438-494 | Mesmos enunciados; Draw continua dentro de Principal no texto detalhado e separado no resumo. |
| Conclusão e próximo passo | L638-687 | guia L496-527 | Conteúdo editorial preservado. |
| Grade de 400 cartas | L689-980 | Não incorporada ao guia | Material de planejamento, com frases “Eu recomendo”/“Eu faria” (L718, L839-840). Recuperar como proposta/histórico, não aprovação automática de set. |
| Locais Athena | L1589-1613 | guia L80-82, L164-166; beta L44-62 | Divergência concreta de tipo, custo e Coliseum; ver CONFLICT-001. |
| Cloths Athena | L1262-1342 | guia §§16–17; PROMPT L159-173 | Evidenciam equip grátis ao personagem “at any time” e Resonance. O manual ainda não formaliza o mecanismo global. |
| Scales finais | L2206-2341 | Ausentes como subtipo/regra global no guia | Textos condicionam Resonance ao personagem, equip grátis e Damage 3; não definem se limite/dano/manutenção de Cloth se aplicam a Scale. |

O ORIGINAL contém checkmarks em alguns nomes e o rótulo “VERSÃO FINAL” nas Scales. Esses sinais são metadados textuais recuperados; **não equivalem a autorização verificável para marcar cartas APPROVED**. Preservar origem e revisão humana conforme PROMPT L234-250.

## Conflitos e lacunas para decisão do criador

| ID | Evidência | Questão / impacto |
| --- | --- | --- |
| CONFLICT-001 Domain versus Local | ORIGINAL L1589-1613: Sanctuary Local custo 3 Common/Cosmoble Yes; Star Hill Local custo 2 Uncommon/Yes; Coliseu Local custo 2 Uncommon/Yes e bônus ao entrar em combate. Guia L80-82 e L145-166: mesmos nomes são Domain fixo, fora do deck, sem custo; Coliseum passa a 1/jogo, alvo +1/+0/Pierce. Beta L44-68 confirma normalização. | A versão atual do guia prevalece na beta, mas é necessário decidir se Local antigo foi substituído, coexistirá com ID distinto ou fica deprecated. Não sobrescrever recuperado. Changelog não registra esta alteração separadamente. |
| CONFLICT-002 Vocabulário de raridade | PROMPT L117-122 e UI `card-forge/index.html:53-56`: Common/Uncommon/Mythic/Divine; guia L154-158 e ORIGINAL L213-219 usam Comum/Incomum/Raro para Domain. ORIGINAL L690-715 tira Gods/Domains/Locais da raridade normal; L717-740 propõe as quatro raridades. | “Raro” no Domain é classe de habilidade, raridade antiga ou deve mapear para Mythic? O original de grade favorece a distinção estrutural, mas não aprova o mapeamento. Não converter automaticamente. |
| CONFLICT-003 Seal counter sem semântica global | PROMPT L147-155 exige “Put a Seal counter on target Devotee” e diz que consequências já existem. Guia só define Sealed “não ataca/usa habilidades” (L415). ORIGINAL L532-535 repete isso, enquanto cartas Hyoga/Camus/Seal of Athena usam counters (L1044-1047, L1173-1176, L1451-1456). Modelo de lote usa “gains Sealed until your next turn” (`card-forge/import/modelo.txt:26-27`). | Confirmar equivalência counter→Sealed, duração, remoção em manutenção/virar/preparar/efeito, múltiplos counters, perda ao trocar zona e relação com estado Prepared. A fórmula oficial de texto é DP atual; ela não cria as consequências ausentes. |
| CONFLICT-004 Prioridade incompleta | Guia L393-403 só concede resposta de Technique ao oponente e a faz resolver primeiro. UX L103-125 propõe pilha LIFO, auto-pass, timer, segurar prioridade. REA engine L194-204 reconhece que não recuperou StackResolver e proíbe importar regras de Magic. | Definir detentor inicial, respostas a respostas, passes, resolução, reabertura, alvos inválidos, habilidades ativadas/desencadeadas durante resposta e custos. Timer/auto-pass da UX não é regra oficial. |
| CONFLICT-005 Turno e compra | Guia L307-315 tem 3 fases; L329-342 permite compra do turno em qualquer ordem na Principal. Resumo L489-494 lista compra/Base/cartas/combate em sequência. REA engine L169-172 fala Upkeep→Draw→Main→End; UX L128 trata Combat como subestado. | Confirmar se Draw é passo obrigatório separado ou ação da Main; se compra pode ser adiada e o primeiro jogador compra; manter fases e estados visuais distintos. |
| CONFLICT-006 Latent e pool | Guia L222: some no fim do seu turno; L348: “todo Latent” some no fim do turno. ORIGINAL repete L287 e L442. Manual gera Cosmo por Base mas não define a validade da pool; UX L79-84/REA L189-192 escolhem ordem Latent→Pool→Base. | Confirmar quais jogadores perdem Latent em cada fim e quando Cosmo comum expira; momento de gerar/spender; se auto-pay é preferência da UI; sem regra default inventada. |
| CONFLICT-007 Unicidade: escopo e descarte | Guia L420-428: uma por mesmo nome em campo, Devotees/Relics, ETB antes da escolha, outra Tartarus, cinza excluída. Guia L275: Relic destruída vai ao Void. PROMPT L115 menciona Devotees “lendários”. | Confirmar por controlador versus mesa inteira, nome completo versus personagem, aplicação a todas as Relics/Cloths/Scales e se enviar a duplicata é destruição. Não restringir ao subtipo lendário só por inferência do prompt. |
| CONFLICT-008 Evolução | Guia L432-434/ORIGINAL L552-558 reduzem 2 Cosmo ao jogar Devotee com mesmo nome de um próprio em campo. | Confirmar piso de custo, custo em Base, stacking, descontos adicionais, identidade entre versões, ETB, estado/marcadores/equip transferidos e como interage com unicidade. “Evolução” não implica transformação/herança não escrita. |
| CONFLICT-009 Resonance e equip | PROMPT L159-173 permite equip não ressonante com bônus geral e exige condição pelo personagem; ORIGINAL Cloths L1268-1342 e Scales L2223-2337 dão suporte textual, inclusive equip grátis “at any time”. Guia L277-305 só formaliza múltiplas Relics, uma Cloth e Damage. | DP atual confirma separação bônus/Resonance; faltam regra de ativação/equip, quem é sujeito de Tap, janela de “at any time”, troca/desanexar, controle e identidade do personagem. “At any time” não resolve prioridade sozinho. |
| CONFLICT-010 Scales e Damage | ORIGINAL L2211-2233, L2238-2260, L2265-2287, L2292-2314 e L2319-2341 tipam Relic—Scale com Equip 2/Damage 3. Guia §17 só nomeia Cloth. | Confirmar se Scale usa limite 1, dano na morte, recuperação e bloqueio por Damage de Cloth. Não aplicar por analogia antes da decisão. |
| CONFLICT-011 Relic só sai destruída versus bounce | Guia L274 diz só sai se destruída; ORIGINAL Chrysaor Scale L2327/L2337 devolve Relic à mão; Libra Cloth destrói Relic L1288. | Formalizar exceções de texto de carta às regras e diferença entre destruir, devolver, exilar, sacrificar/enviar. A precedência atual manual>carta exige expor o conflito, não ajustar silenciosamente texto ou manual. |
| CONFLICT-012 Nimble, bloqueio e combate | Guia L410 “bloqueado”; §22 L362-367 é ataque direto a Devotee. UX L30-33 diz sem bloqueio e marca Nimble como “regra a confirmar”. ORIGINAL Sagittarius Cloth L1268 diz “can block Nimble”. | Escolher interpretação formal: elegibilidade de alvo versus bloqueadores; interação Guardian/Cheater/Nimble. Não portar Magic. |
| CONFLICT-013 Virar defensor e Prepared | Guia L254-259 diz todo Devotee que entra em combate vira/Unprepared; L364 só explicita atacante. Impulse L414 permite agir ao entrar, sem regra padrão de entrada. ORIGINAL repete ambos L324-332 e L460-468. | Definir estado de entrada, preparação, defensor que revida, limite de ataques, reação a Prepare e custos de Tap; distinguir virado, Unprepared e Sealed. |
| CONFLICT-014 Domain 1/jogo e manutenção | Guia L160 usa virar para marcar; L321 manda desvirar todas as cartas. | Confirmar persistência do uso após desvirar e se Domain fica virado permanentemente ou usa contador próprio. |
| CONFLICT-015 Timing de Damage, morte e Awaken | Guia L365-367, L375-376 e L442-454 não dão ordem de checagens, substituições ou simultaneidade. | Confirmar dois Long Range, retorno do God, prevenção, dano suficiente, Awaken ao cruzar e simultâneo Soul 0, ETB e morte. |
| CONFLICT-016 Unfaith | Guia L416/ORIGINAL L535 preservam “remove Latent, ou ... em vez de Soul”. | Confirmar modo único/alternativo, quantidade removida (Power?), revidar do God, Latent insuficiente e destino de excedente/Pierce. |
| CONFLICT-017 Tokens e regras gerais de efeitos | PROMPT L80-89 pede Tokens, contínuos e habilidades; ORIGINAL Scylla cria Beast Devotee token L2300/L2310, sem stats nessa cláusula. Guia não define token, camadas, replacement effects, controle/dono, perda de alvo ou efeito sem alvo. | Registrar componentes e parâmetros a decidir. Não atribuir token stats ou parser de texto livre como regra executável. |
| CONFLICT-018 Original conhecido versus histórico não disponível | PROMPT L826 e L864 exige verificar fontes conhecidas e fornecer conversas/textos. Drive fornece documento original, mas a coleção completa de aprovações de conversas ainda não foi apresentada. | Recuperação documental cobre o arquivo encontrado e o repositório; não demonstrar que todas as últimas decisões históricas foram recuperadas. |

## Diretrizes do prompt já verificáveis e itens ainda sem formalização

- **Concordantes com manual:** deck 60/4 cópias, Domain fora do deck, Cosmoble como condição de Base, Technique responsiva e Moment no próprio turno; custos e números permanecem os recuperados, sem inventar valores.
- **Diretrizes expressas atuais a registrar futuramente:** raridades Common/Uncommon/Mythic/Divine; texto canônico Seal; equipamentos não ressonantes recebem bônus geral; Resonance depende do personagem; equip grátis não deve ser reduzido só ao ETB; ordem de habilidades ETB→bônus→geral→equip→Resonance→Damage (PROMPT L117-192). Não migrar cartas automaticamente durante auditoria.
- **Solicitações de sistema, não regras de jogo existentes:** IDs e versão por regra, banco com estado/histórico, status RECOVERED/DRAFT/REVIEW/APPROVED/DEPRECATED/NEEDS_VERIFICATION, importações, motor determinístico, replays e testes. A auditoria não cria garantia de execução desses recursos.
- **Original com proposta separada:** grade de 400 cartas e proporções das raridades são recuperáveis, mas linguagem “Eu recomendo/Eu faria” exige mantê-las como proposta, não lista de 400 cartas efetivamente desenvolvidas.

## Perguntas prioritárias, sem decisão implícita

1. Seal counter torna o Devotee Sealed? Quando e como cada counter sai? Preparar/virar interfere?
2. Quais são as janelas e a cadeia completa de prioridade/respostas? Habilidades também respondem ou só Techniques?
3. Latent expira só para o jogador ativo? Quando a pool de Cosmo esvazia e como Base Cosmo como unidade de custo difere de Cosmo normal?
4. Unicidade é por jogador? Como determina mesmo nome/personagem? Qual destino de Relic duplicada e qual interação com evolução?
5. O desconto de evolução tem piso 0, vale para Base e preserva quais estados/equipamentos?
6. Sanctuary/Star Hill/Coliseum substituem os antigos Locais ou coexistirão? Raro de Domain é classe ou raridade?
7. Scales seguem integralmente limites/dano/recuperação de Cloth? Qual a regra global de equip e de “at any time”?
8. Nimble restringe alvo ou existe bloqueio? Defensor vira? Como Prepared, Unprepared, Tap e Impulse se relacionam?
9. Qual a ordem de checagem de morte, Soul 0, Awaken, ETB e replacement effects?
10. Quais parâmetros e persistência de tokens/contínuos/controle de cartas devem entrar no Rulebook?

## Evidência de execução recebida da frente principal

A outra frente alterava `playtest/` durante a auditoria; esta auditoria de regras não corrigiu esses arquivos. A frente principal preservou `docs/auditoria-2026-10-22/fontes/engine-snapshot.js.txt` com SHA-256 `94343e2f87e1efcca1b7b562fc71a25a3d03b68fe38d571684fc3552d4ff61d6` e a suíte em `test-rules-snapshot.mjs.txt` para fixar a evidência.

Resultados comunicados pela frente principal para essa cópia: modo padrão **34 passam / 2 pendentes**; modo estrito **35 passam / 1 falha (Nimble)**. Baseline legado `HEAD 6b9`: **29 passam / 7 pendentes**. A falha anterior de Long Range em equipamento passou na cópia posterior, por isso não deve ser apresentada como falha atual nem como correção feita por esta auditoria. A divergência Nimble continua ligada a CONFLICT-012 e depende de esclarecer o manual.

Segundo a inspeção da frente principal, a engine usa `Math.random` no shuffle, timers e closures em `stack.resolve`; isso não demonstra replay determinístico completo exigido pelo prompt. Testes técnicos não aprovam cartas nem certificam balanceamento (PROMPT L509-511). Estes resultados têm escopo da cópia preservada, não de um arquivo vivo que segue mudando.

## Escopo do trabalho efetuado

Foram lidos os documentos do manifesto Graphify, o prompt mestre e a fonte original recuperada do Drive. Foram escritos somente o fragmento semântico `graphify-out/.graphify_chunk_01.json` e este relatório temporário. Não foi iniciada engine, não houve edição do manual, de `data/cards.json`, nem de `FRAMES/`, `ARTS/`, `CARDS/` ou `playtest/`. O relatório não autoriza gravação de cartas, publicação ou merge.

## Adendo — mudança concorrente de Nimble

Após a leitura inicial, outra frente alterou `docs/guia-do-jogo.md:410` para Nimble só poder ser atacado por Nimble, Guardian ou exceção escrita na carta; `docs/ux-arena-rea.md` declara confirmação do autor em 22/10/2026. O contrato do commit inicial permanece preservado em `fontes/guia-local-6b9b19d.md`, e a mudança está em `fontes/guia-local-arvore.md`. CONFLICT-012 registra a divergência histórica e deixa de representar uma pergunta sem resposta na árvore atual. Esta auditoria não implementou a alteração e não substitui a verificação/changelog da outra frente. Os resultados de testes acima correspondem ao snapshot preservado, anterior ao fechamento dessa implementação.

## Adendo final — decisão posterior substitui a interpretação intermediária

O manual e o changelog foram novamente atualizados pela frente concorrente. No estado preservado em `fontes/guia-local-fechamento.md` e `fontes/changelog-local-fechamento.md`: **Guardian exige escolher um Guardian antes do God ou de outros Devotees; somente Nimble ignora essa exigência. Nimble pode ser atacado normalmente. Cheater não ignora Guardian.** A interpretação defensiva de Nimble registrada no adendo anterior foi explicitamente substituída. Novo efeito anti-Long Range de Cheater permanece apenas como proposta em `fontes/keyword-matchups-fechamento.md`.

A tabela de 81 enunciados mantém o snapshot inicial para auditoria histórica; estes enunciados de keyword prevalecem no fechamento. O artefato STAR HILL mostra as três definições atualizadas. A antiga falha do cenário Nimble usa uma expectativa superada e não deve ser usada para afirmar defeito na engine final da outra frente. Não foi preciso pedir ao autor para aprovar novamente a mesma decisão.
