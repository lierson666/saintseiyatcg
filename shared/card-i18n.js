// Carta em PT-BR (autor, 31/10/2026; docs/glossario-pt-br.md): o texto em português fica nos campos *_pt de
// data/cards.json, ao lado dos *_en. Só a exibição troca de idioma: displayCard() devolve uma cópia com os *_en
// trocados pelos *_pt (campo vazio cai no inglês). Engine, preview-cards e keyword-glossary seguem lendo o inglês.
// O Card Forge escolhe o idioma da carta por exportação (forceLang), sem mudar o idioma da página.
let forced = null;
export const forceLang = l => { forced = l === 'pt' || l === 'en' ? l : null; };
export const lang = () => forced ?? (globalThis.ssI18n?.lang === 'pt' ? 'pt' : 'en');
const FIELDS = ['nome_exibicao', 'subtitulo', 'tagline', 'flavour', 'habilidades', 'habilidade_awaken', 'ultimate'];
// auto_equip_pt fica à parte: auto_equip_en é dado da engine (Resonance), lido em PT só por card-visual-values.js.
const filled = v => (Array.isArray(v) ? v.length > 0 : v != null && String(v).trim() !== '');

export function displayCard(card) {
  if (!card || lang() !== 'pt' || card.__pt) return card;
  let out = null;
  for (const f of FIELDS) if (filled(card[`${f}_pt`])) (out ??= {...card, __pt: true})[`${f}_en`] = card[`${f}_pt`];
  return out || card;
}

// Keywords: o nome em inglês é a chave (engine, KEYWORD_RULES); em PT só muda o que aparece.
export const KEYWORD_PT = {
  'Guardian': 'Guardião', 'Nimble': 'Ágil', 'Long Range': 'Longo Alcance', 'Pierce': 'Perfurar', 'Impulse': 'Impulso', 'Hidden Cosmo': 'Cosmo Oculto',
  'Seal': 'Selo', 'Sealed': 'Selado', 'Training': 'Treinamento', 'Afterlife': 'Além-Túmulo',
  'Prepared': 'Preparado', 'Unprepared': 'Despreparado', 'Prepare': 'Preparar',
};
export const keywordName = k => (lang() === 'pt' ? String(k).replace(/^(Long Range|[A-Z][a-z]+)/, m => KEYWORD_PT[m] ?? m) : k);

