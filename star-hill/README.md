# STAR HILL

Painel local de administração do Saint Seiya TCG. Abra `http://localhost:8765/star-hill/` com o servidor do Card Forge ativo.

Uso, prévias, arquivos, limites e testes: [documentação do STAR HILL](../docs/star-hill.md).

## Aplicativo para Mac

```bash
python3 star-hill/macos/install.py
open "$HOME/Applications/STAR HILL.app"
```

Janela nativa com Card Forge integrado, editor de decks, HUD, telas, interações, áudio, cosméticos e regras. O servidor local inicia quando necessário. Requer macOS 13+, Apple Silicon, Python do sistema e ferramentas de linha de comando do Xcode para compilar.

Para atualizar o executável, feche o aplicativo e execute `python3 star-hill/macos/install.py --update`. O instalador preserva a versão anterior em `~/Applications/.star-hill-backups/`. Os arquivos do projeto continuam na pasta original; ela precisa estar disponível no Google Drive.

Os editores têm **Desfazer / Refazer**, com `⌘Z` / `⌘⇧Z` no Mac e `Ctrl+Z` / `Ctrl+Shift+Z` no navegador. São operações no rascunho; a gravação continua passando pela revisão do diff.
