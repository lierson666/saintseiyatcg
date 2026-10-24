# STAR HILL — administração local do Saint Seiya TCG

O painel em `http://localhost:8765/star-hill/` usa o mesmo servidor do Card Forge:

```bash
python3 card-forge/serve.py
```

A implementação é vanilla JS e Python stdlib, sem build. O painel administra os arquivos locais; não publica o editor na internet.

## Aplicativo macOS · 24/10/2026

O **STAR HILL.app** reúne os módulos em uma janela AppKit/WebKit, com Card Forge embutido, ícone próprio, menus em português, seleção nativa de arquivos e painel Salvar nas exportações. Instalação em `~/Applications/STAR HILL.app`:

```bash
python3 star-hill/macos/install.py
open "$HOME/Applications/STAR HILL.app"
```

O instalador compila e verifica a assinatura local. Requer macOS 13+, Apple Silicon e ferramentas de linha de comando do Xcode; o aplicativo usa o Python do sistema e a pasta original do projeto. Se o servidor da porta 8765 já está aberto, ele é reutilizado. Fechar o aplicativo encerra apenas um servidor iniciado por ele próprio. O Card Forge.app existente permanece disponível separadamente.

O menu **Visualizar** oferece os módulos por `⌘1` a `⌘8`. **Editar** encaminha Desfazer/Refazer ao editor ativo. Para atualizar o executável, feche o aplicativo e rode `python3 star-hill/macos/install.py --update`; a instalação anterior fica em `~/Applications/.star-hill-backups/`. Atualizações dos arquivos web do projeto aparecem ao recarregar o editor.

## Módulos

- **Música e FX:** escolher menu, abertura de cada duelo, playlist posterior, volumes iniciais e sons das ações; ouvir os arquivos e importar WAV, OGG, MP3 ou ZIP.
- **Cartas · Card Forge:** pesquisar o catálogo real e abrir a carta no editor. O fluxo de revisão e aprovação do diff de `cards.json` permanece no Card Forge.
- **Decks iniciais:** editar os seis decks, seus nomes, God, Domain e quantidades. Validação de 60 cartas, até quatro por identidade e facções permitidas pelo God/Domain; líderes ficam fora do deck principal.
- **Editor de HUD:** 44 áreas da arena, incluindo token, Soul, ENG, Latent, Bases, Gods, Domains, zonas, mão, campo, ação principal, guia, pilha, histórico e fundo.
- **Editor de telas:** abertura, menu, preparação, decks, coleção, opções, mulligan, carta ampliada, pausa, resultado, ajuda, privacidade, mão, zonas e emotes.
- **Interações e animações:** eventos de interface, declaração de ações, início de resolução, efeitos e gatilhos. Configuração geral, por carta de origem ou por par origem → alvo.
- **Cosméticos:** escala inicial de HUD/cartas, token de vantagem, verso e preferência de efeitos.
- **Livro de regras:** revisão do texto oficial com motivo, histórico e changelog. Salvar texto não reprograma automaticamente o motor; mudanças mecânicas precisam de implementação e validação próprias.

## Editor de decks

