# Rulebook 2.0 — proposta para fechar as regras

**Proposta de design de 23/10/2026, solicitada pelo autor. Ainda não aprovada nem implementada.** O livro oficial continua em [guia-do-jogo.md](guia-do-jogo.md). Os números abaixo são pontos de partida para playtest, não resultados de testes.

Minha recomendação é preservar o confronto individual como centro do jogo: gastar AÇÕES para prender, escapar, preparar uma evolução ou golpear deve ser uma escolha relevante. As definições abaixo fecham as lacunas identificadas na [análise da migração](migracao-rulebook-2.0.md).

## 1. Rodada, iniciativa, compras e passe

- Sortear a iniciativa inicial. O vencedor escolhe quem começa. A iniciativa alterna entre os jogadores a cada rodada, independentemente de quem realizou a última AÇÃO.
- Ambos começam com 7 cartas. Não há compra normal na primeira rodada. A partir da segunda, ambos compram **2 cartas** no início da rodada.
- Ordem do início: renovar as Bases e o ENG dos dois jogadores; preparar seus Devotees; renovar limites por rodada; realizar as compras; resolver os gatilhos de início. O jogador com iniciativa recebe a primeira oportunidade de AÇÃO após essa preparação.
- Cada jogador pode colocar uma Base Cosmoble durante sua própria oportunidade, antes da AÇÃO e com a pilha vazia, uma vez por rodada. Isso não consome a AÇÃO e não abre uma janela de resposta por si só. Gatilhos causados pela colocação são resolvidos antes da AÇÃO.
- Passar entrega a oportunidade ao adversário, sem impedir ações posteriores na mesma rodada. **Dois passes consecutivos**, com a pilha vazia, encerram a fase de ações. Realizar uma AÇÃO ou colocar uma Base zera essa contagem; passes de prioridade da pilha não contam como passes da rodada.
- No encerramento, resolver os gatilhos de fim; remover efeitos “até o fim da rodada”; verificar destruições/derrotas; expirar Latent Cosmo; avançar a rodada. Gatilhos produzidos por essas etapas são resolvidos antes de avançar. O encerramento não reabre AÇÕES comuns, salvo texto explícito.
- Não há limite máximo de cartas na mão nesta base de regras.
- Tentar comprar sem cartas suficientes causa derrota: comprar o que houver e registrar a falha na quantidade restante. Se os dois falharem na mesma compra simultânea, o resultado é empate.

**Por quê:** uma Base usa uma carta da mão. Duas compras sustentam desenvolvimento de recurso e novas jogadas na mesma rodada; com apenas uma, o jogador pode gastar sua compra inteira mantendo a curva. Alternar a iniciativa reduz a vantagem recorrente de agir primeiro. O ritmo precisa ser medido com as cartas novas.

## 2. Timing, respostas e resolução

- Uma AÇÃO comum só é declarada na própria oportunidade e com a pilha vazia. Jogar Devotee, equipamento ou Moment; Engage, troca, Disengage, Strike, Evolve e habilidades marcadas como AÇÃO seguem essa regra.
- **Technique** pode ser jogada como AÇÃO na própria oportunidade ou como resposta em uma janela de prioridade. Como resposta, não gasta a próxima AÇÃO, mas paga integralmente seus custos. **Moment** exige AÇÃO, salvo texto explícito.
- Habilidades ativadas exigem AÇÃO por padrão; apenas as expressamente permitidas como resposta podem ser ativadas na prioridade. Passivas e gatilhos não gastam AÇÃO. Uma carta que disser como e quando a habilidade funciona fornece a exceção.
- Ao declarar uma AÇÃO, anunciar escolhas e alvos e pagar custos. Strike deixa o atacante Unprepared nesse momento. O adversário recebe a primeira prioridade para responder.
- Cada resposta entra no topo da pilha e entrega prioridade ao adversário. Dois passes de prioridade resolvem apenas o item do topo. Havendo itens restantes, a prioridade volta ao jogador da oportunidade atual; o processo continua até esvaziar a pilha e resolver os gatilhos produzidos.
- Quando a AÇÃO e suas consequências terminam, a próxima oportunidade pertence ao adversário de quem declarou a AÇÃO original. Respostas não invertem nem consomem essa alternância.
- Gatilhos simultâneos entram primeiro na ordem escolhida pelo jogador da oportunidade e depois na ordem escolhida pelo adversário. Fora da fase de ações, usar o jogador com iniciativa como referência. O último colocado resolve primeiro.
- Ao resolver, verificar novamente os alvos. Um efeito com todos os alvos inválidos não produz efeito; custos não são devolvidos. Com alvos válidos restantes, resolver o que for possível, salvo exigência expressa de todos os alvos.
- Verificar HP, Soul, vínculos inválidos e derrotas após cada resolução e cada etapa de dano. Processar destruições simultâneas em conjunto; depois colocar seus gatilhos na pilha. Repetir verificações até estabilizar.
- Strike resolve como uma sequência única, sem jogar Techniques entre dano inicial e retaliação. As respostas acontecem antes da resolução. Prevenção e substituição já aplicáveis continuam funcionando durante essa resolução.
- Perder Prepared depois de declarar não cancela um Strike já pago. Sair do campo ou perder o Engage com o alvo antes da resolução impede o combate. Sealed impede novas declarações, sem cancelar automaticamente uma já declarada.

