# Arena Forge 5.0 — biblioteca, cosméticos e publicação

Pedido do autor em 07/11/2026. Relatório técnico da implementação, dos testes e dos limites.

## O que existe

| Parte | Arquivo |
| --- | --- |
| Regras (schema, pipeline, manifesto, escolha, gate) | `shared/arena-model.js` |
| Biblioteca de trabalho | `data/arena-library.json` |
| Manifesto publicado (fonte única para jogo, Codex e site) | `data/arenas-published.json` |
| Gravação local e validação na fronteira | `card-forge/arena_forge.py` (rotas `/api/star-hill/arenas` e `/arenas/miniatura`) |
| Editor (STAR HILL › Arena Forge) | `star-hill/arena-forge.js` |
| Cena 3D da partida | `playtest/divine/scene.js` |
| Migração e semente | `tools/arena-seed.mjs` |
| Miniaturas | `playtest/assets/arenas/<id>@<versão>~<variante>.webp` |

## Biblioteca

Cada arena tem id, nome, facção, descrição, autor, versão, tema-base do código, parâmetros visuais, variantes, status, validação, histórico de versões publicadas e a versão que está no jogo (`publicado`). O editor busca por texto, filtra por facção e status, duplica (a cópia nasce em rascunho, sem histórico), edita e arquiva.

Prévia 3D ao vivo com a mesma cena da partida. Ela simula desktop, tablet e celular deitado ou em pé, troca a qualidade gráfica, liga reduzir movimento, testa um golpe e mostra a zona protegida do campo.

## Variantes

Tipos aceitos: standard, day, night, sunset, storm, ruined, divine, legendary e seasonal. Toda arena tem a standard.

A variante guarda só o que muda em relação à arena. A ordem de resolução é tema-base do código < arena < variante. Geometria, shaders e texturas são os mesmos da cena, então variantes não custam draw call nem memória a mais.

Variantes criadas como exemplo, todas em desenvolvimento e não publicadas:
- Athena's Sanctuary — Golden Hour (sunset)
- Athena's Sanctuary — Twelve Houses Battle (legendary)
- Poseidon's Undersea Temple — Great Flood (storm)
- Hades' Underworld — Eclipse (divine)

## Cosméticos

Arena é cosmética: não muda regra, custo, ordem de ação nem dado competitivo.

O manifesto marca cada arena com `cosmetico: {tipo: 'arena', aquisicao: 'livre'}`. Não há preço, drop nem venda. A economia (`sanctuary-api/server.py`, `COSMETIC_KINDS`) não foi tocada.

`chooseArena` já recebe uma função `owns(key)`. Hoje ela devolve sempre verdadeiro. Quando o autor aprovar arena como item da loja, basta ligar essa função ao inventário do servidor.

## Personalização e partidas online

A prioridade da arena na mesa é: imposta pela partida (`?arena=`, futuro evento ou torneio) > arena do deck > arena do perfil (Opções › Arena) > Cosmo Arena.

O editor de decks tem o seletor Arena (padrão: "Same as Options"). A escolha fica no próprio deck (`arena`) e sincroniza com a conta. As Opções do lobby e da partida listam as arenas publicadas, variantes incluídas.

Só entra arena publicada e possuída. O que não estiver publicado cai na Cosmo Arena.

A escolha é local. Ela nunca vai ao estado sincronizado do duelo, então cada jogador vê a própria arena e o servidor de partidas não muda. A imposta pela partida é o único caminho para os dois jogadores verem a mesma arena (evento).

A paleta da interface (`data-theme`) segue o tema-base, então variantes e cópias herdam as cores certas.

## Pipeline

Rascunho → Desenvolvimento → Validação → Aprovada → Publicada → Arquivada.

- Editar uma arena publicada abre a próxima versão em desenvolvimento. A versão publicada continua no jogo até a nova publicação.
- Qualquer edição apaga a validação e devolve a arena a desenvolvimento.
- Só passa a Aprovada com validação desta versão sem erro.
- Só publica arena aprovada.
- "Publicar" no Star Hill grava o manifesto local. Nada vai ao servidor oficial automaticamente: o deploy é separado e depende do autor.

