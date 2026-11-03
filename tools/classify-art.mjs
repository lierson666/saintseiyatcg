#!/usr/bin/env node
// Gera a sugestão visual de cada carta. Só escreve em card-forge/art-direction/classification.json:
// data/cards.json não muda, e a decisão do autor fica em decisions.json, que este script não toca.
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {cardFacts} from '../card-forge/art-prompt.js';
import {classificationRow} from '../card-forge/art-natures.js';

const source = readFileSync(new URL('../data/cards.json', import.meta.url));
const {cartas} = JSON.parse(source);
const linhas = cartas.map((c) => classificationRow(c.id, cardFacts(c, cartas), c.tipo));
const dir = new URL('../card-forge/art-direction/', import.meta.url);
mkdirSync(dir, {recursive: true});
writeFileSync(new URL('classification.json', dir), `${JSON.stringify({versao: 1, catalogo_sha256: createHash('sha256').update(source).digest('hex').slice(0, 12), linhas}, null, 2)}\n`);
const tally = (key) => Object.entries(linhas.reduce((all, l) => ({...all, [l[key]]: (all[l[key]] || 0) + 1}), {})).map(([k, n]) => `${k} ${n}`).join(', ');
console.log(`${linhas.length} cartas\nTipo: ${tally('tipo_mecanico')}\nNatureza: ${tally('natureza_sugerida')}\nConfiança: ${tally('confianca')}`);
