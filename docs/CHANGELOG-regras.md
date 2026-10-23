# Changelog de regras

Toda mudança em `docs/guia-do-jogo.md` entra aqui, mais recente no topo.

Formato: `AAAA-MM-DD — Seção — antes → depois — motivo — pendências (cartas/engine/UI)`

## 2026-10-23 — Seções 11, 18 e 58 — Assumir o confronto para proteger o God

- **Antes:** a implementação anterior mantinha o vínculo com o God e acrescentava um vínculo excepcional, apenas contra Unprepared. Isso não fazia o Devotee assumir a ameaça ao God.
- **Depois:** um Devotee pode assumir o confronto de um inimigo ligado ao seu God, Prepared ou Unprepared. Ao resolver, o vínculo inimigo–God é substituído por inimigo–Devotee; não há vaga extra. Engage inicial mantém 1 AÇÃO / 0 ENG, e uma troca mantém 1 AÇÃO / 1 ENG. Revalidar a legalidade e manter a substituição atômica preserva os vínculos em caso de falha ou anulação. Os outros inimigos continuam engajados com o God.
- **Motivo:** esclarecimento explícito do autor: Shion precisa poder “tankar” um dos inimigos que atacam seu God. A entrada anterior descreve a interpretação substituída e permanece apenas como histórico.
- **Engine/UI:** alvos, resolução, efeitos de troca, IA, guia, ajuda, inspetor e histórico seguem a substituição. Guardian mantém a intercepção normal por capacidade; a proteção ativa não exige a keyword.
- **Cartas:** nenhuma alteração em `data/cards.json`. Validação local e sem publicação remota.

## 2026-10-23 — Seções 11, 18 e 58 — Engage contra Unprepared vinculado a God

- **Antes:** Prepared não restringia quem recebia Engage, mas um Devotee com sua capacidade ocupada não recebia um novo vínculo, inclusive quando Unprepared e engajado com um God.
- **Depois:** alvo Unprepared vinculado a um God pode receber um confronto adicional de Devotee, além da capacidade normal/Multiguard. O vínculo com o God permanece; preparar depois preserva os vínculos. Uma vaga adicional por Devotee, identificada no vínculo; troca preserva a vaga enquanto houver vínculo com God, e seu encerramento reaplica os limites normais. A condição inicial é revalidada na resolução e também serve à intercepção de Guardian.
- **Motivo:** pedido do autor para permitir Engage contra Devotee virado, seguido da confirmação: “se ele tiver engajado com um deus sim”. Os procedimentos de persistência e capacidade tornam essa exceção consistente com os demais vínculos.
- **Cartas:** nenhuma alteração em `data/cards.json`.
- **Engine/UI:** filtro de alvos, resolução, efeitos de troca, capacidade, Guardian, guia e ajuda acompanham a exceção. IA utiliza o mesmo filtro de alvos e intercepção. Validação local por cenários e navegador; sem publicação remota.

## 2026-10-23 — Primeiro conjunto, hierarquia e token de vantagem

- **Tipos e slots:** autor confirmou Support como permanente de apoio e um único slot de armadura para Cloth, Scale, Surplice e Warplate; armas/acessórios permanecem separados. Guia §§3 e 61 atualizado; catálogo/importador/editor/motor integrados.
- **SST-03-010:** autor escolheu comprar uma carta e exilar a própria carta do Tartarus para Void, corrigindo o destino inválido no rascunho. Texto original preservado na proveniência.
- **Catálogo:** diff `docs/importacao-300-cartas/cards.diff` aprovado explicitamente e gravado: 57 → 357, sem alterar os 57 registros anteriores.
- **Apresentação:** hierarquia obrigatória compartilhada entre impressão e jogo; custo de jogar separado de EQUIP, com headings claros para Owners, Resonance e evolução. Cosméticos não mudam regras.
- **HUD:** pedido do autor implementado com token de vantagem que identifica a iniciativa da rodada; AÇÃO e prioridade têm indicadores distintos. Aparências, sleeves e emotes textuais locais.
- **Verificação:** engine 2.0, IA, arena e Card Forge integrados localmente; cenários e limites em `validacao-rulebook-2.0.md`. Sem deploy remoto.

## 2026-10-23 — Fechamento do 2.0 — aplicação aprovada

