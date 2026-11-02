import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {inlineMarkup, statSymbols, costSymbols} from '../shared/card-text.js';
import {cardKeywords, renderKeywordNotes, renderKeywordIcons, keywordIconUrl, KEYWORD_RULES} from '../shared/keyword-glossary.js';

test('fichas de keyword: impressas primeiro, depois as do texto, sem repetir', () => {
  const card = {keywords_en: ['Guardian'], habilidades_en: ['Target gains @Pierce and @Long Range. Put 1 @Seal counter; it stays Unprepared. @Guardian again.']};
  assert.deepEqual(cardKeywords(card), ['Guardian', 'Pierce', 'Long Range', 'Seal']); // Unprepared é estado, não keyword (autor, 31/10/2026)
  assert.deepEqual(cardKeywords({habilidades_en: ['Hidden Cosmo {6}']}), ['Hidden Cosmo']);
  const html = renderKeywordNotes(card);
  assert.match(html, /<strong>LONG RANGE<\/strong>/);
  assert.ok(html.includes('removes one Seal counter and does not Prepare'));
  assert.match(KEYWORD_RULES['Seal'], /becomes Unprepared/);
  assert.equal(renderKeywordNotes({habilidades_en: ['Draw a card.']}), '');
});

test('só @ puxa keyword e símbolo; sem @ é texto comum', () => {
  assert.deepEqual(cardKeywords({habilidades_en: ['When Forest Guardian enters, gain 1 Training.']}), []);
  assert.deepEqual(cardKeywords({habilidades_en: ['Afterlife {2}{C}: Draw a card.']}), ['Afterlife']);
  const bare = inlineMarkup('Forest Guardian has +1 ATK and costs COSMO.');
  assert.doesNotMatch(bare, /<strong>GUARDIAN|rule-sym/);
  const marked = inlineMarkup('@Guardian. +1 @ATK / -1 @HP. Pay 2 @COSMO, 1 @LATENT, @TAP, 3 @SOUL, 1 @BASECOSMO. @Cosmo Oculto');
  assert.match(marked, /<strong>GUARDIAN<\/strong>/);
  assert.match(marked, /<strong>COSMO OCULTO<\/strong>/);
  assert.doesNotMatch(marked.replace(/<[^>]+>/g, ''), /@/);
  for (const k of 'AHCLTSB') assert.match(marked, new RegExp(`rule-sym--${k}`), k);
  assert.equal(statSymbols('@COSMO'), '{C}');
  assert.equal(costSymbols('Pay 2 @COSMO and +1 @ATK'), 'Pay {2}{C} and +1 @ATK');
});

test('moedas de keyword: todo lembrete tem moeda, com rótulo e dica; o resto fica de fora', () => {
  for (const k of Object.keys(KEYWORD_RULES)) assert.ok(existsSync(fileURLToPath(keywordIconUrl(k))), k);
  const html = renderKeywordIcons(['guardian', 'Unknown', 'Seal', 'Sealed']);
  assert.equal(html.match(/class="kw-icon"/g).length, 2); // Seal e Sealed dividem o cadeado
  assert.ok(html.includes(`aria-label="Guardian: ${KEYWORD_RULES.Guardian.replace(/'/g, '&#39;')}"`));
  assert.ok(html.includes('data-tip="Guardian|'));
  assert.equal(renderKeywordIcons(['Unknown']), '');
});
