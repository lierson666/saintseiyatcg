"""Duelo online e cache no bloco saintseiyatcg.com do Caddyfile (rodar como root em /opt/casamamaco).
1. /arena/* vai para o arena-server (SSE + ações), antes do portão de login (o arena-server confere a sessão).
2. HTML, JS, CSS e JSON com Cache-Control: no-cache: o navegador revalida (ETag) e não mistura arquivos velhos e novos
   da engine (um core.js antigo do cache com um ares.js novo travou a arena em 29/10/2026).
Escreve no mesmo arquivo (mesmo inode) para o bind mount do container ver a mudança. Faz backup antes."""
import shutil, sys, time
path = '/opt/casamamaco/Caddyfile'
text = open(path).read()
if 'arena-server:8090' in text:
    sys.exit('já aplicado')
start = text.index('saintseiyatcg.com {')
at = text.rindex('\n', 0, text.index('handle /api/*', start)) + 1  # antes do /api e do portão
block = """\thandle /arena/* {
\t\treverse_proxy arena-server:8090
\t}
\t@fresh path / *.html */ *.js *.mjs *.css *.json
\theader @fresh Cache-Control "no-cache"
"""
shutil.copy(path, f'{path}.bak-{time.strftime("%Y%m%d-%H%M%S")}')
with open(path, 'r+') as f:
    f.seek(0); f.write(text[:at] + block + text[at:]); f.truncate()
print('OK')
