// Gerador de prompt de arte para o ChatGPT (autor, 02/11/2026), sobre o Master Art Prompt System V1.0 (art-master-prompt.md).
// Duas saídas: o sistema completo com o pedido da carta, para o GPT agir como diretor de arte, ou o prompt direto de imagem.
// No prompt direto o traço vem descrito, sem nome de ilustrador: o gerador de imagem costuma recusar nome de artista vivo.
import {printedKind} from '../shared/rules-policy.js';
import {formatCardTypeLine} from '../shared/equipment-types.js';

const pair = (code, pt) => [code, `${code}: ${pt}`];
export const SHOTS = [
  pair('Extreme Close-Up (ECU)', 'parte específica, como olhos ou boca'), pair('Close-Up (CU)', 'rosto e ombros'), pair('Medium Close-Up', 'peito para cima'),
  pair('Medium Shot (MS)', 'corta na cintura'), pair('Medium Full Shot (MFS)', 'plano americano, corta nos joelhos'), pair('Three-Quarter Shot', 'três quartos do corpo'),
  pair('Full Body Shot (FBS)', 'corpo inteiro'), pair('Wide Shot (WS)', 'personagem menor, cenário em destaque'), pair('Wide Environmental Shot', 'o ambiente é o assunto'),
];
export const POSES = [
  pair('Standing straight', 'em pé, postura reta'), pair('Casual lean against a wall', 'encostado na parede'), pair('Sitting cross-legged', 'sentado de pernas cruzadas'),
  pair('Looking over the shoulder', 'olhando por cima do ombro'), pair('Hands in pockets', 'mãos nos bolsos'), pair('Crossing arms', 'braços cruzados'),
  pair('Dynamic action pose', 'ação em movimento, corpo inclinado'), pair('Mid-air jump', 'no meio de um salto'), pair('Running sprint', 'correndo em velocidade máxima'),
  pair('Combat stance', 'postura de luta, punhos erguidos'), pair('Crouching low', 'agachado, pronto para saltar'),
];
export const ANGLES = [
  pair('Eye-level shot', 'nível dos olhos, confronto direto'), pair('Low-angle shot', 'de baixo para cima, dominante'), pair('Extreme low-angle shot', 'figura colossal ou aterrorizante'),
  pair('High-angle shot', 'de cima para baixo, vulnerável'), pair("Bird's-eye view", 'visão aérea total'), pair('Dutch angle', 'inclinada, instabilidade e violência'), pair('Over-the-shoulder shot', 'confronto narrativo'),
];
export const MOTIONS = [
  ['', 'Nenhum'], ['Motion frozen at the decisive instant', 'Congelado no instante decisivo'], ['Hair and cloth reacting to the energy', 'Cabelos e tecidos reagindo à energia'], ['Debris thrown outward by the force', 'Detritos projetados pela força'],
  ['Dynamic perspective', 'Perspectiva dinâmica'], ['Strong action lines through the whole figure', 'Linhas de ação'], ['Motionless figure against a moving environment', 'Figura imóvel, ambiente em movimento'],
];
export const EXPRESSIONS = [
  ['Fierce, unbreakable determination', 'Determinação feroz'], ['Cold, contemptuous stare', 'Frieza e desprezo'], ['Serene and compassionate', 'Serenidade compassiva'],
  ['Battle fury, teeth clenched, shouting', 'Fúria de batalha, gritando'], ['Wounded but refusing to fall', 'Ferido, sem cair'], ['Grief and tears held back', 'Dor e lágrimas contidas'],
  ['Confident, faint smile', 'Sorriso confiante'], ['Cruel, sadistic grin', 'Sorriso cruel'], ['Eyes closed in concentration', 'Olhos fechados, concentração'], ['Divine, unreadable calm', 'Calma divina'],
];
export const VERSIONS = [
  ['classic 1980s anime', 'Anime clássico'], ['original manga', 'Mangá original'], ['Hades chapter OVAs', 'OVAs de Hades'],
];
export const EPIC_LEVELS = [
  ['1', '1 Contido', 'clean, small scale, simple lighting'], ['2', '2 Heroico', 'striking pose, recognizable setting, moderate effects'], ['3', '3 Épico', 'dramatic composition, elaborate energy and lighting'],
  ['4', '4 Lendário', 'monumental scale, intense atmosphere, extraordinary composition'], ['5', '5 Divino', 'exceptional impact, supernatural scale, sense of absolute power'],
];
export const STYLES = [
  ['elegant anatomy, dramatic flowing hair, expressive faces, ornate armor, classic heroism, 1980s anime cel shadows', 'Anime clássico (Shingo Araki, Michi Himeno)'],
  ['vigorous ink line, intense movement, dramatic energy bursts, original 1980s shonen manga language', 'Mangá original (Masami Kurumada)'],
  ['organic anatomy, expressive faces, traditional hand-drawn composition', 'Anime tradicional (Yoshikazu Yasuhiko)'],
  ['striking silhouettes, clean economical drawing, highly readable movement', 'Silhueta limpa (Akira Toriyama)'],
  ['complex armor, dense crosshatching, heavy blacks, dark fantasy, monumental scale', 'Fantasia sombria (Kentaro Miura)'],
  ['powerful muscular anatomy, intimidating expressions, stark contrast and drama', 'Anatomia poderosa (Tetsuo Hara)'],
  ['realistic anatomy, expressive brushwork, sumi ink washes, emotional realism', 'Pincel realista (Takehiko Inoue)'],
  ['monumental architecture, oppressive atmosphere, dark science-fiction scale', 'Arquitetura opressiva (Tsutomu Nihei)'],
  ['organic textures, gestural ink, visceral movement', 'Tinta gestual (Hiroaki Samura)'],
  ['extreme anatomical detail, intense metallic reflections, dynamic action', 'Detalhe e reflexo (Boichi)'],
  ['extreme perspective, action anatomy, spectacular destruction', 'Ação extrema (Yusuke Murata)'],
  ['ethereal elegance, delicate painting, divine figures, sophisticated ornament', 'Pintura etérea (Yoshitaka Amano)'],
  ['gothic fantasy, aristocratic costume, dark romantic atmosphere, fine painted rendering', 'Gótico romântico (Ayami Kojima)'],
  ['elongated silhouettes, ornamental composition, elegant fantasy', 'Fantasia ornamental (CLAMP)'],
  ['cinematic digital compositing, glowing energy effects, dynamic camera, volumetric light', 'Animação atual (Ufotable)'],
  ['aggressive action, expressive motion, dramatic hard shadows', 'Ação agressiva (MAPPA)'],
  ['visual exaggeration, radical perspective, explosive motion, bold shapes', 'Exagero explosivo (Studio Trigger, Hiroyuki Imaishi)'],
  ['theatrical sculptural poses, bold unexpected color, graphic contour', 'Poses teatrais (Hirohiko Araki)'],
  ['realism and highly detailed environments, precise mechanical drawing', 'Realismo de cenário (Katsuhiro Otomo)'],
  ['elegance, stark black and white contrasts, clean striking silhouettes', 'Contraste elegante (Tite Kubo)'],
  ['experimental painted textures, melancholic atmosphere', 'Pintura melancólica (Sui Ishida)'],
  ['horror, creeping tension, fine unsettling line detail', 'Horror (Junji Ito)'],
  ['atmospheric light, vibrant luminous skies and environments', 'Luz atmosférica (Makoto Shinkai)'],
  ['rich traditional oil look, painterly chiaroscuro, grand heroic realism for an epic fantasy card', 'Pintura épica de Magic (Greg Staples, Chris Rahn)'],
  ['flowing organic linework, jewel-like glazes, decorative halos and patterned robes', 'Art nouveau de Magic (Terese Nielsen, Rebecca Guay)'],
  ['haunting symbolic imagery, muted palette, surreal dreamlike painting', 'Surreal de Magic (Seb McKinnon)'],
];
const styleWith = (name) => STYLES.find(([, label]) => label.includes(name))[0];
export const LIGHTS = [
  ['Cosmo aura erupting behind the figure as key light, warm rim on hair and armor edges, soft reflected fill keeping the face readable', 'Aura de Cosmo atrás'],
  ['Single volumetric shaft of white divine light from directly above, hot highlights on shoulders and head, soft bounce on the face', 'Feixe divino de cima'],
  ['Teal underwater caustics falling from above and rippling over the armor, cool blue ambient, gold speculars', 'Luz subaquática'],
  ['Dim spectral violet glow from below and behind, cold grey fill, thin cold rim separating the silhouette from the fog', 'Brilho espectral'],
  ['Orange firelight and embers from below right, warm uplight on jaw and breastplate, black smoke behind', 'Fogo de baixo'],
  ['Cold moonlight from upper left, silver speculars on armor ridges, long soft shadows, low contrast', 'Luar frio'],
  ['Golden sunset from the right, warm raking side light, long shadows', 'Pôr do sol'],
];
// Identidade das facções (seção 5). Paleta é identidade, não obrigação de carta monocromática.
const GODS = {
  Athena: {title: 'celestial heroism', setting: 'marble temples of the Sanctuary under celestial light', palette: 'white, gold, blue and silver', mood: 'honor, sacrifice, courage, hope', style: 'Araki', light: 0},
  Poseidon: {title: 'oceanic majesty', setting: 'monumental oceans, water currents, submerged temples, pressure and depth', palette: 'deep blue, turquoise, gold and sea green', mood: 'majesty, ancestral power, superiority, inevitable force', style: 'Amano', light: 2},
  Hades: {title: 'dark fantasy', setting: 'the World of the Dead, ruins, mist, spectral flames, funerary architecture', palette: 'black, deep purple, wine and metallic grey', mood: 'terror, death, despair, supernatural authority', style: 'Miura', light: 3},
  Ares: {title: 'war and brutality', setting: 'battlefields, fire, stylized blood, metal, destruction', palette: 'red, black, bronze and incandescent orange', mood: 'fury, violence, impulse, chaos', style: 'Hara', light: 4},
  Artemis: {title: 'nature and lunar power', setting: 'sacred forests, the moon, bows and arrows, vegetation, ancient temples', palette: 'green, silver, lunar white and natural tones', mood: 'precision, serenity, divine superiority, dangerous harmony', style: 'CLAMP', light: 5},
};
const TYPE_RULES = {
  Devotee: 'The character is the main focal point, with a recognizable face, faithful armor, and a pose coherent with personality and ability. Show action or dramatic presence.',
  Equipment: 'The equipment is the protagonist. Show structure and materials clearly and preserve symbols, colors and geometry, in a collectible art composition.',
  Technique: 'Show the execution or impact of the technique, with the origin, trajectory and consequence of the power, preserving the identity of who performs it.',
  Moment: 'Show one specific narrative instant, prioritizing emotion and action with cinematic framing. Avoid a generic poster composition.',
  Domain: 'The environment is the protagonist: architecture, atmosphere, scale and faction identity.',
  God: 'Recognizable divine presence, carefully handled scale, imposing composition, perceptible supernatural power. Never hide the face with effects.',
};
const NEGATIVE_FIGURE = 'extra fingers, missing fingers, fused fingers, extra limbs, duplicate arms, malformed hands, broken anatomy, distorted face, incorrect character design, cropped face';
const NEGATIVE_ALWAYS = 'inaccurate armor, inconsistent lighting, unreadable silhouette, excessive visual clutter, text, typography, card borders, watermarks, logos, UI elements, low resolution';
const EPIC_BY_RARITY = {Common: '2', Uncommon: '3', Legendary: '4', Divine: '5'};

