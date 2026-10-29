"""Servidor local do card-forge (só stdlib). Serve a raiz do projeto e grava edições.

Uso (da raiz do projeto):  python3 card-forge/serve.py   ->  http://localhost:8765/card-forge/
Auto-teste do formatador:  python3 card-forge/serve.py --selftest

Endpoints (só 127.0.0.1):
  POST /api/card              {card}  substitui a carta pelo id em data/cards.json (ou adiciona se nova)
  POST /api/cards             [cards] o mesmo para um lote, numa escrita só
  POST /api/export/<nome>     PNG     grava card-forge/out/<nome>.png (fora do git)
  POST /api/project/<id>      {...}   grava card-forge/projects/<id>.json (subtítulo, flavour, enquadramento da arte)
  POST /api/art/<id>          PNG/JPG grava card-forge/art/<id>.<ext> (fica fora do git)
"""
import json
import io
import importlib.util
import os
import re
import sys
import tempfile
import subprocess
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from zipfile import BadZipFile
from urllib.parse import unquote, urlsplit
from xml.etree.ElementTree import ParseError

ROOT = Path(__file__).resolve().parents[1]
CARDS = ROOT / "data" / "cards.json"
FORGE = ROOT / "card-forge"
ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
MAX_BODY = 40 * 1024 * 1024
LOCAL_HOSTS = {"localhost", "127.0.0.1"}
_hill_spec = importlib.util.spec_from_file_location('star_hill', Path(__file__).with_name('star_hill.py'))
star_hill = importlib.util.module_from_spec(_hill_spec)
_hill_spec.loader.exec_module(star_hill)
_studio_spec = importlib.util.spec_from_file_location("layout_studio", Path(__file__).with_name("layout_studio.py"))
layout_studio = importlib.util.module_from_spec(_studio_spec)
_studio_spec.loader.exec_module(layout_studio)


def fmt(value, indent, expand=False):
    """Mesmo estilo do cards.json: indent 2, listas curtas de primitivos numa linha só (habilidades_en sempre abertas)."""
    pad = " " * indent
    if isinstance(value, dict):
        if not value:
            return "{}"
        items = [f'{pad}  {json.dumps(k, ensure_ascii=False)}: {fmt(v, indent + 2, k == "habilidades_en")}' for k, v in value.items()]
        return "{\n" + ",\n".join(items) + "\n" + pad + "}"
    if isinstance(value, list):
        if not value:
            return "[]"
        if not expand and all(not isinstance(v, (dict, list)) for v in value):
            inline = "[" + ", ".join(json.dumps(v, ensure_ascii=False) for v in value) + "]"
            if indent + len(inline) <= 80:
                return inline
        return "[\n" + ",\n".join(pad + "  " + fmt(v, indent + 2) for v in value) + "\n" + pad + "]"
    return json.dumps(value, ensure_ascii=False)


def card_span(text, card_id):
    """(início, fim) do objeto da carta dentro do texto de cards.json, ou None."""
    m = re.search(r'\{\s*"id":\s*' + re.escape(json.dumps(card_id)), text)
    if not m:
        return None
    _, end = json.JSONDecoder().raw_decode(text, m.start())
    return m.start(), end


def upsert_card(text, card):
    """Devolve o novo texto de cards.json com a carta trocada/adicionada, mexendo só no bloco dela."""
    data = json.loads(text)
    span = card_span(text, card["id"])
    if span:
        # Sem alteração de dados, preserva também a formatação original do bloco.
        if json.loads(text[span[0]:span[1]]) == card:
            return text
        indent = len(text[: span[0]]) - len(text[: span[0]].rstrip(" "))
        new = text[: span[0]] + fmt(card, indent) + text[span[1]:]
    else:
        m = re.search(r'"cartas":\s*\[', text)
        _, end = json.JSONDecoder().raw_decode(text, m.end() - 1)
        close = text.rindex("]", 0, end)
        body = text[:close].rstrip()
        new = body + (",\n    " if data["cartas"] else "\n    ") + fmt(card, 4) + "\n  " + text[close:]
        new = re.sub(r'"total_cartas":\s*\d+', f'"total_cartas": {len(data["cartas"]) + 1}', new, count=1)
    check = json.loads(new)  # nunca grava JSON quebrado
    assert any(c["id"] == card["id"] for c in check["cartas"])
    return new


