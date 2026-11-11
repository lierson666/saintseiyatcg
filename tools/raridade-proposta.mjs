// Propõe raridade por power level (Cosmo Balance 1.1). Não grava cards.json. "Rare" não existe: é Legendary (autor, 07/11/2026).
import fs from 'node:fs';
const root = process.argv[2];
const rep = JSON.parse(fs.readFileSync(root + '/card-forge/out/cosmo-balance-report.json', 'utf8'));
const cat = JSON.parse(fs.readFileSync(root + '/data/cards.json', 'utf8')).cartas;
const WEAPON_CYCLE = new Set(['athena-v6-049','poseidon-v6-123','hades-v6-196','ares-v6-318','artemis-v6-411']);
const AUTHOR_LEGENDARY = new Set(['athena-v6-084']); // autor, 07/11/2026
const QUOTA = { def: { Divine: 3, Legendary: 12, Uncommon: 30 }, Neutral: { Divine: 0, Legendary: 7, Uncommon: 17 } };
const ORDER = ['Divine', 'Legendary', 'Uncommon', 'Common'];
const pct = n => (n * 100).toFixed(0) + '%';
const cards = rep.cards.filter(c => /-v6-/.test(c.id) && c.status !== 'cortado');
const out = [];
const factions = [...new Set(cards.map(c => c.faction))];
for (const f of factions) {
  const all = cards.filter(c => c.faction === f);
  const fixed = [], frozen = [], pool = [];
  for (const c of all) {
    if (c.type === 'God') fixed.push([c, 'Common', 'God fica Common (decisão de 31/10/2026); Power só informativo']);
    else if (AUTHOR_LEGENDARY.has(c.id)) fixed.push([c, 'Legendary', 'Legendary por decisão do autor (07/11/2026); ocupa 1 vaga de Legendary']);
    else if (WEAPON_CYCLE.has(c.id)) fixed.push([c, 'Legendary', 'Ciclo de armas Legendary (07/11/2026): esta arma comum será substituída pela arma Legendary da facção; ocupa 1 vaga de Legendary']);
    else if (c.state !== 'RESOLVED' || c.classification === 'Análise inconclusiva') frozen.push(c);
    else pool.push(c);
  }
  // percentil dentro da facção: impacto (Power) e eficiência (desvio relativo)
  const rankOf = (arr, key) => { const s = [...arr].sort((a, b) => key(a) - key(b)); return c => s.length > 1 ? s.indexOf(c) / (s.length - 1) : 0.5; };
  const pP = rankOf(pool, c => c.power), pD = rankOf(pool, c => c.relativeDeviation);
  for (const c of pool) c._score = 0.5 * pP(c) + 0.5 * pD(c);
  pool.sort((a, b) => b._score - a._score || b.power - a.power);
  const q = { ...(QUOTA[f] || QUOTA.def) };
  for (const c of frozen) { if (c.rarity === "Rare") c.rarity = "Legendary"; if (q[c.rarity] > 0) q[c.rarity]--; } // congeladas ocupam a vaga da raridade atual
  q.Legendary -= fixed.filter(([, r]) => r === "Legendary").length; // armas do ciclo e escolhas do autor usam vaga de Legendary
  let i = 0;
  for (const r of ORDER) {
    const n = r === 'Common' ? pool.length - i : q[r];
    for (let k = 0; k < n && i < pool.length; k++, i++) {
      const c = pool[i];
      out.push({ c, prop: r, motivo: `Power ${c.power.toFixed(2)} (p${pct(pP(c))}), desvio ${c.relativeDeviation >= 0 ? '+' : ''}${pct(c.relativeDeviation)} ${c.classification} (p${pct(pD(c))}); índice ${c._score.toFixed(2)}, ${i + 1}º de ${pool.length} na facção` });
    }
  }
  for (const c of frozen) out.push({ c, prop: c.rarity, motivo: `Mantida: Cosmo Balance não mediu (${c.state}${c.classification === 'Análise inconclusiva' ? ', Análise inconclusiva' : ''}); revisar à mão` });
  for (const [c, prop, motivo] of fixed) out.push({ c, prop, motivo });
}
const fOrder = ['Athena', 'Poseidon', 'Hades', 'Ares', 'Artemis', 'Neutral'];
out.sort((a, b) => fOrder.indexOf(a.c.faction) - fOrder.indexOf(b.c.faction) || a.c.id.localeCompare(b.c.id));
const changed = out.filter(o => o.prop !== o.c.rarity);
// self-check: cotas por facção
for (const f of fOrder) { const t = {}; out.filter(o => o.c.faction === f).forEach(o => t[o.prop] = (t[o.prop] || 0) + 1); console.log(f, JSON.stringify(t)); }
console.log('total', out.length, 'mudam', changed.length);
fs.writeFileSync(process.argv[3], JSON.stringify(out.map(o => ({ id: o.c.id, nome: o.c.name, tipo: o.c.type, custo: o.c.cost, atual: o.c.rarity, proposta: o.prop, motivo: o.motivo })), null, 1));
