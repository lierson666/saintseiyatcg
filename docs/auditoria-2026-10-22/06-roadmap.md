# STAR HILL — roteiro de implementação

Plano proposto, dependente das fontes, decisões e aprovações abaixo. Não corresponde a funcionalidades implementadas nesta auditoria.

| Fase | Entrega | Dependência | Critério de saída |
| --- | --- | --- | --- |
| 0 — auditoria e recuperação | Inventário, cartas/fontes, regras, conflitos, proposta e perguntas | Repositório, PSDs e fontes históricas | Fontes conhecidas verificadas ou limites explicitamente resolvidos com o criador; conflitos classificados. Recuperação integral ainda aberta. |
| 1 — fundação STAR HILL | Contratos compartilhados, revisões, origem e aprovação; navegação mínima local | Aprovação do recorte e das decisões de dados | IDs preservados; nenhuma aprovação automática; histórico acessível; gravação com revisão esperada e diff aprovado. |
| 2 — Card Database | Catálogo, busca/filtros e staging JSON/CSV/XLSX | Fase 1 | Textos preservados; importações não sobrescrevem aprovadas; conflitos exibidos; integridade referencial e roundtrips testados. |
| 3 — Card Craft | Integrar Card Forge, Cosmoble, duplicação e templates aprovados; exportações | Fases 1–2 e parâmetros de impressão | Original preservado ao abrir/salvar sem edição; prévia e imagens verificadas; lote, ZIP e PDF reproduzíveis. |
| 4 — Rulebook Engine | IDs/revisões de regras e handlers das regras confirmadas | Decisões prioritárias e aprovação antes de iniciar engine | Toda regra implementada cita fonte/teste; lacuna retorna pendência explícita; sem interpretação automática de texto. |
| 5 — Game Engine | Comandos, estado, eventos, RNG e replay independente da UI | Fase 4 e revisão dos resolvers existentes | Mesma seed/comandos produzem eventos/estado idênticos; custos/alvos/zonas testados; habilidades sem implementação bloqueadas explicitamente. |
| 6 — Deck Builder | Montar, validar, salvar, duplicar e exportar decks | Catálogo e regras de construção fixados | Deck 60/4, identidades e referências válidas; curva e Cosmoble calculados; avisos estatísticos não impedem decks legais. |
| 7 — Playtest | Hotseat, humano×IA e IA×IA locais | Engine estável e decks validados | Partidas reproduzíveis, vitória sem intervenção técnica e sem atalhos da IA; regressões por interações. Online fica para depois. |
| 8 — Balance Lab | Métricas e comparação de partidas/decks/cartas | Replays e metadados de amostra | Resultados vinculados às versões e parâmetros; anomalias investigáveis; avaliação humana separada de aprovação técnica. |

## Próximos recortes revisáveis

1. **Fechar proveniência:** confirmar cobertura das fontes e versões; marcar cartas com estado de aprovação desconhecido sem alterar `cards.json`.
2. **Resolver o contrato de jogo:** Seal, prioridade, recursos, equipamentos/Scales, unicidade/evolução, tokens e exceções. Registrar decisões no manual/changelog antes do código.
3. **Corrigir preservação do editor, após autorização do recorte:** roundtrip do Awaken de Athena, Cosmoble e importação. Reproduzir cada caso com o texto original antes de mudar comportamento.
4. **Proposta de dados de Poseidon:** preparar diff das dez fichas recuperadas com IDs a decidir e sem dados gráficos inventados. Só gravar após aprovação e por `serve.py`.
5. **Fundação mínima da STAR HILL:** manter o jogo e Card Forge executáveis. Cada alteração tem um commit restrito ao seu recorte; não incluir o trabalho concorrente de `playtest/`.

## Matriz mínima de aceitação

| Área | Verificação obrigatória |
| --- | --- |
| Catálogo | IDs únicos/imutáveis, total coerente, referências válidas, não aplicáveis vazios, revisões recuperáveis. |
| Aprovação | RECOVERED/DRAFT/REVIEW não promovem automaticamente a APPROVED; alteração aprovada não é sobrescrita por importação. |
| Construção de deck | 60 cartas, máximo de quatro conforme identidade oficial, God/Domain separados e combinação de cores. |
| Recursos | Base elegível 1/turno, custo exato, pagamento insuficiente sem consumo, Base vs Cosmo/Latent, expiração. |
| Timing | Fases/janelas aprovadas, prioridade, respostas, alvos inválidos e escolhas sem aproximação. |
| Combate | Ataque, revidar do God, Guardian/Cheater/Nimble, Long Range nativo/equipado e Pierce. |
| Seal | Aplicação, consequências, múltiplos marcadores, remoção, preparação e troca de zona. |
| Equipamentos | Uma Cloth ou limite aprovado de Scale, múltiplas Relics, bônus geral, personagem de Resonance e equip grátis fora do ETB. |
| ETB/contínuos | Ordem de gatilhos, unicidade e efeitos temporários; fontes removidas ou sem alvo. |
| Destruição/zonas | Tartarus/Void, sacrifício, bounce, substituições e permanência/dano do equipamento. |
| Awaken/Ultimate | Limiar e permanência, timing com vitória, custo e limite 1/jogo. |
| Vitória | Soul 0, tentativa de compra sem deck e empate/simultaneidade conforme decisão oficial. |
| Replay | Estado inicial/decks/comandos/targets/custos/eventos/final e versões produzem resultado idêntico. |
| Intercâmbio | JSON/CSV/XLSX com habilidades multilinha e caracteres especiais; roundtrip sem perda. |
| Visual/impressão | Template e facção corretos, legibilidade, resolução, sangria/marcas quando aprovadas. |
| Regressão | Casos das cartas atuais, cada nova interação coberta e nenhuma atualização silenciosa de revisão de regra. |

O projeto já tem cenários úteis, mas eles não cobrem toda esta matriz. É preciso testar os contratos públicos e os replays ao estabilizar a engine; a suíte atual injeta acesso às funções internas e não prova sozinha independência de interface, determinismo ou balanceamento.
