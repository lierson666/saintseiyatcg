# CARD FORGE — LAYOUT STUDIO

Editor visual adicional ao Card Forge, sem build ou dependência de produção. A implementação está na branch `codex/card-forge-layout-studio`. O catálogo, a engine, as configurações de jogo e o Rulebook recebidos foram preservados byte a byte; consulte `base-preservada.json`.

## Utilização

1. Inicie `python3 card-forge/serve.py` na raiz e abra `http://localhost:8765/card-forge/`. Use **Layout Studio** no cabeçalho. No aplicativo STAR HILL o editor permanece na mesma janela.
2. Em **Cards**, escolha a carta real. Busca e filtros ajudam a localizar tipo, facção e raridade. “Editar dados” retorna ao Forge tradicional, com sua revisão de diff.
3. Escolha o template em **Layouts**: Global, tipo/subtipo, facção, raridade ou carta. Crie ou duplique um template para outra variante. As bases são imutáveis; edite os overrides.
4. Selecione uma layer na lista ou na carta. Arraste, redimensione pelos cantos, use Shift para seleção múltipla ou altere as propriedades no Inspector. Espaço permite pan; Fit e 100% ajustam a visualização. Há grid, guias, safe area e bleed.
5. **Themes** controla cores, molduras e símbolos locais. A seleção de arquivos PNG/JPG usa o upload já existente. Imagens originais do projeto não são regravadas.
6. **Preview** simula mão/Battlefield, dano, preparação, Awaken, buffs, equipamentos, keywords e counters numa instância isolada da engine. Nenhuma partida aberta é alterada.
7. **Save Draft** grava o rascunho; **Publish** pede confirmação e disponibiliza o template para Forge/Playtest. O histórico oferece restauração de rascunho e rollback de publicação. Export/Import JSON permite transportar templates declarativos.
8. Exporte PNG nativo, PNG transparente, SVG ou PDF. Corrija os avisos de overflow antes da exportação. Para editar o popup, escolha a superfície **Inspector**.

Desfazer/refazer funciona por template e também pelos controles do STAR HILL. Mudanças não salvas são mantidas em memória ao trocar templates e disparam aviso ao fechar a página; use Save Draft para persistir.

## Arquitetura

`dados canônicos + template + tema + estado fornecido pela engine → cena vetorial → DOM/SVG/Canvas`

| Arquivo | Responsabilidade |
| --- | --- |
| `shared/layout-studio/model.js` | Schema, registry de bindings, validação, condições, resolução e origem de cada propriedade |
| `shared/layout-studio/defaults.js` | Bases e overrides iniciais, descobertos do catálogo/temas existentes |
| `shared/layout-studio/renderer.js` | Fluxo de texto, cena vetorial, atualização incremental, PNG/SVG/PDF |
| `shared/layout-studio/runtime.js` | Consumo de bases + versões publicadas; atualização por publicação/foco |
| `shared/card-visual-values.js` | Formatação somente de leitura dos bônus impressos e Equip |
| `card-forge/studio.*`, `studio-canvas.js`, `studio-properties.js` | Interface, canvas, layers e propriedades |
| `card-forge/studio-preview.js` | Estado de QA independente, calculado com a engine existente |
| `card-forge/layout_studio.py` | Persistência validada, controle de revisão, backup e histórico |
| `data/card-layouts.json`, `card-layout-schema.json` | Biblioteca versionada e contrato de validação para Python |

Integrações: o Forge usa a cena publicada na impressão e a mesma simulação na prévia interativa. `shared/live-card.js` usa a publicação nas cartas do jogo. `playtest/view-v2.js` usa a superfície Inspector publicada, preservando ações legais, botão direito e X. Com nenhuma publicação aplicável, os renderizadores existentes continuam disponíveis. `serve.py` hospeda as APIs locais.

## Schema e herança

Schema 1, com ID estável, nome, escopo, pai opcional, canvas, tema, elementos, revisão e data. Exemplo de override completo válido:

```json
{
  "id": "athena-cloth-editorial",
  "schemaVersion": 1,
  "name": "Athena · Cloth editorial",
  "scope": {"level": "faction", "value": "Athena", "subtype": "Cloth", "surface": "card"},
  "extends": "base-faction-athena",
  "elements": [
    {"id": "resonance", "y": 1655, "height": 255, "style": {"fontSize": 34}}
  ],
  "revision": 0
}
```

Ordem determinística: Global → tipo/subtipo → facção → raridade → carta. O subtipo mais específico vem depois dentro do nível; o override sendo editado fica por último dentro de seu nível. Em seguida se usam revisão e ID estável. O Inspector indica a origem de cada propriedade e permite restaurar o herdado. Ciclos e pais de nível posterior são recusados.

O registry inclui nome, tagline, tipo/subtipos, facção, raridade, custo, Cosmoble, regras, Equip/Auto-Equip, bônus do portador, Armor HP, atributos originais e runtime. Para Gods há bindings independentes de Divine Power, Awaken e Ultimate. `game.stats()` fornece atributos atuais; o editor não soma buffs nem decide legalidade. O campo `damage_cloth` é o HP próprio da Armor V6.

