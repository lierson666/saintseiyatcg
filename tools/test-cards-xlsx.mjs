// Exportação do catálogo para Excel: zip válido, uma linha por carta e texto escapado.
// node --test tools/test-cards-xlsx.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {crc32} from 'node:zlib';
import {COLUNAS, cardsToXlsx} from '../card-forge/cards-xlsx.js';

const entries = bytes => {
  const view = new DataView(bytes.buffer), text = new TextDecoder(), out = {};
  let p = 0;
  while (view.getUint32(p, true) === 0x04034b50) {
    const crc = view.getUint32(p + 14, true), size = view.getUint32(p + 18, true), nameLen = view.getUint16(p + 26, true);
    const name = text.decode(bytes.subarray(p + 30, p + 30 + nameLen)), data = bytes.subarray(p + 30 + nameLen, p + 30 + nameLen + size);
    assert.equal(crc32(data), crc, name);
    out[name] = text.decode(data);
    p += 30 + nameLen + size;
  }
  assert.equal(view.getUint32(p, true), 0x02014b50);
  return out;
};

test('gera o pacote do Excel com CRC certo', () => {
  const files = entries(cardsToXlsx([{id: 'a-1', nome_exibicao_en: 'A'}]));
  for (const f of ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml']) assert.ok(files[f], f);
});

test('uma linha por carta, número como número e texto escapado', () => {
  const sheet = entries(cardsToXlsx([
    {id: 'a-1', nome_exibicao_en: 'Tom & <Jerry>', custo: 3, habilidades_en: ['um', 'dois']},
    {id: 'a-2', custo: 0, subtipos: ['Weapon', 'Sword'], cosmoble: false},
  ]))['xl/worksheets/sheet1.xml'];
  assert.equal(sheet.match(/<row /g).length, 3);
  assert.ok(sheet.includes('Tom &amp; &lt;Jerry&gt;'));
  assert.ok(sheet.includes('<v>3</v>') && sheet.includes('<v>0</v>'));
  assert.ok(sheet.includes('um\n\ndois'));
  assert.ok(sheet.includes('Weapon | Sword') && sheet.includes('>Não<'));
});

test('caractere de controle não entra no XML', () => {
  const sheet = entries(cardsToXlsx([{id: 'a\u0007b'}]))['xl/worksheets/sheet1.xml'];
  assert.ok(sheet.includes('>ab<'));
  assert.ok(COLUNAS.length > 26);
});
