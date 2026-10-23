# Card Forge

Editor de cartas no navegador (vanilla JS, sem build). Monta a carta no canvas nativo 1488×2091 (2.5×3.5 in, ~595 dpi) com as peças extraídas dos PSDs.

**Rulebook 2.0:** o [novo livro](../docs/guia-do-jogo.md) é a referência desde 23/10/2026. O editor e o formato de lote abaixo ainda são da versão anterior: não suportam estruturalmente HP, Owners e estágios de Cloth Evolution. A atualização aguarda as novas cartas do autor. Veja [o mapa da migração](../docs/migracao-rulebook-2.0.md) antes de preparar um lote no formato novo.

## Abrir

Na raiz do projeto:

```bash
python3 card-forge/serve.py
```

Depois abra `http://localhost:8765/card-forge/` (ou `?card=athena-021` para abrir direto numa carta). O servidor só escuta em 127.0.0.1. Ele não faz parte do site público.

## Aplicativo no macOS

O aplicativo **Card Forge** abre o editor em uma janela própria e inicia o servidor local quando necessário. Compilar e instalar na pasta Aplicativos do usuário:

```bash
python3 card-forge/macos/install.py
open "$HOME/Applications/Card Forge.app"
```

Requer macOS 13 ou superior em Apple Silicon e as ferramentas de linha de comando do Xcode para compilar. Depois da instalação, o aplicativo usa o Python e a pasta deste projeto; mantenha a pasta disponível no Google Drive. A instalação existente é preservada se já houver um aplicativo com o mesmo nome.

Upload de artes usa o seletor de arquivos do macOS; exportação individual abre o painel Salvar. Ao fechar, o aplicativo encerra somente o servidor que ele próprio iniciou. Se o servidor já estava aberto, ele é reutilizado.

## O que faz

- Carrega qualquer carta de `data/cards.json`, ou cria uma nova (botão "Nova carta").
- Edita nome, título, subtítulo, custo, tipo, subtipos, regras, Power/Resistance, bônus, Equip/Damage, Soul/Attack/Awaken, raridade, facção e flavour.
- Arte: envie ou solte uma imagem sobre a carta, arraste para mover e use a roda do mouse para zoom. Se existir `ARTS/<mesmo nome do PNG>`, a arte entra sozinha.
- Regras: a barra acima do texto insere símbolos no cursor (`{C}` Cosmo, `{B}` Base Cosmo, `{L}` Latent Cosmo, `{S}` Soul, `{T}` Tap). O dropdown "+ Keyword" insere uma keyword. Keywords (Pierce, Long Range, Seal…) saem em negrito maiúsculo sozinhas. Linha em branco separa habilidades; `**negrito**` força negrito.
- Facção: cada facção usa o pacote do PSD do seu Deus (moldura, caixas, gemas de Power/Soul, divisória, cor do texto e do brilho). Peças que o Deus não tem (gema de custo, Resistance, Equip, Damage e ícones) vêm de Athena, tingidas na cor da facção.
- "Sobrepor PNG original" põe o PNG de `CARDS/` por cima para comparar.
- Export: PNG alta 1488×2091 e PNG web 1100×1546.
- "Salvar projeto" grava em `card-forge/projects/<id>.json` o que não existe no cards.json: título na carta, subtítulo, flavour e enquadramento da arte. Arte enviada vai para `card-forge/art/` (fora do git).
- "Gravar no cards.json…" mostra o diff campo a campo e só grava depois de confirmar. Só o bloco daquela carta muda no arquivo. Habilidades que você não editou mantêm o texto original.

## Impressão e carta interativa no jogo

Diretriz confirmada pelo autor em **23/10/2026**: o Card Forge deve preparar duas representações da mesma carta, compartilhando ID, revisão, ilustração e dados.

- **Impressão:** composição final da arte, moldura e textos, exportada em PNG/PDF conforme os formatos implementados.
- **Jogo:** ilustração como fundo; nome, tipo, custo, habilidades, números e estados em camadas renderizadas pela interface. A carta jogável deve refletir os dados atuais da partida, com áreas de interação e feedback visual.

Power/Resistance, dano, marcadores e estados mudam visualmente conforme o resultado fornecido pela engine, sem gerar outro PNG. Molduras e ícones podem reutilizar os assets existentes. O PNG completo da carta serve à impressão ou à consulta da versão impressa; não é o corpo da carta interativa.

O editor atual já compõe a versão estática no canvas. A integração da representação interativa é um requisito de desenvolvimento, **ainda não implementado por esta documentação**. O contrato e os critérios de aceitação estão em [cartas-print-e-interativas.md](../docs/cartas-print-e-interativas.md).

## Lote (várias cartas de um arquivo de texto)

No topo do editor, abra "Lote", escolha um `.txt` ou cole o texto, e clique em "Ler lote". O formato está em [`import/modelo.txt`](import/modelo.txt): um bloco `Campo: valor` por carta, cartas separadas por `---`, e `Text:` / `Awaken Text:` / `Ultimate:` em várias linhas.

- A lista mostra cada carta: id, se é nova ou atualiza uma existente (pelo `Id` ou pelo `Name`), e erros linha a linha. Clicar numa carta abre ela no editor para ajustar a arte e o texto.
- "Exportar PNGs de todas" grava `card-forge/out/<id>.png` (1488×2091) e `<id>-web.png` (1100px). Essa pasta fica fora do git.
- "Gravar todas no cards.json…" mostra o diff de todas e só grava depois de confirmar. Junto, salva o projeto de cada carta (título, subtítulo, flavour e arte).

## Templates

- `CARD-TEMPLATE/templates.json`: pacotes de facção (`factions`) e layouts por tipo (devotee, relic_cloth, relic_weapon, relic para Relic/Technique/Moment/Domain, e god). Cada layout tem a posição de cada região.
- `CARD-TEMPLATE/pieces.json`: posição de cada peça PNG e de qual PSD/camada ela saiu.
- Re-extrair as peças (só lê `FRAMES/`):

```bash
uv run --with psd-tools --with pillow --with scipy python card-forge/tools/extract_template.py
```

- Auto-teste do gravador do cards.json:

```bash
python3 card-forge/serve.py --selftest
```

## Limites conhecidos

- Fontes: o PSD usa Futura100 LXT BoldOblique e ITC Avant Garde Pro, que não estão instaladas. O editor cai em Futura/Avenir do macOS, e o título sai um pouco mais estreito.
- Efeitos de camada (brilho, sombra, bevel) são aproximados no canvas. O bevel não é reproduzido.
- 14 smart objects vinculados (`.ai`) não existem no disco: `SlksHc.tif.ai`, `tbpBDu.tif.ai`, `Arte 3/4/6/7/8/9/10/11/13/16/24/27.ai`. As peças saíram da prévia raster salva dentro do PSD, então são bitmap, não vetor. A lista fica em `pieces.json → linked_missing`.
- God: layout simplificado; o bloco Awaken entra no texto de regras. Ares, Artemis, Hades e Poseidon ainda estão sem números e texto no cards.json; o texto deles existe só nos PSDs.
- `card-forge/projects/` traz arte, subtítulo e flavour de Ares, Artemis, Hades, Poseidon e do Seiya, com a arte no enquadramento do PSD.