const clean = (t) => String(t || '').replace(/[@{}]/g, '').replace(/\s+/g, ' ').trim();
const same = (a, b) => clean(a).toLowerCase() === clean(b).toLowerCase();
const named = (lines) => (lines || []).map((l) => clean(l)).filter(Boolean).map((l) => { const [name, ...rest] = l.split(' — '); return rest.length ? {name, text: rest.join(' — ')} : {name: '', text: l}; });

// Tudo que dá para saber da carta, inclusive armaduras ligadas ao personagem e quem veste a armadura.
export function cardFacts(card, cards = []) {
  const kind = printedKind(card), name = clean(card.nome_exibicao_en), powers = named(card.habilidades_en);
  const faction = cards.filter((c) => c.tipo === 'Devotee' && c.faccao === card.faccao).map((c) => clean(c.nome_exibicao_en));
  const armors = cards.filter((c) => c.tipo === 'Equipment' && c.slot_equipamento === 'armadura' && (c.auto_equip_en || []).some((o) => same(o, name))).map((c) => ({name: clean(c.nome_exibicao_en), line: formatCardTypeLine(c)}));
  powers.push(...named([card.habilidade_awaken_en, card.ultimate_en]));
  const owner = name.match(/^(.+?)[’']S\b/)?.[1];
  const caster = owner ? faction.find((n) => n.split(' ').includes(owner)) : null;
  const wearer = (card.auto_equip_en || [])[0] ? clean(card.auto_equip_en[0]).toUpperCase() : null;
  const isSelf = card.tipo === 'Devotee' || card.tipo === 'God', isSpell = card.tipo === 'Spell';
  return {
    name, kind, typeLine: formatCardTypeLine(card), faction: card.faccao, isSelf, isSpell, armors, powers,
    subtitle: clean(card.tagline_en || card.subtitulo_en), flavour: clean(card.flavour_en || card.flavour_pt), keywords: card.keywords_en || [], rarity: card.raridade,
    people: [...new Set([...(wearer ? [wearer] : []), ...faction])], person: isSelf ? name : isSpell ? caster || '' : '', // Equipment e Domain: só com personagem se o autor pedir (seção 10)
    techniques: [...new Set([...(isSpell ? [name] : []), ...powers.map((p) => p.name).filter((n) => n && !/^resonance\b/i.test(n))])],
  };
}

export function defaultParams(f) {
  const god = GODS[f.faction], scene = f.kind === 'Domain', object = f.kind === 'Equipment';
  return {
    mode: 'director', version: VERSIONS[0][0], references: false, god: god ? f.faction : '', person: f.person, armor: f.armors[0]?.name || '', technique: f.isSpell ? f.name : '', arc: '', theme: '',
    epic: f.kind === 'God' ? '5' : EPIC_BY_RARITY[f.rarity] || '3',
    shot: scene ? 'Wide Environmental Shot' : object ? SHOTS[6][0] : f.isSpell ? SHOTS[3][0] : SHOTS[4][0], angle: ANGLES[1][0], pose: f.isSpell ? POSES[6][0] : POSES[9][0], motion: f.isSelf || f.isSpell ? MOTIONS[1][0] : '',
    expression: EXPRESSIONS[0][0], style: styleWith(god?.style || 'Araki'), accent: '', light: LIGHTS[god?.light ?? 0][0], before: '', now: '', next: '', viewer: '', usePowers: true, notes: '',
  };
}

export function buildImagePrompt(f, p) {
  const god = GODS[p.god], person = p.person, isEquipment = f.kind === 'Equipment', power = f.powers.find((x) => x.name === p.technique), epic = EPIC_LEVELS.find(([v]) => v === p.epic);
  const subject = person
    ? `${person}${isEquipment ? `, wearing ${f.name} (${f.typeLine})` : p.armor ? `, wearing ${p.armor}` : ''}. Follow the established canonical design of this Saint Seiya character: face, hair, eyes, armor, ornaments, helmet and characteristic colors. Do not invent armor changes.`
    : isEquipment ? `${f.name} (${f.typeLine}) alone as a sacred object, with no wearer; show its structure and materials clearly and preserve its symbols, colors and geometry.`
      : f.kind === 'Domain' ? `${f.name}, as a place, with no characters.` : `${f.name}, as an event, with no main character.`;
  const story = [p.before && `Just happened: ${clean(p.before)}.`, p.now && `Happening now: ${clean(p.now)}.`, p.next && `About to happen: ${clean(p.next)}.`, p.viewer && `The viewer must feel: ${clean(p.viewer)}.`].filter(Boolean).join(' ');
  const body = [
    'Vertical 3:4 high-resolution illustration for a Saint Seiya trading card. Illustration only: no card frame, no text, no names, no logos, no numbers, no stats, no interface symbols, no watermarks.',
    `CARD: ${f.name}${f.subtitle ? ` — "${f.subtitle}"` : ''} (${f.typeLine || f.kind}, ${f.rarity || 'Common'}).`,
    `CARD TYPE DIRECTION: ${TYPE_RULES[f.kind] || TYPE_RULES.Devotee}`,
    `SUBJECT: ${subject}`,
    `VISUAL VERSION: ${p.version}. Do not mix versions.`,
    p.references && 'REFERENCES: follow the attached reference images as the priority source for appearance.',
    god && `FACTION IDENTITY: ${p.god}, ${god.title}. Palette identity, not monochrome: ${god.palette}. Feeling: ${god.mood}.`,
    `SETTING: ${clean(p.theme) || (god ? god.setting : 'an epic mythological setting from the Saint Seiya universe')}.${p.arc ? ` Inspired by: ${clean(p.arc)}.` : ''}`,
    story && `STORY: ${story}`,
    `FRAMING: ${p.shot}. CAMERA: ${p.angle}.${person ? ` POSE: ${p.pose}.` : ''}${p.motion ? ` MOTION: ${p.motion}.` : ''}`,
    person && 'FACE PLACEMENT, 7/10 RULE (mandatory): place the eyes at about 7/10 of the image height measured from the bottom, never above that line, in the central part of the image and away from the edges. Keep the top free for card interface without hiding the face.',
    person && `EXPRESSION: ${p.expression}.`,
    'COMPOSITION: card interface may cover parts of the image, so concentrate the most important elements in the central region and keep a silhouette readable at small size.',
    person && 'ANATOMY: exactly five fingers on each visible hand; no duplicate limbs; coherent joints, hands, feet and neck; the armor follows the body correctly.',
    p.technique && `TECHNIQUE IN USE: ${p.technique}${power ? ` — ${power.text}` : ''}. Show its origin, trajectory and consequence visually with cosmo energy; no written effects.`,
    `ART STYLE: ${p.style}.${p.accent ? ` Complementary finish: ${p.accent}.` : ''}`,
    `LIGHTING: ${p.light}.`,
    epic && `EPIC LEVEL ${epic[0]} OF 5: ${epic[2]}, without hurting character fidelity or card legibility.`,
    p.usePowers && f.powers.length ? `POWERS TO EVOKE (visual inspiration, do not write them): ${f.powers.slice(0, 4).map((x) => x.name ? `${x.name}: ${x.text}` : x.text).join(' | ')}` : '',
    p.usePowers && f.keywords.length ? `KEYWORDS: ${f.keywords.join(', ')}.` : '',
    f.flavour && `MOOD LINE: ${f.flavour}`,
    clean(p.notes) && `NOTES: ${clean(p.notes)}`,
  ].filter(Boolean).join('\n');
  return `${body}\n\nNEGATIVE PROMPT: ${person ? `${NEGATIVE_FIGURE}, ` : ''}${NEGATIVE_ALWAYS}.`;
}

// Sistema completo: o GPT recebe o Master, trata o que veio escolhido como decisão do autor e responde no formato da seção 12.
export const buildDirectorPrompt = (master, f, p) => `${master.trim()}\n\n---\nSOLICITAÇÃO DE ARTE\nExecute o processo da seção 11 para a carta abaixo e responda no formato obrigatório da seção 12. Não gere a imagem. Os parâmetros são decisões do autor; desenvolva-os com especificidade. Onde a narrativa estiver em branco, proponha a cena.\n\n${buildImagePrompt(f, p)}`;

const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const select = (name, label, opts, value) => `<label>${label}<select name="${name}">${opts.map(([v, t]) => `<option value="${esc(v)}"${v === value ? ' selected' : ''}>${esc(t ?? v)}</option>`).join('')}</select></label>`;
const input = (name, label, value, placeholder = '') => `<label>${label}<input name="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}"></label>`;
const GPT_URL = 'https://chatgpt.com/';
const URL_LIMIT = 7000; // acima disso o link pode falhar: o GPT abre vazio e o prompt fica copiado

export function mountArtPrompt(dialog, {getCard, getCards, say, masterUrl}) {
  let facts, params, master = '';
  const output = () => dialog.querySelector('textarea[name=prompt]');
  const text = () => (params.mode === 'director' && master ? buildDirectorPrompt(master, facts, params) : buildImagePrompt(facts, params));
  const refresh = () => { output().value = text(); };
  async function copy() {
    const value = output().value;
    try { await navigator.clipboard.writeText(value); return true; } catch {}
    output().select(); // dentro do iframe do Star Hill a área de transferência pode ser negada
    try { return document.execCommand('copy'); } catch { return false; }
  }
  function draw() {
    const f = facts, p = params, none = (t) => [['', t]];
    dialog.innerHTML = `<form method="dialog" class="ap"><h2>Gerar arte: <span translate="no">${esc(f.name)}</span></h2><div class="ap-grid"><div class="ap-fields">
      <div class="ap-wide">${select('mode', 'Saída', [['director', 'Diretor de arte: Master completo + pedido da carta'], ['image', 'Prompt direto de imagem']], p.mode)}</div>
      ${f.isSelf ? '' : select('person', 'Personagem', [...none('Sem personagem'), ...f.people.map((n) => [n])], p.person)}
      ${f.armors.length ? select('armor', 'Armadura', [...none('Sem armadura'), ...f.armors.map((a) => [a.name, `${a.name} (${a.line})`])], p.armor) : ''}
      ${select('god', 'Deus', [...none('Nenhum'), ...Object.keys(GODS).map((g) => [g])], p.god)}${select('version', 'Versão visual', VERSIONS, p.version)}
      ${select('epic', 'Grandiosidade', EPIC_LEVELS, p.epic)}${select('technique', 'Técnica em uso', [...none('Nenhuma'), ...f.techniques.map((t) => [t])], p.technique)}
      ${select('shot', 'Plano', SHOTS, p.shot)}${select('angle', 'Ângulo', ANGLES, p.angle)}
      ${select('pose', 'Pose', POSES, p.pose)}${select('expression', 'Expressão', EXPRESSIONS, p.expression)}
      ${select('motion', 'Movimento', MOTIONS, p.motion)}${select('light', 'Luz', LIGHTS, p.light)}
      ${select('style', 'Traço dominante', STYLES, p.style)}${select('accent', 'Traço complementar', [...none('Nenhum'), ...STYLES], p.accent)}
      <div class="ap-wide">${input('theme', 'Tema e cenário', p.theme, 'Vazio: cenário da facção')}</div>
      <div class="ap-wide">${input('arc', 'Arco ou acontecimento', p.arc, 'Ex.: Doze Casas, saga de Hades')}</div>
      ${input('before', 'Acabou de acontecer', p.before)}${input('now', 'Está acontecendo', p.now)}${input('next', 'Vai acontecer', p.next)}${input('viewer', 'O observador sente', p.viewer)}
      <div class="ap-wide">${input('notes', 'Observações', p.notes, 'Algo mais para a imagem')}</div>
      <label class="ap-check ap-wide"><input type="checkbox" name="usePowers"${p.usePowers ? ' checked' : ''}> Incluir poderes e keywords da carta</label>
      <label class="ap-check ap-wide"><input type="checkbox" name="references"${p.references ? ' checked' : ''}> Vou anexar imagens de referência</label>
    </div><label class="ap-out">Prompt (pode editar)<textarea name="prompt" rows="20" spellcheck="false" translate="no"></textarea></label></div>
    <p class="hint">O Master completo não cabe no link: o ChatGPT abre vazio e você cola o prompt, que já fica copiado.</p>
    <div class="row"><button type="button" data-ap="copy" class="primary">Copiar prompt</button><button type="button" data-ap="gpt">Abrir no ChatGPT</button><button type="button" data-ap="reset">Restaurar</button><button value="close">Fechar</button></div></form>`;
    refresh();
  }
  dialog.addEventListener('input', (e) => {
    const {name, type, value, checked} = e.target;
    if (name === 'prompt' || !(name in params)) return;
    params[name] = type === 'checkbox' ? checked : value;
    refresh();
  });
  dialog.addEventListener('click', async (e) => {
    const action = e.target.closest('[data-ap]')?.dataset.ap;
    if (!action) return;
    if (action === 'reset') { params = defaultParams(facts); draw(); return; }
    const copied = await copy();
    if (action === 'copy') return void say(copied ? 'Prompt copiado.' : 'Não consegui copiar: selecione o texto do prompt.', !copied);
    const url = `${GPT_URL}?q=${encodeURIComponent(output().value)}`, fits = url.length <= URL_LIMIT;
    window.open(fits ? url : GPT_URL, '_blank', 'noopener');
    say(fits ? 'ChatGPT aberto com o prompt.' : copied ? 'Prompt copiado: cole no ChatGPT.' : 'Copie o prompt e cole no ChatGPT.', !fits && !copied);
  });
  return async () => {
    if (!master) {
      try { const r = await fetch(masterUrl); if (r.ok) master = await r.text(); } catch {}
      if (!master) say('Master Art Prompt não carregou: usando só o prompt direto.', true);
    }
    facts = cardFacts(getCard(), getCards());
    params = defaultParams(facts);
    if (!master) params.mode = 'image';
    draw();
    dialog.showModal();
  };
}
