"""Mini extrator de CPK (CRI Middleware). Uso:
  python cpk.py list <arquivo.cpk> <saida.tsv>
  python cpk.py extract <arquivo.cpk> <pasta_saida> <glob> [<glob> ...]
"""
import fnmatch, os, struct, sys


def read_utf(buf):
    assert buf[:4] == b"@UTF", "tabela @UTF esperada (CPK criptografado?)"
    b = buf[8:]
    rows_off, str_off, data_off, _name, ncols, rowlen, nrows = struct.unpack(">2xHIIIHHI", b[:24])

    def cstr(off):
        s = str_off + off
        return b[s:b.index(b"\0", s)].decode("utf-8", "replace")

    sizes = {0: 1, 1: 1, 2: 2, 3: 2, 4: 4, 5: 4, 6: 8, 7: 8, 8: 4, 9: 8, 0xA: 4, 0xB: 8}
    fmts = {0: ">B", 1: ">b", 2: ">H", 3: ">h", 4: ">I", 5: ">i", 6: ">Q", 7: ">q", 8: ">f", 9: ">d"}

    def value(t, pos):
        if t == 0xA:
            return cstr(struct.unpack_from(">I", b, pos)[0])
        if t == 0xB:
            o, n = struct.unpack_from(">II", b, pos)
            return b[data_off + o:data_off + o + n]
        return struct.unpack_from(fmts[t], b, pos)[0]

    cols, pos = [], 24
    for _ in range(ncols):
        flags = b[pos]; name = cstr(struct.unpack_from(">I", b, pos + 1)[0]); pos += 5
        storage, t = flags & 0xF0, flags & 0x0F
        const = None
        if storage == 0x30:
            const = value(t, pos); pos += sizes[t]
        cols.append((name, storage, t, const))

    rows = []
    for r in range(nrows):
        p = rows_off + r * rowlen
        row = {}
        for name, storage, t, const in cols:
            if storage == 0x50:
                row[name] = value(t, p); p += sizes[t]
            else:
                row[name] = const
        rows.append(row)
    return rows


def crilayla(src):
    usize, hoff = struct.unpack_from("<II", src, 8)
    out = bytearray(usize + 0x100)
    out[:0x100] = src[hoff + 0x10:hoff + 0x110]
    inp = len(src) - 0x100 - 1
    oend = 0x100 + usize - 1
    pool = left = done = 0

    def bits(n):
        nonlocal pool, left, inp
        v = got = 0
        while got < n:
            if left == 0:
                pool = src[inp]; left = 8; inp -= 1
            take = min(left, n - got)
            v = (v << take) | ((pool >> (left - take)) & ((1 << take) - 1))
            left -= take; got += take
        return v

    while done < usize:
        if bits(1):
            ref = oend - done + bits(13) + 3
            length = 3
            for lv in (2, 3, 5, 8):
                x = bits(lv); length += x
                if x != (1 << lv) - 1:
                    break
            else:
                while True:
                    x = bits(8); length += x
                    if x != 255:
                        break
            for _ in range(length):
                out[oend - done] = out[ref]; ref -= 1; done += 1
        else:
            out[oend - done] = bits(8); done += 1
    return bytes(out)


def toc(f):
    head = f.read(0x800)
    assert head[:4] == b"CPK ", "nao e CPK"
    hdr = read_utf(head[0x10:])[0]
    toc_off, content_off = hdr["TocOffset"], hdr["ContentOffset"]
    f.seek(toc_off); t = f.read(0x10 + hdr["TocSize"])
    base = min(toc_off, content_off)
    files = read_utf(t[0x10:])
    for e in files:
        e["path"] = "/".join(x for x in (e.get("DirName") or "", e["FileName"]) if x)
        e["abs"] = base + e["FileOffset"]
    return files


def main():
    mode, cpk = sys.argv[1], sys.argv[2]
    with open(cpk, "rb") as f:
        files = toc(f)
        if mode == "list":
            with open(sys.argv[3], "w") as o:
                for e in files:
                    o.write(f"{e['path']}\t{e['FileSize']}\t{e['ExtractSize']}\n")
            print(len(files), "arquivos")
            return
        outdir, globs = sys.argv[3], sys.argv[4:]
        n = 0
        for e in files:
            if not any(fnmatch.fnmatch(e["path"], g) for g in globs):
                continue
            f.seek(e["abs"]); data = f.read(e["FileSize"])
            if data[:8] == b"CRILAYLA":
                data = crilayla(data)
            assert len(data) == e["ExtractSize"], (e["path"], len(data), e["ExtractSize"])
            dst = os.path.join(outdir, e["path"])
            assert os.path.realpath(dst).startswith(os.path.realpath(outdir)), "caminho fora da pasta"
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            open(dst, "wb").write(data); n += 1
        print(n, "extraidos")


if __name__ == "__main__":
    main()
