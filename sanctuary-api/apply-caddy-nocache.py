"""Páginas HTML do saintseiyatcg.com sem cache velho: o navegador revalida sempre (Cache-Control: no-cache).
Motivo: um tester abriu o /login/ antigo do cache e o cadastro falhou ("Choose your country."). Rodar como root."""
import shutil, sys, time
path = '/opt/casamamaco/Caddyfile'
text = open(path).read()
if '@pages path' in text:
    sys.exit('já aplicado')
start = text.index('saintseiyatcg.com {')
at = text.rindex('\n', 0, text.index('root * /srv/saintseiyatcg', start)) + 1
block = """\t@pages path / *.html */
\theader @pages Cache-Control "no-cache"
"""
shutil.copy(path, f'{path}.bak-{time.strftime("%Y%m%d-%H%M%S")}')
with open(path, 'r+') as f:
    f.seek(0); f.write(text[:at] + block + text[at:]); f.truncate()
print('OK')
