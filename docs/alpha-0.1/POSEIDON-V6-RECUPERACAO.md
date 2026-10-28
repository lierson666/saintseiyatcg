# Poseidon V6 — recuperação, Seal e estado da integração

28/10/2026 · Alpha 0.1 · branch `olympus-arena`. Este relatório não cria regra nem carta. Dados: `data/poseidon-v6/inventario.json`.

## 1. Conclusão

- **God Poseidon: CANÔNICO.** Soul 27, Attack 2, Awaken 4; Water Prison, Pressure of the Deep e Great Flood (8 Cosmo), no registro `GOD-POSEIDON` do D268, com o custo corrente da D198 (2 Latent Cosmo).
- **Catálogo Poseidon V6: não existe como canônico.** A Memória Mestre D268 diz: o catálogo D268 é Athena V6 + 5 Gods, não 90 cartas de Poseidon.
- Só 4 fichas V6 foram encontradas, todas **PARCIAL**: 091 Sea Dragon Kanon, 092 Sea Dragon Scale, 093 Siren Sorrento, 094 Siren Scale. Elas têm texto completo, mas não há registro de aprovação.
- Por isso **não há deck Poseidon oficial possível**. O loader bloqueia cartas incompletas em deck oficial (código `incomplete`).
- O God Poseidon foi integrado e testado na engine 3.0 com um deck **FIXTURE** rotulado: o Dragon Fortress de Athena V6, pilotado pelo God Poseidon.

## 2. Fontes consultadas

| Fonte | O que tem | Uso |
| --- | --- | --- |
| `data/canon/d268.json` | 90 Athena V6 + 5 Gods; D192–D268 | God Poseidon e decisões |
| Drive · 07 Memória Mestre até D268 | "somente quatro dos sete Marina Generals no Vanilla"; D269 (Water Prison em Devotee já Sealed) não aprovada | Contexto e limites |
| Drive · [SSTCG] CARDS (`146Xaq…`) | Fichas 091–094 (seção "POSEIDON'S CARD") | Inventário PARCIAL |
| `CONTEXT/SSTCG_HANDOFF_CLAUDE/SSTCG_CONTEXTO_COMPLETO_PARA_CLAUDE.md` | Kanon Pierce, Sorrento Nimble, Baian Long Range, Io Impulse, Krishna protegido de Moments/Techniques | PLANEJADO |
| Drive · SSTCG_300_cartas_playtest (`1pY_ng…`) e `data/cards.json` (`sst-02-*`) | 50 conceitos Poseidon "PROVISIONAL" / `needs-review` (catálogo 2.x) | Legado; não é V6, não usado |
| Git (todas as branches) | Só o commit 9a243cc (texto do God a partir do PSD); nada de cartas V6 | — |

## 3. Inventário

| Nº | Nome | Raridade | Tipo | Custo | ATK/HP | Keywords | Cosmoble | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| God | POSEIDON | — | God — Olympian | — | Soul 27 · Attack 2 · Awaken 4 | — | — | CANÔNICO |
| 091 | SEA DRAGON KANON | Mythic | Devotee — Marina General | 6 | 4/5 | Pierce | Yes | PARCIAL |
| 092 | SEA DRAGON SCALE | Rare | Equipment — Armor — Scale (Auto-Equip Kanon; Equip 5 — Other Devotees) | 4 | +2 ATK · HP 5 | — | Yes | PARCIAL |
| 093 | SIREN SORRENTO | Mythic | Devotee — Marina General | 5 | 2/5 | Nimble | Yes | PARCIAL |
| 094 | SIREN SCALE | Rare | Equipment — Armor — Scale (Auto-Equip Sorrento; Equip 5 — Other Devotees) | 4 | +1 ATK · HP 4 | — | Yes | PARCIAL |
| — | Seahorse Baian | — | (Marina) | — | — | Long Range (dica) | — | PLANEJADO |
| — | Chrysaor Krishna | — | (Marina) | — | — | proteção contra Moments/Techniques adversárias (dica) | — | PLANEJADO |
| — | Scylla Io | — | (Marina) | — | — | Impulse (dica) | — | PLANEJADO |
| 095+ | demais cartas do set | — | — | — | — | — | — | AUSENTE |

Texto integral das 4 fichas: `data/poseidon-v6/inventario.json`.

Nas fichas 091 e 092, o custo do Golden Triangle aparece como "2, :" e "3, :": o símbolo se perdeu na exportação do Google Docs. Não foi preenchido.

## 4. Marina Generals e Scales

- **Kanon e Sorrento têm ficha**, ambas PARCIAL, com a keyword das dicas: Pierce e Nimble.
- **Baian, Krishna e Io só têm dica de design.** Não está definido quais 2 dos outros Marinas completam os 4 do Vanilla.
- **As 2 Scales recuperadas funcionam em outro portador** ("Equip 5 — Other Devotees"). A Resonance confere o portador nomeado, como manda o contexto do autor.
- **Ordem ETB → modificadores:** as Scales não têm ETB, então nada a conferir.
- **Cosmoble:** Yes nas 4, carta a carta.
- Nenhuma Marina/Scale foi codificada na engine; isso exige aprovação das cartas.

