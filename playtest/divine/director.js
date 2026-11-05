// Divine Arena · orquestrador de apresentação. Lê os eventos que a engine já registrou (state.events) e os
// dramatiza em sequência. Nunca decide resultado: os números exibidos vêm dos próprios eventos.
// `ui` é o adaptador do DOM (posições e textos); `fx` é a camada WebGL (pode faltar: tudo vira só DOM).
import {wait} from './scene.js?v=20261031-pool1';
import {strikeSound, chargeSound} from '../audio.js?v=20261102-voz4';
import {anim, ANIM_OF, sound} from '../telas.js?v=20261102-barulho1';
import {ELEMENT_COLOR} from './pixel-vfx.js?v=20261104-anim4';
import {tunedFx} from './particle-tune.js';
import {ON_ATTACKER} from './combat-tracks.js';

// Quanto o golpe em pixel art leva até o instante do acerto (ms): o som e o impacto saem nele.
const HIT_MS = {slash: 60, impact: 40, ice: 220, fire: 160, lightning: 140, poison: 650, light: 420, dark: 450, explosion: 60, energy: 260, shield: 200, heal: 200, power: 300, muzzle: 30, blood: 40, pickup: 400, dash: 200, blink: 250, sparkle: 300, rain: 300, snow: 300, fog: 300, embers: 200, fireflies: 300, leaves: 300, bubbles: 300};

// Hierarquia visual dos golpes (COMBAT_CINEMATICS.md): comum < Saint < assinatura < divino.
// As assinaturas são só visuais e disparam pelo número da carta atacante; não criam regra.
export const SIGNATURES = {
  '001': {style: 'meteor', name: 'Pegasus Ryuseiken', color: '#9fd8ff'},
  '003': {style: 'dragon', name: 'Rozan Shoryuha', color: '#6ff0b0'},
};
// Partículas da morte de cada God, em dois tempos: o golpe e a queda (o resto é CSS: .die-<deus> e .ruin--<deus>).
export const DEATH_FX = {
  athena: [(f, a) => f.charge(a.x, a.y, {color: '#ffe3a0', count: 70, radius: 120}), (f, a) => { f.burst(a.x, a.y, {color: '#e8e0cc', count: 140, speed: 320, grav: 900, life: 1.2, size: 14}); f.shockwave(a.x, a.y, {color: '#fff2c4', size: 260}); }],
  poseidon: [(f, a) => f.burst(a.x, a.y, {color: '#7cc8ff', count: 90, speed: 260, grav: -120, life: 1}), (f, a) => { f.burst(a.x, a.y, {color: '#bfe6ff', count: 160, speed: 480, grav: 700, life: 1.1}); f.shockwave(a.x, a.y, {color: '#5ab4ff', size: 320}); }],
  hades: [(f, a) => f.charge(a.x, a.y, {color: '#a064ff', count: 140, radius: 240, life: .9}), (f, a) => { f.charge(a.x, a.y, {color: '#2a0a4a', count: 120, radius: 300, life: .7}); f.shockwave(a.x, a.y, {color: '#7a3ad0', size: 360}); }],
  ares: [(f, a) => f.burst(a.x, a.y, {color: '#ff7a3a', count: 60, speed: 200, grav: -200, life: .9}), (f, a) => { f.flash(.5); f.burst(a.x, a.y, {color: '#ff5a2a', count: 200, speed: 600, life: 1}); f.burst(a.x, a.y, {color: '#5a5048', count: 90, speed: 180, grav: -60, life: 1.6, size: 16}); f.shockwave(a.x, a.y, {color: '#ffb070', size: 380}); }],
  artemis: [(f, a) => f.burst(a.x, a.y, {color: '#d8fff0', count: 80, speed: 120, grav: -160, life: 1.4}), (f, a) => { f.burst(a.x, a.y, {color: '#e8f4ff', count: 150, speed: 260, grav: -220, life: 1.8, size: 10}); f.shockwave(a.x, a.y, {color: '#c8f0ff', size: 280}); }],
};
const STYLE_BY_TYPE = [[/Gold Saint/, 'energy', '#ffd36e'], [/Silver Saint/, 'energy', '#d8e4ff'], [/Bronze Saint/, 'physical', '#ffe0a0']];

