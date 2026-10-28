# CARD FORGE — LAYOUT STUDIO: auditoria

## Estado recebido em 25/10/2026

Branch de trabalho: `codex/card-forge-layout-studio`. O diretório contém alterações V6 anteriores à missão, preservadas separadamente. O catálogo atual contém 95 cartas: 90 cartas Athena e cinco deuses; as 357 antigas já estão fora do catálogo. Não reaplicar o diff de limpeza antigo contra esta base nova. Os hashes de catálogo, configurações pessoais, livro e engine estão em `base-preservada.json`; cópia recuperável em `card-forge/out/layout-studio-base-*/`.

## Mapa da arquitetura existente

| Responsabilidade | Arquivos / contrato |
| --- | --- |
| Catálogo canônico | `data/cards.json`; 37 Devotee, 24 Equipment, 25 Spell, 4 Domain, 5 God |
| Identificação de Armor | `shared/card-model.js` e `shared/rules-policy.js`; subtipos e slots, sem criar tipos mecânicos |
| HP próprio da Armor V6 | `damage_cloth ?? vida`, confirmado em `playtest/engine-v2.js` (`armorLife`); `damage_cloth` vale 4 na Pegasus Cloth V2 |
| Estatísticas durante partida | `game.stats(uid)`; `power`, `hp`, `maxHP`, `damage`, `keywords`, `prepared`, `stage`, `armor`, `protectionActive` |
| Dados da instância | `game.locate(uid).card`; dano, preparação, despertar, marcadores, modificadores e equipamento; `game.equipment(uid)` |
| Impressão existente | `card-forge/forge.js`; Canvas 1488×2091, leitura de `templates.json`/`pieces.json`, carregamento de imagens e fontes do sistema |
| Carta viva existente | `shared/live-card.js` + `.css`; DOM com composição das peças PSD, dados e runtime separados; usado por Forge, menu e arena |
| Sintaxe compartilhada | `shared/card-text.js`; blocos de habilidades, ênfase, símbolos, Owners/Resonance; não é compilador de efeitos |
| Layouts e temas PSD | `CARD-TEMPLATE/templates.json`: cinco layouts visuais, mapeamento por tipo/subtipo, cinco temas; `pieces.json`: caixas e PNGs extraídos |
| Artes | `illustration(card)`, `ilustracao`, retratos e `card-forge/projects/<id>.json`; imagens originais em ARTS/CARDS apenas para leitura |
| Inspeção | `playtest/view-v2.js::renderInspector`; engine fornece valores; `app-v2.js` abre por botão direito e mantém escolhas obrigatórias |
| Edição existente | Formulário de campos, enquadramento de arte, importação TXT/JSON/XLSX, histórico `shared/editor-history.js` |
| Exportação existente | PNG Canvas 1488×2091 e web; upload/exportação nativa nos apps macOS |
| Persistência local | `card-forge/serve.py`; gravação atômica, Host local e Origin obrigatório; `star_hill.py` gerencia configurações e histórico |
| Apresentação existente | `data/game-settings.json` / `presentation-schema.json`; HUD/telas/interações, sem template completo das cartas |

Campos encontrados: identificação/coleção, `nome_exibicao_en`, `tagline_en`, facção, tipo/subtipos, raridade, `custo`, `unidade_custo`, Cosmoble, `power`, `vida`, `resistance`, `damage_cloth`, `soul`, `attack`, `awaken`, Equip/Auto-Equip, Owners, habilidades, Awaken e Ultimate. O registry visual deve expor aliases desses campos e valores da engine, sem reescrevê-los.

## Decisão de integração

`CARD DATA + LAYOUT TEMPLATE + FACTION THEME + RUNTIME STATE → cena vetorial → SVG/DOM, Canvas e PDF`.

Um pacote visual versionado, independente do catálogo e de `game-settings.json`, contém rascunhos, publicações e histórico. A ordem de herança é Global → Tipo/subtipo → Facção → Raridade → Carta, com propriedades rastreáveis e restauráveis. O renderizador compartilhado só lê versões publicadas na arena. Sem publicação aplicável, a composição existente continua funcionando.

O Studio será uma página adicional, acessível no editor atual; biblioteca Cards, Layouts, Themes e Preview compartilham as mesmas camadas e o mesmo Inspector. Nenhuma dependência de build. Campos JSON têm allowlists; bindings e condições são declarativos, sem eval, CSS arbitrário ou JavaScript. Exportações usam resolução nativa, não captura de tela.

## Direção visual

Autor trabalhando com cartas, armaduras, Cosmo, constelações, facções, herança e ressonância. A superfície mantém o preto violeta e ouro do Forge; cores de facção entram na carta e nas indicações de escopo. O canvas é o foco; layers à esquerda, Inspector à direita, controles densos em grade de 4 px e cabeçalho editorial. A assinatura é a trilha de cinco níveis de herança junto da carta. Usar controles nativos acessíveis e o histórico já existente, sem biblioteca nova.

## Critérios que precisam de evidência

Testar movimento, resize, seleção múltipla, grid, zoom/pan, safe/bleed; edição independente de custo, regras, Armor HP e Resonance; escopos Athena/Poseidon/raridade/carta; Save Draft/reabrir/Publish/histórico/rollback/import-export; popup com engine; PNG/SVG/PDF; catálogo e engine byte a byte intactos. Casos obrigatórios: Pegasus Cloth V2, God, Devotee, Spell e Domain. Testes de segurança, concorrência e preservação complementam os fluxos visuais.
