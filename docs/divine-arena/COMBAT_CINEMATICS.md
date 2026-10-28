# Combat Cinematics

## Sequência do Strike (`strike_declared` → janela → `strike_resolve` → `damage`/`god_damage`/`soul_lost` → `destroyed`)
1. **Declaração**: atacante brilha (`attacking`), alvo recebe mira vermelha. Abre a janela de resposta (P06).
2. **Callout** (só assinatura): nome do golpe em itálico grande, 650 ms.
3. **Investida**: carta salta (`lunge`).
4. **Carga**: partículas convergem no atacante.
5. **Golpe** por estilo:
   - físico (Bronze/comum): projétil curto;
   - energia (Silver/Gold): feixe;
   - `meteor` (001 Pegasus Ryuseiken): 9 meteoros com dispersão;
   - `dragon` (003 Rozan Shoryuha): espiral dupla verde em arco.
6. **Hit stop** 40 ms.
7. **Impacto**: burst + onda de choque + tremor (+ flash na assinatura, reduzido por "Reduce flashes").
8. **Retaliação**: feixe do alvo de volta (God: feixe dourado largo).
9. **Números**: "-N", "N prevented", "N to Armor", "-N Soul" — todos do evento.

## Assinaturas
Tabela `SIGNATURES` em `director.js`, chaveada pelo número da carta. São só visuais; não alteram dano, alvo nem tempo de regra. Novas assinaturas entram ali.

## Cinemática divina
BLOCKED_BY_RULES: depende de Divine Power/Ultimate aprovados.
