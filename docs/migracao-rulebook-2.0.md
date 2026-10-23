# Rulebook 2.0 — compreensão e preparação da migração

Registro de 23/10/2026. A fonte normativa é [guia-do-jogo.md](guia-do-jogo.md), integralmente substituído pelo livro fornecido pelo autor. Este documento organiza a leitura e os impactos; não completa regras pendentes nem define novos valores de cartas.

## Origem e estado

- Fonte recebida: anexo `Texto colado.txt`, com título “SAINT SEIYA TCG — OFFICIAL RULEBOOK — VERSION 2.0”, 12 capítulos e 54 seções numeradas.
- SHA-256 do anexo: `1c955405a1aade05053135a778b6ad0988c9d8053a9de285b3b6439feadcfd50`.
- O texto do livro foi preservado. A adaptação ao Markdown limita-se a títulos e separadores.
- O livro se declara versão-base para playtest e implementação; não é um regulamento de torneio concluído.
- A engine, o catálogo, a beta, os testes e o Card Forge existentes ainda refletem a versão anterior. Esta etapa registra documentação; a próxima entrada esperada são as novas cartas do autor.
- O grafo existente serviu para localizar pontos de leitura, mas está marcado como desatualizado. As referências abaixo foram verificadas diretamente nos arquivos atuais; o grafo não foi usado para definir a regra 2.0.

## O funcionamento que o livro estabelece

