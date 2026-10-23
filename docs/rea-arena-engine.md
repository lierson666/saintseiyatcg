# REA estático — engine do Magic Arena como referência

Investigação local em 22/10/2026 para a reconstrução do Saint Seiya TCG. O objetivo é
reimplementar padrões de arquitetura e interação com nossas regras e arquivos próprios.
Não foram copiados código, modelos, texturas, sons, bundles ou algoritmos proprietários.

## Escopo e autoridade das evidências

- O documento anterior `docs/ux-arena-rea.md` descreve **experiência e proposta de adaptação**.
  Ele não documenta uma decompilação completa da engine do Arena.
- `get_evidence_bundle(detail="summary")` do REA retornou **zero registros retidos** no
  início desta investigação. Não há Evidence IDs históricos dessa sessão para citar.
- Os identificadores `LOCAL-*` abaixo são referências documentais desta inspeção local,
  **não** IDs emitidos pelo ledger do REA. Preservamos caminhos, hashes e offsets para
  permitir auditoria sem depender do histórico do chat.
- A inspeção foi somente de arquivos estáticos. Não iniciamos o Arena, não fizemos login,
  não capturamos tráfego, não analisamos o servidor, não executamos código do alvo e não
  abrimos uma análise nativa pesada do `GameAssembly.dylib`.

## Identidade do alvo e método

Alvo instalado inequívoco:

`/Users/Shared/Epic Games/MagicTheGathering/MTGA.app`

**LOCAL-IDENTITY-01 — observado:** `Contents/Info.plist` declara `CFBundleName=MTGA`,
`CFBundleIdentifier=com.wizards.mtga`, `CFBundleShortVersionString=2026.59.0`.
O pacote contém `Contents/Frameworks/UnityPlayer.dylib`,
`Contents/Frameworks/GameAssembly.dylib` e
`Contents/Resources/Data/il2cpp_data/Metadata/global-metadata.dat`.
Essa combinação identifica um cliente Unity/IL2CPP; não é uma engine JavaScript a ser importada.

**LOCAL-METADATA-01 — observado:** arquivo

`/Users/Shared/Epic Games/MagicTheGathering/MTGA.app/Contents/Resources/Data/il2cpp_data/Metadata/global-metadata.dat`

- Tamanho: `30.353.328` bytes.
- SHA-256: `3403db2b711ac89e50a224186da69aaefda2ab1b0a7e0b89612f7f8ec3da88b5`.
- Cabeçalho little-endian: magic `0xFAB11BAF`, versão `31`.
- Tabela de nomes: offset `1.512.568`, tamanho `4.666.372` bytes, segundo os campos do cabeçalho.
- Método: leitura dos bytes, conferência dos limites e seleção de identificadores ASCII
  terminados em NUL dentro dessa tabela. Foram encontrados `217.860` tokens ASCII com
  pelo menos três caracteres; tokens não ASCII não fazem parte desta amostra.
- Todos os offsets abaixo são **offsets decimais no arquivo completo**, não endereços nativos.

**Limite:** os nomes não são pseudocódigo nem um call graph. O método não determina, por si
só, a classe proprietária de cada método, seus argumentos, condições, implementação ou
ordem de execução. A coexistência dos nomes sustenta a identificação de subsistemas;
os contratos propostos adiante são inferências e decisões nossas.

**LOCAL-ASSEMBLIES-01 — observado:**
`Contents/Resources/Data/ScriptingAssemblies.json`, SHA-256
`0f24142a333cdaec5b41e22327a4b60b0f1bb127a06628c46601a35c81344108`,
lista, entre outros, `Core.dll`, `SharedClientCore.dll`,
`Wizards.Arena.TcpConnection.dll`, `Wizards.MDN.GreProtobuf.dll`,
`Wizards.Arena.MessageSerialization.dll`, `Wizards.Arena.Models.Protobuf.dll` e
`Wizards.Arena.Models.dll`. São identidades de assemblies na build IL2CPP; isso não
significa que seus DLLs CIL estejam disponíveis no pacote nem revela o protocolo completo.

## Subsistemas encontrados

### Estado canônico, projeção e reprodução visual

| Token observado | Offset |
| --- | ---: |
| `GameStateManager` | 3266607 |
| `IGameStateProvider` | 3267284 |
| `CurrentGameState` | 1630321 |
| `LatestGameState` | 1630338 |
| `OnVisibleGameStateChanged` | 1631324 |
| `GameStatePlaybackController` | 3266854 |
| `IGameStatePlaybackController` | 3267223 |
| `StartPlayback` | 3266960 |
| `CompletePlayback` | 3266974 |
| `GenerateGameStateUxEvents` | 1628708 |
| `UXEventQueue` | 1630410 |
| `GameStatePlaybackCommencedUXEvent` | 3292307 |
| `GameStatePlaybackCompletedUXEvent` | 3292380 |
| `ParallelPlaybackUXEvent` | 3292773 |
| `LifeTotalUpdateUXEvent` | 3297124 |

**Inferência:** o cliente separa informação de estado, estado visível e reprodução dos
eventos de apresentação. O código necessário para provar cada vínculo não foi recuperado.