**Por quê:** uma única lógica de resposta atende cartas, habilidades e combate. Separar passe da rodada e passe da pilha evita encerrar a rodada enquanto alguém apenas está deixando uma habilidade resolver.

## 3. Entrada em campo e Prepared

- Devotees entram **Unprepared**, salvo texto contrário. Podem estabelecer ou receber Engage imediatamente, equipar e participar de evolução; para iniciar Strike precisam de Prepared.
- **Impulse** faz o Devotee entrar Prepared. Ainda é necessário estabelecer Engage e gastar uma AÇÃO para Strike. Impulse não concede uma AÇÃO extra.
- A preparação normal acontece no início da rodada seguinte. Efeitos explícitos podem preparar antes disso ou impedir a preparação.
- Engage, troca, Disengage e Evolve não usam Prepared. Retaliação também não usa Prepared.
- Um efeito que prepara pode permitir outro Strike na mesma rodada. O limite natural é Prepared mais AÇÕES disponíveis; não há proibição adicional de “um ataque por rodada”.

**Por quê:** até um recém-chegado pode conter um adversário, enquanto causar dano imediatamente exige Impulse ou um efeito de preparo.

## 4. Engage, Guardian, Multiguard e controle

### Alvos e vínculos

- Engage é sempre entre combatentes adversários: Devotee contra Devotee ou Devotee contra God. Gods recebem vínculos, mas não iniciam Engage nem Strike.
- Um vínculo é compartilhado pelos dois participantes. Qualquer Devotee participante pode fazer seu próprio Strike contra um oponente vinculado, respeitando Prepared e a alternância de AÇÕES.
- Existe no máximo um vínculo entre o mesmo par de combatentes. Não se declara troca para um alvo já vinculado ao mesmo Devotee; um efeito que tente duplicar o vínculo mantém apenas o existente.
- Trocar Engage substitui um vínculo escolhido por outro, por 1 AÇÃO + 1 ENG. Disengage remove um vínculo escolhido pelo mesmo custo. Uma troca resolve de forma atômica: se o novo alvo se tornar inválido, a troca falha e o vínculo anterior permanece, se ainda válido; o custo já pago não retorna.
- Os alvos e a capacidade disponível são reavaliados na resolução. Um vínculo acaba quando um participante sai do campo, quando deixam de ser adversários ou quando um efeito o encerra.

### Guardian: intercepção por capacidade

- Ao declarar estabelecer ou trocar Engage contra um God ou outro Devotee, o defensor pode escolher **um Guardian com capacidade livre** para receber esse Engage no lugar do alvo.
- A intervenção não exige Prepared, AÇÃO ou ENG. Ela faz parte da declaração: registrar o alvo final e então abrir a janela de respostas. Se esse alvo ficar inválido, a declaração falha; não retorna automaticamente ao alvo original.
- Guardian com capacidade ocupada não protege novos alvos. Um Guardian já vinculado ao mesmo atacante não intercepta a troca daquele vínculo para mantê-lo preso. Outro Guardian disponível pode interceptar.
- Apenas uma intervenção de Guardian é feita por declaração; o defensor escolhe entre os elegíveis. Isso impede cadeias de redirecionamento entre Guardians.
- **Nimble ignora essa intervenção.** Continua sujeito às capacidades de Engage e pode ser escolhido como alvo normalmente. Ganhar Nimble depois da intercepção não reescreve retroativamente a declaração.
- Intercepção vale para declarações de Engage, inclusive troca. Um efeito que apenas move ou encerra um vínculo não é automaticamente uma nova declaração; a carta deve dizer se estabelece um novo Engage.

