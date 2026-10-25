"""Relatório e diff de migração, sem gravar no catálogo nem renomear cartas."""
import difflib,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
path=ROOT/'data/cards.json';source=path.read_text();data=json.loads(source)
armor=[c for c in data['cartas'] if c['tipo']!='Devotee' and (c.get('slot_equipamento')=='armadura' or set(c.get('subtipos',[]))&{'Armor','Cloth','Scale','Surplice','Warplate','Moonplate'})]
updates={c['id']:{'categoria_equipamento':'Armor','equipar_custo_ressonante':c.get('equipar_custo',1),'equipar_custo_outros':5} for c in armor}
# O gravador existente preserva todos os bytes dos outros registros; apenas simulação em memória.
import importlib.util
spec=importlib.util.spec_from_file_location('serve_report',ROOT/'card-forge/serve.py');serve=importlib.util.module_from_spec(spec);spec.loader.exec_module(serve)
proposed=source
for c in armor:
 changed={**c,**updates[c['id']]};proposed=serve.upsert_card(proposed,changed)
out=ROOT/'docs/rulebook-2.1';out.mkdir(exist_ok=True)
(out/'catalogo.diff').write_text(''.join(difflib.unified_diff(source.splitlines(True),proposed.splitlines(True),fromfile='a/data/cards.json',tofile='b/data/cards.json')))
(out/'catalogo-proposta.json').write_text(json.dumps({'sha256_fonte':hashlib.sha256(source.encode()).hexdigest(),'atualizacoes':updates},ensure_ascii=False,indent=2)+'\n')
rows='\n'.join(f"| {c['id']} | {c['nome_exibicao_en']} | {c['faccao']} | {', '.join(c.get('donos',[])) or 'não definido'} | {len(c.get('estagios',[]))} |" for c in armor)
(out/'migracao-catalogo.md').write_text(f'''# Migração do catálogo — Rulebook 2.1

Catálogo auditado: {len(data['cartas'])} cartas; SHA-256 `{hashlib.sha256(source.encode()).hexdigest()}`. Nenhuma gravação autorizada nesta etapa.

## Proposta pronta para aprovação

[Diff integral](catalogo.diff): adiciona categoria Armor e custos explícitos de Equip ressonante (valor impresso atual, padrão 1) / outros (5) em {len(armor)} cartas. Preserva IDs, nomes, arte, textos, custos de jogar, programas e demais registros. A engine já aplica a política aprovada sem precisar regravar as 357 cartas. A proposta só torna os padrões explícitos para futuras revisões.

| ID | Carta | Facção | Owners atuais | Estágios atuais |
| --- | --- | --- | --- | --- |
{rows}

## Revisões de design que exigem Card Craft

- As armaduras acima não distinguem V1/V2 no nome: revisar individualmente antes de marcar versões. V1 é identidade do Devotee e não será criada como Equipment. Nenhuma carta é removida ou renomeada automaticamente.
- Athena: definir as cinco afinidades Bronze → Gold aprovadas e múltiplos portadores, sem inferir identidades de cartas genéricas. Dados estruturados já aceitam `portadores_ressonantes`, `donos` e `ressonancias` com personagem exato.
- Hades e Ares têm armaduras sem portador designado; enquanto não aprovado, qualquer portador paga o custo alternativo. Não se deduz identidade pelo nome.
- Artemis: Chosen Moonplate ocupa o slot de armadura, mas ainda usa subtipo Equipment; a reclassificação editorial aguarda revisão. Moonplate já é suportado na engine/editor; Silver Mantle e acessórios não são convertidos automaticamente em Armor. Revisar o elenco Satellites sem reclassificar personagens pelo título.
- Até quatro estágios podem ser definidos por carta, com custos e requisitos; não criar automaticamente estágios inexistentes ou todas as versões.
- God Armor / Divine Artifact: categorias editoriais `categoria_conjunto: god_armor | divine_artifact`, `conjunto: vanilla`. Validação conta exatamente uma de cada por facção quando o Card Craft fornecer os dados; dados ausentes são pendências, não cartas inventadas ou limite de deck.
- Origem: `origem_personagem` aceita CANON — KURUMADA, SAINT SEIYA — OUTRAS OBRAS, MITOLOGIA ADAPTADA, ORIGINAL TCG. `referencias_mitologicas` documenta adaptações. Nenhuma atribuição automática a personagens existentes.
- Manter textos legados e arquivos de origem até revisão do autor. Identidades preliminares das outras quatro facções não constituem fechamento do design.

## Aprovação e escrita

A proposta em `catalogo-proposta.json` inclui o hash da fonte; qualquer mudança concorrente exige novo diff. Após aprovação explícita, usar `serve.upsert_card` para gravar somente os registros aprovados. Nunca aplicar esta proposta sobre outra revisão silenciosamente.
''')
print(json.dumps({'cartas':len(data['cartas']),'armaduras':len(armor),'diff':str(out/'catalogo.diff'),'catalogo_gravado':False},ensure_ascii=False))