// Linha de tipo (tipo, subtipos, facção) em PT. tipo/subtipos continuam em inglês nos dados: a engine lê esses valores.
export const TYPE_PT = {
  'Devotee': 'Devoto', 'Spell': 'Momento ou Técnica', 'Equipment': 'Equipamento', 'Domain': 'Domínio', 'God': 'Deus', 'Moment': 'Momento', 'Technique': 'Técnica',
  'Athena': 'Athena', 'Poseidon': 'Poseidon', 'Hades': 'Hades', 'Ares': 'Ares', 'Artemis': 'Ártemis', 'Neutral': 'Neutro',
  'Saint': 'Cavaleiro', 'Bronze Saint': 'Cavaleiro de Bronze', 'Silver Saint': 'Cavaleiro de Prata', 'Gold Saint': 'Cavaleiro de Ouro', 'Black Saint': 'Cavaleiro Negro',
  'Steel Saint': 'Cavaleiro de Aço', 'Ghost Saint': 'Cavaleiro Fantasma', 'Marina': 'Marina', 'Marina General': 'General Marina', 'Specter': 'Espectro',
  'Judge Specter': 'Juiz do Inferno', 'Berserker': 'Berserker', 'Satellite': 'Satélite', 'Warrior': 'Guerreiro', 'Support': 'Suporte', 'Armor': 'Armadura',
  'Cloth': 'Armadura', 'Scale': 'Escama', 'Surplice': 'Súplice', 'Warplate': 'Placa de Guerra', 'Moonplate': 'Placa Lunar', 'Glory': 'Glória', 'Angel': 'Anjo', 'Celestial Warrior': 'Guerreiro Celestial', 'God Armor': 'Armadura Divina',
  'Steel Cloth': 'Armadura de Aço', 'Sacred Armor': 'Armadura Sagrada', 'Satellite Armor': 'Armadura de Satélite', 'Living Armor': 'Armadura Viva',
  'Artifact': 'Artefato', 'Divine Artifact': 'Artefato Divino', 'War Artifact': 'Artefato de Guerra', 'Relic': 'Relíquia', 'Divine Relic': 'Relíquia Divina',
  'Sword': 'Espada', 'Trident': 'Tridente', 'Chain': 'Corrente', 'Dagger': 'Adaga', 'Staff': 'Cajado', 'Axe': 'Machado', 'Whip': 'Chicote', 'Instrument': 'Instrumento', 'Lyre': 'Lira', 'Flute': 'Flauta', 'Harp': 'Harpa', 'Horn': 'Trompa',
  'Bronze': 'Bronze', 'Silver': 'Prata', 'Gold': 'Ouro', 'Steel': 'de Aço', 'General': 'General',
  'Marine': 'Marina', 'Captain': 'Capitão', 'Terrestrial': 'Terrestre', 'Celestial': 'Celestial', 'Judge': 'Juiz', 'Elite': 'Elite', 'Warlord': 'Senhor da Guerra', 'Crescent': 'Crescente', 'Half': 'Meia', 'Full': 'Cheia',
  'Weapon': 'Arma', 'Divine Weapon': 'Arma Divina', 'War Gear': 'Equipamento de Guerra', 'Nature': 'Natureza', 'Sacred Beast': 'Fera Sagrada',
  'Disaster Legion': 'Legião do Desastre', 'Red Fire Legion': 'Legião do Fogo Vermelho', 'Flame Legion': 'Legião da Chama', 'Fear Legion': 'Legião do Medo',
  'Atlantean': 'Atlante', 'Lunar Guardian': 'Guardião Lunar', 'Forest Guardian': 'Guardião da Floresta', 'Floral Guardian': 'Guardião Floral', 'Ancient Guardian': 'Guardião Ancestral',
  'Nature Spirit': 'Espírito da Natureza', 'Sanctuary': 'Santuário', 'Olympian': 'Olimpiano', 'Lunar': 'Lunar', 'Ocean Pillar': 'Pilar do Oceano',
  'Underworld Servant': 'Servo do Mundo dos Mortos', 'Divine Awakening': 'Despertar Divino', 'Forest': 'Floresta', 'Cosmo Ramp': 'Aceleração de Cosmo',
  'Removal': 'Remoção', 'Divine': 'Divino', 'Human': 'Humano', 'Divinity': 'Divindade', 'Skeleton': 'Esqueleto', 'Lunar Commander': 'Comandante Lunar',
  'Bow': 'Arco', 'Wolf': 'Lobo', 'Archer': 'Arqueira', 'Guardian': 'Guardião', 'Combat': 'Combate', 'Growth': 'Crescimento', 'Commander': 'Comandante',
  'Arena': 'Arena', 'Vessel': 'Receptáculo', 'Abyssal': 'Abissal', 'Scout': 'Batedor', 'Labyrinth': 'Labirinto', 'Ruins': 'Ruínas', 'Abyss': 'Abismo',
  'Spirit': 'Espírito', 'Lunar Vestment': 'Veste Lunar', 'Black Moon Huntress': 'Caçadora da Lua Negra', 'Divine Vessel': 'Receptáculo Divino', 'Titan': 'Titã',
  'Lunar Divinity': 'Divindade Lunar', 'Lunar Blessing': 'Bênção Lunar', 'Sacred Oath': 'Juramento Sagrado', 'Nature Divinity': 'Divindade da Natureza',
  'Arrow': 'Flecha', 'Bear': 'Urso', 'Serpent': 'Serpente', 'Hound': 'Cão de Caça', 'Initiate': 'Iniciada', 'Druid': 'Druida', 'Hunter': 'Caçador',
  'Acolyte': 'Acólito', 'Ancient': 'Ancestral', 'Black Moon': 'Lua Negra', 'Dryad': 'Dríade', 'Nymph': 'Ninfa', 'Primal': 'Primordial', 'Apprentice': 'Aprendiz',
  'Stag': 'Cervo', 'Fox': 'Raposa', 'Treant': 'Ente', 'Royal Huntress': 'Caçadora Real', 'Shaman': 'Xamã', 'Quiver': 'Aljava', 'Spear': 'Lança', 'Cloak': 'Manto',
  'Amulet': 'Amuleto', 'Shield': 'Escudo', 'Recovery': 'Recuperação', 'Lunar Sanctuary': 'Santuário Lunar', 'Ancient Forest': 'Floresta Ancestral',
  'Primordial Grove': 'Bosque Primordial', 'Sacred Hunting Grounds': 'Terras Sagradas de Caça', 'Champion': 'Campeão', 'Archer Commander': 'Comandante Arqueira',
  'Gathering': 'Reunião', 'Invasion': 'Invasão', 'Divine Conflict': 'Conflito Divino', 'Tragedy': 'Tragédia', 'Divine Judgment': 'Julgamento Divino',
  'Soldier': 'Soldado', 'Mercenary': 'Mercenário', 'Construct': 'Constructo', 'Beast': 'Fera', 'Scientist': 'Cientista', 'Prototype': 'Protótipo',
  'Facility': 'Instalação', 'Mask': 'Máscara', 'Device': 'Dispositivo', 'Supply': 'Suprimento', 'Undersea': 'Submarino', 'Temple': 'Templo',
};
export const typeWord = w => (lang() === 'pt' ? TYPE_PT[w] ?? w : w);