| Tema | Regra do 2.0 | Consequência para a migração |
| --- | --- | --- |
| Objetivo e setup | 1 God e 1 Domain começam fora do deck de 60 cartas; mão inicial de 7. Soul zero derrota; zero simultâneo dos dois Gods empata, salvo efeito específico (§§1–2). | Separar derrota de um jogador e resolução de derrota simultânea. Construção, mulligan e compras ainda têm lacunas. |
| Rodada | Renovar Cosmo e ENG, preparar Devotees elegíveis, resolver início, alternar AÇÕES e encerrar (§§7–8). | O fluxo anterior de turnos completos precisa ser substituído. Timing e prioridade ainda precisam ser fechados. |
| Cosmo Base | Apenas Cosmoble normalmente pode virar Base; uma colocação por rodada não consome AÇÃO; a carta deixa de funcionar como sua forma original nessa zona (§§4–6). | Rastrear o limite por jogador/rodada e a zona. A oportunidade exata de colocação está pendente. |
| Engage inicial | Um Devotee livre estabelece vínculo com alvo válido usando 1 AÇÃO e 0 ENG; não exige nem altera Prepared (§§10–11). | Engage é uma relação de estado distinta de dano e da ação Strike. |
| Persistência de Engage | O vínculo permanece após Strike, Unprepared e mudança de rodada. Termina se um participante deixa o campo (§§12–13). | Manter vínculos por instância e liberar o sobrevivente quando o oponente sai. Strike deve respeitar o alvo vinculado. |
| Troca e Disengage | Cada um custa 1 AÇÃO + 1 ENG; trocar encerra o vínculo anterior e estabelece outro válido; nenhum exige Prepared (§§14–16). | Validar ação, recurso compartilhado e alvo antes de efetivar a mudança. O ENG experimental é 3 por God/rodada, sem acumular sobras. |
| Capacidade de Engage | Um Devotee normalmente participa de um vínculo; não recebe outro se já vinculado. Gods podem receber vários; Multiguard X permite exceções (§§17–19, 50). | Distinguir capacidade do God e do Devotee; detalhes de Multiguard e intervenção de Guardian estão pendentes. |
| Strike e retaliação | Strike exige Prepared, Engage válido e 1 AÇÃO; deixa o atacante Unprepared. Power de ambos causa dano simultâneo; defensor retalia sem AÇÃO nem Prepared (§§9, 20–21). | Defensor Unprepared continua retaliando. Na resolução simultânea, ser destruído não cancela o dano correspondente. |
| HP e dano | Devotees acumulam dano, inclusive entre rodadas. Dano maior ou igual ao HP máximo destrói e envia ao Tartarus (§§22–23). | Separar HP máximo, dano marcado e bônus. Preparar, trocar Engage ou evoluir não cura automaticamente. |
| God em combate | Recebe dano no Soul e retalia com Attack simultaneamente; não usa HP; sua retaliação independe de Prepared (§24). | Não aplicar ao God o modelo de HP dos Devotees. |
| Long Range | Só quem inicia Strike ganha precedência. Alvo destruído pelo primeiro dano não retalia; defender com Long Range não concede essa precedência (§§25, 45). | Não transportar indiscriminadamente a implementação anterior de dano primeiro. Interação com fim de partida requer o timing consolidado. |
| Owner e Resonance | Owner define quem pode evoluir a Cloth; não restringe sozinho quem pode equipá-la. Resonance identifica expressamente quem usa uma habilidade (§§26–28, 33, 52). | Usar identidade do personagem; portar Pegasus Cloth não transforma outro personagem em Pegasus Seiya. Owner e Resonance devem ser informações distintas. |
| Cloth Evolution | Toda Cloth entra Vanilla salvo efeito. Evolve exige Owner, requisitos, AÇÃO e Cosmo; avança um estágio. Não exige Prepared, não esgota e não rompe Engage (§§29–30). | Estágios, custos e requisitos são específicos da carta. Uma evolução por Cloth/rodada é parâmetro experimental. |
| Vínculo Cloth + Owner | A evolução pertence à combinação atual. Sair daquele Owner reseta para Vanilla, inclusive transferência direta para outro Owner listado. Na morte, a Cloth fica em campo sem portador, salvo efeito (§§31–32). | Guardar estágio na instância vinculada, não como alteração permanente da definição da carta. Reequipar ainda precisa de procedimento. |
| Bônus de estágios | Um estágio substitui os bônus anteriores salvo texto explícito. O dano permanece quando o HP máximo aumenta ou diminui; a queda pode causar destruição (§§34–35). | Recalcular atributos sem somar estágios automaticamente nem apagar dano. God Cloth existe apenas onde a carta a define. |
| Awaken e Ultimate | Awaken pertence ao Devotee, independe de equipamento. 7th Sense nomeia estágio de Cloth. Ultimate segue requisitos da carta e não exige God Cloth universalmente (§§36–38). | Separar despertar do personagem, evolução do equipamento e condição de Ultimate. A relação final Awaken/7th Sense está pendente. |
| Afterlife | Todo Devotee no Tartarus possui Afterlife, de qualquer facção; sai da condição ao deixar a zona. Não recebe habilidade ou retorno gratuito (§§39–41). | Derivar a condição da zona e do tipo, sem marcador obrigatório. Arayashiki e Meikai não são keywords da engine. |
| Texto e facções | Texto válido da carta pode criar exceção à regra geral, respeitando proibições expressas. Efeitos de entrada aparecem antes de atributos e keywords; isso é apresentação (§§51–54). | Distinguir apresentação e ordem de resolução. As identidades de facção orientam design sem proibir outras categorias de efeito. |

## Pontos que continuam abertos

O capítulo XII já enumera pendências. A comparação com a implementação anterior também revela omissões que precisam ser tratadas como perguntas, sem importar respostas da Vanilla 1.0:

1. **Timing:** iniciativa, alternância, passe, fim da rodada, respostas e interrupções; ordem dos efeitos de início/fim e a oportunidade “apropriada” para colocar Base sem AÇÃO.
2. **Compra e deck vazio:** o 2.0 fixa a mão inicial, mas não define compra recorrente nem derrota por tentativa de compra sem cartas. Não transportar a condição antiga por suposição.
3. **Entrada e Prepared:** o livro fala em Devotees elegíveis e Strike Prepared, mas não fecha o estado de entrada nem quando um recém-jogado pode realizar Strike. Impulse está sem texto normativo.
4. **Guardian e evasão:** não há procedimento fechado de intervenção. Nimble e Cheater precisam de revisão canônica para o sistema de Engage; a redação antiga sobre alvos de ataque não resolve isso sozinha.
5. **Outras keywords:** Pierce, Impulse, Sealed e Unfaith estão sem texto normativo; Multiguard X precisa de regras para múltiplos vínculos, escolha de Strike, retaliação e mudanças de capacidade.
6. **Equipamentos:** custo e timing de reequipar, limite por Devotee, interação Cloth/Scale, destruição, remoção, destino e representação física dos estágios.
7. **Despertar:** relação Awaken/7th Sense e requisitos por carta para God Cloth/Ultimate. O antigo Awaken automático de God por limiar de Soul e o limite geral de Ultimate uma vez por jogo não foram reconfirmados pelo novo texto.
8. **Latent Cosmo e tipos de custo:** o recurso antigo não está regulamentado no 2.0. Não apagar nem preservar automaticamente geração, expiração ou pagamento com Latent. A distinção antiga entre custos de Cosmo e Base Cosmo também precisa de decisão.
9. **Sistemas antigos sem consolidação:** Damage/recuperação de Cloth, Relics genéricas, Void, lendários, desconto por jogar mesmo nome e restrições antigas de God/Domain. Ausência no livro não basta para estabelecer um comportamento de engine.
10. **Construção:** limite de cópias, mulligan, critérios por facção, tratamento de cartas neutras e identidade estável dos Owners. O capítulo I declara parte dessas regras pendente.
11. **Duração dos efeitos:** textos antigos como “until end of turn”, “during your opponent’s turn” e “at the beginning of your turn” precisam de redação nova aprovada. Trocar mecanicamente toda ocorrência de “turn” por “round” pode alterar o efeito.
12. **Balanceamento:** Soul/Attack dos Gods, curvas de custo, ENG, Long Range, evolução e recursão de Afterlife continuam hipóteses de playtest. A meta de 8–10 rodadas não é resultado de testes.

## Preparação para as novas cartas e o Card Forge

O editor atual mantém `resistance`, bônus fixos, `equipar_custo`, `damage_cloth` e um `awaken` numérico. O importador `parseBatch` aceita os tipos `Devotee`, `Relic`, `Technique`, `Moment`, `Domain` e `God`; Cloth ainda é subtipo de Relic. O mapa `FIELDS` não oferece HP, Cosmoble, Owner, Resonance ou estágios estruturados. Apenas adicionar nomes à lista visual de keywords não cria suporte mecânico.

Quando o novo conjunto chegar:

1. Preservar o texto original recebido e identificar cartas por ID/identidade, distinguindo renomeações, revisões e cartas novas. Não concluir que um título diferente é necessariamente outra identidade.
2. Extrair o que as cartas realmente especificam: HP, Cosmoble, Owners, Resonance com personagem explícito, estágios e respectivos bônus/custos/requisitos, Awaken, Ultimate, entradas e duração de efeitos. Listar campos desconhecidos em vez de descartá-los.
3. Propor o contrato de dados e o formato de importação antes de converter o catálogo. Os nomes internos permanecem em português; os textos de carta permanecem em inglês. O nome dos novos campos e a representação de Cloth/Scale ainda não foram definidos nesta etapa.
4. Separar definição da carta e estado da partida: dano acumulado, Engage, ENG, Prepared, evolução atual, vínculo com Owner e evolução usada na rodada são informações de instância/partida. Não gravá-las nos valores-base do catálogo.
5. Preparar as duas representações já exigidas pelo autor: impressão e carta interativa. Arte é fundo na versão do jogo; HP, dano, Engage, Prepared, evolução e outros estados vêm da engine e aparecem em camadas vivas. A identidade e a revisão são compartilhadas.
6. Mostrar o diff das cartas e obter aprovação antes de gravar `data/cards.json`, usando o gravador existente quando adaptado ao contrato aprovado. Atualizar o modelo de lote, os validadores e a documentação junto com o editor.

