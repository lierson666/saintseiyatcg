#!/usr/bin/env python3
"""Guarda de deploy (docs/platform-4.0.md): falha fechado se o alvo não for exatamente o declarado em deploy/environments.json.

  deploy-guard.py check --env playtest --host mamaco-dev --path /home/dev/saintseiyatcg/playtest
  deploy-guard.py stamp --env playtest   (grava playtest/build.json: a identidade do build que a tela mostra)

Official nunca passa: a promoção não existe nesta fase e exige autorização explícita do autor.
"""
import argparse, json, subprocess, sys, time
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parent.parent
ENGINE_VERSION = '3.0'


def refuse(msg):
    print(f'deploy-guard: RECUSADO: {msg}', file=sys.stderr)
    sys.exit(2)


def environments(path):
    try:
        envs = json.loads(Path(path).read_text())
    except (OSError, ValueError) as e:
        refuse(f'não consegui ler {path}: {e}')
    envs.pop('_nota', None)
    return envs


def inside(path, parent):
    return PurePosixPath(path) == PurePosixPath(parent) or PurePosixPath(parent) in PurePosixPath(path).parents


def check(envs, env, host, paths):
    target = envs.get(env)
    if not target:
        refuse(f'ambiente desconhecido: {env!r}')
    if not target.get('deployable'):
        refuse(f'{env} não aceita deploy (status {target.get("status")}).')
    if host != target['host']:
        refuse(f'host {host!r} não é o host de {env} ({target["host"]!r}).')
    if not paths:
        refuse('nenhum caminho de destino informado.')
    protected = [e['site_dir'] for name, e in envs.items() if name != env]
    for p in paths:
        if '..' in PurePosixPath(p).parts or not p.startswith('/'):
            refuse(f'caminho ambíguo: {p!r}')
        if not inside(p, target['site_dir']):
            refuse(f'{p} está fora de {target["site_dir"]}.')
        if any(inside(p, other) for other in protected):
            refuse(f'{p} está dentro de um ambiente protegido.')
    print(f'deploy-guard: ok {env} ({target["channel"]}) em {host}: {len(paths)} caminho(s)')


def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()


def stamp(envs, env):
    target = envs.get(env)
    if not target or not target.get('deployable'):
        refuse(f'sem build para {env!r}.')
    index = json.loads((ROOT / 'data/registry/index.json').read_text())
    build = {'environment': env, 'channel': target['channel'], 'version': target['version'],
             'commit': git('rev-parse', 'HEAD'), 'dirty': bool(git('status', '--porcelain', '--', '.')),
             'engine': ENGINE_VERSION, 'rules': index['current']['rules'], 'catalog': index['current']['catalog'],
             'built_at': int(time.time())}
    (ROOT / 'playtest/build.json').write_text(json.dumps(build, indent=1) + '\n')
    print(f'deploy-guard: build {build["version"]} {build["commit"][:8]} carimbado')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['check', 'stamp'])
    ap.add_argument('--env', required=True)
    ap.add_argument('--host', default='')
    ap.add_argument('--path', action='append', default=[])
    ap.add_argument('--config', default=ROOT / 'deploy/environments.json')
    a = ap.parse_args()
    envs = environments(a.config)
    if a.cmd == 'check':
        check(envs, a.env, a.host, a.path)
    else:
        stamp(envs, a.env)


if __name__ == '__main__':
    main()
