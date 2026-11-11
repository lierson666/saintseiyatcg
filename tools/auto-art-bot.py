#!/usr/bin/env python3
"""SSTCG Auto Art Bot v1: imports at most one new 3:4 art per 300s tick.

This is a file-ingestion runner, NOT an image-generation backend.
Art must first be generated, reviewed, and put in the correct Drive folder as <card-id>.png.
Never overwrites a final PNG or non-reference Card Forge project.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import traceback

from PIL import Image, ImageStat

ROOT = Path(__file__).resolve().parent.parent
BATCH = ROOT / "card-forge/out/art-production-2026-11-06"
QUEUE = BATCH / "queue.json"
STATE = BATCH / "auto-art-state.json"
EVENTS = BATCH / "auto-art-events.jsonl"
LOCK = BATCH / ".auto-art-bot.lock"
DRIVE = Path.home() / "Library/CloudStorage/GoogleDrive-limattenhauer@gmail.com/Meu Drive/Lierson Jr/SAINT SEIYA TCG/ARTS"
MIN_W, MIN_H = 768, 1024
FACE = {"Ares":"ARES", "Artemis":"ARTEMIS", "Athena":"ATHENA", "Hades":"HADES", "Neutral":"NEUTRAL", "Poseidon":"POSEIDON"}


def utcnow():
    return dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")


def atomic_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=path.parent, prefix=path.name + ".", suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=2)
            f.write("\n")
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)


def event(action, **fields):
    entry = {"at": utcnow(), "event": action, **fields}
    with EVENTS.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    print(json.dumps(entry, ensure_ascii=False), flush=True)


def image_check(path):
    # Detect technical defects. Semantic fidelity, anatomy, text, collages and lore
    # still require visual human approval before publication.
    with Image.open(path) as im:
        im.verify()
    with Image.open(path) as im:
        w,h=im.size
        if im.format != "PNG": raise ValueError("Not a valid PNG")
        if w < MIN_W or h < MIN_H: raise ValueError(f"Too small: {w}x{h}; minimum {MIN_W}x{MIN_H}")
        if abs((w/h)-0.75)>0.025: raise ValueError(f"Aspect ratio must be approximately 3:4 ({w}x{h})")
        if im.mode not in ("RGB","RGBA"): raise ValueError(f"Unsupported image mode {im.mode}")
        stat=ImageStat.Stat(im.convert("RGB").resize((64,85)))
        if max(stat.stddev)<8: raise ValueError("Image nearly uniform / empty")
    return (w,h)


def run(args):
    import fcntl
    BATCH.mkdir(parents=True, exist_ok=True)
    with LOCK.open("a+") as lock:
        try: fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            event("SKIPPED_ALREADY_RUNNING")
            return 0

        data=json.loads(QUEUE.read_text(encoding="utf-8"))
        rows=data["rows"]
        state=json.loads(STATE.read_text()) if STATE.exists() else {
            "version":1, "created":utcnow(), "generation_backend":"NOT_CONFIGURED",
            "mode":"watch-drive-one-per-cycle", "cards":{}, "runs":0
        }
        state["runs"]=state.get("runs",0)+1
        state["last_tick"]=utcnow()

        if args.status:
            statuses={}
            for row in rows:
                s=state.get("cards",{}).get(row["id"],{}).get("status","WAITING_FOR_IMAGE")
                statuses[s]=statuses.get(s,0)+1
            print(json.dumps({"total":len(rows),"statuses":statuses,"generation_backend":state["generation_backend"],"last_tick":state["last_tick"]},indent=2))
            return 0

        installed=0
        for row in rows:
            cid=row["id"]
            if args.id and cid!=args.id:continue
            previous=state.setdefault("cards",{}).get(cid,{})
            project=ROOT/"card-forge/projects"/f"{cid}.json"
            final=ROOT/"card-forge/art"/f"{cid}.png"
            source=DRIVE/FACE[row["faction"]]/f"{cid}.png"

            if not project.is_file():
                if previous.get("status")!="BLOCKED_MISSING_PROJECT":event("BLOCKED_MISSING_PROJECT",id=cid)
                state["cards"][cid]={"status":"BLOCKED_MISSING_PROJECT","updated":utcnow()}
                continue

            proj=json.loads(project.read_text(encoding="utf-8"))
            art=(proj.get("art") or {})
            # New catalog entries begin without a placeholder image.
            # Only a queue entry explicitly marked initial_art_absent may use this path.
            empty_new = row.get("initial_art_absent") is True and proj.get("art") is None
            has_reference = str(art.get("src","")).endswith("-ref.jpg")
            if final.exists() or not (has_reference or empty_new):
                if previous.get("status") not in ("ALREADY_FINAL","INSTALLED"):
                    event("SKIP_EXISTING_OR_CHANGED",id=cid)
                state["cards"][cid]={"status":"ALREADY_FINAL" if previous.get("status")!="INSTALLED" else "INSTALLED", "updated":utcnow()}
                continue
            if not source.is_file():
                continue

            digest=hashlib.sha256(source.read_bytes()).hexdigest()
            if previous.get("status") in ("REVIEW_NEEDED","REJECTED") and digest==previous.get("sha256"):
                continue
            try:
                w,h=image_check(source)
            except Exception as exc:
                state["cards"][cid]={"status":"REVIEW_NEEDED","reason":str(exc),"sha256":digest,"updated":utcnow()}
                event("REVIEW_NEEDED",id=cid,reason=str(exc))
                continue

            if args.dry_run:
                event("READY_DRY_RUN",id=cid,dimensions=[w,h],source=str(source))
                break

            # Copy image to temp first; commit only if no destination exists.
            dest_tmp=final.parent / f".{cid}.incoming-{os.getpid()}.png"
            try:
                shutil.copy2(source,dest_tmp)
                with Image.open(dest_tmp) as check: check.verify()
                if final.exists(): raise FileExistsError(str(final))
                # Do not overwrite any existing art or any changed project.
                current=json.loads(project.read_text(encoding="utf-8"))
                current_art=current.get("art") or {}
                current_ref=str(current_art.get("src","")).endswith("-ref.jpg")
                current_empty=row.get("initial_art_absent") is True and current.get("art") is None
                if current!=proj or not (current_ref or current_empty):
                    raise RuntimeError("Project modified during import")
                os.link(dest_tmp,final)
                width=max(1488/w,2091/h)*w
                height=width*h/w
                new=dict(proj)
                new["art_previous_reference"]=art
                new["art"]={"src":f"art/{cid}.png","w":round(width,4),
                            "x":round((1488-width)/2,4),"y":round((2091-height)/2,4),
                            "zoom":1,"baseW":round(width,4)}
                atomic_json(project,new)
                state["cards"][cid]={"status":"INSTALLED_PENDING_EXPORT","sha256":digest,"dimensions":[w,h],"updated":utcnow()}
                installed+=1
                event("INSTALLED_PROJECT",id=cid,source=str(source),dimensions=[w,h])
                break
            except Exception as exc:
                # If a project wasn't updated, leave new PNG in place rather than blindly deleting.
                state["cards"][cid]={"status":"REVIEW_NEEDED","reason":str(exc),"sha256":digest,"updated":utcnow()}
                event("INSTALL_ERROR",id=cid,reason=str(exc))
                break
            finally:
                dest_tmp.unlink(missing_ok=True)

        pending=[k for k,v in state["cards"].items() if v.get("status")=="INSTALLED_PENDING_EXPORT"]
        if pending and not args.dry_run:
            try:
                result=subprocess.run(["/bin/sh",str(ROOT/"tools/forge-art-web.sh"),str(ROOT)],
                    cwd=ROOT,capture_output=True,text=True,timeout=240)
                if result.returncode: raise RuntimeError((result.stderr+"\n"+result.stdout)[-1200:])
                exported=json.loads((ROOT/"card-forge/art-web/cards.json").read_text())["cartas"]
                byid={c["id"]:c for c in exported}
                for cid in pending:
                    stem=cid
                    ready=(byid.get(cid,{}).get("ilustracao")==stem+".jpg" and
                        all((ROOT/"card-forge/art-web"/v/(stem+".webp")).exists() for v in ("webp","touch","thumb","zoom")))
                    if ready:
                        state["cards"][cid]["status"]="INSTALLED"
                        event("EXPORT_VERIFIED",id=cid)
                    else:
                        event("EXPORT_NOT_VERIFIED",id=cid)
            except Exception as exc:
                event("EXPORT_ERROR",reason=str(exc))

        # Optional paid generation backend. It is disabled by default and
        # only generates ONE candidate when explicitly configured. This
        # never bypasses the generation review gate.
        gen_config=Path.home()/".config/sstcg/auto-art.json"
        if not installed and not args.dry_run and gen_config.is_file():
            try:
                cfg=json.loads(gen_config.read_text())
                if cfg.get("enabled") is True:
                    generation=subprocess.run(
                        [sys.executable,str(ROOT/"tools/auto-art-generate.py"),"--generate-one"],
                        cwd=ROOT,capture_output=True,text=True,timeout=270)
                    event("GENERATOR_RUN",returncode=generation.returncode,
                          result=(generation.stdout or generation.stderr)[-450:])
            except Exception as exc:
                event("GENERATOR_ERROR",reason=str(exc)[:300])
        atomic_json(STATE,state)
        if not installed:
            event("IDLE",reason="No new installable PNG this tick")
    return 0


if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--dry-run",action="store_true")
    p.add_argument("--status",action="store_true")
    p.add_argument("--id")
    a=p.parse_args()
    try:sys.exit(run(a))
    except Exception:
        traceback.print_exc()
        sys.exit(1)