**Por quê:** Guardian protege enquanto consegue sustentar confrontos. Isso evita que um único Guardian ocupado continue bloqueando todos os outros combatentes e dá função clara a Multiguard. É uma proposta nova para o 2.0, diferente da proteção global da Vanilla 1.0.

### Multiguard X

- X é a capacidade **total** de vínculos, não X vínculos adicionais. Se houver vários valores de Multiguard, usar o maior, sem somar.
- Multiguard permite receber outros Engage enquanto houver vagas. Estabelecer ativamente um Engage inicial continua exigindo estar livre; a keyword amplia a capacidade defensiva, sem criar uma sequência gratuita de vínculos ofensivos.
- Ao realizar Strike, o portador escolhe **um** oponente vinculado. Apenas esse oponente retalia. Os demais vínculos permanecem.
- Ao receber Strikes diferentes, o portador retalia em cada um, mesmo Unprepared, enquanto sobreviver.
- Troca e Disengage afetam um vínculo por AÇÃO. Se a capacidade diminuir abaixo do número atual, o controlador escolhe quais vínculos mantém; os excedentes terminam sem custo.

### Mudança de controle

- Uma carta vai para as zonas de seu proprietário, salvo efeito explícito. “Owner” da Cloth significa personagem elegível; não significa proprietário da carta.
- Mudar o controle de um Devotee deixa-o Unprepared, sem curar dano nem apagar seu Awaken. Os vínculos que passaram a ligar aliados terminam; vínculos ainda válidos permanecem.
- Equipamentos não mudam de controlador automaticamente. Como a ligação normal exige equipamento e portador do mesmo controlador, um equipamento incompatível fica em campo sem portador e perde a evolução. Um efeito pode transferir expressamente ambos.

## 5. Combate e textos das keywords

O dano é marcado separadamente do HP máximo. Power negativo causa zero dano. HP máximo zero ou negativo destrói o Devotee. Soul zero ou negativo derrota o jogador. O excesso de dano não é cura nem recurso.

| Keyword | Definição proposta |
| --- | --- |
| Guardian | Intercepta declarações de Engage conforme a capacidade e o procedimento acima. |
| Nimble | Ignora a intervenção de Guardian ao declarar Engage; não ignora capacidade nem fica protegido contra ser alvo. |
| Cheater | Durante um Strike contra este Devotee, o Devotee adversário não se beneficia de Long Range. Não ignora Guardian. |
| Long Range | Ao iniciar Strike, causa seu dano primeiro. Verificar destruição/derrota antes da retaliação; alvo destruído não retalia. Defender com Long Range não concede dano primeiro. |
| Pierce | Ao iniciar Strike contra um Devotee, o dano excedente ao HP restante daquele alvo é causado ao Soul do God que o controla. Não funciona por retaliação. Calcular depois de prevenção/modificação do dano e sem contar dano antigo como dano novo. |
| Impulse | Entra Prepared; precisa de Engage e AÇÃO para Strike, como qualquer atacante. |
| Sealed | Não pode declarar Strike nem ativar suas próprias habilidades, inclusive habilidades concedidas por equipamento. Mantém passivas, Engage e retaliação; pode mudar vínculos e receber Evolve, que pertence à Cloth. Dura até o fim da rodada, salvo duração expressa diferente. |
| Unfaith | Ao declarar Strike contra um God, pode escolher remover até 2 Latent Cosmo daquele jogador em lugar de causar dano ao Soul. A escolha é anunciada antes das respostas. O God retalia normalmente; sem Latent, o modo não causa dano ao Soul. |
| Multiguard X | Capacidade defensiva total de X Engage, com um alvo por Strike e as demais regras acima. |

**Cheater e Unfaith são escolhas de design propostas, não definições já aprovadas.** A primeira dá uma resposta específica a Long Range; a segunda cria uma decisão entre pressão no Soul e negação de recurso.