**Decisão para o TCG:** o resultado das regras deve existir antes da animação. Um comando
validado produz o próximo estado e eventos semânticos; a apresentação consome eventos numa
fila e exibe uma projeção. Voo de carta, dano flutuante e dissolução não calculam dano,
pagamento, morte ou vitória. Cancelar ou acelerar uma animação preserva o resultado.

### Comandos, ações disponíveis e mensagens de estado

| Token observado | Offset |
| --- | ---: |
| `ActionsAvailableWorkflow` | 1633555 |
| `SubmitAction` | 1633901 |
| `SubmitActions` | 1633914 |
| `SubmitResponse` | 1639383 |
| `ActionsAvailableRequest` | 3715265 |
| `ActionsAvailableReq` | 3826143 |
| `PerformActionResp` | 3840523 |
| `ClientToGREMessage` | 3633954 |
| `GREToClientMessage` | 3836090 |
| `GameStateMessage` | 3820609 |
| `GameStateId` | 3821795 |
| `PrevGameStateId` | 3821862 |
| `QueuedGameStateMessage` | 3865603 |

**Inferência:** existe uma fronteira explícita entre intenção/resposta do cliente e mensagens
de estado do mecanismo GRE. Os identificadores não provam que toda regra rode no servidor,
que as mensagens sejam determinísticas, nem como ocorre uma transação atômica.

**Decisão para o TCG:** toda ação deve declarar ator, tipo e parâmetros; o motor confere
turno, prioridade, fase, custo e alvos usando o estado atual. A UI e a IA usam o mesmo
despachante. Uma revisão monotônica permite rejeitar confirmação de uma escolha obsoleta.
A escolha de pagamento é confirmada antes do compromisso da carta; o custo não é devolvido por perda posterior dos alvos. Escolhas de alvo são revalidadas na resolução, e o movimento final de zona só ocorre ao concluí-la.
Essas garantias são escolhas da nossa implementação, não algoritmos extraídos do Arena.

### Workflows de alvo e combate

| Token observado | Offset |
| --- | ---: |
| `SelectTargetsWorkflow` | 1644666 |
| `CanSubmitCurrentTargetSelection` | 1645087 |
| `CanAutoAdvanceTargetSelectionIndex` | 1645137 |
| `SetTargetSelectionIndex` | 1645393 |
| `SelectTargetsRequest` | 3721812 |
| `SelectTargetsReq` | 3839399 |
| `SelectTargetsResp` | 3845461 |
| `get_AllowCancel` | 3837863 |
| `DeclareAttackersWorkflow` | 3342858 |
| `DeclareAttackersHighlightsGenerator` | 3344396 |
| `DeclareAttackersReq` | 3839280 |
| `DeclareAttackersResp` | 3845403 |
| `DeclareBlockersWorkflow` | 3344942 |

**Inferência:** escolhas possuem workflows, critérios de confirmação e realces próprios.
O método exato de cancelamento e as regras de seleção não foram decompilados.

**Decisão para o TCG:** uma escolha pendente guarda seu ator, origem, candidatos legais,
quantidade, seleção e possibilidade de cancelar. A confirmação revalida os alvos. Combate
usa declarar atacantes → escolher alvo por atacante → janela de resposta → resolução.
**Não transportar o workflow de bloqueadores:** no Saint Seiya o atacante escolhe o God ou
Devotee alvo. Guardian, Cheater, Nimble, Long Range e Pierce seguem o manual e o motor próprio.

### Prioridade, full control, auto-pass e phase stops

| Token observado | Offset |
| --- | ---: |
| `PriorityReceived` | 1681802 |
| `PriorityPassed` | 1681819 |
| `FullControlEnabled` | 3265800 |
| `FullControlLocked` | 3265819 |
| `AutoPassEnabled` | 3265837 |
| `SetTurnAutoPass` | 3266177 |
| `ToggleFullControl` | 3285767 |
| `ToggleLockedFullControl` | 3285785 |
| `SetAutoPassOption` | 3285908 |
| `PhaseLadderUtility` | 3287064 |
| `Wotc.Mtga.DuelScene.PhaseLadder` | 3287083 |
| `DuelScene_PhaseLadder_PhaseStop_PhaseStep_Main` | 2577663 |
| `DuelScene_PhaseLadder_PhaseStop_PhaseStep_Combat_Player` | 2576941 |
| `DuelScene_PhaseLadder_PhaseStop_RemoveStop` | 2578087 |

**Observado:** há tokens de controle e chaves de localização para stops de jogador/oponente.
As chaves de localização comprovam a superfície de UI, não a regra executável do stop.

**Decisão para o TCG:** fase de turno, subestado de combate e detentor da prioridade são
campos distintos. O botão principal deriva desses campos e das escolhas pendentes.
Auto-pass deve respeitar existência de resposta legal, full control e stops configurados.
Hotseat usa o ator da vez e troca a perspectiva quando a prioridade muda. Não presumir
que jogador A é sempre o humano. As fases continuam Upkeep → Draw → Main → End; Combat
permanece um subestado de Main. Stops não adicionam fases nem alteram o timing das regras.

