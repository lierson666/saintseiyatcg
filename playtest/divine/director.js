// Divine Arena · orquestrador de apresentação. Lê os eventos que a engine já registrou (state.events) e os
// dramatiza em sequência. Nunca decide resultado: os números exibidos vêm dos próprios eventos.
// `ui` é o adaptador do DOM (posições e textos); `fx` é a camada WebGL (pode faltar: tudo vira só DOM).
import {wait} from './scene.js?v=20261028-5';
import {strikeSound, chargeSound} from '../audio.js?v=20261028-strike';

// Hierarquia visual dos golpes (COMBAT_CINEMATICS.md): comum < Saint < assinatura < divino.
// As assinaturas são só visuais e disparam pelo número da carta atacante; não criam regra.
export const SIGNATURES = {
  '001': {style: 'meteor', name: 'Pegasus Ryuseiken', color: '#9fd8ff'},
  '003': {style: 'dragon', name: 'Rozan Shoryuha', color: '#6ff0b0'},
};
const STYLE_BY_TYPE = [[/Gold Saint/, 'energy', '#ffd36e'], [/Silver Saint/, 'energy', '#d8e4ff'], [/Bronze Saint/, 'physical', '#ffe0a0']];

export function createDirector({ui, getFx, settings}) {
  let skipping = false, busy = false;
  const fx = () => (settings.reduceMotion ? null : getFx());
  const t = ms => (skipping ? 0 : ms * ({fast: .55, normal: 1, cinematic: 1.35}[settings.speed] || 1));
  const pause = ms => (t(ms) ? wait(t(ms)) : Promise.resolve());
  const shake = amp => { const f = fx(); if (f && !skipping) { f.shake(amp * settings.shake); f.punch(amp * settings.shake * .05); } ui.shake(amp * settings.shake); };

  function styleOf(uid) {
    const sig = SIGNATURES[ui.number(uid)];
    if (sig) return sig;
    const type = ui.type(uid), hit = STYLE_BY_TYPE.find(([re]) => re.test(type));
    return hit ? {style: hit[1], color: hit[2]} : {style: 'physical', color: '#ffe0a0'};
  }

  // Força do golpe pelo ATK (autor, 28/10/2026): 0 num ATK 2, 1 num ATK 10. Só apresentação; o dano vem da engine.
  const powerOf = atk => Math.max(0, Math.min(1, ((atk || 0) - 2) / 8));

  // Golpe do atacante até o alvo; resolve no momento do impacto. `p` (0..1) engrossa tudo.
  async function strikeVfx(from, to, style, p = 0) {
    const f = fx();
    if (skipping) return;
    chargeSound(p);
    if (!f) return;
    f.charge(from.x, from.y, {color: style.color, count: Math.round((style.style === 'physical' ? 30 : 60) * (1 + p * 2))});
    if (p > .6) f.shake(p * 3); // o chão treme enquanto o Cosmo sobe
    await pause((style.style === 'physical' ? 140 : 260) + p * 420);
    if (style.style === 'meteor') {
      // Pegasus Ryuseiken: rajada de meteoros com leve dispersão, todos convergindo no alvo.
      const shots = [];
      const n = 9 + Math.round(p * 16), spread = 60 + p * 90;
      for (let i = 0; i < n; i++) {
        const jitter = {x: from.x + (Math.random() - .5) * spread, y: from.y + (Math.random() - .5) * spread};
        shots.push(wait(i * 28).then(() => f.projectile(jitter, to, {color: style.color, duration: .22, size: 12 * (1 + p * .6), trail: 2 + p * 2})));
      }
      await Promise.all(shots);
    } else if (style.style === 'dragon') {
      // Rozan Shoryuha: espiral ascendente de Cosmo verde que mergulha no alvo.
      await Promise.all([f.projectile(from, to, {color: style.color, duration: .42, size: 22 * (1 + p), trail: 5 + p * 4, arc: 140}),
        wait(60).then(() => f.projectile(from, to, {color: '#d6ffe9', duration: .42, size: 10, trail: 2, arc: -90}))]);
    } else if (style.style === 'energy') {
      await f.beam(from, to, {color: style.color, width: 22 * (1 + p * 1.8), duration: .3 + p * .25});
    } else {
      await f.projectile(from, to, {color: style.color, duration: .18, size: 14 * (1 + p * 1.2), trail: 2 + p * 3});
    }
  }

  function impact(at, {color = '#fff2c4', strength = 1} = {}) {
    const f = fx();
    if (f && !skipping) {
      f.burst(at.x, at.y, {color, count: Math.round(50 * strength), speed: 380 * strength});
      f.shockwave(at.x, at.y, {color, size: 160 * strength});
      if (strength > 1.2) f.flash(Math.min(.6, .12 + strength * .1));
      if (strength > 1.8) wait(90).then(() => f.shockwave(at.x, at.y, {color: '#ffffff', size: 260 * strength})); // segunda onda
    }
    shake(strength * 6);
  }

  // Cada tipo de evento: o que mostrar e quanto tempo segurar a fila.
  const pool = {A: 0, B: 0}; // Cosmo pago e ainda não entregue a uma carta
  const handlers = {
    async turn_start(e) { pool.A = pool.B = 0; ui.clearPool(); // o que sobrou na pool volta sem perda
      await ui.banner(ui.isViewer(e.player) ? 'Your turn' : `Player ${e.player}'s turn`, e.player, t(900)); },
    async draw(e) { if (!settings.skipDraws) await ui.flyCard(e.uid, ui.deckRect(e.player), ui.handRect(e.player), t(220), !ui.isViewer(e.player)); },
    async fatigue(e) {
      const at = ui.center(ui.deckRect(e.player));
      fx()?.burst(at.x, at.y, {color: '#8a5cff', count: 40});
      ui.float(at, `Fatigue ${e.amount}`, 'damage');
      await pause(500);
    },
    async mulligan() {},
    async base_placed(e) {
      const at = ui.center(ui.bankRect(e.player, 'base'));
      await ui.flyCard(e.uid, ui.rect(e.uid) || ui.handRect(e.player), ui.bankRect(e.player, 'base'), t(260), false);
      fx()?.burst(at.x, at.y, {color: '#ffd36e', count: 30, speed: 200});
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
      const f = fx(), poolAt = ui.center(ui.bankRect(e.player, 'base')), src = ui.center(ui.rect(e.uid) || ui.handRect(e.player));
      if (pool[e.player] && f && !skipping && poolAt && src) { // o pool encontra a carta e a energia a vira para o campo
        f.beam(poolAt, src, {color: '#a8e4ff', width: 14 + 4 * Math.min(pool[e.player], 6), duration: .38});
        await pause(300);
        f.burst(src.x, src.y, {color: '#bfe6ff', count: 28, speed: 220});
      }
      pool[e.player] = 0;
      const to = e.kind === 'Equipment' && e.bearer ? ui.rect(e.bearer) : ui.fieldRect(e.player);
      await ui.flyCard(e.uid, ui.rect(e.uid) || ui.handRect(e.player), to, t(320), false, true);
      const at = ui.center(to);
      if (e.kind === 'Devotee') { fx()?.burst(at.x, at.y, {color: '#ffe7a8', count: 45, speed: 260}); fx()?.shockwave(at.x, at.y, {size: 140}); }
      else if (e.kind === 'Equipment') fx()?.shockwave(at.x, at.y, {color: '#d8e4ff', size: 110});
      else fx()?.charge(at.x, at.y, {color: e.category === 'Moment' ? '#c58cff' : '#ffd36e', count: 50});
      ui.log(e);
      await pause(e.kind === 'Spell' ? 280 : 120);
    },
    async spell_resolved(e) {
      const at = ui.center(ui.fieldRect(e.player));
      fx()?.burst(at.x, at.y, {color: '#f5e2ff', count: 40, speed: 300});
      ui.log(e);
      await pause(260);
    },
    async ability(e) { ui.pulse(e.uid, 'activate'); ui.log(e); await pause(260); },
    async equipped(e) { ui.log(e); await pause(120); },
    async strike_declared(e) {
      ui.pulse(e.attacker, 'attacking', true);
      ui.aim(e.attacker, e.target);
      ui.log(e);
      await pause(260);
    },
    async strike_resolve(e) {
      const from = ui.center(ui.rect(e.attacker)), targetRect = e.target.kind === 'god' ? ui.godRect(e.target.player) : ui.rect(e.target.uid);
      const to = ui.center(targetRect), style = styleOf(e.attacker), p = powerOf(e.atk);
      if (style.name) await ui.callout(style.name, e.player, t(650 + p * 350));
      ui.pulse(e.attacker, 'lunge');
      await strikeVfx(from, to, style, p);
      await pause(40 + p * 160); // hit stop: mais longo quanto mais forte
      if (!skipping) strikeSound(p);
      impact(to, {color: style.color, strength: (style.name ? 1.4 : 1) * (1 + p * 1.3)});
      // Retaliação: do alvo de volta ao atacante (o God usa o raio divino).
      await pause(140);
      const back = e.target.kind === 'god' ? {style: 'energy', color: '#ffd36e'} : styleOf(e.target.uid);
      if (fx() && !skipping) await fx().beam(to, from, {color: back.color, width: e.target.kind === 'god' ? 26 : 12, duration: .22});
      ui.aim(null);
      ui.pulse(e.attacker, 'attacking', false);
    },
    async damage(e) {
      const at = ui.center(ui.rect(e.uid));
      if (!at) return;
      if (e.prevented) ui.float({x: at.x, y: at.y - 36}, `${e.prevented} prevented`, 'shield');
      if (e.absorbed) ui.float({x: at.x, y: at.y - 18}, `${e.absorbed} to Armor`, 'armor');
      if (e.dealt) { ui.float(at, `-${e.dealt}`, 'damage'); ui.pulse(e.uid, 'hit'); impact(at, {color: '#ff9a7a', strength: Math.min(1.3, .5 + e.dealt * .15)}); }
      await pause(e.dealt ? 220 : 120);
    },
    async god_damage(e) { if (e.incoming > e.dealt) ui.float(ui.center(ui.godRect(e.player)), `${e.incoming - e.dealt} prevented`, 'shield'); },
    async soul_lost(e) {
      const at = ui.center(ui.godRect(e.player));
      ui.setSoul(e.player, e.soul);
      ui.float(at, `-${e.amount} Soul`, 'damage big');
      impact(at, {color: '#ffcf6e', strength: Math.min(2, .8 + e.amount * .2)});
      await pause(420);
    },
    async destroyed(e) {
      const at = ui.center(ui.rect(e.uid));
      ui.pulse(e.uid, 'shatter');
      if (at) fx()?.burst(at.x, at.y, {color: '#cbbfa8', count: 70, speed: 300, grav: 600, life: .9});
      ui.log(e);
      await pause(380);
    },
    async round_end() {},
    // ---------- Gods ----------
    async awaken_changed(e) {
      const at = ui.center(ui.godRect(e.player));
      if (e.awaken) {
        fx()?.charge(at.x, at.y, {color: '#9fd0ff', count: 90, radius: 140});
        await ui.banner('Awaken', e.player, t(900));
        fx()?.shockwave(at.x, at.y, {color: '#bfe2ff', size: 220});
      } else ui.float(at, 'Awaken ends', 'shield');
    },
    async divine_power(e) {
      const at = ui.center(ui.godRect(e.player));
      fx()?.burst(at.x, at.y, {color: '#bfe2ff', count: 40, speed: 220});
      ui.float(at, e.ability, 'gain');
      await pause(420);
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
      ui.cinematic?.(true);
      if (e.ability === 'GREAT FLOOD') { // onda sobre o campo inimigo; o retorno às mãos aparece no render seguinte
        const enemy = ui.enemyOf(e.player), god = ui.center(ui.godRect(e.player)), to = ui.center(ui.godRect(enemy));
        fx()?.beam(god, to, {color: '#7fd4ff', width: 44, duration: .7});
        impact(to, {color: '#7fd4ff', strength: 2});
        await ui.banner('Great Flood', e.player, t(1100));
        ui.cinematic?.(false);
        return;
      }
      const enemy = ui.enemyOf(e.player), to = ui.center(ui.godRect(enemy));
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
    async judgment_removed(e) { ui.float(ui.center(ui.godRect(e.player)), 'Judgment removed', 'gain'); await pause(400); },
    async soul_gained(e) { if (e.amount) { ui.setSoul(e.player, e.soul); ui.float(ui.center(ui.godRect(e.player)), `+${e.amount} Soul`, 'gain'); } },
    async victory(e) { await ui.banner(e.draw ? 'Draw' : ui.isViewer(e.winner) ? 'Victory' : `Player ${e.winner} wins`, e.winner, t(1200)); },
    async window_open() {}, async window_close() {}, async pass(e) { ui.log(e); }, async chain_add() {}, async resolve() {}, async end_phase(e) { ui.log(e); },
  };

  return {
    get busy() { return busy; },
    skip() { skipping = true; },
    // Toca os eventos em ordem. Retorna quando tudo terminou (ou foi pulado).
    async play(events) {
      busy = true; skipping = false;
      try {
        for (const e of events) await (handlers[e.type] || (async () => {}))(e);
      } finally { busy = false; skipping = false; }
    },
  };
}
