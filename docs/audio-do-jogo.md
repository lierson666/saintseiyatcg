# Áudio do jogo

Configuração aprovada pelo autor em 23/10/2026. Os arquivos são lidos da pasta local `MUSIC/`, sincronizada com o Google Drive e fora do Git. Os originais não são modificados.

- Menu e abertura: `PEGASUS TYU SEI KEN.mp3`, em loop após a primeira interação do jogador.
- Início de cada duelo: `battle`, arquivo MP3 sem extensão. Toca uma vez, inclusive ao escolher Duel again.
- Depois da abertura: as outras cinco músicas da pasta tocam em ordem aleatória. Cada ciclo passa por todas antes de embaralhar novamente; a primeira do próximo ciclo é diferente da última que acabou.
- O menu volta a Pegasus ao sair da partida. A trilha anterior é interrompida, sem sobrepor dois arquivos. Volume e mudo acompanham as opções de música; efeitos sonoros mantêm seu controle próprio.

As cinco faixas da sequência são `GLIDESACRIFICE.mp3`, `PEGASUS TYU SEI KEN.mp3`, `SEIYAxRADAMANTYS.mp3`, `TENKAIHEN.mp3` e `UNDERTHEWOODOFTHEWORLDTREE.mp3`. A seleção fica em `data/game-settings.json`, editável no [STAR HILL](star-hill.md). `BATTLE_PLAYLIST`, em `playtest/audio.js`, mantém o padrão de reserva. A faixa de abertura é excluída da playlist pelo painel, backend e reprodutor.

O botão de áudio do menu e da HUD abre controles de música, FX e mudo durante a partida, sem pausar ou gastar AÇÃO. A preferência pessoal persiste no navegador; os volumes do STAR HILL são padrões para jogadores sem preferências salvas.

A biblioteca inclui 115 FX Common Sounds de Soldiers’ Soul, com origem PC identificada e seleção individual. FX de arquivo substituem os sintetizados quando escolhidos. Interações por carta/par também podem ter sons, animações e arquivos visuais; veja os limites e a procedência na documentação do STAR HILL.

Verificação com Playwright Python e Chrome, usando o servidor local:

```bash
python3 tools/test-audio-playlist.py
```

O cenário reproduz e decodifica os arquivos, antecipa o fim da abertura pelo relógio real do áudio e percorre dois ciclos de músicas. Confere ausência de repetição, volume/mudo, novo duelo, retorno ao menu e descarte dos eventos da trilha anterior.
