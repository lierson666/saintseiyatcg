"""ARMOR FORGE V1: armaduras como entidades próprias, versionadas e reutilizáveis.

Camada local e separada do catálogo: nunca toca em data/cards.json nem em caminho_imagem.
Seis tabelas em armor-forge/store.json (uma por entidade) e as imagens em armor-forge/images/.
Versão aprovada ou canônica não muda mais: qualquer alteração exige nova versão.
"""
import json
import os
import re
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(os.environ.get("ARMOR_FORGE_DIR") or Path(__file__).with_name("armor-forge"))
STORE = BASE / "store.json"
IMAGES = BASE / "images"
TABLES = ("projects", "versions", "components", "references", "bindings", "generations")
FIELD_MODES = {"auto", "manual", "absent"}
MODES = {"concept", "blueprint", "totem", "equipped", "detail", "card_art"}
CHECKS = {"silhouette", "helmet", "pauldrons", "chest", "palette", "materials", "ornaments", "proportions"}
REVIEWABLE = ("DRAFT", "IN_REVIEW")  # referência ainda pode ser escolhida; o desenho só muda em DRAFT
ALLOWED = {
    "DRAFT": {"IN_REVIEW", "ARCHIVED"},
    "IN_REVIEW": {"DRAFT", "APPROVED", "ARCHIVED"},
    "APPROVED": {"CANONICAL", "ARCHIVED"},
    "CANONICAL": {"ARCHIVED"},
    "ARCHIVED": {"RESTORE"},
}
LOCK_KEYS = {"name", "silhouette", "helmet", "pauldrons", "chest", "palette", "materials", "identifying_ornaments", "proportions", "required_components", "reference_ids"}
IMAGE_KINDS = {b"\x89PNG": ("png", "image/png"), b"\xff\xd8\xff": ("jpg", "image/jpeg")}
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
IMAGE_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,80}\.(png|jpg|webp)$")
GUARD = threading.Lock()  # o servidor é multithread: leitura, alteração e gravação vão juntas


class Locked(Exception):
    """Pedido recusado porque mudaria um desenho aprovado."""


def empty():
    return {"versao": 1, **{table: {} for table in TABLES}}


def load(path=None):
    try:
        data = json.loads(Path(path or STORE).read_text(encoding="utf-8"))
    except FileNotFoundError:
        return empty()
    for table in TABLES:
        data.setdefault(table, {})
    return data


def now_iso():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def new_id(prefix):
    return f"{prefix}-{uuid.uuid4().hex[:10]}"


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", str(text).lower()).strip("-")[:48] or "armor"


def need(table, key, what):
    row = table.get(key)
    if not row:
        raise ValueError(f"{what} não encontrado.")
    return row


def text_of(payload, key, limit=20000):
    value = payload.get(key, "")
    if not isinstance(value, str) or len(value) > limit:
        raise ValueError(f"Campo {key} inválido.")
    return value


def card_ref(payload):
    card_id = text_of(payload, "card_id", 64).strip()
    if card_id and not SLUG_RE.match(card_id):
        raise ValueError("Id de carta inválido.")
    return card_id


def validate_spec(spec):
    if not isinstance(spec, dict) or not str(spec.get("name", "")).strip():
        raise ValueError("A armadura precisa de nome oficial.")
    fields = spec.get("fields", {})
    if not isinstance(fields, dict) or any(not isinstance(f, dict) or f.get("mode") not in FIELD_MODES for f in fields.values()):
        raise ValueError("Campo de armadura com modo inválido.")


def validate_component(row):
    if row.get("mode") not in FIELD_MODES or not isinstance(row.get("value", ""), str):
        raise ValueError("Componente com modo ou texto inválido.")


def note(project, action, at, version_id=None, **extra):
    project.setdefault("history", []).append({"at": at, "action": action, "version_id": version_id, **extra})
    project["updated_at"] = at


