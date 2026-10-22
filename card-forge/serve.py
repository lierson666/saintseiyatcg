"""Servidor local do card-forge (só stdlib). Serve a raiz do projeto e grava edições.

Uso (da raiz do projeto):  python3 card-forge/serve.py   ->  http://localhost:8765/card-forge/
Auto-teste do formatador:  python3 card-forge/serve.py --selftest

Endpoints (só 127.0.0.1):
  POST /api/card              {card}  substitui a carta pelo id em data/cards.json (ou adiciona se nova)
  POST /api/project/<id>      {...}   grava card-forge/projects/<id>.json (subtítulo, flavour, enquadramento da arte)
  POST /api/art/<id>          PNG/JPG grava card-forge/art/<id>.<ext> (fica fora do git)
"""
import json
import os
import re
import sys
import tempfile
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CARDS = ROOT / "data" / "cards.json"
FORGE = ROOT / "card-forge"
ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
MAX_BODY = 40 * 1024 * 1024


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
        indent = len(text[: span[0]]) - len(text[: span[0]].rstrip(" "))
        new = text[: span[0]] + fmt(card, indent) + text[span[1]:]
    else:
        m = re.search(r'"cartas":\s*\[', text)
        _, end = json.JSONDecoder().raw_decode(text, m.end() - 1)
        close = text.rindex("]", 0, end)
        body = text[:close].rstrip()
        new = body + ",\n    " + fmt(card, 4) + "\n  " + text[close:]
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

    def do_POST(self):
        try:
            n = int(self.headers.get("Content-Length", 0))
            if n <= 0 or n > MAX_BODY:
                return self.reply(413, {"erro": "corpo vazio ou grande demais"})
            raw = self.rfile.read(n)
            parts = self.path.strip("/").split("/")
            if parts == ["api", "card"]:
                card = json.loads(raw)
                if not isinstance(card, dict) or not ID_RE.match(str(card.get("id", ""))):
                    return self.reply(400, {"erro": "id inválido"})
                text = CARDS.read_text(encoding="utf-8")
                atomic_write(CARDS, upsert_card(text, card).encode("utf-8"))
                return self.reply(200, {"ok": True})
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
        except (ValueError, KeyError, AssertionError) as e:
            return self.reply(400, {"erro": str(e)})


def selftest():
    text = CARDS.read_text(encoding="utf-8")
    data = json.loads(text)
    for c in data["cartas"]:
        assert upsert_card(text, c) == text, f"formatador mudou {c['id']}"
    novo = dict(data["cartas"][0], id="zz-teste")
    t2 = upsert_card(text, novo)
    d2 = json.loads(t2)
    assert len(d2["cartas"]) == len(data["cartas"]) + 1 and d2["cartas"][-1]["id"] == "zz-teste"
    assert d2["total_cartas"] == len(d2["cartas"])
    print(f"selftest ok: {len(data['cartas'])} cartas regravadas sem diff; append ok")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest()
    else:
        port = int(os.environ.get("PORT", 8765))
        print(f"card-forge em http://localhost:{port}/card-forge/", flush=True)
        ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
