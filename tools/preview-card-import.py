"""Prepara diff de importação usando o formatador oficial, sem gravar data/cards.json."""
from collections import Counter
import difflib
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "docs/importacao-300-cartas"


def preview():
    spec = importlib.util.spec_from_file_location("forge_server", ROOT / "card-forge/serve.py")
    server = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(server)
    path = ROOT / "data/cards.json"
    original = path.read_text(encoding="utf-8")
    old = json.loads(original)
    cards = json.loads((REVIEW / "cartas-candidatas.json").read_text())
    before = {c["id"]: c for c in old["cartas"]}
    if any(c["id"] in before for c in cards):
        raise ValueError("A importação inicial não deve substituir um ID existente")
    candidate = original
    for c in cards:
        candidate = server.upsert_card(candidate, c)
    data = json.loads(candidate)
    after = {c["id"]: c for c in data["cartas"]}
    assert all(after[i] == c for i, c in before.items())
    assert len(data["cartas"]) == len(before) + len(cards)
    assert path.read_text(encoding="utf-8") == original
    (REVIEW / "catalogo-candidato.json").write_text(candidate, encoding="utf-8")
    patch = "".join(difflib.unified_diff(original.splitlines(True), candidate.splitlines(True), fromfile="a/data/cards.json", tofile="b/data/cards.json"))
    (REVIEW / "cards.diff").write_text(patch, encoding="utf-8")
    summary = {
        "catalogo_original_sha256": hashlib.sha256(original.encode()).hexdigest(),
        "catalogo_candidato_sha256": hashlib.sha256(candidate.encode()).hexdigest(),
        "diff_sha256": hashlib.sha256(patch.encode()).hexdigest(),
        "antes": len(before), "depois": len(after), "adicionadas": len(cards), "alteradas": 0, "removidas": 0,
        "por_tipo": dict(Counter(c["tipo"] for c in cards)),
        "por_faccao": dict(Counter(c["faccao"] for c in cards)),
        "slots": dict(Counter(c["slot_equipamento"] for c in cards if c["slot_equipamento"])),
        "evolucoes": [c["id"] for c in cards if len(c["estagios"]) > 1],
        "correcoes_confirmadas": ["SST-03-010: após comprar, exilar a própria carta para o Void"],
        "pendencias": ["Todas as cartas de fonte são provisórias; balanceamento não testado", "Não há God Cloth, Awaken ou Ultimate novos na planilha; não foram inventados", "Nenhuma ilustração foi fornecida na planilha"],
    }
    (REVIEW / "resumo.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = ["# Importação das 300 cartas — diff para aprovação", "", f"Catálogo: **{len(before)} → {len(after)} cartas**. Adicionadas: {len(cards)}; alteradas: 0; removidas: 0.", "", "Os 57 registros antigos permanecem intactos. Os novos usam IDs `sst-XX-XXX`, preservando o ID original `SST-XX-XXX` em `id_fonte`, o texto literal e a localização da célula na proveniência.", "", "- [Diff completo](cards.diff)", "- [Catálogo candidato completo](catalogo-candidato.json)", "- [Resumo estruturado e hashes](resumo.json)", "", "## Normalizações e decisões", "", "- HP vira `vida`; custos e atributos mantêm os números da planilha.", "- Equipment e Support recebem suporte próprio; os tipos da fonte são preservados.", "- Equipment usa Equip padrão de 1 Cosmo, conforme regra aprovada. A lista explícita de slots está abaixo.", "- Owners e Resonance usam identidade estável do personagem; as 10 Cloths de Athena possuem apenas Vanilla e 7th Sense, como na fonte.", "- As habilidades recebem operações estruturadas para o motor. O texto de apresentação é preservado, com a correção aprovada de SST-03-010 identificada separadamente.", "- Todas recebem status `needs-review` e raridade visual `Playtest`; nenhum balanceamento é apresentado como validado.", "- O texto e status originais da planilha ficam em `origem`; a planilha original não é modificada.", "", "## Slots de equipamento", "", "| ID | Equipamento | Slot |", "| --- | --- | --- |"]
    lines += [f"| {c['id_fonte']} | {c['nome_exibicao_en']} | {c['slot_equipamento']} |" for c in cards if c["tipo"] == "Equipment"]
    lines += ["", "## Integridade", "", f"SHA-256 anterior: `{summary['catalogo_original_sha256']}`", "", f"SHA-256 candidato: `{summary['catalogo_candidato_sha256']}`", "", "Esta ferramenta somente prepara arquivos de revisão; `data/cards.json` aguarda a aprovação do diff.", ""]
    (REVIEW / "README.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({k: summary[k] for k in ["antes", "depois", "adicionadas", "alteradas", "removidas", "slots", "diff_sha256"]}, ensure_ascii=False))


if __name__ == "__main__":
    preview()
