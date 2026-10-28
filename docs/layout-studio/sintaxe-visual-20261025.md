# Sintaxe visual aprovada — 25/10/2026

Referência do autor: `CARDS/ATHENA/CLOTH/SAGGITARIUS-CLOTH.png`, apenas lida; o arquivo original não foi modificado.

- Alto esquerdo: custo de jogar. O fundo circular de Cosmo indica **Cosmoble**, independentemente da unidade mecânica usada para pagar o custo.
- Meio esquerdo de Equipment: bônus impresso de ATK concedido ao portador, com sinal (`+2`).
- Meio direito de Equipment: bônus impresso de HP concedido ao portador (`+2`). Esse valor não é o HP próprio da Armor.
- Rodapé: retirar os badges de EQUIP e DAMAGE/Armor HP da composição padrão.
- Custo de Equip e Auto-Equip continuam no texto de regras e no Inspector; HP próprio continua nos dados, na engine e no Inspector.
- As layers Equip Cost e Armor HP continuam editáveis no Studio, ocultas por padrão. Uma prévia de QA pode ativá-las explicitamente para validar os controles; isso não publica alteração no catálogo real.

Os bônus são lidos do estágio estruturado ou da linha de bônus impressa já existente. Não somamos bônus, não deduzimos HP da Armor a partir do bônus e não atribuímos valores ausentes. O mesmo mapeamento é usado nas duas representações.

Esta orientação substitui a obrigação anterior de manter um badge de EQUIP na arte; a informação continua consultável nas regras e no Inspector. Não altera regras, custos nem habilidades do jogo.
