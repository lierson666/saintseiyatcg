// Alvos de Spell escolhidos AO CONJURAR (guia §54, autor 29/10/2026): as perguntas de alvo (e de modo, que decide os
// alvos) saem antes de pagar e de abrir a janela, para as respostas verem o alvo. Na resolução a Spell roda o mesmo
// `spell.run`, mas as perguntas já respondidas voltam das respostas guardadas; alvo que já não é opção legal vira null
// (a parte que dependia dele não acontece).
//
// Contrato (v6/registry.js): `spell.targets(s, c, key, self)` opcional devolve a lista de alvos que ele mesmo perguntou
// (kit.choose); ela chega ao `run` como 6º argumento. Sem `targets`, vale o coletor padrão abaixo: um ensaio de `run`
// sobre uma CÓPIA do estado e do ctx (o real não muda), em que só as perguntas de alvo/modo do conjurador chegam ao jogador (e são guardadas); o
// resto ("you may", descarte, busca…) recebe resposta neutra e fica para a resolução.
// shortcut: alvo que depende de uma escolha da própria resolução ("you may defeat… for each, target…") só é perguntado
// na resolução (o ensaio responde "não" ao "you may"); mover para `targets` explícito se a carta precisar.
import {clone} from '../decision.js';
import {bindContext} from './registry.js';

const isTargetQ = (key, player, q) => player === key && ((q.options && (q.choose === 'target' || q.choose === 'mode')) || q.part === 'target');
const kindOf = q => q.choose || 'may';
// Resposta neutra do ensaio: nada que o jogador deva ver.
const dummy = q => (q.options ? (q.count ? q.options.slice(0, q.count) : q.options[0]) : false);

// Pergunta os alvos ao conjurar. Devolve {records, values}: `records` para repetir na resolução, `values` (uids, 'god:X',
// uid de Spell na cadeia) para a cadeia, o log e os observadores.
export function aim(s, c, key, self, entry, choice = {}) {
  const real = c.decide, records = [];
  if (!real) return {records, values: []};
  if (entry.spell.targets) {
    const values = entry.spell.targets(s, c, key, self) || [];
    return {records: null, values: values.filter(Boolean)};
  }
  // Ensaio numa CÓPIA do estado e do ctx: o estado real (e as referências que a interface e os testes guardam) não muda.
  let asked = null; // erro vindo do jogador (pergunta pendente, resposta ilegal): nunca engolido pelo ensaio
  const s2 = clone(s), c2 = {...c, objects: {...c.objects}, attached: clone(c.attached), cards: new Map(c.cards)};
  bindContext(s2, c2);
  c2.decide = (player, q) => {
    if (!isTargetQ(key, player, q)) return dummy(q);
    let value;
    try { value = real(player, q); } catch (e) { asked = e; throw e; } // PendingDecision e resposta ilegal sobem daqui
    records.push({ability: q.ability, kind: kindOf(q), value});
    return value;
  };
  try { entry.spell.run(s2, c2, key, self, choice, []); } catch (e) { if (asked) throw asked; /* resposta neutra no ensaio: o erro real, se houver, vem na resolução */ }
  return {records, values: [...new Set(records.filter(r => r.kind !== 'may' && r.kind !== 'mode' && r.value).flatMap(r => r.value))]}; // "up to N" responde lista
}

// Roda `fn` (a resolução) com as respostas de alvo guardadas. Sem `records` (alvos explícitos) só roda.
export function withTargets(c, key, records, fn) {
  const real = c.decide;
  if (!real || !records) return fn();
  const left = [...records];
  c.decide = (player, q) => {
    if (isTargetQ(key, player, q)) {
      const at = left.findIndex(r => r.ability === q.ability && r.kind === kindOf(q));
      if (at >= 0) {
        const [r] = left.splice(at, 1);
        if (q.part === 'target' || r.value == null) return r.value;
        if (Array.isArray(r.value)) return r.value.filter(v => q.options.includes(v)); // "up to N": só os que seguem legais
        return q.options.includes(r.value) ? r.value : null; // alvo que saiu do campo: a parte dele não acontece
      }
    }
    return real(player, q);
  };
  try { return fn(); } finally { c.decide = real; }
}
