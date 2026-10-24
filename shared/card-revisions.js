// Revisões de regra aplicadas por ID sobre o conjunto importado. O texto original continua em `origem.texto_en`.
// 2026-10-24 — Fim do Engage; Guarda e Rivalidade (guia cap. IV, CHANGELOG-regras.md).
const unit=(lado='qualquer',extra={})=>({zona:'battlefield',tipo:'Devotee',lado,...extra});
const NOTA='Revisado em 24/10/2026: Engage removido; texto e programa reescritos para Guarda e Rivalidade.';
const support=(texto,ajuste)=>c=>{
  const activation=c.habilidades_en[0].match(/Activation:.*$/)?.[0]||'';
  return{habilidades_en:[`${texto} ${activation}`.trim()],motor:ajuste(structuredClone(c.motor))};
};
const challenge={id:'challenge',nome_en:'Challenge',zona:'battlefield',custo:0,limite_rodada:1,efeitos:[{op:'rivalizar',alvo:unit('inimigo'),com:unit('aliado',{subtipo:'Marina'})}]};
const rivalsOfMarinas=m=>({...m,passivas:m.passivas.map(p=>p.tipo==='reduzir_engajados_marinas'?{...p,tipo:'reduzir_rivais_marinas'}:p)});
const pillarChallenge=m=>({...m,passivas:m.passivas.filter(p=>p.tipo!=='troca_gratis'),habilidades:[...m.habilidades.filter(h=>h.id!=='challenge'),challenge]});
const spell=(texto,efeitos)=>()=>({habilidades_en:[texto],motor:{efeitos,gatilhos:[],passivas:[],habilidades:[]}});

export const CARD_REVISIONS={
  'sst-02-010':()=>({habilidades_en:['When played: Choose an enemy Devotee. It becomes a Rival of this Devotee.'],motor:{efeitos:[],gatilhos:[{evento:'entrada',escopo:'self',efeitos:[{op:'rivalizar',alvo:unit('inimigo'),com:'self'}]}],passivas:[],habilidades:[]}}),
  'sst-02-021':spell('Change the target of an enemy Strike to another legal target. Play only in response to an enemy Strike.',[{op:'redirecionar_strike'}]),
  'sst-02-026':spell('Target enemy Devotee becomes Unprepared. Timing: during your action opportunity or an applicable Strike window (provisional).',[{op:'esgotar',alvo:unit('inimigo')}]),
  'sst-02-033':spell('Choose a friendly Devotee and an enemy Devotee. They become Rivals. Play only during your action opportunity.',[{op:'rivalizar',alvo:unit('inimigo'),com:unit('aliado')}]),
  'sst-02-038':spell('End a Rivalry involving a friendly Devotee. Play only during your action opportunity.',[{op:'encerrar_rivalidade',alvo:unit('aliado',{rival:true})}]),
  'sst-02-041':support('Once per round, ACTION: a friendly Marina and an enemy Devotee become Rivals.',pillarChallenge),
  'sst-02-046':support('Once per round, ACTION: a friendly Marina and an enemy Devotee become Rivals.',pillarChallenge),
  'sst-02-042':support('Rivals of your Marinas get -1 Power.',rivalsOfMarinas),
  'sst-02-047':support('Rivals of your Marinas get -1 Power.',rivalsOfMarinas),
  'sst-03-035':spell('Deal 1 damage to a Devotee and to each of its Rivals. Play only during your action opportunity.',[{op:'dano_rivais',n:1,alvo:unit()}]),
  'sst-03-040':spell('Deal 1 damage to a Devotee and to each of its Rivals. Play only during your action opportunity.',[{op:'dano_rivais',n:1,alvo:unit()}]),
  'sst-04-035':spell('Deal 1 damage to each Unprepared Devotee. Play only during your action opportunity.',[{op:'dano_area',n:1,alvo:'esgotados'}]),
  'sst-04-040':spell('Deal 1 damage to each Unprepared Devotee. Play only during your action opportunity.',[{op:'dano_area',n:1,alvo:'esgotados'}]),
};

// Aplica a revisão uma única vez: o texto de origem decide se a carta ainda está na versão anterior.
export function reviseCard(c){
  const revise=CARD_REVISIONS[c.id];
  if(!revise||c.revisao>=2)return c;
  const patch=revise(c);
  return{...c,...patch,revisao:2,notas_pt:[c.notas_pt,NOTA].filter(Boolean).join(' ')};
}
