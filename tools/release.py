#!/usr/bin/env python3
"""Candidato a release (docs/platform-4.0.md). Prepara e compara; nunca promove.

  release.py prepare     roda as validações e grava data/releases/<id>.json + index.json
  release.py compare     mostra Official x Playtest (só leitura)
  release.py promote     sempre recusa: a promoção ao Official não existe nesta fase e exige aprovação explícita do autor
"""
import argparse, json, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'sanctuary-api'))
OUT = ROOT / 'data/releases'
ENGINE_VERSION = '3.0'


def run(*cmd):
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)


def git(*args):
    return run('git', *args).stdout.strip()


def validate(skip_tests):
    known = set((ROOT / 'deploy/known-failures.txt').read_text().split())
    report = {'registry': run(sys.executable, 'tools/build-registry.py', '--check').returncode == 0, 'known_failures': sorted(known), 'failed': [], 'passed': 0, 'tests_run': not skip_tests}
    if not skip_tests:
        tests = sorted(str(t.relative_to(ROOT)) for t in ROOT.glob('tools/test-*.mjs')) + ['arena-server/test-arena.mjs']
        for test in tests:
            if run('node', test).returncode == 0:
                report['passed'] += 1
            elif test not in known:
                report['failed'].append(test)
        api = run('python3.12', '-W', 'ignore', '-m', 'unittest', 'sanctuary-api/test_server.py', 'sanctuary-api/test_cosmo.py')
        report['api_tests'] = api.returncode == 0
    report['ready'] = report['registry'] and not report['failed'] and report.get('api_tests', False)
    return report


def prepare(version, skip_tests):
    envs = json.loads((ROOT / 'deploy/environments.json').read_text())
    index_path = OUT / 'index.json'
    index = json.loads(index_path.read_text()) if index_path.exists() else {'releases': []}
    previous = index['releases'][-1] if index['releases'] else None
    registry = json.loads((ROOT / 'data/registry/index.json').read_text())['current']
    commit, dirty = git('rev-parse', 'HEAD'), bool(git('status', '--porcelain', '--', '.'))
    since = f'{previous["commit"]}..HEAD' if previous else 'HEAD~20..HEAD'
    now = int(time.time())
    release_id = f'rel-{time.strftime("%Y%m%d-%H%M%S", time.gmtime(now))}-{commit[:8]}'
    report = validate(skip_tests)
    if dirty:
        report['ready'] = False  # árvore suja não é reproduzível
    from_schema = run(sys.executable, '-c', 'import sys;sys.path.insert(0,"sanctuary-api");import cosmo;print(cosmo.SCHEMA_VERSION)').stdout.strip()
    manifest = {
        'id': release_id, 'version': version or envs['playtest']['version'], 'channel': 'release-candidate', 'commit': commit, 'dirty': dirty,
        'rules': registry['rules'], 'catalog': registry['catalog'], 'engine': ENGINE_VERSION, 'content': registry.get('catalog_version'), 'db_schema': from_schema,
        'created_at': now, 'published_at': None, 'changelog': git('log', '--format=%h %s', since).splitlines(), 'validation': report,
        'rollback': previous['id'] if previous else None, 'approval': {'status': 'pending', 'by': None, 'at': None},
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f'{release_id}.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n')
    index['releases'].append({k: manifest[k] for k in ('id', 'version', 'channel', 'commit', 'rules', 'catalog', 'created_at')} | {'ready': report['ready'], 'approval': 'pending'})
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=1) + '\n')
    print(f'{release_id}: pronto={report["ready"]} falhas novas={report["failed"]} aprovação=pending')
    return 0 if report['ready'] else 1


def compare():
    envs = json.loads((ROOT / 'deploy/environments.json').read_text())
    registry = json.loads((ROOT / 'data/registry/index.json').read_text())['current']
    print(json.dumps({'official': {'status': envs['official'].get('status'), 'route': envs['official']['route'], 'release': None},
                      'playtest': {'version': envs['playtest']['version'], 'route': envs['playtest']['route'], 'commit': git('rev-parse', 'HEAD'), 'rules': registry['rules'], 'catalog': registry['catalog']}}, indent=1))
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['prepare', 'compare', 'promote'])
    ap.add_argument('--version')
    ap.add_argument('--skip-tests', action='store_true')
    a = ap.parse_args()
    if a.cmd == 'promote':
        print('release: RECUSADO: promoção ao Official não implementada; exige aprovação explícita do autor.', file=sys.stderr)
        return 3
    return prepare(a.version, a.skip_tests) if a.cmd == 'prepare' else compare()


if __name__ == '__main__':
    sys.exit(main())