def atomic_write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=".tmp-")
    with os.fdopen(fd, "wb") as f:
        f.write(data)
    os.replace(tmp, path)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def reply(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def local_host(self):
        """Recusa nomes de fora (DNS rebinding): só localhost/127.0.0.1 leem a pasta do projeto."""
        host = self.headers.get("Host", "")
        if urlsplit("//" + host).hostname in LOCAL_HOSTS:
            return True
        self.reply(403, {"erro": "Acesse pelo endereço local (localhost ou 127.0.0.1)."})
        return False

    def do_HEAD(self):
        if self.local_host():
            super().do_HEAD()

    def do_GET(self):
        if not self.local_host():
            return
        path = self.path.split('?', 1)[0]
        if path.startswith('/api/layout-studio'):
            return layout_studio.handle(self, path)
        if path.startswith('/api/star-hill/'):
            try:
                return star_hill.get(self, path)
            except (ValueError, KeyError, TypeError) as error:
                return self.reply(400, {'erro': str(error)})
            except OSError:
                return self.reply(500, {'erro': 'Não foi possível ler os arquivos locais.'})
        return super().do_GET()

    def do_POST(self):
        if not self.local_host():
            return
        # Outro site aberto no navegador não pode gravar: o pedido tem de vir da própria página local.
        if self.headers.get("Origin") != "http://" + self.headers.get("Host", ""):
            return self.reply(403, {"erro": "Gravações só são aceitas pela interface local."})
        try:
            n = int(self.headers.get("Content-Length", 0))
            if n <= 0 or n > MAX_BODY:
                return self.reply(413, {"erro": "corpo vazio ou grande demais"})
            raw = self.rfile.read(n)
            if self.path.startswith('/api/layout-studio'):
                return layout_studio.handle(self, self.path.split('?', 1)[0], raw, atomic_write)
            if self.path.startswith('/api/star-hill/'):
                return star_hill.post(self, self.path.split('?', 1)[0], raw, atomic_write)
            parts = self.path.strip("/").split("/")
            if parts == ["api", "import-xlsx"]:
                # Leitura em memória; o arquivo de origem e o catálogo não são gravados.
                spec = importlib.util.spec_from_file_location("forge_xlsx", ROOT / "tools/import-playtest-xlsx.py")
                reader = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(reader)
                try:
                    result = reader.extract(io.BytesIO(raw), filename=Path(unquote(self.headers.get("X-File-Name", "cartas.xlsx"))).name)
                except (BadZipFile, ParseError, ValueError, KeyError, IndexError) as error:
                    return self.reply(400, {"erro": f"Planilha inválida: {error}"})
                return self.reply(200, result)
            if parts == ["api", "publish-visuals"]:
                # Olympus Arena (autor, 29/10/2026): "enviar ao jogo" é o export local card-forge/art-web
                # (tools/forge-art-web.sh). Não envia nada para servidor remoto: há artes provisórias de terceiros.
                try:
                    published = subprocess.run(
                        ['/bin/sh', str(ROOT / 'tools/forge-art-web.sh'), str(ROOT)],
                        cwd=ROOT, capture_output=True, text=True, timeout=900, check=True)
                    return self.reply(200, {"ok": True, "message": "Artes publicadas no jogo", "details": published.stdout[-900:]})
                except (subprocess.CalledProcessError, subprocess.TimeoutExpired) as error:
                    detail=(getattr(error, 'stderr', '') or str(error))[-500:]
                    return self.reply(502, {"erro": "Projeto salvo localmente, mas o envio ao jogo falhou: " + detail})
            if parts == ["api", "card"]:
                card = json.loads(raw)
                if not isinstance(card, dict) or not ID_RE.match(str(card.get("id", ""))):
                    return self.reply(400, {"erro": "id inválido"})
                text = CARDS.read_text(encoding="utf-8")
                atomic_write(CARDS, upsert_card(text, card).encode("utf-8"))
                return self.reply(200, {"ok": True})
            if parts == ["api", "cards"]:
                cards = json.loads(raw)
                if not isinstance(cards, list) or not all(isinstance(c, dict) and ID_RE.match(str(c.get("id", ""))) for c in cards):
                    return self.reply(400, {"erro": "lista de cartas inválida"})
                text = CARDS.read_text(encoding="utf-8")
                for c in cards:
                    text = upsert_card(text, c)
                atomic_write(CARDS, text.encode("utf-8"))
                return self.reply(200, {"ok": True, "n": len(cards)})
            if len(parts) == 3 and parts[:2] == ["api", "export"] and ID_RE.match(parts[2]):
                if not raw.startswith(b"\x89PNG"):
                    return self.reply(415, {"erro": "só PNG"})
                atomic_write(FORGE / "out" / f"{parts[2]}.png", raw)
                return self.reply(200, {"ok": True, "path": f"card-forge/out/{parts[2]}.png"})
            if len(parts) == 3 and parts[:2] == ["api", "project"] and ID_RE.match(parts[2]):
                proj = json.loads(raw)
                atomic_write(FORGE / "projects" / f"{parts[2]}.json",
                             (json.dumps(proj, indent=2, ensure_ascii=False) + "\n").encode("utf-8"))
                return self.reply(200, {"ok": True})
            if len(parts) == 3 and parts[:2] == ["api", "art"] and ID_RE.match(parts[2]):
                ext = {b"\x89PNG": "png", b"\xff\xd8\xff": "jpg"}
                kind = next((e for sig, e in ext.items() if raw.startswith(sig)), None)
                if not kind:
                    return self.reply(415, {"erro": "só PNG ou JPG"})
                atomic_write(FORGE / "art" / f"{parts[2]}.{kind}", raw)
                return self.reply(200, {"ok": True, "path": f"card-forge/art/{parts[2]}.{kind}"})
            return self.reply(404, {"erro": "rota desconhecida"})
        except (ValueError, KeyError, AssertionError, TypeError) as e:
            return self.reply(400, {"erro": str(e)})
        except OSError:
            return self.reply(500, {'erro': 'Não foi possível gravar o arquivo local. Verifique o acesso à pasta.'})


def selftest():
    text = CARDS.read_text(encoding="utf-8")
    data = json.loads(text)
    for c in data["cartas"]:
        assert upsert_card(text, c) == text, f"formatador mudou {c['id']}"
    original = data["cartas"][0] if data["cartas"] else {"id": "zz-origem", "nome_exibicao_en": "Teste"}
    sample = text if data["cartas"] else upsert_card(text, original)
    edited = dict(original, nome_exibicao_en=original["nome_exibicao_en"] + " · teste")
    changed = upsert_card(sample, edited)
    start, end = card_span(sample, original["id"])
    new_start, new_end = card_span(changed, original["id"])
    assert json.loads(changed[new_start:new_end]) == edited, "edição não aplicada"
    assert changed[:new_start] == sample[:start] and changed[new_end:] == sample[end:], "edição fora da carta"
    assert upsert_card(changed, edited) == changed, "edição repetida gerou diff"
    novo = dict(original, id="zz-teste")
    t2 = upsert_card(text, novo)
    d2 = json.loads(t2)
    assert len(d2["cartas"]) == len(data["cartas"]) + 1 and d2["cartas"][-1]["id"] == "zz-teste"
    assert d2["total_cartas"] == len(d2["cartas"])
    empty = dict(data, cartas=[], total_cartas=0)
    first = json.loads(upsert_card(fmt(empty, 0) + "\n", novo))
    assert first == dict(empty, cartas=[novo], total_cartas=1), "primeira carta em catálogo vazio"
    print(f"selftest ok: {len(data['cartas'])} cartas preservadas sem diff; edição, append e catálogo vazio ok")
    import http.client, threading
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    port = server.server_address[1]
    def status(method, headers, body=None):
        conn = http.client.HTTPConnection("127.0.0.1", port)
        conn.request(method, "/README.md" if method == "GET" else "/api/card", body=body, headers=headers)
        code = conn.getresponse().status
        conn.close()
        return code
    local = f"127.0.0.1:{port}"
    assert status("GET", {"Host": local}) == 200
    assert status("GET", {"Host": f"evil.example:{port}"}) == 403, "DNS rebinding"
    card = json.dumps(novo)
    assert status("POST", {"Host": local, "Content-Type": "text/plain"}, card) == 403, "POST sem Origin"
    assert status("POST", {"Host": local, "Origin": "https://evil.example"}, card) == 403, "POST de outro site"
    server.shutdown()
    assert CARDS.read_text(encoding="utf-8") == text, "cards.json mudou no teste"
    print("selftest ok: Host e Origin externos recusados")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest()
    else:
        port = int(os.environ.get("PORT", 8765))
        print(f"card-forge em http://localhost:{port}/card-forge/", flush=True)
        ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