Não há conversão automática aprovada de `Resistance` para HP, de Cloth para outro tipo, de custos, de keywords ou de nomes/Owners. A comparação é necessária porque a semântica mudou e as novas cartas ainda serão fornecidas.

## Impactos verificados nos arquivos atuais

| Área | Ponto de partida | Trabalho futuro |
| --- | --- | --- |
| Engine | `playtest/engine.js`: `TURN_PHASES`, `beginTurn`, validação de atacante/alvos, estado e resolução de combate | Rodadas, alternância, vínculos, comandos Engage/Disengage/Strike/Evolve, recursos e dano persistente; timing consolidado. |
| Testes | `tools/test-rules.mjs` ainda cria unidades com Resistance e verifica regras de turnos/Latent | Reescrever expectativas conforme o 2.0 e preservar cenários de regressão válidos. A suíte antiga não certifica conformidade 2.0. |
| Interface e IA | `playtest/app.js`, `playtest/view.js`, `playtest/presentation.js` e projeções da engine | Disponibilidade de AÇÕES, rodadas, ENG, vínculos, dano/HP, estágio de Cloth, Owner/Resonance e decisões da IA. |
| Catálogo e decks | `data/cards.json`, `data/beta-athena.json`, `docs/beta-athena.md` | Aguardar novas cartas; revisar relações e decks após consolidar construção. Preservar os dados atuais até o diff aprovado. |
| Editor e lote | `card-forge/forge.js`: `FIELDS`, `NUM`, `TIPOS`, `KEYWORDS`, `parseBatch`, `buildCard`; `index.html`, `import/modelo.txt`, `serve.py` | Campos e validação estruturados, exportação sem perda, persistência e revisão das duas prévias. Se o servidor mudar, executar seu `--selftest`. |
| Composição | `CARD-TEMPLATE/templates.json` e os projetos do editor | Propor apresentação de HP, evolução e requisitos com base nas novas cartas; respeitar a posição dos efeitos de entrada. |

Os arquivos de `playtest/`, `FRAMES/`, `ARTS/` e `CARDS/` foram apenas consultados quando necessário. Nenhum código ou asset dessas pastas foi alterado. O aplicativo macOS continua abrindo o editor existente.

## Verificações a preparar na implementação

- Alternância de AÇÕES, renovação e limites de Base/ENG; passe e prioridade conforme a decisão futura.
- Engage livre por 0 ENG, mudança e Disengage por 1 ENG; persistência entre rodadas e liberação por saída do campo.
- Strike preso ao vínculo, consumo de Prepared apenas do atacante e retaliação de defensor Unprepared.
- Destruição simultânea de Devotees; retaliação do God; derrota e empate por Soul.
- Long Range ao atacar, ausência de vantagem defensiva e supressão da retaliação apenas quando o primeiro dano destrói o alvo.
- Dano persistente por rodada, evolução e troca de Engage; HP máximo recalculado com dano preservado, inclusive destruição após perder bônus.
- Evolve por Owner válido, avanço de um estágio, limite experimental por rodada, substituição de bônus e estado Prepared/Engage preservado.
- Reset de evolução ao sair do Owner, inclusive transferência entre Owners válidos; Cloth sem portador após morte, salvo efeito.
- Identidade exata de personagem para Owner/Resonance e independência entre Awaken e equipamento.
- Afterlife em qualquer Devotee no Tartarus, desaparecendo ao sair, sem retorno automático.
- Importação, edição, gravação e reabertura sem perder campos; diff antes da escrita; mesma revisão nas representações de impressão e jogo.

Nesta etapa foram verificadas a fidelidade textual do livro recebido e a integridade do escopo documental. Não foram executadas partidas para validar o 2.0, pois a engine ainda não o implementa.
