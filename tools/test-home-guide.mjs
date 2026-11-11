// Guia da home: quando abre sozinho e quando retoma.
import assert from 'node:assert';
const m = new Map();
globalThis.localStorage = {getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k)};
globalThis.location = {search: ''};
const {guideStart: G, STEPS} = await import('../playtest/home-guide.js');
const K = u => `sstcg.onboarding.home.${u}`, set = (u, v) => m.set(K(u), JSON.stringify(v));
assert.equal(STEPS.length, 9);
assert.equal(G('nova', {signedIn: true, isNew: true}), 0, 'primeiro login');
assert.equal(G('antiga', {signedIn: true, isNew: false}), null, 'conta já existente');
assert.equal(G('guest', {signedIn: false, isNew: true}), null, 'sem login');
set('a', {onboarding_home_seen: true, onboarding_home_completed: false, onboarding_home_last_step: 4});
assert.equal(G('a', {signedIn: true, isNew: false}), 4, 'retoma depois de recarregar');
set('b', {onboarding_home_seen: true, onboarding_home_skipped: true, onboarding_home_last_step: 2});
assert.equal(G('b', {signedIn: true, isNew: true}), null, 'pulou: não reabre');
set('c', {onboarding_home_seen: true, onboarding_home_completed: true});
assert.equal(G('c', {signedIn: true, isNew: true}), null, 'concluiu: não repete');
assert.equal(G('outra', {signedIn: true, isNew: true}), 0, 'cada conta tem o seu registro');
console.log('ok');