## 5. Matriz de Seal

| Regra | Fonte | Engine | Teste |
| --- | --- | --- | --- |
| Seal é marcador; "Sealed" = 1 ou mais | D211 | `addSeal` | "D211: Seal são marcadores…" |
| "Becomes Sealed" = passagem de 0 para ≥1 no mesmo objeto | D211 | `addSeal` devolve transições | Pressure (vários) |
| Cada evento que prepararia remove 1 marcador; N marcadores atrasam N | D211, D212 | `prepareUnit` (início de turno, Pegasus Cloth Resonance, 019) | "D211…" |
| Marcadores acumulam; acrescentar não dispara Pressure de novo | D211 | `addSeal` | "D211: selar quem já está Sealed…" |
| Seal depois da declaração não cancela o Strike | D212 | Water Prison só sela; Strike segue | "D212/D198…" |
| Seal não é stun nem proíbe ações | D211/D212 (só atraso de preparo) | nenhuma checagem de Seal em Strike/ativação | "Seal não é stun…" |
| Water Prison: Strike legal de Devotee inimigo; inimigo checado na declaração | D198, D263 | `hooks.strikeDeclared` | "D212/D198…" |
| Recusar não gasta uso; pagar legal gasta mesmo sem Seal | D268 | gatilho da Water Prison | "D268…" (2 testes) |
| Pressure: um gatilho por Devotee, inimigo no instante do Seal, Awaken ativo | D211, D264, D267 | `hooks.sealed` | "D267…", "D264…" |
| Mill 2 de quem controlava no Seal; continua se o Devotee sair; compra 1 independe | D265, D266, D234 | gatilho guarda `millPlayer` | "D265/D266/D233…" |
| Mill com deck curto: min(N, K), sem Fatigue | D233 | `core.js mill` | idem |
| Marcadores somem quando o objeto sai do campo | regra geral de objeto novo (Memória Mestre §5) | `delete state.units[uid]` | implícito |
| **Quantos marcadores "Seal that Devotee" coloca** | — | `NotSpecified` (P-SEAL-1) | "P-SEAL-1…" |
| **Prepare redundante em Devotee Prepared e Sealed** | — | `NotSpecified` (P-SEAL-2) | "P-SEAL-2…" |
| Water Prison em atacante já Sealed | D269, **não aprovada** | `NotSpecified` | "Seal não é stun…" |
| Conflito: `guia-do-jogo.md` §48 (2.x) define Sealed como status até o fim da rodada, que impede Strike e habilidades | 2.x × D211/D212 | engine 3.0 segue D211/D212 (precedência do D268 na 3.0) | — |

## 6. Perguntas fechadas ao autor

1. **P-SEAL-1:** "Seal that Devotee" (Water Prison) coloca quantos marcadores Seal?
   - (A) 1 marcador. Recomendado: é o que as cartas históricas escrevem por extenso ("put 1 Seal counter"), e a D211 fala em "one or more".
   - (B) outro número.
2. **P-SEAL-2:** um evento de Prepare sobre um Devotee **já Prepared** e com Seal:
   - (A) remove 1 marcador mesmo assim; ou
   - (B) não é um "would-be Prepare event" e não remove nada.
   - Hoje isso não ocorre no Alpha: só a Water Prison sela, e o atacante já está Unprepared.
3. **P-FLOOD-1:** no Great Flood, quem escolhe as cartas descartadas da mão?
   - (A) o próprio jogador que descarta; ou
   - (B) Poseidon.
   - A D232 diz só "ordinary discard rules", e as regras 3.0 não definem descarte.

## 7. Integração feita

- **Engine 3.0:** Seal, Water Prison, Pressure of the Deep e Great Flood (`playtest/engine-v3/core.js`, `gods.js`, `strike.js`).
- **Loader e legalidade:**
  - `shared/poseidon-v6.js` só aceita cartas CANÔNICO no pool oficial;
  - deck oficial pela D171 (`validateDeck`) mais o bloqueio `incomplete`.
- **Testes** (`tools/test-engine-v3-poseidon.mjs`, 18 testes):
  - Seal, Water Prison, Pressure e Great Flood;
  - loader e legalidade;
  - duelo FIXTURE Athena × Poseidon reproduzível por seed, que termina e mantém as invariantes.
- **HUD Olympus:** não ligado a Poseidon nesta tarefa. O battlefield não mudou. A integração visual fica como pendência.

## 8. Para aprovação humana

1. Responder P-SEAL-1, P-SEAL-2 e P-FLOOD-1.
2. Aprovar (ou corrigir) o texto das fichas 091–094 e o símbolo de custo perdido no Golden Triangle.
3. Definir os outros 2 Marinas do Vanilla e criar as fichas de Baian/Krishna/Io, se forem eles.
4. Definir o restante do set Poseidon V6 (até 90 cartas) e a numeração depois de 094.
5. Confirmar que G3-023 (Cosmo de Ultimate pago com Base preparada) vale também para o Great Flood. A engine aplica assim.
6. Revisar a tabela de identidades G3-029 (`shared/character-identity.js`). Os 4 Devotees genéricos estão sem personagem.
7. Decidir a D269.
