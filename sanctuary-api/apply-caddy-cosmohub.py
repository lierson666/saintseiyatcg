"""Cosmo Hub público em /cosmohub (autor, 08/11/2026): rodar como root em /opt/casamamaco.
O Hub lê o registro de cartas (/data/registry), as molduras (/CARD-TEMPLATE) e as artes (/card-forge/art-web);
esses caminhos saem do portão de login. Arte provisória de terceiros (-ref) continua só para quem entrou.
Valida no container antes de recarregar; se a validação falhar, devolve o arquivo antigo.
Escreve no mesmo arquivo (mesmo inode) para o bind mount do container ver a mudança. Faz backup antes."""
import shutil, subprocess, sys, time
path = '/opt/casamamaco/Caddyfile'
CADDY = 'casamamaco-caddy-1'
text = open(path).read()
old = '\t@gated path /playtest /playtest/* /data/* /card-forge/* /CARD-TEMPLATE/*\n'
new = """\t@gated {
\t\tpath /playtest /playtest/* /data/* /card-forge/* /CARD-TEMPLATE/*
\t\tnot path /data/registry/* /CARD-TEMPLATE/*
\t\tnot {
\t\t\tpath /card-forge/art-web/*
\t\t\tnot path_regexp -ref\\.
\t\t}
\t}
"""
if new in text:
    sys.exit('já aplicado')
if text.count(old) != 1:
    sys.exit('linha do @gated não encontrada: confira o Caddyfile à mão')
backup = f'{path}.bak-{time.strftime("%Y%m%d-%H%M%S")}'
shutil.copy(path, backup)
with open(path, 'r+') as f:
    f.seek(0); f.write(text.replace(old, new)); f.truncate()
check = subprocess.run(['docker', 'exec', CADDY, 'caddy', 'validate', '--config', '/etc/caddy/Caddyfile', '--adapter', 'caddyfile'], capture_output=True, text=True)
if check.returncode:
    with open(path, 'r+') as f:
        f.seek(0); f.write(text); f.truncate()
    sys.exit('Caddyfile inválido, voltei o anterior:\n' + check.stderr[-800:])
subprocess.run(['docker', 'exec', CADDY, 'caddy', 'reload', '--config', '/etc/caddy/Caddyfile', '--adapter', 'caddyfile'], check=True)
print('OK — backup em', backup)
