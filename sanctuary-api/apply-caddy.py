"""Põe /api/* e o portão de login no bloco saintseiyatcg.com do Caddyfile (rodar como root em /opt/casamamaco).
Escreve no mesmo arquivo (mesmo inode) para o bind mount do container ver a mudança. Faz backup antes."""
import shutil, sys, time
path = '/opt/casamamaco/Caddyfile'
text = open(path).read()
if 'sanctuary-api:8080' in text:
    sys.exit('já aplicado')
start = text.index('saintseiyatcg.com {')
at = text.rindex('\n', 0, text.index('root * /srv/saintseiyatcg', start)) + 1  # início da linha do root
block = """\thandle /api/* {
\t\treverse_proxy sanctuary-api:8080
\t}
\t@gated path /playtest /playtest/* /data/* /card-forge/* /CARD-TEMPLATE/*
\tforward_auth @gated sanctuary-api:8080 {
\t\turi /api/auth/check
\t}
"""
shutil.copy(path, f'{path}.bak-{time.strftime("%Y%m%d-%H%M%S")}')
with open(path, 'r+') as f:
    f.seek(0); f.write(text[:at] + block + text[at:]); f.truncate()
print('OK')
