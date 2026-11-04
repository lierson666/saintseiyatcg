"""ARMOR FORGE: os 11 critérios de aceite no navegador real, com servidor e loja temporários.

uv run --with playwright python tools/test-armor-forge-ui.py
Não grava na loja real nem em data/cards.json; o teste confere o hash do catálogo no fim.
"""
import hashlib
import json
import os
import socket
import struct
import subprocess
import tempfile
import time
import urllib.request
import zlib
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CARDS = ROOT / "data/cards.json"
SHOTS = Path(os.environ.get("ARMOR_SHOTS", tempfile.mkdtemp()))
SHOTS.mkdir(parents=True, exist_ok=True)


def png(color):
    """PNG mínimo de 4x4, para não depender de arte real."""
    raw = b"".join(b"\x00" + bytes(color) * 4 for _ in range(4))
    chunk = lambda tag, data: struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 4, 4, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")


def image(name, color):
    return {"name": name, "mimeType": "image/png", "buffer": png(color)}


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def main():
    before = hashlib.sha256(CARDS.read_bytes()).hexdigest()
    store_dir = tempfile.mkdtemp()
    port = free_port()
    server = subprocess.Popen(["/usr/bin/python3", "card-forge/serve.py"], cwd=ROOT, env={**os.environ, "PORT": str(port), "ARMOR_FORGE_DIR": store_dir}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)  # o mesmo Python do app, não o do uv
    url = f"http://127.0.0.1:{port}"
    for _ in range(50):
        try:
            urllib.request.urlopen(url + "/api/armor-forge")
            break
        except OSError:
            time.sleep(0.1)
    errors = []
    store = lambda: json.loads((Path(store_dir) / "store.json").read_text(encoding="utf-8"))
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, channel="chrome")
            context = browser.new_context(viewport={"width": 1600, "height": 1100})
            context.grant_permissions(["clipboard-read", "clipboard-write"], origin=url)
            forge = context.new_page()
            forge.on("pageerror", lambda e: errors.append(f"forge: {e}"))

            def open_modal(page, card):
                page.goto(f"{url}/card-forge/index.html?card={card}")
                page.wait_for_function("document.querySelector('#cardSelect')?.value && document.querySelector('#cardSelect').value !== ''")
                page.locator("summary", has_text="Arte").first.click()
                page.locator("#artPrompt").click()
                page.locator("#artPromptDialog textarea[name=prompt]").wait_for(state="visible")

            # 1. Abrir carta inédita (sem arte): a oferta de armadura aparece, e nada é obrigatório.
            open_modal(forge, "ares-v6-279")
            dialog = forge.locator("#artPromptDialog")
            assert dialog.locator("h3", has_text="Armadura / Equipamento").count() == 1
            baseline = dialog.locator("textarea[name=prompt]").input_value()
            assert "brutal blood-red war armor" in baseline
            forge.screenshot(path=str(SHOTS / "01-modal-oferta.png"))

            # 2. Criar projeto original de armadura, a partir da carta.
            # O editor abre dentro do Card Forge, sem aba nova, e já vem com a carta.
            dialog.get_by_role("button", name="Desenvolver armadura original").click()
            forge.locator("#armorForgeDialog").wait_for(state="visible")
            assert len(context.pages) == 1
            armor = forge.frame_locator("#armorForgeFrame")
            armor.locator("#newDialog form").wait_for(state="visible")
            assert armor.locator("#newDialog [name=card]").input_value() == "ares-v6-279"
            assert armor.locator("#newDialog [name=faction]").input_value() == "Ares"
            assert armor.locator("#newDialog [name=family]").input_value() == "Warplate"
            armor.locator("#newDialog [name=name]").fill("TEST WARPLATE")
            armor.locator("#createProject").click()
            armor.locator("[data-spec=name]").wait_for()
            # Só o prompt à vista: gerar não pede imagem nem aprovação, e o prompt já responde ao que foi criado.
            assert "TEST WARPLATE" in armor.locator("#armorPrompt").input_value()
            assert not armor.locator('details[data-key="more"]').evaluate("(d) => d.open")
            forge.screenshot(path=str(SHOTS / "02-editor-no-forge.png"))
            forge.locator("#armorForgeClose").click()
            forge.locator("#artPromptDialog [name=armorProject]").wait_for()
            assert dialog.locator("[name=armorSource]").input_value() == "original"
            # Sem aprovação, o prompt da carta já usa a armadura no estado atual e avisa disso.
            assert "TEST WARPLATE" in dialog.locator("textarea[name=prompt]").input_value() and "brutal blood-red" not in dialog.locator("textarea[name=prompt]").input_value()
            assert dialog.locator(".ap-note", has_text="sem aprovação").count() == 1
            data = store()
            assert len(data["projects"]) == 1 and len(data["versions"]) == 1 and len(data["components"]) == 30
            pid = next(iter(data["projects"]))
            v1 = f"{pid}-v1"
            assert data["versions"][v1]["status"] == "DRAFT"
            assert next(iter(data["bindings"].values()))["card_id"] == "ares-v6-279"
            # O restante do fluxo roda na página direta, que continua existindo.
            armor = context.new_page()
            armor.on("pageerror", lambda e: errors.append(f"armor: {e}"))
            armor.goto(f"{url}/card-forge/armor.html?project={pid}")
            armor.locator("[data-spec=name]").wait_for()

            def more():
                box = armor.locator('details[data-key="more"]')
                if not box.evaluate("(d) => d.open"):
                    box.locator("summary").first.click()


            # 3. Definir componentes um a um, nos três modos, e confirmar que sobrevive ao recarregar.
            def component(key, mode, text=None, required=False):
                row = armor.locator(f'[data-component="{key}"]')
                row.locator("[data-comp-mode]").select_option(mode)
                if text:
                    row.locator("[data-comp-value]").fill(text)
                if required:
                    row.locator("[data-comp-req]").check()

            component("helmet", "manual", "open helm with a sawtooth serpent crest", True)
            component("pauldrons", "manual", "pauldrons cut as open serpent jaws with hooked fangs", True)
            component("chest", "manual", "segmented cuirass of diamond scale-plates over a bronze keel", True)
            component("mask", "absent")
            component("wings", "absent")
            armor.locator('[data-field-mode="entity"]').select_option("manual")
            armor.locator('[data-field-value="entity"]').fill("Python, the serpent of Delphi")
            armor.wait_for_function("document.querySelector('#status').textContent === 'Rascunho salvo.'")
            armor.reload()
            armor.locator('[data-component="helmet"] [data-comp-value]').wait_for()
            assert armor.locator('[data-component="helmet"] [data-comp-value]').input_value().startswith("open helm")
            assert armor.locator('[data-component="mask"] [data-comp-mode]').input_value() == "absent"

            # 4. Prompt da armadura isolada: sai da especificação e fica no histórico.
            prompt = armor.locator("#armorPrompt").input_value()
            for piece in ("open helm with a sawtooth", "EXPLICITLY ABSENT: Mask, Wings", "model wearing the armor", "matte armature"):
                assert piece in prompt, piece
            armor.get_by_role("button", name="Copiar prompt").click()
            armor.wait_for_function("document.querySelector('#status').textContent.includes('histórico')")
            assert context.pages and any(g["mode"] == "concept" and "open helm" in g["prompt"] for g in store()["generations"].values())

            # 5. Registrar a imagem gerada no projeto: vai para o disco e é servida de volta.
            more()
            armor.locator("#registerImage").set_input_files(image("conceito.png", (200, 30, 30)))
            armor.locator('.af-shot img').first.wait_for()
            concept = next(g for g in store()["generations"].values() if g["mode"] == "concept")
            assert (Path(store_dir) / "images" / concept["image"]).read_bytes().startswith(b"\x89PNG")
            assert armor.locator('.af-shot img').first.evaluate("(el) => el.decode().then(() => el.naturalWidth)") == 4

            # 6. Prompt de ficha técnica, separado do conceito.
            armor.locator('[data-mode="blueprint"]').click()
            blueprint = armor.locator("#armorPrompt").input_value()
            assert "FRONT view, BACK view" in blueprint and blueprint != prompt
            armor.get_by_role("button", name="Copiar prompt").click()
            armor.wait_for_function("document.querySelector('#status').textContent.includes('histórico')")
            armor.locator("#registerImage").set_input_files(image("ficha.png", (120, 90, 40)))
            armor.wait_for_function("document.querySelectorAll('.af-shot img').length === 2")

            # 7. Revisar e aprovar: bloqueado até ter silhueta e referência; aprovado grava o lock.
            armor.locator(f'[data-transition="IN_REVIEW"]').click()
            armor.locator('[data-transition="APPROVED"]').wait_for()
            assert armor.locator('[data-transition="APPROVED"]').is_disabled()
            armor.locator('[data-transition="DRAFT"]').click()
            armor.locator('[data-field-mode="silhouette"]').wait_for()
            armor.locator('[data-field-mode="silhouette"]').select_option("manual")
            armor.locator('[data-field-value="silhouette"]').fill("narrow waist, tall serpent crest, jaw shoulders")
            armor.wait_for_function("document.querySelector('#status').textContent === 'Rascunho salvo.'")
            armor.locator(f'[data-generation="{concept["id"]}"] [data-ref-toggle]').click()
            armor.locator(f'[data-generation="{concept["id"]}"] [data-ref-toggle]', has_text="Tirar").wait_for()
            armor.locator('[data-transition="IN_REVIEW"]').click()
            armor.locator("#decisionNote").fill("primeiro desenho aceito")
            armor.locator('[data-transition="APPROVED"]').click()
            armor.locator("summary", has_text="ARMOR DESIGN LOCK").wait_for()
            armor.screenshot(path=str(SHOTS / "07-lock.png"), full_page=True)
            data = store()
            lock = data["versions"][v1]["lock"]
            assert data["versions"][v1]["status"] == "APPROVED" and lock["reference_ids"] and "sawtooth" in lock["helmet"]
            assert sorted(lock["required_components"]) == ["chest", "helmet", "pauldrons"]
            frozen = json.dumps(lock, sort_keys=True)
            # Versão aprovada recusa gravação direta, mesmo sem passar pela tela.
            refused = armor.evaluate("""(id) => fetch('/api/armor-forge/version-update', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({version_id: id, spec: {name: 'HACK', fields: {}}})}).then((r) => r.status)""", v1)
            assert refused == 409
            assert armor.locator('[data-transition="CANONICAL"]').count() == 1
            armor.locator('[data-transition="CANONICAL"]').click()
            armor.wait_for_function("document.querySelector('#status').textContent.includes('Canônica')")
            assert store()["projects"][pid]["canonical_version_id"] == v1

            # 8. Vínculo com o personagem (nasceu com a carta) e prompt de personagem equipado com o lock.
            armor.locator('[data-mode="equipped"]').click()
            armor.locator("[data-binding]").select_option(index=1)
            equipped = armor.locator("#armorPrompt").input_value()
            assert "ISEU OF PYTHON" in equipped and "ARMOR DESIGN LOCK" in equipped and "sawtooth" in equipped

            # 9. Arte de carta com essa referência: volta ao popup, que atualiza sozinho.
            forge.bring_to_front()
            forge.evaluate("window.dispatchEvent(new Event('focus'))")
            forge.wait_for_function("document.querySelector('#artPromptDialog textarea[name=prompt]').value.includes('ARMOR REFERENCES: 1 approved image')")
            final = dialog.locator("textarea[name=prompt]").input_value()
            assert "brutal blood-red" not in final and "sawtooth" in final and "ARMOR REFERENCES: 1 approved image" in final
            forge.locator("#artPromptDialog [name=armorProject]").scroll_into_view_if_needed()
            forge.screenshot(path=str(SHOTS / "09-modal-lock.png"))
            for field in ("ethnicity", "hair", "expression", "style"):
                assert dialog.locator(f"[name={field}]").count() == 1, field
            dialog.get_by_role("button", name="Copiar prompt").click()
            forge.wait_for_function("document.querySelector('#status').textContent.includes('copiado')")
            forge.locator("[data-armor-image]").set_input_files(image("arte.png", (10, 200, 90)))
            forge.wait_for_function("document.querySelector('#status').textContent.includes('registrada')")
            art = [g for g in store()["generations"].values() if g["mode"] == "card_art"]
            assert len(art) == 1 and art[0]["card_id"] == "ares-v6-279" and art[0]["image"]
            assert "caminho_imagem" not in json.dumps(art[0])

            # A verificação de consistência só registra o que o autor apontou; divergência fica visível.
            armor.bring_to_front()
            armor.reload()
            more()
            shot = armor.locator(f'[data-generation="{art[0]["id"]}"]')
            shot.locator("summary", has_text="Verificar consistência").click()
            shot.locator('[data-check-key="helmet"]').select_option("diverge")
            armor.locator(f'[data-generation="{art[0]["id"]}"][data-consistency="DIVERGENT"]').wait_for()
            assert armor.locator(".af-block", has_text="divergência").count() == 1
            assert store()["generations"][art[0]["id"]]["consistency"]["checks"]["helmet"] == "diverge"
            assert json.dumps(store()["versions"][v1]["lock"], sort_keys=True) == frozen, "imagem nova não altera o lock"

            # 10. Reutilizar em outra carta e em arte alternativa: mesmo bloco do lock.
            block = lambda text: text[text.index("ARMOR DESIGN LOCK"):text.index("ARMOR REFERENCES")]
            forge.bring_to_front()
            open_modal(forge, "ares-v6-281")
            dialog.locator("[name=armorSource]").select_option("original")
            dialog.locator("[name=armorProject]").select_option(pid)
            forge.wait_for_function("document.querySelector('#artPromptDialog textarea[name=prompt]').value.includes('ARMOR DESIGN LOCK')")
            other = dialog.locator("textarea[name=prompt]").input_value()
            assert block(other) == block(final)
            bindings = store()["bindings"].values()
            assert {b["card_id"] for b in bindings} == {"ares-v6-279", "ares-v6-281"}
            assert all(b["version_id"] == v1 for b in bindings)
            open_modal(forge, "ares-v6-279")
            dialog.locator("[data-variant]").select_option("manga")
            dialog.locator("[name=armorSource]").select_option("original")
            dialog.locator("[name=armorProject]").select_option(pid)
            forge.wait_for_function("document.querySelector('#artPromptDialog textarea[name=prompt]').value.includes('ARMOR DESIGN LOCK')")
            assert block(dialog.locator("textarea[name=prompt]").input_value()) == block(final)
            assert {(b["card_id"], b["variant"]) for b in store()["bindings"].values()} == {("ares-v6-279", "default"), ("ares-v6-281", "default"), ("ares-v6-279", "manga")}

            # 11. Nova versão sem perder a anterior: v1 e o lock ficam, e as cartas continuam presas à v1.
            armor.bring_to_front()
            armor.reload()
            more()
            armor.locator("#decisionNote").fill("ombreiras maiores")
            armor.locator("[data-new-version]").click()
            armor.locator('[data-component="pauldrons"] [data-comp-value]:not([readonly])').wait_for()
            armor.locator('[data-component="pauldrons"] [data-comp-value]').fill("oversized cobra-hood pauldrons")
            armor.wait_for_function("document.querySelector('#status').textContent === 'Rascunho salvo.'")
            data = store()
            v2 = f"{pid}-v2"
            assert data["versions"][v2]["status"] == "DRAFT" and data["versions"][v2]["parent_version_id"] == v1
            assert data["versions"][v1]["status"] == "CANONICAL" and json.dumps(data["versions"][v1]["lock"], sort_keys=True) == frozen
            assert sum(1 for c in data["components"].values() if c["version_id"] == v1) == 30
            assert all(b["version_id"] == v1 for b in data["bindings"].values())
            assert armor.locator("#armorPrompt").input_value().count("oversized cobra-hood") == 1
            armor.locator(f'[data-version="{v1}"]').click()
            armor.locator('[data-component="pauldrons"] [readonly]').wait_for()
            assert "open serpent jaws" in armor.locator('[data-component="pauldrons"] textarea').input_value()
            assert armor.locator("[data-generation] img").count() == 3
            armor.screenshot(path=str(SHOTS / "11-versoes.png"), full_page=True)
            forge.bring_to_front()
            open_modal(forge, "ares-v6-279")
            assert "oversized cobra-hood" not in dialog.locator("textarea[name=prompt]").input_value(), "arte aponta para a versão específica"

            # A carta de Equipment da própria armadura aceita o lock como objeto, sem portador.
            open_modal(forge, "ares-v6-280")
            dialog.locator("[name=armorSource]").select_option("original")
            dialog.locator("[name=armorProject]").select_option(pid)
            forge.wait_for_function("document.querySelector('#artPromptDialog textarea[name=prompt]').value.includes('ARMOR DESIGN LOCK')")
            equipment = dialog.locator("textarea[name=prompt]").input_value()
            assert "sawtooth" in equipment and "FIT:" not in equipment and "with no wearer" in equipment
            dialog.locator("[name=armorSource]").select_option("auto")
            forge.wait_for_function("!document.querySelector('#artPromptDialog textarea[name=prompt]').value.includes('ARMOR DESIGN LOCK')")

            # Compatibilidade: Domain sem personagem não mostra a seção; nada é obrigatório.
            open_modal(forge, "athena-v6-062")
            assert dialog.locator("h3", has_text="Armadura / Equipamento").count() == 0
            assert dialog.get_by_role("button", name="Desenvolver armadura original").count() == 0

            # Exemplo da seção 8.
            armor.bring_to_front()
            armor.locator("#seedExample").click()
            armor.wait_for_function("document.querySelector('[data-spec=name]')?.value === 'PYTHON WARPLATE'")
            text = armor.locator("#armorPrompt").input_value()
            assert armor.locator('[data-mode="totem"]').count() == 1 and "open serpent jaw" in text and "Delphi" in text
            assert store()["versions"]["python-warplate-v1"]["status"] == "DRAFT"
            browser.close()
    finally:
        server.terminate()
        if errors:
            print("erros de página:", errors)
    assert not errors, errors
    assert hashlib.sha256(CARDS.read_bytes()).hexdigest() == before, "cards.json mudou no teste"
    print(f"ok: 11 critérios no navegador. Capturas em {SHOTS}")


if __name__ == "__main__":
    main()
