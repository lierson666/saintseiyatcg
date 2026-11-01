import test from 'node:test';
import assert from 'node:assert/strict';
import {cardKeywords, renderKeywordNotes, KEYWORD_RULES} from '../shared/keyword-glossary.js';

test('fichas de keyword: impressas primeiro, depois as do texto, sem repetir', () => {
  const card = {keywords_en: ['Guardian'], habilidades_en: ['Target gains Pierce and Long Range. Put 1 Seal counter; it stays Unprepared. Guardian again.']};
  assert.deepEqual(cardKeywords(card), ['Guardian', 'Pierce', 'Long Range', 'Seal']); // Unprepared é estado, não keyword (autor, 31/10/2026)
  assert.deepEqual(cardKeywords({habilidades_en: ['Hidden Cosmo {6}']}), ['Hidden Cosmo']);
  const html = renderKeywordNotes(card);
  assert.match(html, /<strong>LONG RANGE<\/strong>/);
  assert.ok(html.includes(KEYWORD_RULES['Seal']));
  assert.equal(renderKeywordNotes({habilidades_en: ['Draw a card.']}), '');
});
