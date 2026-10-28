# Olympus Arena V1: relatório de QA (28/10/2026)

- Branch `olympus-arena`, worktree `~/worktrees/sstcg-olympus`, criado a partir de `alpha-0.1`. Sem merge nem deploy.
- Rota: `/playtest/divine/`. No menu do playtest: "Olympus Arena · Engine 3.0".
- Fixture identificada na tela: `?demo=ultimate`.

## Referência e capturas
- Referência aprovada: `olympus-arena-v1-reference.webp`.
- Capturas em `qa/`:

| Arquivo | O que mostra |
| --- | --- |
| `01-hud-1672x941.jpg` | HUD na resolução da referência |
| `02-ultimate-announce.jpg` | Anúncio do Athena Exclamation (callout e letterbox) |
| `03-ultimate-resolved-judgment.jpg` | Resolução, piso zodiacal e Divine Judgment |
| `04-hud-1280x720-low.jpg` | Perfil LOW, Round 1 |
| `05-mobile-375.jpg` | 375×812 |

## Comparação com a referência

| Elemento da referência | Implementação | Situação |
| --- | --- | --- |
| God adversário no canto superior esquerdo, retrato com aro dourado, nome, coração + Soul, escudo | `godhud--opp`: escudo = limite Awaken (acende com Awaken), selo U do Ultimate, barra de Soul | Fiel |
| God do jogador no canto inferior esquerdo | `godhud--me`: clique abre os poderes divinos | Fiel |
| Hexágono azul com número e chamas azuis na coluna esquerda | Hexágono = Bases preparadas / total; chamas = Latent (3) | Fiel |
| Deck e Tartarus no canto superior direito | Pilha do adversário; a do jogador fica acima do retrato dele | Adaptado |
| Mão do adversário em leque no topo | Versos dourados em leque, saindo pela borda | Fiel |
| Mão em leque embaixo, cortada pela borda | Leque com hover que levanta a carta | Fiel |
| Piso com mostrador zodiacal | Textura de canvas no Three.js (12 casas, signos, estrela de 16 pontas) | Fiel |
| Estátua de Athena e colunas | Recorte da estátua tirado da referência aprovada, em blend `screen` sobre o céu; colunas instanciadas | Fiel |
| Relógio das Doze Casas acima do botão de ações; tempo "02:34 TURNO" | 12 tochas em CSS, signos no mostrador, tempo e rótulo ao lado | Fiel |
| Botão "Ações ›" | "End Turn ›" / "Pass ›" / "Keep Hand ›": rótulo contextual em inglês (convenção do projeto) | Adaptado |
| Battlefield amplo e limpo | Fileiras centrais sem moldura; o texto "No Devotees" fica oculto | Fiel |

## Testes
`node --test tools/test-*.mjs` → **228/228**.

Os 15 testes novos estão em `tools/test-engine-v3-gods.mjs` e cobrem:
- Awaken dinâmico e checkpoint;
- Cosmo of Hope e Divine Protection;
- custo, consumo, falha e independência de Awaken do Athena Exclamation;
- Divine Judgment, com prazo e remoção;
- Soul máximo e recuperação;
- custo misto e Soul letal;
- derrota imediata;
- relógio, timeouts, reconexão e visibilidade.

Dois testes antigos mudaram de resultado esperado porque agora o God Athena age: Cosmo of Hope (D225) e Divine Protection (+1/+1). A intenção original de cada teste foi preservada.

## No navegador
| Caso | Resultado |
| --- | --- |
| Console sem erro (desktop, celular, LOW) | OK |
| Fixture: Awaken ativo em A (Soul 5), escudo aceso e +1/+1 nos Athena Devotees | OK |
| Ultimate: clicar no God, escolher 3 Saints (só os elegíveis acendem), pagar 13 Bases, ir à cadeia, passar e resolver | OK. B 21 → 11, os 3 Saints no Tartarus, Divine Judgment com prazo no fim do Round 8 |
| Relógio: tochas acesas = ceil(tempo restante / 60); pausa durante animações | OK (02:27 → 3 tochas) |
| 375×812 sem rolagem horizontal | OK |
| 1280×720 no perfil LOW | OK |

## Não verificado / limitações
- **Prints do canvas WebGL:** com o painel oculto, alguns saem com a arena escura. O canvas usa `preserveDrawingBuffer: false` e o rAF fica pausado. Com o painel visível, a arena aparece (capturas 02 e 03).
- **FPS:** não medido de forma válida, porque o painel estava oculto.
- **Timeouts:** vêm desligados no playtest local (Settings → "Apply clock timeouts"). O caminho foi testado só na engine.
- **Escolhas "you may"** (Divine Protection): ainda usam o diálogo do navegador.
- **Ordenação de gatilhos pelo jogador:** sem interface.

## Poseidon no HUD (28/10/2026)

- God do jogador B em Settings ("Poseidon · fixture deck") ou `?godB=poseidon`. Etiqueta na tela: "Fixture · Poseidon with an Athena V6 deck — not an official deck".
- Fixtures de demo: `?godB=poseidon&demo=water-prison` e `?godB=poseidon&demo=great-flood`.
- Water Prison: diálogo pagar 2 Latent ou recusar. Seal aparece como contador ◈N no Devotee.
- Great Flood: menu do God. Escolha de Base e de descarte pelo dono da mão (G3-034). Cancelar aplica a G3-030 (`TIMEOUT_AUTO_CHOICE` no log).
- Verificado no navegador, sem erro de console:
  - Water Prison → Seal → Pressure of the Deep (Mill 2, compra 1) → Strike segue;
  - Great Flood: 3 Devotees à mão, 3 Bases, descarte de 7 em 13, Mill 21.
- Capturas: `qa/06-water-prison-pressure-log.jpg`, `qa/07-seal-counter-on-board.jpg`, `qa/08-great-flood-log.jpg`.
- Limite: as decisões síncronas da engine usam diálogo do navegador (`confirm`/`prompt`), como as já existentes.