def add_version(store, project, spec, components, at, parent=None, change_note=""):
    number = 1 + max((v["number"] for v in store["versions"].values() if v["project_id"] == project["id"]), default=0)
    version_id = f"{project['id']}-v{number}"
    store["versions"][version_id] = {"id": version_id, "project_id": project["id"], "number": number, "status": "DRAFT", "parent_version_id": parent, "spec": spec, "note": change_note, "lock": None, "created_at": at, "updated_at": at}
    for row in components:
        validate_component(row)
        cid = new_id("comp")
        store["components"][cid] = {"id": cid, "version_id": version_id, "key": row["key"], "group": row.get("group", "anatomy"), "mode": row["mode"], "value": row.get("value", ""), "required": bool(row.get("required"))}
    project["head_version_id"] = version_id
    project["name"], project["faction"] = spec.get("name", ""), spec.get("faction", "")
    return store["versions"][version_id]


def editable(version, states=("DRAFT",)):
    if version["status"] not in states:
        raise Locked(f"A versão {version['number']} está {version['status']}: crie uma nova versão para alterar.")


def op_project(store, p, at):
    validate_spec(p.get("spec"))
    wanted = p.get("id") or slug(p["spec"]["name"])
    if not SLUG_RE.match(str(wanted)):
        raise ValueError("Id de projeto inválido.")
    if p.get("id") and wanted in store["projects"]:
        raise ValueError("Este projeto já existe.")
    project_id, n = wanted, 2
    while project_id in store["projects"]:
        project_id, n = f"{wanted}-{n}", n + 1
    origin = p.get("origin") or {}
    project = {"id": project_id, "name": "", "faction": "", "head_version_id": None, "canonical_version_id": None, "origin_card_id": card_ref(origin), "origin_card_name": text_of(origin, "card_name", 200), "created_at": at, "updated_at": at, "history": []}
    store["projects"][project_id] = project
    version = add_version(store, project, p["spec"], p.get("components") or [], at)
    note(project, "projeto criado", at, version["id"], to="DRAFT")
    return {"project_id": project_id, "version_id": version["id"]}


def op_version_update(store, p, at):
    version = need(store["versions"], p.get("version_id"), "Versão")
    editable(version)
    if "spec" in p:
        validate_spec(p["spec"])
        version["spec"] = p["spec"]
        project = store["projects"][version["project_id"]]
        if project["head_version_id"] == version["id"]:
            project["name"], project["faction"] = p["spec"].get("name", ""), p["spec"].get("faction", "")
    for row in p.get("components", []):
        current = need(store["components"], row.get("id"), "Componente")
        if current["version_id"] != version["id"]:
            raise ValueError("Componente de outra versão.")
        merged = {**current, **{k: row[k] for k in ("mode", "value", "required") if k in row}}
        validate_component(merged)
        store["components"][row["id"]] = merged
    version["updated_at"] = at
    store["projects"][version["project_id"]]["updated_at"] = at
    return {"version_id": version["id"]}


def op_version_new(store, p, at):
    source = need(store["versions"], p.get("from_version_id"), "Versão")
    project = store["projects"][source["project_id"]]
    rows = [c for c in store["components"].values() if c["version_id"] == source["id"]]
    # Copia o texto, não o estado: a versão anterior e o lock dela ficam intactos.
    version = add_version(store, project, json.loads(json.dumps(source["spec"])), [dict(c) for c in rows], at, source["id"], text_of(p, "note", 2000))
    note(project, "nova versão", at, version["id"], parent=source["id"], note=version["note"], to="DRAFT")
    return {"version_id": version["id"]}


