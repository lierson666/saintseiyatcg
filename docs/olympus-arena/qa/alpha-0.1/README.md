# Alpha 0.1: decisões, timeouts e playtest de ponta a ponta (28/10/2026)

Branch `olympus-arena`. Sem merge, deploy nem PR. Nenhuma carta, habilidade ou regra criada ou alterada; D269 continua fora (NotSpecified). Poseidon pilota o deck Athena V6 Dragon Fortress como **fixture** identificada.

## O que mudou
- `playtest/engine-v3/decision.js` (novo): protocolo de decisão pendente. A pergunta síncrona da engine (`ctx.decide`) sem resposta suspende a ação; o estado fica no ponto da pergunta (com `state.pending` para reconexão); a resposta continua do snapshot por replay determinístico. Custos, gatilhos e efeitos anteriores à pergunta não se repetem. A engine valida a resposta (fora das opções legais = `RuleError`).
- `clock.js`: `applyTimeout` (G3-027) para janela e fase de ações; escolhas pendentes respondem `{timeout: true}` (opcional → `TIMEOUT_DECLINED`; obrigatória → `TIMEOUT_AUTO_CHOICE` pela G3-030, revalidada no replay).
- `sync.js`: `resumeFor` inclui a decisão pendente; só quem decide recebe as opções.
- `divine/app.js`: sem `window.confirm`/`window.prompt`. Modal de decisão no HUD Olympus (quem decide, relógio dele, só opções legais, teclado 1–9/setas/Tab preso/Esc = "View board", que não é timeout). `tickClock` aplica timeout com escolha pendente e com escolha de alvo aberta (cancela a escolha e vale o timeout da janela/turno).
- Correção: depois do END TURN a janela da End Phase ficava sem relógio (ninguém decidindo) e o jogador podia segurar a partida; agora quem tem prioridade gasta a própria reserva.
- Painel da cadeia numera os itens e indica que o topo resolve primeiro.
- CSS: modal; mobile sem sobreposição entre etiquetas de fixture, painel de prioridade × God do jogador e pílula × God adversário; link "Main menu" alinhado na vitória.

## Capturas (navegador do app, 1024×768 e 375×812)
| Arquivo | O que mostra |
| --- | --- |
| `01-water-prison-modal.jpg` | Water Prison: pagar 2 Latent ou recusar; Player B decide; relógio de reserva |
| `02b-great-flood-base.jpg` | Great Flood: escolha da Base (D231) |
| `02-great-flood-discard.jpg` | Great Flood: descarte de 7 de 13 (G3-034), seleção marcada |
| `03-trigger-chain-order.jpg` | Cadeia com 2 itens (Water Prison de B + Moment de A em resposta); topo resolve primeiro |
| `04-clock-near-timeout-decision.jpg` | Decisão a 12 s do timeout, "On timeout: declined" |
| `05-battlefield-match.jpg` | Battlefield durante a partida, Seiya com Seal |
| `06-victory.jpg` | Tela de vitória (Soul de Poseidon a 0) |
| `07-mobile-hud-375.jpg`, `07b-mobile-decision-375.jpg` | HUD e modal em 375×812 |

## Verificado na interface (preview `olympus`, porta 8030)
- Water Prison: pagar → 2 Latent gastos uma vez, Seal 1, Pressure of the Deep; recusar e "View board" não pagam; Espaço com o modal escondido não passa a prioridade.
- Great Flood: 8 Bases uma vez, 3 escolhas de Base, descarte de 7, Mill 21.
- Cadeia LIFO: o Moment de A resolveu antes do Water Prison de B.
- Timeouts (`?timeouts=1`): `TIMEOUT_DECLINED` no Water Prison sem pagar; `TIMEOUT_END_TURN` → janela da End Phase → `TIMEOUT_PASS_PRIORITY` → turno de B com o relógio de B correndo.
- Vitória por Soul 0 jogando pela interface.

## Performance
- 375×812 (emulação no desktop): 60,3 FPS em 4 s, pior quadro 17,7 ms; heap 7,4 MB; CLS 0.
- Modal: 200 aberturas/fechamentos → heap 7,4 → 7,5 MB, 304 → 312 nós, nenhum elemento de animação sobrando.
- Movimento reduzido: classe aplicada, transições do modal 0,01 ms; do clique no alvo ao modal: 332 ms (normal) e 344 ms (reduzido).
- FPS no desktop não medido: o painel do navegador estava oculto e o `requestAnimationFrame` parou.

## Pendências (decisão humana)
- Ordem dos gatilhos simultâneos do mesmo jogador: pendência 5 do suplemento (hoje é a ordem de criação). Sem modal de ordenação até a regra existir.
- Seal acumulado não acontece em partida real com as cartas canônicas: Water Prison sela o atacante já Unprepared e o Prepare seguinte remove o marcador; um segundo Seal exigiria a D269. Acúmulo só por fixture (`test-engine-v3-poseidon`).
- Awaken desligando: nenhuma carta do Alpha ganha Soul, então não acontece em partida real (coberto por `gainSoul` em `test-engine-v3-gods`).
- Hot-seat: a tela troca para quem decide (como já acontece nas janelas de prioridade); não existe tela de "passe o aparelho".