- **Antes:** timing, compras, keywords, equipamentos, despertar e construção ainda tinham lacunas no livro recebido.
- **Depois:** recomendações de `proposta-fechamento-rulebook-2.0.md` aprovadas pelo autor e incorporadas ao capítulo XII do guia. Incluem 2 compras por rodada desde a segunda, iniciativa alternada, passes e pilha distintos, Guardian por capacidade, textos das keywords, Latent limitado a 3, procedimentos de equipamentos, limites de evolução/retorno/Ultimate e construção/mulligan.
- **Motivo:** autorização explícita do autor: “pode aplicar isso no sistema do jogo e modificar todo o jogo”.
- **Implementação:** migração local integrada após a aprovação do catálogo de 357 cartas. Limitações reais, cobertura e referências estão em `implementacao-rulebook-2.0.md` e `validacao-rulebook-2.0.md`.
- **Escopo:** alteração local de `playtest/` autorizada; originais de arte e planilha preservados. Sem publicação remota nesta autorização.

## 2026-10-23 — Livro completo — Rulebook 2.0

- **Antes:** Vanilla 1.0, com turnos completos, ataques diretos, Resistance restaurada no fim do turno, Damage nas Cloths e Awaken geral dos Gods.
- **Depois:** substituição integral pelo livro 2.0 enviado pelo autor: rodadas com AÇÕES alternadas, Engage persistente, Strike separado, ENG compartilhado, HP e dano persistente; evolução vinculada a Cloth + Owner, Resonance distinta de Owner, Awaken próprio de Devotees e Afterlife universal para Devotees no Tartarus. Long Range concede precedência de dano apenas ao iniciar Strike. A vitória por Soul inclui empate quando ambos os Gods chegam a zero simultaneamente.
- **Motivo:** decisão do autor de reformular o livro e atualizar o jogo, seguida do fornecimento do Rulebook 2.0 neste chat. O texto foi preservado; apenas a hierarquia de títulos e os separadores receberam marcação Markdown.
- **Status:** versão-base para playtest e implementação. Os parâmetros experimentais continuam experimentais, incluindo 3 ENG por God/rodada e uma evolução por Cloth/rodada. Timing, Guardian, várias keywords, equipamentos e construção de decks têm pendências explícitas; a omissão de uma regra antiga não autoriza presumir sua continuidade nem sua remoção mecânica.
- **Pendências — cartas:** aguardar o novo conjunto que o autor enviará; comparar por identidade, revisar campos e apresentar diff antes de qualquer gravação em `data/cards.json`.
- **Pendências — engine/UI/Card Forge:** implementação ainda anterior ao 2.0. Nenhum comportamento de jogo, catálogo, template ou importador foi alterado nesta etapa documental. Impactos, lacunas e verificações futuras estão em `migracao-rulebook-2.0.md`.
- **Histórico:** a Vanilla 1.0 continua recuperável pelo Git no commit `e33dcd2494baccd8303e955966f9e85fdc7fd2cc`. As entradas abaixo descrevem decisões daquela versão e não resolvem automaticamente as pendências do novo livro.

## 2026-10-22 — Seção 24 — Guardian, Nimble e Cheater

- **Antes:** Guardian precisava ser atacado antes do Deus; Nimble usava linguagem de bloqueio; Cheater ignorava Guardian.
- **Depois:** Guardian exige escolher um Guardian antes do Deus ou de outros Devotees. Somente Nimble ignora essa exigência. Nimble pode ser atacado normalmente; Cheater não atravessa Guardian.
- **Motivo:** correção e confirmação explícitas do autor nesta conversa. A interpretação defensiva de Nimble discutida antes foi substituída pela decisão final acima.
- **Engine/UI:** filtro de alvos, escolhas, realce de Guardian e aviso de passagem Nimble atualizados; testes cobrem A/B, múltiplos Guardians e keywords de equipamentos/efeitos temporários.
- **Pendências:** texto antigo de Sanctuary Archer dizendo que pode atacar Nimble ficou redundante, mas não contradiz a permissão atual. Novo efeito para Cheater permanece apenas como proposta em `keyword-matchups.md`; não foi aplicado.

## 2026-10-22 — Vanilla 1.0

Base oficial: `docs/guia-do-jogo.md` vira a fonte da verdade das regras do projeto.
