"""Extrai as peças estáticas (moldura, caixas, gemas, ícones) dos PSDs para PNG transparente.

Só LÊ os PSDs em FRAMES/ — nunca grava nada lá.
Uso (da raiz do projeto):
    uv run --with psd-tools --with pillow --with scipy python card-forge/tools/extract_template.py
Saída: CARD-TEMPLATE/<pasta>/<peça>.png + CARD-TEMPLATE/pieces.json (posição de cada peça no canvas 1488x2091).
"""
import json
import sys
from pathlib import Path

from PIL import Image
from psd_tools import PSDImage

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "CARD-TEMPLATE"

# (psd, nome da camada, (x, y) aproximado do bbox para desambiguar, pasta, nome da peça)
PIECES = [
    ("FRAMES/ATHENA/BRONZE/PEGASUSV1.psd", "Camada 9", (0, 0), "athena", "vignette"),
    ("FRAMES/ATHENA/BRONZE/PEGASUSV1.psd", "FRAME", (-11, -3), "athena", "frame"),
    ("FRAMES/ATHENA/BRONZE/PEGASUSV1.psd", "box_flavour copiar", (279, 114), "athena", "box_name"),
    ("FRAMES/ATHENA/BRONZE/PEGASUSV1.psd", "box_flavour copiar 3", (279, 246), "athena", "box_subtitle"),
    ("FRAMES/ATHENA/BRONZE/PEGASUSV1.psd", "box_flavour copiar 4", (68, 1218), "athena", "box_type"),
    ("FRAMES/ATHENA/BRONZE/PEGASUSV1.psd", "LINHAN AWAKEN 1", (170, 1845), "athena", "divider"),
    ("FRAMES/ATHENA/BRONZE/PEGASUSV1.psd", "COSMO", (88, 90), "athena", "gem_cost"),
    ("FRAMES/ATHENA/BRONZE/PEGASUSV1.psd", "Arte 16", (40, 1172), "athena", "gem_power"),
    ("FRAMES/ATHENA/BRONZE/PEGASUSV1.psd", "Arte 11", (1254, 1160), "athena", "gem_resistance"),
    ("FRAMES/ATHENA/BRONZE/PEGASUSV1.psd", "COSMO copiar 2", (1058, 1413), "athena", "icon_cosmo"),
    ("FRAMES/ATHENA/BRONZE/PEGASUSV1.psd", "LATENT COSMO copiar 2", (1066, 1534), "athena", "icon_latent"),
    ("FRAMES/ATHENA/RELICS/STAFFOFATHENA.psd", "Camada 11", (72, 93), "athena", "gem_cost_base"),
    ("FRAMES/ATHENA/RELICS/LIBRA-SWORD.psd", "Arte 24", (48, 1848), "athena", "gem_equip"),
    ("FRAMES/ATHENA/CLOTH/SAGGITARIUS-CLOTH.psd", "Arte 27", (1270, 1856), "athena", "gem_damage"),
    ("FRAMES/ATHENA/RELICS/LIBRA-SWORD.psd", "COMMON", (715, 1988), "athena", "rarity_common"),
    ("FRAMES/ATHENA/RELICS/LIBRA-SWORD.psd", "INCOMMON", (715, 1989), "athena", "rarity_uncommon"),
    ("FRAMES/ATHENA/RELICS/LIBRA-SWORD.psd", "MITIC", (715, 1989), "athena", "rarity_mythic"),
    ("FRAMES/ATHENA/RELICS/LIBRA-SWORD.psd", "DIVINE", (713, 1986), "athena", "rarity_divine"),
    ("FRAMES/ATHENA/ATHENA.psd", "Arte 6", (1227, 782), "athena", "gem_soul"),
    # ícones de texto que só existem nos PSDs dos Deuses (o editor tinge na cor da facção)
    ("FRAMES/HADES/HADES.psd", "Arte 12", (1171, 1105), "icons", "soul"),
    ("FRAMES/HADES/HADES.psd", "TAP", (654, 1439), "icons", "tap"),
    ("FRAMES/ATHENA/BRONZE/PEGASUSV1.psd", "Objeto Inteligente de Vetor", (1168, 90), "symbols", "athena"),
    ("FRAMES/ARES/ARES.psd", "Arte 13", (1066, 99), "symbols", "ares"),
    ("FRAMES/HADES/HADES.psd", "SIMBOL", (995, 77), "symbols", "hades"),
    ("FRAMES/ARTEMIS/ARTEMIS.psd", "SIMBOL", (910, 86), "symbols", "artemis"),
    ("FRAMES/POSEIDON/POSEIDON.psd", "Arte 4", (1083, 80), "symbols", "poseidon"),
]

