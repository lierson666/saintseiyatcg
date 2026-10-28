#!/usr/bin/env python3
# Servidor estático de desenvolvimento: igual ao `python3 -m http.server`, mas com `Cache-Control: no-cache`,
# para o navegador revalidar os módulos (engine, UI) a cada carga e nunca rodar uma versão antiga da regra.
# Uso: python3 tools/serve-dev.py [porta]  (padrão 8030), a partir da raiz do repositório.
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8030
ThreadingHTTPServer(('', port), partial(NoCache, directory='.')).serve_forever()