Se um Strike normal causar Soul zero aos dois Gods simultaneamente por efeitos aplicáveis à mesma etapa, há empate. Se Long Range derrotar o God na etapa inicial, a partida termina antes da retaliação. Gatilhos futuros não desfazem uma derrota já verificada; substituições de derrota/dano precisam agir antes dessa verificação.

**Exemplo:** A tem Power 4, HP 5 e 2 de dano; B tem Power 3, HP 4 e 1 de dano. Em Strike normal, ambos são destruídos. Se A inicia com Long Range, destrói B antes da retaliação e continua com seus 2 de dano. Cheater em B faz esse combate voltar à resolução simultânea.

## 6. Cosmo, Latent e custos

- Uma Base disponível paga 1 Cosmo e fica indisponível até a renovação. Gastar Bases para pagar é parte do pagamento; não cria uma AÇÃO adicional nem exige guardar um estoque de Cosmo gerado sem uso.
- Custo de **Cosmo** aceita Bases e Latent. Custo explicitamente de **Base Cosmo** aceita apenas Bases; custo de **Latent Cosmo** aceita apenas Latent. Soul e ENG são recursos distintos e não substituem Cosmo.
- Manter Latent como recurso de superação: **uma vez por AÇÃO adversária**, se um ou mais Devotees seus receberem dano efetivo de fontes adversárias, ganhar 1 Latent. As respostas e consequências daquela AÇÃO contam na mesma ocorrência. Dano zero ou totalmente prevenido não gera; o Devotee pode ter sido destruído pelo dano.
- Limite experimental: **3 Latent por jogador**. Efeitos que geram mais respeitam esse limite, salvo exceção expressa. Latent expira no fim da rodada, depois dos efeitos de encerramento.
- Dano de retaliação sofrido durante sua própria AÇÃO não gera esse ganho geral. Cartas podem criar suas próprias fontes de Latent.
- Escolhas e custos são validados antes de gastar; pagamento insuficiente não produz gasto parcial. Recursos pagos em uma declaração válida não retornam se o efeito depois falhar.

**Por quê:** preservar o despertar pelo sofrimento sem gerar recurso repetidamente de cada alvo de um dano em área. O limite e a expiração limitam explosões e tornam Unfaith útil sem decidir a partida sozinho.

## 7. Equipamentos, estágios e remoção

- Cada Devotee tem **um espaço de armadura**, ocupado por uma Cloth **ou** uma Scale. As duas não se acumulam. Outras Relics não têm limite geral de quantidade, respeitando restrições impressas e cartas únicas.
- Jogar uma Cloth/Scale custa uma AÇÃO e seu custo de entrada. Pode entrar sem portador ou entrar equipada pagando também seu custo de Equip, na mesma AÇÃO, com alvo elegível anunciado. Se apenas o portador ficar inválido, ela entra sem portador e não devolve o custo de Equip.
- Equipar uma armadura em campo, reequipar ou transferir custa uma AÇÃO mais Equip. Recomendo **Equip padrão de 1 Cosmo** quando a carta não indicar outro valor. Trocar de armadura deixa a anterior em campo sem portador, em Vanilla; não a destrói.
- Desequipar voluntariamente custa uma AÇÃO e zero Cosmo. Não exige Prepared. Transferência e troca são concluídas antes de recalcular os atributos e verificar destruição, evitando mortes por um estado intermediário de interface.
- Destruir equipamento envia ao Tartarus; exilar envia ao Void; desequipar mantém no campo. Apenas Devotees ganham Afterlife no Tartarus. Equipamentos anexados não são enviados junto com o portador quando ele morre, retorna à mão ou é exilado, salvo texto explícito.
- **Retirar Damage de Cloth da regra-base.** Sem marcadores e recuperação automática de Cloth. Uma carta específica ainda pode criar seu próprio sistema de dano/reparo, descrito integralmente no texto.
- Evolução pertence a Cloth + Owner atual. Desanexar, transferir ou sair do campo reseta para Vanilla. A armadura continua tendo seus benefícios Vanilla quando equipada em um não Owner elegível.
- Cada Evolve avança um estágio e exige AÇÃO, requisitos e Cosmo. Manter uma evolução por carta física por rodada; transferir, desequipar ou sair e voltar não renova esse limite na mesma rodada.
- Os bônus numéricos indicados para cada estágio são **totais daquele estágio**, sem somar os anteriores. Habilidades desbloqueadas anteriormente permanecem, salvo texto contrário; uma habilidade escrita como exclusiva de um estágio só funciona nele. O padrão de Card Craft deve distinguir bônus numéricos de habilidades.
- Para a mesa física, usar um único indicador de estágio junto à Cloth, com as posições Vanilla / 7th Sense / God Cloth. Não exige outra cópia da carta nem uma carta de personagem adicional.