## Validação automática

Roda no navegador, em cada variante:

| Item | Regra |
| --- | --- |
| Schema e referências | campos, faixas, cores, facção, tema-base existente, variantes únicas |
| Carregamento | cena criada; erros de shader contados |
| Draw calls | até 16 no desktop e até 8 no perfil celular |
| Tempo de GPU | até 8 ms por quadro (aviso) |
| Memória | até 6 texturas e 20 malhas |
| Zonas protegidas | astro e topo das colunas fora do retângulo do campo (14–86% × 22–82% da tela) |
| Legibilidade do HUD | brilho médio sob o campo: aviso acima de 0,70, erro acima de 0,80 |
| Fundo calmo | variação de brilho sob as cartas (aviso) |
| Reduzir movimento | a arena para de desenhar |

A validação também gera as miniaturas de cada variante.

## Dependências, versões, rollback e fallback

- A versão publicada congela os parâmetros completos de cada variante. Mudar o código ou um tema-base depois não altera arena já publicada.
- O servidor recusa alterar ou apagar uma versão já publicada.
- O servidor também recusa publicar uma versão sem validação aprovada.
- As miniaturas têm a versão no nome e nunca são sobrescritas por outra versão.
- O manifesto declara `requer` (nível de recursos da cena). Se a cena for mais antiga que o pedido, ou se um parâmetro vier corrompido, a arena cai no tema do código.
- Sem manifesto (404 ou rede), a partida usa os temas do código.
- Rollback: "Voltar a esta" no histórico faz o manifesto apontar para uma versão antiga.
- Migração: `migrate()` converte o `data/arenas.json` v1 do Arena Forge anterior (removido) em biblioteca schema 2. `node tools/arena-seed.mjs` cria a biblioteca a partir do código.

## Cosmo Codex e site

O manifesto publicado é a fonte única. Ele traz id, versão, nome, facção, descrição, variantes, miniaturas, data e autor da publicação.

A identificação `id@versão~variante` é a mesma no editor, no jogo, nas miniaturas e no manifesto. O Codex (`playtest/platform/`) e o site podem ler `/data/arenas-published.json`; a tela de arenas no Codex ainda não foi feita.

## Testes (07/11/2026)

| Teste | Resultado |
| --- | --- |
| `node --test tools/test-arena-forge.mjs` (serialização, migração, schema, pipeline, dependências, rollback, arquivar e duplicar, troca de arena, fallback, gate) | 11/11 |
| `python3 tools/test-arena-forge.py` (servidor: schema na fronteira, manifesto derivado, versão imutável, publicação sem validação recusada, rollback, arquivada sai, miniatura) | ok |
| `uv run --with playwright python tools/test-arena-forge-ui.py` (Chrome real: 7 arenas em 1280×720, 375×812 e 812×375, câmera e zonas, draw calls, reduzir movimento, console, `?arena=`, manifesto ausente e corrompido, validar → aprovar → publicar → miniaturas → rollback no Star Hill) | 17/17 (inclui arena escolhida no deck) |

Medidas da validação real: Athena v2 com 3 variantes teve 10 draw calls no desktop, 6 no celular, 2,2 ms de GPU, 2 texturas, 12 malhas, campo livre e brilho 0,67. Elísios e Hades v2 passaram sem aviso.

## Limites conhecidos

- Arena por deck vale para partidas locais (IA e hot-seat, `?deckA=`). Online, vale a arena do perfil, porque a partida online não lê o deck local.
- Decks Starter são só leitura: para ter arena própria, duplique o deck.
- Brilho e zonas são medidos por amostragem (96 pontos) com as cartas de exemplo, não com a mesa real.
- FPS em aparelho real (Redmi Pad 2) não foi medido. O gate usa draw calls, tempo de GPU do Mac e o perfil celular.
- Não há assets externos (modelos, texturas): tudo é procedural na cena. Se um dia houver, entram no manifesto com versão no nome, como as miniaturas.
- Nada do Arena Forge 5.0 foi publicado no site oficial.
