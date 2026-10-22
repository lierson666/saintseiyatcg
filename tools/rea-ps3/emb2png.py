"""Converte texturas de .emb (Dimps, PS3 big-endian, GTF dentro) em PNG.
Uso: python emb2png.py <pasta_entrada> <pasta_saida>
"""
import os, struct, sys
from pathlib import Path
from PIL import Image

DXT = {0x86: 1, 0x87: 2, 0x88: 3}  # CELL_GCM_TEXTURE_COMPRESSED_DXT1/23/45 -> bcn


def unswizzle(data, w, h, bpp):
    # shortcut: morton simples, so vale para texturas quadradas/potencia de 2; texturas retangulares podem sair embaralhadas.
    out = bytearray(len(data))
    def morton(x, y):
        z = 0
        for i in range(max(w, h).bit_length()):
            z |= ((x >> i) & 1) << (2 * i) | ((y >> i) & 1) << (2 * i + 1)
        return z
    for y in range(h):
        for x in range(w):
            s = morton(x, y) * bpp; d = (y * w + x) * bpp
            out[d:d + bpp] = data[s:s + bpp]
    return bytes(out)


def gtf_to_image(g):
    off, size = struct.unpack_from(">II", g, 0x10)
    fmt = g[0x18]; w, h = struct.unpack_from(">HH", g, 0x20)
    base = fmt & ~0x60
    data = g[off:off + size]
    if base in DXT:
        blk = 8 if base == 0x86 else 16
        need = max(1, w // 4) * max(1, h // 4) * blk
        return Image.frombytes("RGBA", (w, h), data[:need], "bcn", (DXT[base],))
    if base == 0x85:  # A8R8G8B8
        raw = data[:w * h * 4]
        if not fmt & 0x20:
            raw = unswizzle(raw, w, h, 4)
        a, r, g_, b = Image.frombytes("RGBA", (w, h), raw).split()
        return Image.merge("RGBA", (r, g_, b, a))
    raise ValueError(f"formato GTF 0x{fmt:02x} nao suportado")


def emb_entries(d):
    assert d[:4] == b"#EMB"
    n, = struct.unpack_from(">I", d, 0x0C)
    tab, names = struct.unpack_from(">II", d, 0x18)
    for i in range(n):
        o, s = struct.unpack_from(">II", d, tab + i * 8)
        o += tab + i * 8
        name = f"{i:02d}"
        if names:
            p, = struct.unpack_from(">I", d, names + i * 4)
            if 0 < p < len(d):
                name = d[p:d.index(b"\0", p)].decode("latin-1") or name
        yield name, d[o:o + s]


def main():
    src, dst = Path(sys.argv[1]), Path(sys.argv[2])
    ok = bad = 0
    for f in sorted(src.rglob("*.emb")):
        out = dst / f.relative_to(src).with_suffix("")
        for name, g in emb_entries(f.read_bytes()):
            try:
                img = gtf_to_image(g)
            except Exception as e:
                bad += 1; print("skip", f.name, name, e); continue
            out.mkdir(parents=True, exist_ok=True)
            img.save(out / (Path(name).stem + ".png")); ok += 1
    print(ok, "png,", bad, "falhas")


if __name__ == "__main__":
    main()