def op_transition(store, p, at):
    version = need(store["versions"], p.get("version_id"), "Versão")
    project = store["projects"][version["project_id"]]
    origin, to = version["status"], p.get("to")
    if to not in ALLOWED[origin]:
        raise ValueError(f"Não é possível ir de {origin} para {to}.")
    reason = text_of(p, "note", 2000)
    if to == "RESTORE":
        to = version.pop("status_before", "DRAFT")
        if to == "CANONICAL" and project.get("canonical_version_id"):
            to = "APPROVED"
    if to == "APPROVED":
        lock = p.get("lock")
        if not isinstance(lock, dict) or LOCK_KEYS - set(lock):
            raise ValueError("Aprovação sem Design Lock completo.")
        if not str(lock["silhouette"]).strip() or not str(lock["name"]).strip():
            raise ValueError("O lock precisa de nome e silhueta.")
        ids = lock["reference_ids"]
        rows = [store["references"].get(i) for i in ids]
        if not ids or any(not r or r["version_id"] != version["id"] or not r.get("approved") or not r.get("image") for r in rows):
            raise ValueError("Aprovar exige ao menos uma referência aprovada, com imagem, desta versão.")
        version["lock"] = {**lock, "locked_at": at}
    if to == "CANONICAL" and origin != "ARCHIVED":
        if not any(g["version_id"] == version["id"] and g["mode"] == "blueprint" and g.get("image") for g in store["generations"].values()):
            raise ValueError("Tornar canônica exige imagem de ficha técnica registrada nesta versão.")
        old = project.get("canonical_version_id")
        if old and old != version["id"]:
            if not p.get("replace_canonical"):
                raise Locked(f"A versão {store['versions'][old]['number']} já é canônica. Confirme a troca.")
            store["versions"][old]["status"] = "APPROVED"  # continua travada: sai do posto, não perde o desenho
            note(project, "canônica substituída", at, old, frm="CANONICAL", to="APPROVED")
    if to == "ARCHIVED":
        version["status_before"] = origin
        if project.get("canonical_version_id") == version["id"]:
            project["canonical_version_id"] = None
    if to == "CANONICAL":
        project["canonical_version_id"] = version["id"]
    version["status"], version["updated_at"] = to, at
    note(project, "decisão", at, version["id"], frm=origin, to=to, note=reason)
    return {"version_id": version["id"], "status": to}


def op_generation(store, p, at):
    version = need(store["versions"], p.get("version_id"), "Versão")
    if p.get("mode") not in MODES:
        raise ValueError("Modo de geração inválido.")
    gid = new_id("gen")
    store["generations"][gid] = {"id": gid, "project_id": version["project_id"], "version_id": version["id"], "mode": p["mode"], "prompt": text_of(p, "prompt", 200000), "card_id": card_ref(p), "card_name": text_of(p, "card_name", 200), "variant": text_of(p, "variant", 40), "note": text_of(p, "note", 2000), "image": None, "consistency": {"checks": {}, "note": "", "at": None}, "created_at": at}
    return {"generation_id": gid}


def locked_reference_ids(store):
    return {i for v in store["versions"].values() if v.get("lock") for i in v["lock"].get("reference_ids", [])}


def op_reference(store, p, at):
    version = need(store["versions"], p.get("version_id"), "Versão")
    source = store["generations"].get(p.get("generation_id"))
    if p.get("generation_id") and (not source or not source.get("image")):
        raise ValueError("A referência precisa de uma geração com imagem.")
    rid = new_id("ref")
    # Imagem nova numa versão travada entra como apoio: nunca altera o desenho aprovado.
    approved = bool(p.get("approved")) and version["status"] in REVIEWABLE
    store["references"][rid] = {"id": rid, "project_id": version["project_id"], "version_id": version["id"], "generation_id": p.get("generation_id"), "kind": source["mode"] if source else text_of(p, "kind", 40) or "external", "note": text_of(p, "note", 2000), "image": source["image"] if source else None, "approved": approved, "created_at": at}
    return {"reference_id": rid}


def op_reference_update(store, p, at):
    row = need(store["references"], p.get("id"), "Referência")
    version = store["versions"][row["version_id"]]
    if "approved" in p:
        editable(version, REVIEWABLE)
        row["approved"] = bool(p["approved"])
    if "note" in p:
        if row["id"] in locked_reference_ids(store):
            raise Locked("Esta referência faz parte do Design Lock.")
        row["note"] = text_of(p, "note", 2000)
    return {"reference_id": row["id"]}


def op_consistency(store, p, at):
    row = need(store["generations"], p.get("generation_id"), "Geração")
    checks = p.get("checks")
    if not isinstance(checks, dict) or set(checks) - CHECKS or any(v not in ("", "ok", "diverge") for v in checks.values()):
        raise ValueError("Verificação de consistência inválida.")
    row["consistency"] = {"checks": checks, "note": text_of(p, "note", 2000), "at": at}
    return {"generation_id": row["id"]}