**Por quê:** manter a armadura recuperável e o vínculo com o personagem como risco principal. O dano persistente já exige controle suficiente; outro dano acumulado na Cloth tornaria a manutenção mais lenta.

## 8. Awaken, God Cloth, Ultimate e Afterlife

- **Awaken é do Devotee.** Padronizar o despertar ativável como uma AÇÃO mais o custo/requisito impresso, sem exigir ou alterar Prepared por regra geral. Um gatilho automático impresso é uma exceção e não paga AÇÃO adicional. O estado dura enquanto a instância permanecer em campo, salvo texto diferente.
- **7th Sense é estágio da Cloth.** Não concede Awaken automaticamente, e Awaken não evolui a Cloth automaticamente. Uma carta pode exigir ou produzir a relação explicitamente.
- God Cloth exige o estágio anterior e os requisitos da própria carta. Nem toda armadura tem God Cloth, e o estágio não concede imunidade implícita contra Gods.
- Retirar o antigo limiar universal de Awaken dos Gods. Uma nova carta de God pode ter seu próprio despertar, inteiramente descrito no texto, sem depender de uma regra herdada.
- **Ultimate usa AÇÃO e uma utilização por identidade de personagem, por jogador e por partida**, além dos custos e requisitos impressos. Na ausência de personagem nomeado, usar a identidade da carta. Ressuscitar ou trocar a versão do mesmo personagem não recarrega essa utilização. Não exige God Cloth universalmente nem consome Prepared se isso não estiver no custo.
- Afterlife é derivado de ser Devotee no Tartarus, inclusive se chegou lá por descarte. Não precisa estar impresso em todo Devotee, não oferece ativação por si só e não concede retorno.
- Retornar do Tartarus exige um efeito. Por padrão, a carta retorna sob controle de seu proprietário, Unprepared, sem Engage, sem dano, sem seu Awaken anterior e sem equipamentos automaticamente anexados; o efeito pode especificar exceções.
- Limite experimental para evitar ciclos: **cada carta física pode retornar do Tartarus ao campo uma vez por rodada**. Hades pode retornar vários Devotees diferentes; exceções ao limite precisam estar explícitas. Sair de novo não renova o limite.

**Por quê:** três progressões distintas, com papéis claros: despertar do personagem, vínculo com a armadura e golpe extraordinário. O retorno continua relevante sem reciclar infinitamente a mesma entrada em campo.

## 9. Deck, identidade, mulligan, Gods e Domains

- Deck principal com 60 cartas, até **4 cópias da mesma identidade de carta**; artes alternativas e revisões da mesma carta não aumentam o limite. God e Domain ficam fora dessas 60.
- Permitir cartas da facção do God, da facção do Domain e neutras. Se God e Domain forem da mesma facção, o deck é monofacção mais neutras. Não criar cinco tipos de mana nesta base.
- Um mulligan parcial gratuito: separar qualquer quantidade da mão inicial, comprar a mesma quantidade e só então embaralhar as separadas no deck. Apenas uma troca; sem penalidade de Latent ao adversário.
- Cada jogador pode controlar um Devotee de cada **personagem nomeado**, mesmo que existam versões diferentes da carta. Unidades genéricas não têm essa exclusividade. Usar identidade estável de personagem para essa regra, Owner e Resonance; título e ilustração não bastam.
- Não permitir jogar da mão uma segunda versão de personagem que já controla. Se um efeito produzir duplicidade, o controlador escolhe um para manter e envia os outros ao Tartarus, sem considerar isso destruição. Habilidades de entrada continuam seguindo o fato de a carta ter entrado; essa interação deve ser considerada no custo do efeito que a trouxe.
- Relics só são únicas se isso estiver expresso. Retirar o desconto geral de 2 Cosmo por repetir nome; evolução de Cloth passa a ser a progressão geral, e uma carta específica pode autorizar substituir sua versão anterior.
- Gods não iniciam Engage/Strike nem equipam armaduras. Possuem Soul e Attack; retaliação permanece disponível independentemente de Prepared. Custos de habilidades do God devem estar impressos, inclusive eventual esgotamento.
- Domains permanecem em jogo, fora do deck, sem custo de entrada e protegidos de ataque, destruição, exílio, retorno à mão e mudança de controle adversária nesta base. Seus efeitos e limites de uso vêm do texto da carta.
- Manter Tartarus e Void distintos. Void representa exílio e não concede Afterlife. Efeitos só alcançam as zonas e tipos que identificam; “target Devotee” não alcança automaticamente uma carta no Tartarus.

