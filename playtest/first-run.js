// Tutorial 001 de combate: endereço e registro de conclusão. O guia de primeiro acesso da home é outro fluxo (home-guide.js).
const KEY = 'sstcg.novice.v1';
export const GUIDED_URL = './divine/?guided=1&deckA=rulebook2-athena-d171&deckB=preview-poseidon-tide&ai=B&godB=poseidon';
export const tutorialDone = () => { try { return JSON.parse(localStorage.getItem(KEY))?.stage === 'done'; } catch { return false; } };
export const setStage = stage => { try { localStorage.setItem(KEY, JSON.stringify({stage})); } catch { /* sem armazenamento */ } };