### Auto-tap e pagamento

| Token observado | Offset |
| --- | ---: |
| `AutoTapActionsWorkflow` | 3341169 |
| `SanitizeAutoTapSolutions` | 3341353 |
| `AutoTapActionsProvider` | 3370842 |
| `GetAutoTapActions` | 3370896 |
| `AutoTapActionsAvailableReq` | 3826259 |
| `PayCostsRequest` | 3719538 |
| `PayCostsReq` | 3715858 |

**Inferência:** auto-tap é tratado como escolha/solução de pagamento, com normalização
separada. Não temos o algoritmo de otimização, ordem de preferência ou prova de correção.

**Decisão para o TCG:** gerar planos válidos com nossas fontes e custos. A preferência
Latent → Pool → Cosmo Base vem da adaptação `docs/ux-arena-rea.md`, não do Arena. Custos de
Soul e alternativas relevantes exigem escolha explícita; full control e Shift permitem
pagamento manual. Cancelar antes da confirmação não deve gastar recursos.

## Pilha e resolução: cobertura e limite

Foram observados `DrawGameStateStackArrows` no offset `1631452` e a chave de localização
`Enum_ZoneType_ZoneType_Stack` no offset `2617884`, além dos workflows de ação e alvo acima.
Isso sustenta uma representação explícita da pilha e seus vínculos visuais no cliente.
Não foi identificado um `StackResolver` comprovado, nem recuperado o algoritmo interno de
resolução do GRE. Os arquivos `ALT_Resolution` são lookups de apresentação, não fonte do motor.

Para o TCG, Techniques e respostas obedecem ao manual. A pilha visível deve representar
exatamente as resoluções pendentes do motor próprio. Não importar regras de Magic, como
bloqueios, prioridades ou passagem automática, quando conflitarem com o Saint Seiya.

## Evidências de apresentação, separadas da engine

Cache local: `/Users/mac/Library/Application Support/com.wizards.mtga/Downloads/ALT/`.
Inspeção limitada a chaves JSON e identidade dos arquivos; nenhum payload foi copiado.

| Arquivo | SHA-256 | Conteúdo observado |
| --- | --- | --- |
| `ALT_GameState_c030245698e213d56383ae1c2d05ecde.mtga` | `bc8c556f3bec3bd9934ab844ef7f2f5629891f6db471cb11813998adc1a9595f` | 2 entradas; inclui `ALT_GameState.GameLossVFX` |
| `ALT_Combat_55529f0836cd12071cc4f3263bbaa688.mtga` | `5d1559e442a4994137ffc90abcaf4337fa78f0ad3b16ed6eb8a8f0f110930a5b` | 10 entradas; inclui `ALT_Combat.SFXAttackType` |
| `ALT_DuelScene_79cef42115ebf0186298e04c0c30a04b.mtga` | `41ea96d3cc3a9e236810c815ae406b24e1734c6136a60f01513813a82ac07e92` | 20 entradas de lookups da cena |

Essas referências só ajudam a separar estado/regras e feedback. Não comprovam comportamento
de combate, prioridade, dano ou pagamento.

## Base visual PS3 já documentada

`docs/rea-soldiers-soul.md` é o estudo local de Alma dos Soldados (PS3, build 10/08/2015).
Para a reconstrução, os achados aplicáveis são:

- Metal anime com matcaps procedurais de ouro, azul e prata; toon shading em três faixas.
- Fundos escuros, molduras de arabescos em dourado-bronze e flares brancos/dourados.
- Seleção em faixas com fade lateral; retratos quadrados com cor por personagem.
- Soul em barras finas ornamentadas; números e letreiros quentes com contorno forte.
- Feedback de ataque e despertar com composição original, sem extrair assets.

Os modelos `.emo` e animações `.ema` não foram convertidos; o áudio não foi decodificado e
os vídeos `.usm` não foram demuxados. O estudo visual não entrega uma engine de luta nem
autoriza incluir arte, música, voz ou modelos da Bandai/Toei no TCG.

## Contrato de reconstrução

1. **Regras próprias:** manual, cartas e casos já implementados continuam a referência
   normativa. Casos específicos precisam de testes de resultado antes de serem movidos.
2. **Motor independente:** comandos validados e transições de estado sem DOM/WebGL.
3. **Interações explícitas:** seleção de cartas, alvo, pagamento, lendário e mulligan como
   workflows com ator e confirmação.
4. **Projeção e feedback:** view model + fila de eventos visuais, desacoplados das regras.
5. **Direção visual:** PS3 reinterpretado com os materiais originais do TCG; UX da mesa
   adaptada do Arena conforme `docs/ux-arena-rea.md`.

Não houve decompilação completa, validação dinâmica, reconstrução do protocolo online,
observação de uma partida de Arena nesta investigação, nem acesso ao código do GRE.
Os subsistemas e identificadores observados orientam uma implementação própria; as
garantias do novo TCG precisam ser demonstradas por seus testes e partidas completas.
