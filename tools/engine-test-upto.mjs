// Testes do motor: o "up to N" virou uma pergunta só, com lista (autor, 31/10/2026). Os `decide` dos testes foram
// escritos para a pergunta antiga, uma carta por vez ("Use?" + escolha); `oneByOne` traduz, sem mudar o que cada teste
// responde. `guardDecide` aplica a tradução também a toda troca posterior de `ctx.decide` no teste.
export function oneByOne(decide) {
  if (!decide || decide.oneByOne) return decide;
  const w = (p, q) => {
    if (!(q.options && q.count && q.min === 0)) return decide(p, q);
    const direct = decide(p, q); // quem já responde em lista (ex.: o withTargets da resolução) passa direto
    if (Array.isArray(direct)) return direct;
    const picked = [];
    for (let i = 0; i < q.count; i++) {
      const rest = q.options.filter(o => !picked.includes(o));
      if (!rest.length || !decide(p, {ability: q.ability, text: q.text || 'Use this ability?', part: 'target'})) break;
      const pick = decide(p, {ability: q.ability, options: rest, choose: 'target', text: q.text});
      if (!pick) break;
      picked.push(pick);
    }
    return picked;
  };
  w.oneByOne = true;
  return w;
}
export function guardDecide(ctx) {
  let f = oneByOne(ctx.decide);
  Object.defineProperty(ctx, 'decide', {get: () => f, set: v => { f = oneByOne(v); }, enumerable: true, configurable: true});
  return ctx;
}