def op_binding(store, p, at):
    card_id = card_ref(p)
    if not card_id:
        raise ValueError("A carta precisa de id para ser vinculada.")
    version = need(store["versions"], p.get("version_id"), "Versão")
    variant = text_of(p, "variant", 40) or "default"
    # Uma carta tem uma armadura por variante de arte; a mesma armadura vale para várias cartas.
    row = next((b for b in store["bindings"].values() if b["card_id"] == card_id and b["variant"] == variant), None)
    if not row:
        bid = new_id("bind")
        row = store["bindings"][bid] = {"id": bid, "card_id": card_id, "variant": variant, "created_at": at}
    row.update({"project_id": version["project_id"], "version_id": version["id"], "card_name": text_of(p, "card_name", 200), "armor_type": text_of(p, "armor_type", 60), "adjustments": text_of(p, "adjustments", 4000), "use": bool(p.get("use", True)), "updated_at": at})
    note(store["projects"][version["project_id"]], "vínculo", at, version["id"], card_id=card_id, variant=variant)
    return {"binding_id": row["id"]}


def op_binding_delete(store, p, at):
    row = need(store["bindings"], p.get("id"), "Vínculo")
    del store["bindings"][row["id"]]
    note(store["projects"][row["project_id"]], "vínculo removido", at, row["version_id"], card_id=row["card_id"], variant=row["variant"])
    return {"ok": True}


OPS = {"project": op_project, "version-update": op_version_update, "version-new": op_version_new, "transition": op_transition, "generation": op_generation, "reference": op_reference, "reference-update": op_reference_update, "consistency": op_consistency, "binding": op_binding, "binding-delete": op_binding_delete}


def apply(store, op, payload, now=None):
    if op not in OPS:
        raise ValueError("Operação desconhecida.")
    if not isinstance(payload, dict):
        raise ValueError("Pedido inválido.")
    return OPS[op](store, payload, now or now_iso())


def attach_image(store, row_id, raw, write):
    """Grava os bytes e liga a imagem à geração ou referência. Imagem dentro de um lock não troca."""
    kind = next((v for sig, v in IMAGE_KINDS.items() if raw.startswith(sig)), None)
    if not kind and raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        kind = ("webp", "image/webp")
    if not kind:
        raise ValueError("Só PNG, JPG ou WEBP.")
    row = store["generations"].get(row_id) or store["references"].get(row_id)
    if not row:
        raise ValueError("Registro da imagem não encontrado.")
    if row.get("image"):
        raise Locked("Este registro já tem imagem: registre outra geração. Nada é sobrescrito.")
    name = f"{row_id}.{kind[0]}"
    write(IMAGES / name, raw)
    row["image"] = name
    return {"image": name}


def write_store(store, atomic_write):
    atomic_write(STORE, (json.dumps(store, ensure_ascii=False, indent=1) + "\n").encode("utf-8"))


def get(handler, path):
    parts = path.strip("/").split("/")
    if len(parts) == 2:
        return handler.reply(200, load())
    if len(parts) == 4 and parts[2] == "image" and IMAGE_RE.match(parts[3]):
        try:
            body = (IMAGES / parts[3]).read_bytes()
        except FileNotFoundError:
            return handler.reply(404, {"erro": "imagem não encontrada"})
        handler.send_response(200)
        handler.send_header("Content-Type", {"png": "image/png", "jpg": "image/jpeg", "webp": "image/webp"}[parts[3].rsplit(".", 1)[1]])
        handler.send_header("Content-Length", str(len(body)))
        handler.end_headers()
        handler.wfile.write(body)
        return None
    return handler.reply(404, {"erro": "rota desconhecida"})


def post(handler, path, raw, atomic_write):
    parts = path.strip("/").split("/")
    try:
        with GUARD:
            store = load()
            if len(parts) == 4 and parts[2] == "image":
                result = attach_image(store, parts[3], raw, atomic_write)
            elif len(parts) == 3:
                result = apply(store, parts[2], json.loads(raw))
            else:
                return handler.reply(404, {"erro": "rota desconhecida"})
            write_store(store, atomic_write)
    except Locked as error:
        return handler.reply(409, {"conflict": True, "erro": str(error)})
    except (ValueError, KeyError, TypeError, AttributeError) as error:
        return handler.reply(400, {"erro": str(error)})
    return handler.reply(200, {**result, "store": store})