## 10. Duração dos efeitos e Card Craft

- Novos textos usam **round** para rodada e **action** para AÇÃO. Evitar “turn” no novo conjunto, pois deixou de representar o fluxo do jogo.
- “Until end of round” termina no encerramento atual; “until the beginning of the next round” termina no início da seguinte, antes da preparação. Uma duração diferente deve identificar precisamente o evento.
- Cada texto antigo precisa de revisão contextual: “during your opponent's turn” pode virar “during an opponent's action”, mas isso não é substituição automática segura para todas as habilidades.
- Habilidades de entrada aparecem primeiro na carta. A posição gráfica não antecipa a resolução de um gatilho em relação à pilha.
- No Card Forge, separar: identidade e versão; custo e Cosmoble; Power/HP ou Soul/Attack; entrada; keywords; habilidades; Awaken/Ultimate; Owners; Resonance; estágios com bônus totais, requisitos e custos. Cloth e Scale precisam de identificação mecânica própria, ainda que reutilizem uma moldura.
- Dados de partida como dano, Prepared, vínculos, ENG, estágio atual e limites usados ficam fora da definição-base. A carta interativa recebe esses estados da engine. Impressão e jogo compartilham os mesmos textos, identidade e revisão.
- Proponho tornar obrigatórios os textos que definem alvos, custo, duração e limite das habilidades, evitando que o importador complete esses elementos silenciosamente. O editor deve sinalizar conflitos entre texto e campos estruturados.

## 11. Valores iniciais e o que medir

| Parâmetro | Minha recomendação inicial |
| --- | --- |
| Soul / Attack de God de referência | 30 / 3; variar por facção apenas com compensação no restante da carta |
| Compras | 2 por rodada a partir da segunda |
| Bases | 1 por jogador/rodada, sem AÇÃO |
| ENG | 3 por God/rodada, sem acumular |
| Latent | Limite de 3; ganho geral uma vez por AÇÃO adversária com dano elegível; expira no fim da rodada |
| Evolve | Uma vez por Cloth/rodada |
| Retorno do Tartarus | Uma vez por carta física/rodada |
| Ultimate | Uma vez por personagem/jogador/partida |
| Partida desejada | 8–10 rodadas; medir, sem prometer que a curva já entrega isso |

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

Exemplo de Cloth para testar, sem impor esses valores a todas: custo de entrada 2, Equip 1; Vanilla +1/+1; Evolve por 2 para bônus total +2/+2; Evolve por 4 para bônus total +4/+4. As duas evoluções ocupam rodadas diferentes. A carta só terá os estágios que seu design realmente definir.

Medir pelo menos: duração e vencedor com iniciativa; cartas disponíveis na mão e uso de Bases; proporção de AÇÕES gastas reposicionando; dano evitado por Long Range; intervenções de Guardian e uso de ENG; frequência de evolução/God Cloth/Ultimate; quantidade de retornos e vantagem de cartas de Hades. Usar partidas espelhadas com iniciativa invertida antes de atribuir uma diferença à facção.

## 12. Limite desta proposta

Estas são minhas recomendações concretas para todas as categorias abertas do livro e para as omissões identificadas. Os valores individuais e as redações das cartas novas ainda dependem do conjunto que o autor enviará. A aprovação pode ser por bloco, com ajustes do autor; só decisões confirmadas entram no livro oficial, no changelog, no catálogo e na implementação.
