// Exporta o catálogo para Excel (autor, 02/11/2026), sem biblioteca: um .xlsx é um zip de XMLs; aqui, sem compressão.
const list = (v) => (v || []).join(' | ');
const abilities = (v) => (v || []).join('\n\n');
export const COLUNAS = [
  ['ID', (c) => c.id, 18], ['Número', (c) => c.numero_carta, 9], ['Nome', (c) => c.nome_exibicao_en, 30], ['Nome PT', (c) => c.nome_exibicao_pt, 30],
  ['Subtítulo', (c) => c.tagline_en, 26], ['Subtítulo PT', (c) => c.subtitulo_pt || c.tagline_pt, 26],
  ['Tipo', (c) => c.tipo, 12], ['Subtipos', (c) => list(c.subtipos), 22], ['Patente', (c) => c.patente_armadura, 12], ['Facção', (c) => c.faccao, 10],
  ['Raridade', (c) => c.raridade, 11], ['Coleção', (c) => c.conjunto, 18], ['Status', (c) => c.status, 13],
  ['Custo', (c) => c.custo, 7], ['Unidade do custo', (c) => c.unidade_custo, 14], ['Cosmoble', (c) => (c.cosmoble == null ? null : c.cosmoble ? 'Sim' : 'Não'), 10],
  ['ATK', (c) => c.power ?? c.attack, 6], ['HP', (c) => c.vida ?? c.resistance, 6], ['Soul', (c) => c.soul, 6], ['Awaken', (c) => c.awaken, 8],
  ['Bônus ATK', (c) => c.bonus_poder, 9], ['Bônus HP', (c) => c.bonus_vida, 9], ['Equip', (c) => c.equipar_custo_outros ?? c.equipar_custo, 7],
  ['Slot', (c) => c.slot_equipamento, 11], ['Resonance', (c) => list(c.auto_equip_en), 26], ['Keywords', (c) => list(c.keywords_en), 22],
  ['Habilidades', (c) => abilities(c.habilidades_en), 70], ['Habilidades PT', (c) => abilities(c.habilidades_pt), 70],
  ['Awaken (texto)', (c) => c.habilidade_awaken_en, 50], ['Awaken PT', (c) => c.habilidade_awaken_pt, 50],
  ['Ultimate', (c) => c.ultimate_en, 50], ['Ultimate PT', (c) => c.ultimate_pt, 50], ['Flavour', (c) => c.flavour_en, 40], ['Flavour PT', (c) => c.flavour_pt, 40],
];

// O XML do Excel não aceita caracteres de controle fora de tab e quebra de linha.
const xml = (v) => String(v).replace(/[^\t\n\r -퟿-�\u{10000}-\u{10FFFF}]/gu, '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const colName = (i) => (i < 26 ? '' : String.fromCharCode(64 + Math.floor(i / 26))) + String.fromCharCode(65 + (i % 26));
function cell(value, ref, style = '') {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') return `<c r="${ref}"${style}><v>${value}</v></c>`;
  return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(String(value).slice(0, 32767))}</t></is></c>`;
}

function sheet(cards) {
  const last = `${colName(COLUNAS.length - 1)}${cards.length + 1}`;
  const head = `<row r="1">${COLUNAS.map(([t], i) => cell(t, `${colName(i)}1`, ' s="1"')).join('')}</row>`;
  const rows = cards.map((c, r) => `<row r="${r + 2}">${COLUNAS.map(([, get], i) => cell(get(c), `${colName(i)}${r + 2}`)).join('')}</row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${last}"/><sheetViews><sheetView workbookViewId="0"><pane xSplit="3" ySplit="1" topLeftCell="D2" activePane="bottomRight" state="frozen"/></sheetView></sheetViews><cols>${COLUNAS.map(([, , w], i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${head}${rows}</sheetData><autoFilter ref="A1:${last}"/></worksheet>`;
}

const crcTable = Array.from({length: 256}, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (bytes) => { let c = 0xffffffff; for (const b of bytes) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zip(files) {
  const enc = new TextEncoder(), parts = [], central = [];
  let offset = 0;
  const header = (sig, extra, name, data, crc) => {
    const fixed = [[20, 2], [0x0800, 2], [0, 2], [0, 2], [0x21, 2], [crc, 4], [data.length, 4], [data.length, 4], [name.length, 2], [0, 2]]; // 0x0800: nomes em UTF-8
    const out = new DataView(new ArrayBuffer(4 + extra.reduce((n, [, s]) => n + s, 0) + fixed.reduce((n, [, s]) => n + s, 0)));
    let p = 0;
    const put = (v, s) => { if (s === 2) out.setUint16(p, v, true); else out.setUint32(p, v, true); p += s; };
    put(sig, 4);
    extra.slice(0, 1).forEach(([v, s]) => put(v, s));
    fixed.forEach(([v, s]) => put(v, s));
    extra.slice(1).forEach(([v, s]) => put(v, s));
    return new Uint8Array(out.buffer);
  };
  for (const [path, text] of files) {
    const name = enc.encode(path), data = enc.encode(text), crc = crc32(data);
    const local = header(0x04034b50, [], name, data, crc);
    parts.push(local, name, data);
    central.push(header(0x02014b50, [[20, 2], [0, 2], [0, 2], [0, 2], [0, 4], [offset, 4]], name, data, crc), name);
    offset += local.length + name.length + data.length;
  }
  const size = central.reduce((n, b) => n + b.length, 0), end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, size, true); end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)], out = new Uint8Array(all.reduce((n, b) => n + b.length, 0));
  let p = 0;
  for (const b of all) { out.set(b, p); p += b.length; }
  return out;
}

export function cardsToXlsx(cards) {
  const x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', pkg = 'http://schemas.openxmlformats.org/package/2006', doc = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', ms = 'application/vnd.openxmlformats-officedocument.spreadsheetml';
  return zip([
    ['[Content_Types].xml', `${x}<Types xmlns="${pkg}/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${ms}.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="${ms}.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="${ms}.styles+xml"/></Types>`],
    ['_rels/.rels', `${x}<Relationships xmlns="${pkg}/relationships"><Relationship Id="rId1" Type="${doc}/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `${x}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${doc}"><sheets><sheet name="Cartas" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">Cartas!$A$1:$${colName(COLUNAS.length - 1)}$${cards.length + 1}</definedName></definedNames></workbook>`],
    ['xl/_rels/workbook.xml.rels', `${x}<Relationships xmlns="${pkg}/relationships"><Relationship Id="rId1" Type="${doc}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${doc}/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', `${x}<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>`],
    ['xl/worksheets/sheet1.xml', sheet(cards)],
  ]);
}
