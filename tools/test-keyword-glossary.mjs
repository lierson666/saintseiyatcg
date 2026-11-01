import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {cardKeywords, renderKeywordNotes, renderKeywordIcons, keywordIconUrl, KEYWORD_RULES} from '../shared/keyword-glossary.js';

test('fichas de keyword: impressas primeiro, depois as do texto, sem repetir', () => {
  const card = {keywords_en: ['Guardian'], habilidades_en: ['Target gains Pierce and Long Range. Put 1 Seal counter; it stays Unprepared. Guardian again.']};
  assert.deepEqual(cardKeywords(card), ['Guardian', 'Pierce', 'Long Range', 'Seal']); // Unprepared é estado, não keyword (autor, 31/10/2026)
  assert.deepEqual(cardKeywords({habilidades_en: ['Hidden Cosmo {6}']}), ['Hidden Cosmo']);
  const html = renderKeywordNotes(card);
  assert.match(html, /<strong>LONG RANGE<\/strong>/);
  assert.ok(html.includes('removes one Seal counter and does not Prepare'));
  assert.match(KEYWORD_RULES['Seal'], /becomes Unprepared/);
  assert.equal(renderKeywordNotes({habilidades_en: ['Draw a card.']}), '');
});

test('moedas de keyword: todo lembrete tem moeda, com rótulo e dica; o resto fica de fora', () => {
  for (const k of Object.keys(KEYWORD_RULES)) assert.ok(existsSync(fileURLToPath(keywordIconUrl(k))), k);
  const html = renderKeywordIcons(['guardian', 'Unknown', 'Seal', 'Sealed']);
  assert.equal(html.match(/class="kw-icon"/g).length, 2); // Seal e Sealed dividem o cadeado
  assert.ok(html.includes(`aria-label="Guardian: ${KEYWORD_RULES.Guardian.replace(/'/g, '&#39;')}"`));
  assert.ok(html.includes('data-tip="Guardian|'));
  assert.equal(renderKeywordIcons(['Unknown']), '');
});