As condições usam `all`/`any` e operadores `exists`, `eq`, `neq`, `gt`, `includes`, `truthy`, `falsy`. Campos, propriedades, fontes e assets têm allowlists. JSON não executa código, seletores CSS ou URLs externas. Assets precisam estar nas pastas locais autorizadas.

## Bases e componentes

22 bases e 22 rascunhos iniciais: global; tipos atuais e legados já existentes; cinco temas de facção; raridades encontradas; Inspector; leitura por God Armor e Divine Artifact. Os subtipos visuais não criam tipos mecânicos.

Componentes: TextBlock, ArtworkFrame, FactionIcon, CastingCost, StatBadge, ArmorHPBadge, SoulBadge, AwakenBadge, EquipCostBlock, TypeLine, RulesBox, FlavorText, KeywordList, RarityMark, Frame, DecorativeLayer, GlowEffect, Divider, StatusBadge e CounterBadge. O Inspector acrescenta CardPreview para a carta aninhada.

Veja a [análise V6](analise-v6.md) e a [sintaxe aprovada](sintaxe-visual-20261025.md). EQUIP e Armor HP ficam ocultos no rodapé por padrão, mas continuam editáveis. A prova de QA os ativa explicitamente para testar posição, binding e dano.

## Publicação e segurança de gravação

GET `/api/layout-studio`, `/assets`, `/projects`. POST `/draft`, `/publish`, `/restore`, `/rollback` sob `/api/layout-studio/`.

Cada mutação exige a revisão esperada; um editor desatualizado recebe conflito 409. O backend valida antes de gravar, gera backup em `card-forge/out/layout-studio/` e usa a gravação atômica existente. Mantém até 120 entradas de histórico. Bases são imutáveis. Host/Origin externos são recusados pelo servidor local.

Somente o usuário publica na biblioteca real. Partidas leem bases + publicados; nunca leem os rascunhos. Publicação sinaliza as outras janelas e atualiza ao retornar foco. Catálogo e regras não fazem parte dessas APIs.

## Verificação e evidências

```bash
node --test tools/test-card-presentation.mjs tools/test-layout-studio.mjs
python3 tools/test-layout-studio.py
python3 card-forge/serve.py --selftest
python3 tools/test-layout-studio-ui.py
```

O último comando requer Python Playwright e Chrome instalados apenas no ambiente de QA. `tools/serve-layout-studio-qa.py` cria uma biblioteca temporária e recusa gravações de cartas, artes, projetos e configurações. PNGs, PDF, SVG, capturas e `resultado.json` ficam em `card-forge/out/qa-layout-studio/`, fora do Git.

| Critério solicitado | Evidência |
| --- | --- |
| 1–2: acesso e carta real | Link no Forge e seleção de Pegasus Cloth V2 |
| 3: mover nome | Drag + propriedades; undo/redo/restaurar herdado |
| 4: custo | Resize pelo canto + posição/tipografia |
| 5: habilidades | Altura editada na UI; overflow recusa exportação |
| 6: Armor HP | HP 4 nativo; posição alterada; dano 2 mostra HP 2 |
| 7–8: Athena/Poseidon | Temas independentes editados e publicados em QA |
| 9: raridade | Override Uncommon publicado em QA |
| 10: carta individual | Pegasus personalizada, Dragon preservada |
| 11–12: rascunho | Save Draft + reload mantém propriedades |
| 13: estados | Seiya + Cloth + buff + dano resulta em 5 ATK / 4 de 5 HP via engine |
| 14–15: publicação e partida | Mão renderizada no Playtest; botão direito abre Inspector publicado; X funciona; mulligan obrigatório bloqueia X |
| 16: restauração | Segunda publicação e rollback para a primeira |
| 17: exportação | PNG 1488×2091, alpha, SVG com imagens incorporadas, PDF nativo |
| 18: preservação | Hashes do catálogo, engine, configurações e Rulebook; QA sem gravação real |

Casos adicionais: God, Devotee, Spell, Domain, Kamui, pendências editoriais, injeção, import/export JSON, condições, bloqueio, ordem, seleção múltipla, desktop/tablets 1024/768 e reduced motion.

## Limites de apresentação

- SVG preserva texto editável e incorpora imagens, mas depende das fontes disponíveis no destino. PNG/PDF preservam a composição rasterizada neste Mac. Fontes proprietárias ausentes continuam sujeitas às alternativas existentes.
- PDF usa 1488×2091 px em largura de 2,5 polegadas (~595 dpi), conservando a proporção nativa. Não é PDF/X nem impõe sangria gráfica de uma gráfica específica; guias de bleed/safe são controles visuais.
- O PNG transparente omite fundo/moldura. Pixels opacos da ilustração enviada continuam opacos.
- Autoajuste não substitui prova física de impressão. Overflow bloqueia exportação; fonte muito pequena avisa somente no editor. Novas cartas ou fontes podem exigir ajustes nas bases.
- As artes dos novos registros dependem dos projetos/imagens realmente disponíveis. Não usamos o PNG completo de uma carta como ilustração de fundo.
- Não há execução de regras novas por texto de layout; publicação é exclusivamente visual. O envio da branch ao GitHub foi autorizado pelo autor em 25/10/2026; merge e deploy não fazem parte desta entrega.
