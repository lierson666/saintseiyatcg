#!/usr/bin/env python3
# Servidor estático de desenvolvimento: igual ao `python3 -m http.server`, mas com `Cache-Control: no-cache`,
# para o navegador revalidar os módulos (engine, UI) a cada carga e nunca rodar uma versão antiga da regra.
# Uso: python3 tools/serve-dev.py [porta]  (padrão 8030), a partir da raiz do repositório.
# Com SANCTUARY_URL=http://127.0.0.1:8091, repassa /api/* a um sanctuary-api local (login, decks, rank).
import os, sys, urllib.error, urllib.request
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


API = os.environ.get('SANCTUARY_URL')


class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def proxy(self):
        body = self.rfile.read(int(self.headers.get('Content-Length') or 0)) or None
        req = urllib.request.Request(API + self.path, body, method=self.command,
                                     headers={k: v for k, v in self.headers.items() if k.lower() in ('cookie', 'content-type', 'origin')})
        try:
            r = urllib.request.urlopen(req)
        except urllib.error.HTTPError as e:
            r = e
        data = r.read()
        self.send_response(r.status)
        for k, v in r.headers.items():
            if k.lower() in ('content-type', 'set-cookie', 'location'):
                self.send_header(k, v)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def handle_api(self, fallback):
        return self.proxy() if API and self.path.startswith('/api/') else fallback()

    def do_GET(self): self.handle_api(super().do_GET)
    def do_POST(self): self.handle_api(lambda: self.send_error(405))
    def do_PATCH(self): self.handle_api(lambda: self.send_error(405))
    def do_PUT(self): self.handle_api(lambda: self.send_error(405))
    def do_DELETE(self): self.handle_api(lambda: self.send_error(405))


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8030
ThreadingHTTPServer(('', port), partial(NoCache, directory='.')).serve_forever()
