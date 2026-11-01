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
  'Guardian': 'Guardião', 'Nimble': 'Ágil', 'Cheater': 'Trapaceiro', 'Long Range': 'Longo Alcance', 'Pierce': 'Perfurar', 'Impulse': 'Impulso',
  'Seal': 'Selo', 'Sealed': 'Selado', 'Unfaith': 'Infiel', 'Training': 'Treinamento', 'Afterlife': 'Além-Túmulo',
  'Prepared': 'Preparado', 'Unprepared': 'Despreparado', 'Prepare': 'Preparar', 'Multiguard': 'Multiguarda',
};
export const keywordName = k => (lang() === 'pt' ? String(k).replace(/^(Long Range|Multiguard|[A-Z][a-z]+)/, m => KEYWORD_PT[m] ?? m) : k);

// Linha de tipo (tipo, subtipos, facção) em PT. tipo/subtipos continuam em inglês nos dados: a engine lê esses valores.
export const TYPE_PT = {
  'Devotee': 'Devoto', 'Spell': 'Magia', 'Equipment': 'Equipamento', 'Domain': 'Domínio', 'God': 'Deus', 'Moment': 'Momento', 'Technique': 'Técnica',
  'Athena': 'Athena', 'Poseidon': 'Poseidon', 'Hades': 'Hades', 'Ares': 'Ares', 'Artemis': 'Ártemis', 'Neutral': 'Neutro',
  'Saint': 'Cavaleiro', 'Bronze Saint': 'Cavaleiro de Bronze', 'Silver Saint': 'Cavaleiro de Prata', 'Gold Saint': 'Cavaleiro de Ouro', 'Black Saint': 'Cavaleiro Negro',
  'Steel Saint': 'Cavaleiro de Aço', 'Ghost Saint': 'Cavaleiro Fantasma', 'Marina': 'Marina', 'Marina General': 'General Marina', 'Specter': 'Espectro',
  'Judge Specter': 'Juiz do Inferno', 'Berserker': 'Berserker', 'Satellite': 'Satélite', 'Warrior': 'Guerreiro', 'Support': 'Suporte', 'Armor': 'Armadura',
  'Cloth': 'Armadura', 'Scale': 'Escama', 'Surplice': 'Súplice', 'Warplate': 'Placa de Guerra', 'Moonplate': 'Placa Lunar', 'God Armor': 'Armadura Divina',
  'Steel Cloth': 'Armadura de Aço', 'Sacred Armor': 'Armadura Sagrada', 'Satellite Armor': 'Armadura de Satélite', 'Living Armor': 'Armadura Viva',
  'Artifact': 'Artefato', 'Divine Artifact': 'Artefato Divino', 'War Artifact': 'Artefato de Guerra', 'Relic': 'Relíquia', 'Divine Relic': 'Relíquia Divina',
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