A composição segue a referência do [editor do MTG Arena](https://magic.wizards.com/en/news/mtg-arena/upcoming-improvements-to-reprints): coleção de cartas à esquerda, filtros no topo, marcadores de cópias e deck na lateral. O STAR HILL usa a identidade visual e as regras do Saint Seiya. A opção **Horizontal** organiza o deck abaixo da coleção, por custo em Cosmo.

- Clique na carta da coleção para adicionar uma cópia; clique no nome da carta no deck para remover. Botões de quantidade e arraste entre as áreas oferecem as mesmas operações.
- **Ampliar** ou botão direito abre a carta com texto completo. Todas as cartas usam a representação interativa compartilhada com a arena: ilustração no fundo e informações em camadas próprias. Cartas sem ilustração têm fundo provisório; nenhuma arte é inventada ou reexportada.
- Busque por nome, ID, texto, subtipo ou keyword; filtre facção, tipo, custo e Cosmoble. As facções permitidas pelo God/Domain aparecem por padrão. Mostrar as demais permite consultar, com a inclusão bloqueada.
- God e Domain ficam na liderança. A curva mostra custos, média, tipos e Cosmoble. O painel sinaliza composição incompleta e facções inválidas. O limite de quatro cópias é por identidade, inclusive entre variantes; gravar exige 60 cartas válidas.
- Importe e exporte listas de texto com `God: ID`, `Domain: ID` e `quantidade ID` por linha. A importação valida tudo antes de substituir o rascunho. Os seis decks iniciais continuam sendo os baralhos configuráveis usados pelo jogo.
- No mobile, os botões **Coleção** e **Deck** alternam as áreas, preservando os filtros e o rascunho.

## Desfazer e Refazer

Os botões do cabeçalho e os atalhos `⌘Z` / `⌘⇧Z` (`Ctrl+Z` / `Ctrl+Shift+Z`, ou `Ctrl+Y`) percorrem o histórico em memória. Configuração de áudio, decks, HUD, telas, interações e cosméticos compartilham até 100 passos. Texto e motivo do livro de regras têm histórico separado. Cada arraste constitui um passo; digitação contínua no mesmo campo é agrupada. Uma nova edição após desfazer descarta a sequência de refazer.

O Card Forge tem também botões próprios e até 50 passos por carta, cobrindo campos, estágios e enquadramento/zoom/upload da arte. Trocar de carta começa um novo histórico. O estado do item de um lote mantém sua referência ao desfazer.

Desfazer altera o rascunho e a prévia. Não reverte arquivos gravados automaticamente: para gravar um estado anterior, desfaça, revise o novo diff e aprove. Uploads já importados permanecem na biblioteca. O histórico da sessão se encerra ao recarregar a página; os backups de gravações aprovadas continuam em disco.

## Prévia e edição

Os editores usam a própria interface da arena em um iframe local. As cenas são montadas em partidas de prévia, sem persistir preferências pessoais. A cena de resultado é uma demonstração visual, sem declarar vitória numa partida real.

Selecione uma área pelo contorno ou lista. Arraste ou use os campos de posição, largura/altura, escala, opacidade, camada, visibilidade, fonte, tamanho e cores. A posição livre usa porcentagens do contêiner original do elemento. Sem ajuste, permanece o layout responsivo do jogo. Desktop e mobile têm perfis separados; o perfil mobile entra até 700 px. A prévia usa 1280 × 900 ou 390 × 844, reduzidos para caber na prancheta.

Imagens de fundo podem ser enviadas em PNG, WebP ou GIF. Textos fixos autorizados, como subtítulo e botão da abertura, podem ser editados em inglês. Números, fases, regras de cartas, nomes e estado da partida continuam vindo dos dados e do motor. O Card Forge edita conteúdo de carta.

**Restaurar este componente** remove o ajuste do componente e formato selecionados. A prévia muda imediatamente; o jogo usa o arquivo gravado no próximo carregamento.

## Interações

A lista em `data/presentation-schema.json` é o registro central de componentes, telas, eventos e animações. Os nomes e seletores são definidos pelo projeto; uploads não executam JavaScript, HTML, SVG ou CSS arbitrário.

Cada interação pode definir som, volume relativo, animação, arquivo visual, duração de 100 a 5.000 ms, intensidade e ativação. Prioridade: par de cartas → origem → configuração geral → comportamento padrão. Campos ausentes herdam; som nulo significa silêncio; desativação suprime a apresentação daquele evento. Remover o ajuste restaura a herança.

Há 11 animações além da opção sem animação: pulso, brilho, impacto, elevar, virar, flash, deslocamento, aparecer, zoom, giro e onda. FX visuais aceitam PNG, WebP, GIF, WebM e MP4, até 20 MB por arquivo. Vídeos são silenciosos; o som é escolhido separadamente. Animações e arquivos visuais respeitam movimento reduzido e a preferência de efeitos do jogador.

`acao:*` informa que um comando foi aceito — pode abrir uma escolha antes da execução. `resolucao:*` informa o início da resolução de uma ação, que ainda pode perder um alvo válido. `efeito:*` identifica uma operação em resolução; `evento:*`, os eventos emitidos pelo motor. O editor não cria novas regras nem transforma uma animação em efeito mecânico.

A integração inclui ações da IA. Observadores recebem descritores copiados, sem o estado mutável nem identidades de cartas ocultas. A camada visual só resolve identidade de cartas públicas e da própria mão. Exceções de um observador não interrompem o motor. FX de arquivo compartilham o volume de efeitos e um limite de oito reproduções simultâneas; músicas têm volume independente.

## Biblioteca de sons

115 WAVs de **Common Sounds — Saint Seiya: Soldiers’ Soul** foram importados e decodificados no navegador. A fonte se identifica como **PC / Computer**; não foi comprovado que os arquivos sejam idênticos aos do PS3. Nenhum som desse banco é imposto como padrão: é possível ouvir e escolher no painel.

Fonte: [Common Sounds](https://sounds.spriters-resource.com/pc_computer/saintseiyasoldierssoul/asset/444581/). O painel também cataloga os outros 49 pacotes de personagens na [página do jogo](https://sounds.spriters-resource.com/pc_computer/saintseiyasoldierssoul/). Links de referência não são arquivos já importados. Brave Soldiers tem referência de vídeo; Sanctuary Battle tem referência de trilha. Os FX isolados dessas duas versões ainda não estão disponíveis na biblioteca local.

Áudios ficam em `MUSIC/fx/<origem>/`; visuais, em `star-hill/assets/`. Ambos ficam fora do Git. A importação valida extensão, assinatura, limites e destino. ZIPs de áudio são validados integralmente antes de criar o primeiro arquivo e não preservam caminhos internos. Reimportar conteúdo idêntico não duplica arquivos.

## Persistência e revisão

`data/game-settings.json` armazena áudio, cosméticos, overrides de decks e apresentação; `data/presentation-schema.json` mantém o registro de capacidades. O catálogo de cartas e o livro oficial preservam suas fontes próprias.

1. Edite o rascunho e teste na prévia.
2. Selecione **Revisar alterações**.
3. Confira o diff e selecione **Aprovar e gravar**.

O backend valida os dados e emite uma proposta de dez minutos. A aplicação grava somente o texto revisado, verifica a revisão do arquivo novamente e preserva o anterior em `star-hill/historico/`. Mudanças concorrentes bloqueiam a gravação. Cancelar a revisão não grava o rascunho. O histórico é local e fica fora do Git.

Gravações são aceitas apenas pela origem local do servidor ligado a 127.0.0.1. Não há autenticação para hospedagem pública; este backend é para uso local. O artefato STAR HILL publicado anteriormente permanece independente, com seu iframe em sandbox e sua CSP originais.

## Verificação

```bash
python3 card-forge/serve.py --selftest
python3 tools/test-star-hill.py
node --test tools/test-presentation.mjs tools/test-rules-v2.mjs tools/test-card-presentation.mjs tools/test-battle-guide.mjs
node --test tools/test-star-hill-editors.mjs
python3 tools/test-star-hill-editors-ui.py
python3 tools/test-star-hill-ui.py
python3 tools/test-designers-ui.py
python3 tools/test-audio-playlist.py
python3 tools/test-arena-ui.py
python3 tools/test-ui-v2.py
```

Os testes de navegador requerem Python Playwright e Chrome. Capturas ficam em `card-forge/out/qa-star-hill/`, fora do Git. Os testes do backend usam diretório temporário; os de interface revisam e cancelam os diffs. Nenhum teste modifica o catálogo real, as regras oficiais ou a configuração real.
