"""Extrai a planilha de playtest sem alterá-la; não grava data/cards.json."""
import argparse
from collections import Counter
import hashlib
import io
import json
from pathlib import Path
import posixpath
import re
import xml.etree.ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
HEADERS = ["ID", "Faction", "Type", "Name", "Cosmo Cost", "Power", "HP", "Cosmoble", "Rules Text (EN draft)", "Design Status"]


def read_xlsx(path):
    """Lê somente valores literais. Fórmulas não são executadas nem importadas."""
    with ZipFile(path) as archive:
        if sum(i.file_size for i in archive.infolist()) > 20_000_000:
            raise ValueError("Planilha excede o limite de leitura de 20 MB descompactados")
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            for si in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("m:si", NS):
                strings.append("".join(t.text or "" for t in si.findall(".//m:t", NS)))
        rels = {r.attrib["Id"]: r.attrib["Target"] for r in ET.fromstring(archive.read("xl/_rels/workbook.xml.rels")) if r.attrib.get("TargetMode") != "External"}
        sheets = ET.fromstring(archive.read("xl/workbook.xml")).findall("m:sheets/m:sheet", NS)
        result = {}
        for sheet in sheets:
            target = rels[sheet.attrib[f"{{{REL}}}id"]]
            member = posixpath.normpath(target.lstrip("/") if target.startswith("/") else "xl/" + target)
            if not member.startswith("xl/"):
                raise ValueError("Caminho de aba inválido")
            rows = []
            for row in ET.fromstring(archive.read(member)).findall("m:sheetData/m:row", NS):
                values = {}
                for cell in row.findall("m:c", NS):
                    coordinate = cell.attrib["r"]
                    if cell.find("m:f", NS) is not None:
                        raise ValueError(f"Fórmula não permitida na importação: {sheet.attrib['name']}!{coordinate}")
                    col = 0
                    for c in re.match(r"[A-Z]+", coordinate).group():
                        col = col * 26 + ord(c) - 64
                    typ = cell.attrib.get("t")
                    value = cell.find("m:v", NS)
                    if typ == "inlineStr":
                        value = "".join(t.text or "" for t in cell.findall("m:is//m:t", NS))
                    elif value is None:
                        value = None
                    elif typ == "s":
                        value = strings[int(value.text)]
                    elif typ == "b":
                        value = value.text == "1"
                    elif typ in ("str", "e"):
                        value = value.text
                    else:
                        number = float(value.text)
                        value = int(number) if number.is_integer() else number
                    values[col - 1] = value
                rows.append((int(row.attrib["r"]), [values.get(i) for i in range(max(values, default=-1) + 1)]))
            result[sheet.attrib["name"]] = rows
        return result


def extract(path, output=None, filename=None):
    data = path.read_bytes() if isinstance(path, Path) else path.read()
    original_hash = hashlib.sha256(data).hexdigest()
    sheets = read_xlsx(io.BytesIO(data))
    cards, seen = [], set()
    for sheet, rows in sheets.items():
        if sheet == "Overview":
            continue
        if not rows or rows[0][1] != HEADERS:
            raise ValueError(f"Cabeçalho inesperado: {sheet}")
        for number, row in rows[1:]:
            if not any(v is not None for v in row):
                continue
            card = dict(zip(HEADERS, row))
            if not re.fullmatch(r"SST-\d{2}-\d{3}", card.get("ID", "")) or card["ID"] in seen:
                raise ValueError(f"ID inválido ou duplicado: {sheet}!A{number}")
            seen.add(card["ID"])
            card["origem"] = {"aba": sheet, "linha": number, "intervalo": f"A{number}:J{number}"}
            cards.append(card)
    result = {
        "arquivo_fonte": filename or path.name, "sha256_fonte": original_hash,
        "total": len(cards), "por_faccao": dict(Counter(c["Faction"] for c in cards)),
        "por_tipo": dict(Counter(c["Type"] for c in cards)),
        "overview": [row for _, row in sheets.get("Overview", [])], "cartas": cards,
    }
    if output is not None:
        output.mkdir(parents=True, exist_ok=True)
        (output / "fonte.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        assert hashlib.sha256(path.read_bytes()).hexdigest() == original_hash
        print(json.dumps({k: result[k] for k in ["total", "por_faccao", "por_tipo", "sha256_fonte"]}, ensure_ascii=False))
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", nargs="?", type=Path, default=ROOT / "CARDS/TABELA/SSTCG_300_cartas_playtest.xlsx")
    parser.add_argument("--output", type=Path, default=ROOT / "docs/importacao-300-cartas")
    args = parser.parse_args()
    extract(args.source.resolve(), args.output.resolve())
