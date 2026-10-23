# Áudio do jogo

Configuração aprovada pelo autor em 23/10/2026. Os arquivos são lidos da pasta local `MUSIC/`, sincronizada com o Google Drive e fora do Git. Os originais não são modificados.

- Menu e abertura: `PEGASUS TYU SEI KEN.mp3`, em loop após a primeira interação do jogador.
- Início de cada duelo: `battle`, arquivo MP3 sem extensão. Toca uma vez, inclusive ao escolher Duel again.
- Depois da abertura: as outras cinco músicas da pasta tocam em ordem aleatória. Cada ciclo passa por todas antes de embaralhar novamente; a primeira do próximo ciclo é diferente da última que acabou.
- O menu volta a Pegasus ao sair da partida. A trilha anterior é interrompida, sem sobrepor dois arquivos. Volume e mudo acompanham as opções de música; efeitos sonoros mantêm seu controle próprio.

As cinco faixas da sequência são `GLIDESACRIFICE.mp3`, `PEGASUS TYU SEI KEN.mp3`, `SEIYAxRADAMANTYS.mp3`, `TENKAIHEN.mp3` e `UNDERTHEWOODOFTHEWORLDTREE.mp3`. A lista fica em `BATTLE_PLAYLIST`, em `playtest/audio.js`. Novas faixas devem ser acrescentadas à lista quando entrarem no projeto.

Verificação com Playwright Python e Chrome, usando o servidor local:

```bash
python3 tools/test-audio-playlist.py
```

O cenário reproduz e decodifica os arquivos, antecipa o fim da abertura pelo relógio real do áudio e percorre dois ciclos de músicas. Confere ausência de repetição, volume/mudo, novo duelo, retorno ao menu e descarte dos eventos da trilha anterior.