// ---------- Habilidades em jogo (autor, 01/11/2026): a engine fala em inglês ("SCAVENGER'S REWARD"); a tela mostra o *_pt. ----------
const NAME = /^(.{2,60}?)(?: — |: )/;
const lines = (c, l) => [...(c[`habilidades_${l}`] || []), c[`habilidade_awaken_${l}`], c[`ultimate_${l}`]].map(v => v || '');
const title = s => s.toLowerCase().replace(/(^|[\s(-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/ (De|Do|Da|Dos|Das|E|Of|The)(?= )/g, m => m.toLowerCase());
// Dicionário EN → PT para shared/i18n.js: nome de carta e de habilidade, nas grafias que aparecem na tela.
export function cardTerms(cards) {
  const out = {}, put = (en, pt) => { if (!en || !pt || en === pt) return; out[en] ??= pt; out[en.toUpperCase()] ??= pt.toUpperCase(); out[title(en)] ??= title(pt); };
  for (const c of cards) {
    put(c.nome_exibicao_en, c.nome_exibicao_pt);
    const en = lines(c, 'en'), pt = lines(c, 'pt');
    en.forEach((l, i) => put(l.match(NAME)?.[1], pt[i]?.match(NAME)?.[1]));
  }
  return out;
}
export const registerCardTerms = cards => globalThis.ssI18n?.add?.(cardTerms(cards));
// Efeito impresso da habilidade `ability` (nome, ou frase do gatilho) no idioma da tela, ou null. Sai sem o nome e sem a
// etiqueta de God ("Divine Power", "Cost:"), que ficam na primeira linha ou na seguinte.
// Gatilho de Domain chega como "Domain · evento", sem nome de habilidade: a linha é a de gatilho que mais cita o evento.
export function triggerLine(c, event) {
  const en = c?.habilidades_en || [], low = event.toLowerCase(), words = low.match(/\p{L}{4,}/gu) || [];
  const named = en.findIndex(l => l.match(NAME)?.[1].toLowerCase() === low);
  if (named >= 0) return named;
  const score = l => words.filter(w => l.toLowerCase().includes(w.slice(0, 5))).length;
  return en.map((l, i) => i).filter(i => /\b(when|whenever|at the (beginning|start|end))\b/i.test(en[i])).sort((a, b) => score(en[b]) - score(en[a]))[0] ?? -1;
}
export function abilityText(c, ability) {
  if (!c || !ability) return null;
  const en = lines(c, 'en'), low = ability.toLowerCase();
  let i = en.findIndex(l => l.match(NAME)?.[1].toLowerCase() === low);
  const named = i >= 0;
  if (!named) i = en.findIndex(l => l.toLowerCase().includes(low));
  if (i < 0) return null;
  const line = (lang() === 'pt' && lines(c, 'pt')[i]) || en[i];
  if (!named) return line;
  const rows = line.split('\n'), first = rows[0].replace(NAME, '').trim();
  return (rows.length > 1 ? rows.slice(1).filter(r => !/^(Cost|Custo):/.test(r)).join(' ') : first).trim() || first;
}
