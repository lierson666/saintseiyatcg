"""Servidor de QA: só layouts de uma cópia temporária podem ser gravados."""
import argparse
import importlib.util
import json
import shutil
import tempfile
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('forge_serve', ROOT / 'card-forge/serve.py')
serve = importlib.util.module_from_spec(spec)
spec.loader.exec_module(serve)


def make_server(port=0):
    temp = tempfile.TemporaryDirectory(prefix='sstcg-layout-qa-')
    root = Path(temp.name)
    (root / 'data').mkdir()
    for name in ['card-layouts.json', 'card-layout-schema.json']:
        shutil.copy2(ROOT / 'data' / name, root / 'data' / name)
    for folder in ['CARD-TEMPLATE', 'playtest/assets', 'card-forge/art', 'star-hill/assets']:
        source = ROOT / folder
        if source.exists():
            target = root / folder
            target.parent.mkdir(parents=True, exist_ok=True)
            target.symlink_to(source, target_is_directory=True)

    class Handler(serve.Handler):
        def do_GET(self):
            if not self.local_host():
                return
            path = self.path.split('?', 1)[0]
            if path in ['/api/layout-studio', '/api/layout-studio/assets']:
                return serve.layout_studio.handle(self, path, root=root)
            if path == '/data/card-layouts.json':
                return self.reply(200, serve.layout_studio.read(root))
            return super().do_GET()

        def do_POST(self):
            if not self.local_host():
                return
            if self.headers.get('Origin') != 'http://' + self.headers.get('Host', ''):
                return self.reply(403, {'erro': 'Origin local obrigatório.'})
            path = self.path.split('?', 1)[0]
            if not path.startswith('/api/layout-studio/'):
                return self.reply(403, {'erro': 'QA não grava cartas, projetos, artes nem configurações.'})
            size = int(self.headers.get('Content-Length', 0))
            if not 0 < size <= 3 * 1024 * 1024:
                return self.reply(413, {'erro': 'Corpo inválido.'})
            return serve.layout_studio.handle(self, path, self.rfile.read(size), serve.atomic_write, root=root)

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    server.qa_temp = temp
    server.qa_root = root
    return server


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8766)
    args = parser.parse_args()
    server = make_server(args.port)
    print(f'QA isolado em http://localhost:{server.server_port}/card-forge/studio.html', flush=True)
    try:
        server.serve_forever()
    finally:
        server.server_close()
        server.qa_temp.cleanup()
