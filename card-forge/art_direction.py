"""Direção de arte salva por carta e por variante.

Camada local e separada do catálogo: nunca toca em data/cards.json nem em caminho_imagem.
Aprovar uma direção não troca a arte da carta; a arte padrão só muda por decisão do autor, fora daqui.
"""
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parent.parent
STORE = Path(__file__).with_name("art-direction") / "decisions.json"
CARDS = ROOT / "data" / "cards.json"
VARIANTS = {"default", "manga", "anime", "narrative", "symbolic", "character", "effect", "equipment", "promo"}
REVIEW = {"pendente", "aceita", "editada", "rejeitada", "revisar-depois"}
ENTRY_KEYS = {"params", "prompt", "prompt_version", "nature"}


class Conflict(Exception):
    """A variante já aprovada só muda com pedido explícito."""


def load(path=STORE):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {"versao": 1, "cartas": {}}


def known_ids(path=CARDS):
    return {card["id"] for card in json.loads(Path(path).read_text(encoding="utf-8"))["cartas"]}


def apply(store, payload, ids, now=None):
    """Aplica um pedido ao conteúdo do arquivo e devolve a carta alterada."""
    card_id = payload.get("card_id")
    if card_id not in ids:
        raise ValueError("Salve a carta no catálogo antes de guardar a direção de arte.")
    now = now or datetime.now(timezone.utc).isoformat(timespec="seconds")
    card = store.setdefault("cartas", {}).setdefault(card_id, {"variants": {}})
    if "review" in payload:
        status = (payload["review"] or {}).get("status")
        if status not in REVIEW:
            raise ValueError("Status de revisão inválido.")
        card["review"] = {"status": status, "em": now}
    if "entry" in payload:
        variant = payload.get("variant")
        if variant not in VARIANTS:
            raise ValueError("Variante de arte inválida.")
        entry = payload["entry"]
        if not isinstance(entry, dict) or set(entry) - ENTRY_KEYS:
            raise ValueError("A direção de arte só guarda parâmetros, prompt, versão e natureza.")
        old = card["variants"].get(variant)
        if old and old.get("approved") and not payload.get("replace_approved"):
            raise Conflict(variant)
        card["variants"][variant] = {**entry, "approved": bool(payload.get("approve")), "em": now}
    return card


def get(handler):
    card_id = parse_qs(urlsplit(handler.path).query).get("card", [""])[0]
    return handler.reply(200, load().get("cartas", {}).get(card_id, {"variants": {}}))


def post(handler, raw, atomic_write):
    try:
        payload = json.loads(raw)
        store = load()
        card = apply(store, payload, known_ids())
    except Conflict:
        return handler.reply(409, {"conflict": True, "erro": "Esta variante já está aprovada."})
    except (ValueError, TypeError, AttributeError) as error:
        return handler.reply(400, {"erro": str(error)})
    atomic_write(STORE, (json.dumps(store, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    return handler.reply(200, {"card": card})