// O lote já traz o dano do Strike, sem nada jogado no meio: ninguém respondeu e ninguém parou na janela.
const unanswered = rest => {
  const end = rest.findIndex(x => x.type === 'strike_resolve' || x.type === 'strike_fizzled');
  return end >= 0 && !rest.slice(0, end).some(x => x.type === 'chain_add' || x.type === 'card_played');
};

export function createDirector({ui, getFx, settings}) {
  const equipSound = uid => { if (!skipping) sound(ui.isArmor?.(uid) ? 'equipar_armadura' : 'equipar_arma'); };
  let skipping = false, busy = false, queue = [];
  // Grupo do evento em curso (Star Hill: ligada e velocidade por grupo); desligada = sem efeito e sem espera.
  let cur = {ligada: true, velocidade: 1};
  let curType = null; // grupo de partículas do evento em curso (particle-tune.js)
  const fx = (key = curType) => { const f = settings.reduceMotion || !cur.ligada ? null : getFx(); return f && tunedFx(f, ui.particleTune?.(key)); };
  const t = ms => (skipping || !cur.ligada ? 0 : ms * ({fast: .55, normal: 1, cinematic: 1.35}[settings.speed] || 1) / cur.velocidade);
  const pause = ms => (t(ms) ? wait(t(ms)) : Promise.resolve());
  const shake = (amp, key) => { if (!cur.ligada) return; const f = fx(key); if (f && !skipping) { f.shake(amp * settings.shake); f.punch(amp * settings.shake * .05); } if (ui.particleTune?.(key ?? curType)?.ligado !== false) ui.shake(amp * settings.shake); };

  function styleOf(uid) {
    // Ordem: animação da carta ou da facção, assinatura, estilo do tipo e padrão do jogo. false: sem animação de golpe.
    const sig = SIGNATURES[ui.number(uid)], own = ui.animOf?.('golpe', uid, '', true);
    if (own === false) return {style: 'none', name: sig?.name, color: sig?.color || ui.godColor?.(uid) || '#ffe0a0'};
    if (own) return {style: 'pixel', element: own, name: sig?.name, color: ELEMENT_COLOR[own] || sig?.color || ui.godColor?.(uid) || '#ffe0a0'};
    if (sig) return sig;
    const type = ui.type(uid), hit = STYLE_BY_TYPE.find(([re]) => re.test(type));
    // Golpe básico na cor do God de quem ataca; a tabela por tipo só define o estilo (e a cor se não houver God).
    const base = ui.animOf?.('golpe', uid);
    return {style: hit ? hit[1] : 'physical', element: hit && hit[1] !== 'physical' ? null : base ?? 'slash', color: ui.godColor?.(uid) || (hit ? hit[2] : '#ffe0a0')};
  }

  // Som sai quando o gatilho resolve, não quando vai à pilha (autor, 02/11/2026); null: evento sem som próprio.
  const SOM_DE = {strike_declared: 'declarar_ataque', god_damage: 'dano_deus', soul_lost: 'dano_deus', ability: null, ultimate_announced: null, ultimate_resolved: 'ultimate'};
  const somDe = e => e.type === 'resolve' ? (e.ability ? 'gatilho' : null) : e.type in SOM_DE ? SOM_DE[e.type] : ANIM_OF[e.type];

  // Força do golpe pelo ATK (autor, 28/10/2026): 0 num ATK 2, 1 num ATK 10. Só apresentação; o dano vem da engine.
  const powerOf = atk => Math.max(0, Math.min(1, ((atk || 0) - 2) / 8));

  // Efeito em pixel art (pixel-vfx.js): segue os mesmos interruptores dos VFX e nunca segura a fila.
  const pixel = (recipe, rect, opts) => { if (recipe && rect && fx() && !skipping) ui.pixel?.play(recipe, rect, opts); };
  // Animação do momento (Star Hill / Card Forge) em cima de `rect`. `ability`: nome da habilidade que resolveu.
  const moment = (kind, ref, rect, opts = {}, ability = '') => pixel(ui.animOf?.(kind, ref, ability), rect, opts);

  // Reação ao golpe: a carta pisca e recua para longe de quem bateu. O dano do Strike vem depois e não repete o recuo.
  const recoiled = new Set();
  const recoil = (uid, from, p) => { if (skipping || !cur.ligada) return; if (from) recoiled.add(uid); ui.recoil?.(uid, from, p, ui.particleTune?.('recuo')); };

  // Coreografia do Combat Composer: agenda cada fase e devolve no HIT, para o resto do Strike seguir a engine. Nunca segura a fila depois do HIT.
  async function choreography(c, {from, attacker, target, targetRect, color, p}) {
    const later = (ms, fn) => setTimeout(() => { if (!skipping) fn(); }, t(ms));
    let stop = 0;
    for (const [key, b] of Object.entries(c.faixas)) {
      if (b.efeito) later(b.inicio, () => pixel(b.efeito, ON_ATTACKER.includes(key) ? ui.rect(attacker) : targetRect, {from, color, power: p, ...(key === 'projectile' ? {ancora: 'viagem'} : {})}));
      else if (key === 'hitstop') { later(b.inicio, () => ui.pixel?.hold(t(b.duracao))); stop = Math.max(0, b.inicio + b.duracao - c.hit); }
      else if (key === 'knockback' && target) later(b.inicio, () => { const tune = ui.particleTune?.('recuo'); recoiled.add(target); ui.recoil?.(target, from, p, {...tune, tamanho: (tune?.tamanho ?? 1) * b.distancia}); });
      else if (key === 'sound') later(b.inicio, () => sound(b.som));
    }
    await pause(c.hit + stop);
  }

  // Golpe do atacante até o alvo; resolve no momento do impacto. `p` (0..1) engrossa tudo.
  async function strikeVfx(from, to, style, p = 0, attacker, targetRect) {
    const f = fx('strikeVfx');
    if (skipping) return;
    if (!ui.noise?.('carga', attacker)) chargeSound(p);
    if (!f || style.style === 'none') return;
    moment('carga', attacker, ui.rect(attacker), {color: style.color});
    f.charge(from.x, from.y, {color: style.color, count: Math.round((style.style === 'physical' ? 30 : 60) * (1 + p * 2))});
    if (p > .6) f.shake(p * 3); // o chão treme enquanto o Cosmo sobe
    await pause((style.style === 'physical' ? 140 : 260) + p * 420);
    if (style.element && ui.pixel) {
      pixel(style.element, targetRect, {from, color: style.color, power: p});
      await pause(HIT_MS[style.element] ?? 200);
    } else if (style.style === 'meteor') {
      // Pegasus Ryuseiken: rajada de meteoros com leve dispersão, todos convergindo no alvo.
      const shots = [], g = fx('assinatura-meteor') || f;
      const n = 9 + Math.round(p * 16), spread = 60 + p * 90;
      for (let i = 0; i < n; i++) {
        const jitter = {x: from.x + (Math.random() - .5) * spread, y: from.y + (Math.random() - .5) * spread};
        shots.push(wait(i * 28).then(() => g.projectile(jitter, to, {color: style.color, duration: .22, size: 12 * (1 + p * .6), trail: 2 + p * 2})));
      }
      await Promise.all(shots);
    } else if (style.style === 'dragon') {
      // Rozan Shoryuha: espiral ascendente de Cosmo verde que mergulha no alvo.
      const g = fx('assinatura-dragon') || f;
      await Promise.all([g.projectile(from, to, {color: style.color, duration: .42, size: 22 * (1 + p), trail: 5 + p * 4, arc: 140}),
        wait(60).then(() => g.projectile(from, to, {color: '#d6ffe9', duration: .42, size: 10, trail: 2, arc: -90}))]);
    } else if (style.style === 'energy') {
      if (ui.pixel) { pixel('energy', targetRect, {from, color: style.color, power: p}); await pause(260 + p * 200); }
      else await f.beam(from, to, {color: style.color, width: 22 * (1 + p * 1.8), duration: .3 + p * .25});
    } else {
      await f.projectile(from, to, {color: style.color, duration: .18, size: 14 * (1 + p * 1.2), trail: 2 + p * 3});
    }
  }

  function impact(at, {color = '#fff2c4', strength = 1, rect = null, from = null, effect = 'impact'} = {}) {
    const f = fx('impact');
    if (f && !skipping) {
      pixel(effect, rect || at, {color, strength: Math.min(1.6, strength), from});
      if (!ui.pixel || strength > 1.6) f.burst(at.x, at.y, {color, count: Math.round(50 * strength), speed: 380 * strength});
      f.shockwave(at.x, at.y, {color, size: 160 * strength});
      if (strength > 1.2) f.flash(Math.min(.6, .12 + strength * .1));
      if (strength > 1.8) wait(90).then(() => f.shockwave(at.x, at.y, {color: '#ffffff', size: 260 * strength})); // segunda onda
    }
    shake(strength * 6, 'impact');
  }

  // Habilidade resolvendo: o efeito escolhido cai em cada alvo atingido; sem alvo, na própria carta.
  function abilityVfx(e) {
    const value = ui.animOf?.('habilidade', e.uid, e.ability || ''), rest = queue.slice(queue.indexOf(e) + 1);
    const done = rest.find(x => x.type === 'resolved' && x.uid === e.uid), from = ui.center(ui.refRect(e.uid));
    const rects = (done?.results || []).map(r => ui.refRect(r.ref)).filter(Boolean);
    for (const rect of rects.length ? rects : [ui.refRect(e.uid)]) pixel(value, rect, {from, color: ELEMENT_COLOR[value]});
  }

  // Cada tipo de evento: o que mostrar e quanto tempo segurar a fila.
  const pool = {A: 0, B: 0}; // Cosmo pago e ainda não entregue a uma carta
  const handlers = {
    async turn_start(e) { if (ui.isViewer(e.player)) sound('receber_turno'); pool.A = pool.B = 0; ui.clearPool(); // o que sobrou na pool volta sem perda
      await ui.banner(ui.isViewer(e.player) ? 'Your round' : `${ui.seatName(e.player)}'s round`, e.player, t(900)); },
    async draw(e) { if (!settings.skipDraws && !e.opening) await ui.flyCard(e.uid, ui.deckRect(e.player), ui.handRect(e.player), t(220), !ui.isViewer(e.player)); },
    async mulligan() {},
    async base_placed(e) {
      const at = ui.center(ui.bankRect(e.player, 'base'));
      await ui.flyCard(e.uid, ui.rect(e.uid) || ui.handRect(e.player), ui.bankRect(e.player, 'base'), t(260), false);
      fx()?.burst(at.x, at.y, {color: '#ffd36e', count: 30, speed: 200});
      ui.bankPulse?.(e.player);
    },
    // Cosmo como pool (autor, 28/10/2026): a energia sai das Bases prontas (ou do Latent), junta-se no orbe de Cosmo
    // do jogador e só depois corre até a carta conjurada em card_played.
    async cosmo_spent(e) {
      const poolAt = ui.center(ui.bankRect(e.player, 'base'));
      const from = (e.unit === 'base' ? (e.uids ? ui.baseRects(e.uids) : ui.readyBaseRects(e.player, e.amount)) : [ui.bankRect(e.player, 'latent')]).map(ui.center);
      ui.spendOrbs(e.player, e.unit, e.amount);
      pool[e.player] = (pool[e.player] || 0) + e.amount;
      const f = fx();
      if (!f || skipping || !poolAt) return pause(160);
      from.filter(Boolean).forEach((p, i) => setTimeout(() => f.beam(p, poolAt, {color: '#7fc8ff', width: 12, duration: .34}), t(i * 70)));
      await pause(320 + from.length * 40);
      f.charge(poolAt.x, poolAt.y, {color: '#9fd8ff', count: 16 * e.amount, radius: 55});
      await pause(160);
    },
    async latent_gained(e) {
      const at = ui.center(ui.bankRect(e.player, 'latent'));
      fx()?.charge(at.x, at.y, {color: '#b58cff', count: 25 * e.amount, radius: 90});
      ui.float(at, `+${e.amount} Latent`, 'gain');
      await pause(380);
    },
    async card_played(e) {
      moment(e.from === 'tartarus' ? 'retorno' : e.from ? 'entrada' : 'cast', e.uid, ui.rect(e.uid));
      ui.speak?.(e.from === 'tartarus' ? 'retorno' : e.from ? 'entrada' : 'cast', e.uid); // som próprio da carta (autor, 02/11/2026); `from`: posta em campo sem conjurar
      const f = fx(), poolAt = ui.center(ui.bankRect(e.player, 'base')), src = ui.center(ui.rect(e.uid) || ui.handRect(e.player));
      if (pool[e.player] && f && !skipping && poolAt && src) { // o pool encontra a carta e a energia a vira para o campo
        f.beam(poolAt, src, {color: '#a8e4ff', width: 14 + 4 * Math.min(pool[e.player], 6), duration: .38});
        await pause(300);
        f.burst(src.x, src.y, {color: '#bfe6ff', count: 28, speed: 220});
      }
      pool[e.player] = 0;
      // Cast estilo Arena (autor, 31/10/2026): a carta vai só para a pilha (app.js drawZoom); a chegada ao campo é na
      // resolução (app.js flyResolved), nunca ao mesmo tempo.
      ui.log(e);
      await pause(120);
    },
    async spell_resolved(e) {
      const at = ui.center(ui.fieldRect(e.player));
      fx()?.burst(at.x, at.y, {color: '#f5e2ff', count: 40, speed: 300});
      ui.log(e);
      await pause(260);
    },
    async ability(e) { ui.pulse(e.uid, 'activate'); ui.log(e); await pause(260); },
    async equipped(e) { equipSound(e.uid); ui.log(e); await pause(120); },
    async returned_to_hand(e) { if (e.from === 'tartarus') { ui.speak?.('retorno', e.uid); moment('retorno', e.uid, ui.rect(e.uid)); } },
    async entered(e) { ui.speak?.('entrada', e.uid); moment('entrada', e.uid, ui.rect(e.uid)); if (e.bearer) equipSound(e.uid); }, // Equipment conjurado já preso no portador
    async strike_declared(e) {
      ui.speak?.('declarar', e.attacker);
      moment('declarar', e.attacker, ui.rect(e.attacker));
      ui.pulse(e.attacker, 'attacking', true);
      ui.aim(e.attacker, e.target);
      ui.log(e);
      await pause(260);
    },
    async strike_resolve(e) {
      const onGod = e.target.kind === 'god';
      recoiled.clear();
      ui.speak?.('golpe', e.attacker); // a fala do ataque sai quando ele resolve, não ao declarar (autor, 02/11/2026)
      ui.speak?.('strike', onGod ? e.target.player : e.target.uid);
      const from = ui.center(ui.rect(e.attacker)), targetRect = e.target.kind === 'god' ? ui.godRect(e.target.player) : ui.rect(e.target.uid);
      const to = ui.center(targetRect), style = styleOf(e.attacker), p = powerOf(e.atk);
      if (style.name) await ui.callout(style.name, e.player, t(650 + p * 350));
      ui.pulse(e.attacker, 'lunge');
      const cho = fx('strikeVfx') && !skipping && style.element ? ui.choreography?.(style.element) : null;
      if (cho) await choreography(cho, {from, attacker: e.attacker, target: onGod ? null : e.target.uid, targetRect, color: style.color, p});
      else { await strikeVfx(from, to, style, p, e.attacker, targetRect); await pause(40 + p * 160); } // hit stop: mais longo quanto mais forte
      if (!cho?.faixas.sound && !skipping && !(onGod ? ui.noise?.('impacto_deus', e.attacker, e.target.player) : ui.noise?.('impacto', e.attacker))) strikeSound(p);
      if (!onGod && !cho?.faixas.knockback) recoil(e.target.uid, from, p); // recua junto com o impacto, não depois
      if (!cho?.faixas.impact) impact(to, {color: style.color, strength: (style.name ? 1.4 : 1) * (1 + p * 1.3), rect: targetRect, from, effect: ui.animOf?.(onGod ? 'impacto_deus' : 'impacto', e.attacker) ?? 'impact'});
      if (!onGod) moment('strike', e.target.uid, targetRect);
      // Retaliação: do Devotee alvo de volta ao atacante. God não retalia (§24, autor 01/11/2026).
      if (e.target.kind !== 'god') {
        await pause(140);
        const back = styleOf(e.target.uid);
        recoil(e.attacker, to, .3);
        if (ui.pixel && back.style !== 'energy') { pixel('slash', ui.rect(e.attacker), {from: to, color: back.color}); await pause(220); }
        else if (fx() && !skipping) await fx().beam(to, from, {color: back.color, width: 12, duration: .22});
      }
      ui.aim(null);
      ui.pulse(e.attacker, 'attacking', false);
    },
    async damage(e) {
      const at = ui.center(ui.rect(e.uid));
      if (!at) return;
      if (e.prevented) { ui.float({x: at.x, y: at.y - 36}, `${e.prevented} prevented`, 'shield'); moment('escudo', e.uid, ui.rect(e.uid), {color: '#a6ecff'}); }
      if (e.absorbed) ui.float({x: at.x, y: at.y - 18}, `${e.absorbed} to Armor`, 'armor');
      if (e.dealt) { ui.float(at, `-${e.dealt}`, 'damage'); if (!recoiled.delete(e.uid)) recoil(e.uid, null, Math.min(1, e.dealt / 8)); impact(at, {color: '#ff9a7a', strength: Math.min(1.3, .5 + e.dealt * .15), rect: ui.rect(e.uid), effect: ui.animOf?.('dano', e.uid) ?? 'impact'}); }
      await pause(e.dealt ? 220 : 120);
    },
    async god_damage(e) { if (e.incoming > e.dealt) { ui.float(ui.center(ui.godRect(e.player)), `${e.incoming - e.dealt} prevented`, 'shield'); moment('escudo', e.player, ui.godRect(e.player), {color: '#a6ecff'}); } },
    async soul_lost(e) {
      const at = ui.center(ui.godRect(e.player));
      ui.setSoul(e.player, e.soul);
      ui.float(at, `-${e.amount} Soul`, 'damage big');
      impact(at, {color: '#ffcf6e', strength: Math.min(2, .8 + e.amount * .2), rect: ui.godRect(e.player), effect: ui.animOf?.('soul', e.player) ?? 'impact'});
      await pause(420);
    },
    async destroyed(e) {
      ui.speak?.('morte', e.uid);
      const at = ui.center(ui.rect(e.uid));
      ui.pulse(e.uid, 'shatter');
      moment('morte', e.uid, ui.rect(e.uid));
      if (at) fx()?.burst(at.x, at.y, {color: '#cbbfa8', count: 70, speed: 300, grav: 600, life: .9});
      ui.log(e);
      await pause(380);
    },
    async round_end() {},
    // ---------- Gods ----------
    async awaken_changed(e) {
      const at = ui.center(ui.godRect(e.player));
      if (e.awaken) {
        if (!skipping) ui.noise?.('awaken', e.player);
        fx()?.charge(at.x, at.y, {color: '#9fd0ff', count: 90, radius: 140});
        moment('awaken', e.player, ui.godRect(e.player), {color: '#9fd0ff'});
        await ui.banner('Awaken', e.player, t(900));
        fx()?.shockwave(at.x, at.y, {color: '#bfe2ff', size: 220});
      } else ui.float(at, 'Awaken ends', 'shield');
    },
    // Poder do God (autor, 28/10/2026: precisa ser sentido): Cosmo sobe no God, nome em destaque, onda e estrondo.
    async divine_power(e) {
      const at = ui.center(ui.godRect(e.player)), f = fx();
      const custom = !skipping && ui.noise?.('poder_divino', e.player);
      if (!skipping && !custom) chargeSound(.5);
      f?.charge(at.x, at.y, {color: '#bfe2ff', count: 110, radius: 170});
      moment('poder_divino', e.player, ui.godRect(e.player), {color: '#bfe2ff'});
      await ui.callout(e.ability, e.player, t(900));
      if (!skipping && !custom) strikeSound(.35);
      f?.shockwave(at.x, at.y, {color: '#bfe2ff', size: 260});
      f?.burst(at.x, at.y, {color: '#e6f4ff', count: 90, speed: 420});
      shake(4);
      ui.float(at, e.ability, 'gain');
      await pause(380);
    },
    // Domain: a energia sai do Domain no painel e chega ao God do dono.
    async domain_power(e) {
      const from = ui.center(ui.domainRect(e.player)), to = ui.center(ui.godRect(e.player)), f = fx();
      if (!skipping && !ui.noise?.('poder_dominio', e.player)) chargeSound(.4);
      if (from) f?.charge(from.x, from.y, {color: '#ffe4a0', count: 80, radius: 110});
      moment('poder_dominio', e.player, ui.domainRect(e.player), {color: '#ffe4a0'});
      await ui.callout(e.ability, e.player, t(800));
      if (from && to && f && !skipping) await f.beam(from, to, {color: '#ffe4a0', width: 26, duration: .35});
      if (to) { f?.shockwave(to.x, to.y, {color: '#ffe4a0', size: 200}); ui.float(to, e.ability, 'gain'); }
      shake(3);
      await pause(320);
    },
    async seal_added(e) {
      const at = ui.center(ui.rect(e.uid));
      if (!at) return;
      fx()?.shockwave(at.x, at.y, {color: '#7fd4ff', size: 130});
      ui.float(at, `Seal ×${e.added}`, 'shield');
      await pause(450);
    },
    async seal_removed(e) {
      const at = ui.center(ui.rect(e.uid));
      if (at) ui.float(at, 'Seal −1 · stays Unprepared', 'shield');
      await pause(300);
    },
    async defeat_prevented(e) {
      const at = ui.center(ui.rect(e.uid));
      if (!at) return;
      fx()?.shockwave(at.x, at.y, {color: '#ffe7a8', size: 150});
      ui.float(at, 'Divine Protection', 'shield');
      await pause(500);
    },
    // Cinemática divina (nível mais alto da hierarquia): nome do Ultimate, Cosmo convergindo, raios dos Saints ao God.
    async ultimate_announced(e) {
      ui.cinematic?.(true);
      for (const uid of e.saints || []) ui.pulse(uid, 'attacking', true);
      const god = ui.center(ui.godRect(e.player));
      fx()?.charge(god.x, god.y, {color: '#ffe4a0', count: 140, radius: 220});
      await ui.callout(e.ability, e.player, t(1300));
      ui.cinematic?.(false); // a janela de resposta (G3-005) volta com o HUD inteiro
    },
    async ultimate_resolved(e) {
      ui.speak?.('ultimate', e.player);
      ui.cinematic?.(true);
      moment('ultimate', e.player, ui.godRect(ui.enemyOf(e.player)));
      if (e.ability === 'GREAT FLOOD') { // onda sobre o campo inimigo; o retorno às mãos aparece no render seguinte
        const enemy = ui.enemyOf(e.player), god = ui.center(ui.godRect(e.player)), to = ui.center(ui.godRect(enemy));
        fx()?.beam(god, to, {color: '#7fd4ff', width: 44, duration: .7});
        impact(to, {color: '#7fd4ff', strength: 2});
        await ui.banner('Great Flood', e.player, t(1100));
        ui.cinematic?.(false);
        return;
      }
      const enemy = ui.enemyOf(e.player), to = ui.center(ui.godRect(enemy));
      if (!e.snapshot) { // Ultimates sem os raios dos Saints (Great Eclipse, Moon Awakening, Obliteration…): onda e o Soul perdido
        impact(to, {color: '#d6b4ff', strength: 1.6});
        if (e.lost) ui.float(to, `-${e.lost} Soul`, 'damage big');
        await pause(600);
        ui.cinematic?.(false);
        return;
      }
      const shots = e.snapshot.map((s, i) => {
        const from = ui.center(ui.rect(s.uid));
        if (!from) return Promise.resolve();
        fx()?.charge(from.x, from.y, {color: '#ffd36e', count: 70});
        return pause(180 * i + 260).then(() => fx()?.beam(from, to, {color: '#fff2c4', width: 30, duration: .5}));
      });
      await Promise.all(shots);
      impact(to, {color: '#ffd36e', strength: 2});
      for (const s of e.snapshot) ui.pulse(s.uid, 'shatter');
      ui.float(to, `-${e.loss} Soul`, 'damage big');
      await pause(700);
      ui.cinematic?.(false);
    },
    async ultimate_failed(e) { ui.cinematic?.(false); ui.float(ui.center(ui.godRect(e.player)), 'Ultimate failed', 'shield'); await pause(600); },
    async judgment_placed(e) { await ui.banner('Divine Judgment', e.player, t(1100)); },
    async judgment_removal(e) { return handlers.judgment_removed(e); }, // nome que a engine emite (gods.js)
    async judgment_removed(e) { ui.float(ui.center(ui.godRect(e.player)), 'Judgment removed', 'gain'); await pause(400); },
    async soul_gained(e) { if (e.amount) { ui.setSoul(e.player, e.soul); ui.float(ui.center(ui.godRect(e.player)), `+${e.amount} Soul`, 'gain'); moment('cura', e.player, ui.godRect(e.player)); } },
    // Morte do God (autor, 31/10/2026): cada deus cai com o seu tema e a metade dele da arena desmorona; ~3 s antes da tela final.
    async victory(e) {
      const dead = t(1) ? ui.godDeath(e) : [];
      if (dead.length) {
        const f = fx(), at = dead.map(d => ({...d, at: ui.center(ui.godRect(d.key))}));
        for (const d of at) if (f && d.at && DEATH_FX[d.god]) DEATH_FX[d.god][0](fx(`morte-${d.god}`), d.at);
        shake(8); await pause(1100);
        for (const d of at) if (f && d.at && DEATH_FX[d.god]) DEATH_FX[d.god][1](fx(`morte-${d.god}`), d.at);
        shake(16); await pause(1700);
      }
      sound(e.draw ? 'derrota' : ui.isViewer(e.winner) ? 'vitoria' : 'derrota'); await ui.banner(e.draw ? 'Draw' : ui.isViewer(e.winner) ? 'Victory' : `Player ${e.winner} wins`, e.winner, t(1200)); },
    async window_open() {}, async window_close() {}, async pass(e) { ui.log(e); }, // Gatilho entrando na cadeia e resolvendo: a carta de origem pisca e cresce (estilo Arena), nada genérico.
    async chain_add(e) { ui.pulse(e.uid, 'trigger-pop'); await pause(240); },
    async trigger(e) { ui.pulse(e.uid, 'trigger-pop'); ui.log(e); await pause(240); }, // a origem pisca e o item voa para a pilha (app.js drawZoom)
    // Ao resolver: linha de energia da fonte até cada alvo e o número no alvo (~1 s); com Reduce motion fica só o número.
    async resolved(e) {
      const from = ui.center(ui.refRect(e.uid));
      for (const r of e.results) {
        const to = ui.center(ui.refRect(r.ref));
        if (from && to && from !== to) fx()?.beam(from, to, {color: r.trend === 'down' ? '#ff8a6a' : '#8fe6a0', width: 10, duration: .3});
        ui.float(to, r.text, `fx-num fx-num--${r.trend}`);
      }
      ui.log(e);
      await pause(360);
    }, async resolve(e) { if (e.ability) ui.speak?.('linha', e.uid, e.ability); /* a fala sai quando resolve, não quando vai à pilha (autor, 02/11/2026) */ abilityVfx(e); ui.pulse(e.uid, 'trigger-pop'); await pause(300); }, async end_phase(e) { ui.log(e); },
  };

  return {
    get busy() { return busy; },
    skip() { skipping = true; },
    // Toca os eventos em ordem. Retorna quando tudo terminou (ou foi pulado).
    async play(events) {
      busy = true; skipping = false; queue = events;
      try {
        let last = null;
        for (const [i, e] of events.entries()) {
          const group = ANIM_OF[e.type];
          cur = group ? anim(group) : {ligada: true, velocidade: 1};
          curType = e.type;
          const som = somDe(e);
          if (som && som !== last && !skipping) sound(som) || (som === 'dano_deus' && sound('dano')); // um som por sequência do mesmo grupo
          last = som;
          ui.onEvent?.(e); // zoom da pilha acompanha a animação, não o render
          await (handlers[e.type] || (async () => {}))(e);
          // A janela do Strike que o auto-pass fecha fica visível antes do dano (autor, 03/11/2026), sem aviso na tela (autor, 05/11/2026).
          if (e.type === 'strike_declared' && unanswered(events.slice(i + 1))) await pause(1000);
        }
      } finally { busy = false; skipping = false; cur = {ligada: true, velocidade: 1}; curType = null; }
    },
  };
}
