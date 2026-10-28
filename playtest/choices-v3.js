// Escolhas que cada carta pede ao jogar (alvo, modo, confirmação), compartilhadas pelas mesas da engine 3.0.
// Só descreve a interface; a legalidade é checada pela engine. Texto visível em inglês.
// Escolhas de cada carta, em ordem. pick: conjunto de candidatos; multi: até N; optional: pode pular.
export const SAINT = {key: 'target', pick: 'saint', label: 'Choose a friendly Saint'};
export const STEPS = {
  '052': [{key: 'targets', pick: 'bronze', multi: 2, optional: true, label: 'Choose up to two friendly Bronze Saints'}],
  '053': [SAINT], '054': [SAINT], '058': [SAINT], '076': [SAINT], '077': [SAINT],
  '059': [SAINT, {key: 'prepare', confirm: 'Also Prepare that Saint (needs Shunrei)?'}],
  '060': [{key: 'target', pick: 'bronze', label: 'Choose a friendly Bronze Saint'}],
  '061': [{key: 'mode', options: {atk: '+2 ATK to a friendly Saint', god: 'Prevent the next 3 Strike damage to your God'}},
    {...SAINT, when: c => c.mode === 'atk'}],
  '081': [{key: 'mode', options: {atk: '+2/+2 to a friendly Bronze Saint', god: 'Prevent the next 5 Strike damage to your God', both: 'Both (needs Pegasus Seiya)'}},
    {key: 'target', pick: 'bronze', label: 'Choose a friendly Bronze Saint', when: c => c.mode !== 'god'}],
  '082': [{key: 'target', pick: 'enemy', label: 'Choose an enemy Devotee'}, {key: 'heal', pick: 'saint', optional: true, label: 'If it is defeated, remove 1 damage from which friendly Saint?'}],
  '085': [{key: 'source', pick: 'saint', label: 'Choose the friendly Saint'}, {key: 'target', pick: 'enemy', label: 'Choose an enemy Devotee'}],
  '087': [{key: 'prepare', pick: 'saint', multi: 2, optional: true, label: 'If your God has 5 or less Soul, Prepare up to two friendly Saints'}],
  '088': [SAINT, {key: 'prepare', confirm: 'Prepare that Saint if your God is behind?'}],
  '021': [{key: 'target', pick: 'bronze', optional: true, label: 'Training counter on which friendly Bronze Saint?'}],
  '041': [{key: 'target', pick: 'devotee', label: 'Remove up to 2 damage from which friendly Devotee?'}],
  '042': [{key: 'target', pick: 'armor', label: 'Shield which friendly Armor?'}],
  '011': [{key: 'target', pick: 'armor', label: 'Shield which friendly Armor?'}],
};

