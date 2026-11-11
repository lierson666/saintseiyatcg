// Escolhas que cada carta pede ao jogar (alvo, modo, confirmação), compartilhadas pelas mesas da engine 3.0.
// Só descreve a interface; a legalidade é checada pela engine. Texto visível em inglês.
// Escolhas de cada carta, em ordem. pick: conjunto de candidatos; multi: até N; optional: pode pular.
export const SAINT = {key: 'target', pick: 'saint', label: 'Choose a friendly Saint'};
export const STEPS = {
  '053': [SAINT], '054': [SAINT], '077': [SAINT],
  '059': [SAINT, {key: 'prepare', confirm: 'Also Prepare that Saint (needs Shunrei)?'}],
  '060': [{key: 'target', pick: 'bronze', label: 'Choose a friendly Bronze Saint'}],
  '081': [{key: 'mode', options: {atk: '+2/+2 to a friendly Bronze Saint', god: 'Prevent the next 5 Strike damage to your God', both: 'Both (needs Pegasus Seiya)'}},
    {key: 'target', pick: 'bronze', label: 'Choose a friendly Bronze Saint', when: c => c.mode !== 'god'}],
  '082': [{key: 'target', pick: 'enemy', label: 'Choose an enemy Devotee'}],
  '085': [{key: 'source', pick: 'saint', label: 'Choose the friendly Saint'}, {key: 'target', pick: 'enemy', label: 'Choose an enemy Devotee'}],
  '087': [{key: 'prepare', pick: 'saint', multi: 2, optional: true, label: 'If your God has 5 or less Soul, Prepare up to two friendly Saints'}],
  '088': [SAINT, {key: 'prepare', confirm: 'Prepare that Saint if your God is behind?'}],
  '021': [{key: 'target', pick: 'bronze', optional: true, label: 'Training counter on which friendly Bronze Saint?'}],
};

// Habilidades {T} (ABILITIES da engine): escolhas ao ativar, não ao jogar a carta.
export const ABILITY_STEPS = {
  '041': [{key: 'target', pick: 'devotee', label: 'Remove up to 2 damage from which friendly Devotee?'}],
  '042': [{key: 'target', pick: 'armor', label: 'Remove 1 damage from which friendly Devotee with an Armor?'}],
  '011': [{key: 'target', pick: 'armor', label: 'Remove 1 damage from which friendly Devotee with an Armor?'}],
};

