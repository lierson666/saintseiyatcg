// Lista única de edições do jogo (autor, 31/10/2026): a 1ª é Dawn of Cosmo. Carta sem `edicao` é da 1ª.
// Rodapé das cartas, Card Forge e STAR HILL leem daqui; `logo` é relativo à raiz do site.
export const EDITIONS = [{name: 'Dawn of Cosmo', code: 'DOC', language: 'EN', year: 2026, logo: 'LOGO/edicoes/doc.png'}];
export const editionOf = card => EDITIONS.find(e => e.code === card?.edicao) || EDITIONS[0];