# Pacote de cada facção, tirado do PSD do Deus dela: moldura (camadas sobre a arte, na ordem),
# caixas, gemas e divisória. O editor usa estas peças nas cartas da facção; o que faltar vem de Athena tingido.
GODS = {
    "hades": ("FRAMES/HADES/HADES.psd", {
        "frame_1": ("Camada 9", (0, 0)), "frame_2": ("Camada 8 copiar", (-4, -1)),
        "box_name": ("box_flavour copiar", (149, 114)), "box_subtitle": ("box_flavour copiar 3", (149, 246)),
        "box_type": ("box_flavour copiar 4", (65, 934)), "gem_power": ("Arte 16", (47, 887)),
        "gem_soul": ("Arte 6", (1230, 866)), "divider": ("LINHAN AWAKEN 1 copiar 2", (242, 1906))}),
    "ares": ("FRAMES/ARES/ARES.psd", {
        "frame_1": ("Camada 7", (0, 0)), "frame_2": ("FRAME", (-289, -323)),
        "box_name": ("box_flavour copiar 6", (154, 128)), "box_subtitle": ("box_flavour copiar 7", (154, 248)),
        "box_type": ("box_flavour copiar 4", (65, 1064)), "gem_power": ("Arte 16", (46, 1020)),
        "gem_soul": ("Arte 6", (1230, 996)), "divider": ("LINHAN AWAKEN 1 copiar 2", (243, 1904))}),
    "artemis": ("FRAMES/ARTEMIS/ARTEMIS.psd", {
        "frame_1": ("Camada 5", (0, 0)), "frame_2": ("Camada 8", (0, 0)),
        "box_type": ("box_flavour copiar 4", (65, 1044)), "gem_power": ("Arte 16", (43, 999)),
        "gem_soul": ("Arte 6", (1231, 977)), "divider": ("LINHAN AWAKEN 1 copiar 2", (243, 1876))}),
    "poseidon": ("FRAMES/POSEIDON/POSEIDON.psd", {
        "frame_1": ("Camada 2", (-9, -363)), "frame_2": ("Camada 2 copiar", (-9, 0)), "frame_3": ("Camada 9", (-6, -1)),
        "box_name": ("box_flavour copiar", (149, 114)), "box_subtitle": ("box_flavour copiar 3", (149, 246)),
        "box_type": ("box_flavour copiar 4", (65, 972)), "gem_power": ("Arte 16", (43, 925)),
        "gem_soul": ("Arte 6", (1230, 904)), "divider": ("LINHAN AWAKEN 1 copiar 2", (243, 1918))}),
}
for faction, (psd_path, parts) in GODS.items():
    PIECES += [(psd_path, name, xy, faction, piece) for piece, (name, xy) in parts.items()]

# modo de mesclagem do PSD -> globalCompositeOperation do canvas
BLEND = {"EXCLUSION": "exclusion", "HARD_LIGHT": "hard-light", "MULTIPLY": "multiply", "SCREEN": "screen",
         "OVERLAY": "overlay", "SOFT_LIGHT": "soft-light", "COLOR_DODGE": "color-dodge", "LINEAR_DODGE": "lighter"}


def find_layer(psd, name, xy):
    hits = [l for l in psd.descendants() if l.name == name and not l.is_group()]
    hits.sort(key=lambda l: abs(l.bbox[0] - xy[0]) + abs(l.bbox[1] - xy[1]))
    if not hits or abs(hits[0].bbox[0] - xy[0]) + abs(hits[0].bbox[1] - xy[1]) > 20:
        raise LookupError(f"camada {name!r} perto de {xy} não encontrada")
    return hits[0]


def render_alone(psd, layer):
    """Renderiza só esta camada (com efeitos e opacidade) no canvas inteiro, mesmo se oculta."""
    keep = {id(layer)}
    p = layer.parent
    while p is not None and p is not psd:
        keep.add(id(p))
        p = p.parent
    return psd.composite(layer_filter=lambda l: id(l) in keep, force=False)


def main():
    spec = {"canvas": [1488, 2091], "pieces": {}, "linked_missing": []}
    cache = {}
    for psd_path, name, xy, folder, piece in PIECES:
        psd = cache.get(psd_path) or cache.setdefault(psd_path, PSDImage.open(ROOT / psd_path))
        layer = find_layer(psd, name, xy)
        blend = BLEND.get(layer.blend_mode.name)
        if blend:
            # mesclagem especial: grava os pixels crus (opacidade embutida) e o canvas aplica o modo
            raw = layer.topil().convert("RGBA")
            raw.putalpha(raw.getchannel("A").point(lambda a: a * layer.opacity // 255))
            im = Image.new("RGBA", (raw.width + max(0, layer.left), raw.height + max(0, layer.top)))
            im.paste(raw, (max(0, layer.left), max(0, layer.top)))
            if layer.left < 0 or layer.top < 0:
                im = im.crop((max(0, -layer.left), max(0, -layer.top), im.width, im.height))
        else:
            im = render_alone(psd, layer).convert("RGBA")
        box = im.getchannel("A").getbbox()
        if not box:
            print("VAZIO", piece, file=sys.stderr)
            continue
        (OUT / folder).mkdir(parents=True, exist_ok=True)
        im.crop(box).save(OUT / folder / f"{piece}.png", optimize=True)
        spec["pieces"][f"{folder}/{piece}"] = {
            "x": box[0], "y": box[1], "w": box[2] - box[0], "h": box[3] - box[1],
            "src": f"{psd_path} :: {name}",
            **({"blend": blend} if blend else {}),
        }
        if layer.kind == "smartobject" and layer.smart_object.kind == "external":
            spec["linked_missing"].append({"piece": f"{folder}/{piece}", "file": layer.smart_object.filename,
                                           "note": "arquivo vinculado ausente; exportado da prévia raster salva no PSD"})
        print("ok", folder, piece, box)
    (OUT / "pieces.json").write_text(json.dumps(spec, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
