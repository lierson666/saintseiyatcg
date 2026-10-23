# Validação local — Rulebook 2.0

Data: 23/10/2026. Escopo: primeiro conjunto de 300 cartas, arena local, motor, IA e Card Forge. Não é certificação de balanceamento nem publicação remota.

## Verificações reproduzíveis

```bash
node --test tools/test-rules-v2.mjs tools/test-card-presentation.mjs tools/test-battle-guide.mjs tools/test-presentation.mjs
python3 card-forge/serve.py --selftest
python3 tools/test-ui-v2.py
python3 tools/test-arena-ui.py
python3 tools/test-engage-god-ui.py
```

- **66 testes automatizados, todos aprovados.** Incluem rodadas/compras, AÇÕES/ENG, prioridade, Engage, Guardian/Nimble, dano persistente, Long Range/Cheater, Pierce, Unfaith, Latent por AÇÃO, substituição de armadura, múltiplas armas, Owner/evolução, Multiguard com redução de capacidade, Awaken/Ultimate, Afterlife, unicidade por efeito, correção de SST-03-010 e textos que exigem revisão de efeitos. Oito cenários cobrem orientação contextual, privacidade, histórico completo, ordem das entradas e escape de HTML.
- Um cenário percorre **cada uma das 300 definições** para resolver sua entrada ou sua resposta, fornecendo recursos e zonas apropriados. Não substitui a cobertura combinatória de todos os efeitos e interações.
- Seis confrontos automáticos entre os decks iniciais chegam a uma vitória sem laços de ações inválidas. São testes determinísticos de funcionamento, não uma amostra de equilíbrio entre facções.
- Testes de apresentação verificam EQUIP em todas as cartas equipáveis, Owners/Resonance/estágios em blocos próprios, números de evolução derivados dos campos editáveis, escape de HTML, carta viva sem PNG completo e token seguindo a iniciativa.
- Gravador: **357 cartas regravadas em memória sem diff; adição de teste correta**. O selftest não grava o catálogo real.
- Navegador Chrome headless: abrir e reconstruir as **357 cartas sem diferenças**; importação XLSX com 300 registros e diff vazio; simulação de dano na prévia; alteração de texto sinalizando revisão; diálogo de diff sem confirmar gravação; leitura e alteração de cosméticos; token A → B na rodada 2; Base sem consumir AÇÃO; emote do God; telas de 1440×1000 e 390×844 sem transbordamento horizontal. **Zero erros de JavaScript capturados.**
- Mesa e guia: mão em leque, prévia por foco, abertura da carta sem jogá-la, navegação entre cartas, Base pelo inspetor, arrastar e resolver uma carta, prioridade distinta de passagem de rodada, histórico com leitura preservada após novas jogadas e retorno ao mais recente. Nove combinações de tela/escala, de 375 a 1920 px, incluindo paisagem, HUD em 125% no PC e celular de 740 px de altura. Guia sobreposto com mesa inativa somente no celular; troca de tamanho restaura acesso no PC. Consulta do histórico após concessão também verificada. **Zero erros de JavaScript capturados.**
- Medição tipográfica do catálogo: nenhum bloco de regras transborda a caixa e nenhum precisa de fonte inferior a 32 px no canvas nativo. A conferência visual de impressão e carta interativa inclui a armadura com EQUIP, Owner e 7th Sense separados.

O script de navegador requer Playwright Python e Chrome instalados. Nesta execução foi usada uma instalação temporária do Playwright em `/tmp/card-forge-qa-python`, com o Python do runtime Codex. As dependências do editor continuam sendo somente o navegador e Python stdlib para o servidor.

Capturas locais, fora do Git:

- `card-forge/out/qa-v2/arena-desktop.png`
- `card-forge/out/qa-v2/arena-mobile.png`
- `card-forge/out/qa-v2/print-equipment.png`
- `card-forge/out/qa-v2/forge-equipment.png`
- `card-forge/out/qa-arena/card-open.png`
- `card-forge/out/qa-arena/desktop-playing.png`
- `card-forge/out/qa-arena/mobile-playing.png`
- `card-forge/out/qa-arena/mobile-guide.png`

## Assumir o confronto para proteger God

Esclarecido pelo autor em 23/10/2026. A regra vigente substitui o vínculo com God; a interpretação de adicionar uma vaga foi removida.

- O seletor aceita um inimigo engajado com seu God, em ambos os lados e em todas as combinações de Prepared/Unprepared. O novo vínculo substitui o antigo, sem dano ou alteração de Prepared.
- Com três inimigos no God, assumir um mantém os outros dois vínculos. O próximo Strike do inimigo atinge seu protetor e não o God; a rodada seguinte não restaura o vínculo antigo.
- Multiguard mantém sua capacidade e os demais confrontos. Um alvo ocupado apenas com Devotee continua bloqueado quando não há vaga. Guardian mantém sua intercepção por capacidade.
- Engage inicial custa 1 AÇÃO / 0 ENG; troca custa 1 AÇÃO / 1 ENG. Efeitos de troca usam a mesma resolução. Resposta que torna o alvo inválido não apaga o vínculo anterior da troca; preparar em resposta não bloqueia a proteção.
- IA seleciona inimigos que ameaçam seu God. Seu uso de equipamento preenche portadores livres e evita alternar armaduras já anexadas em ciclo. Os seis confrontos de regressão terminam dentro do limite anterior de comandos.
- O navegador cria a situação por comandos legais e escolhe o novo alvo por clique, tanto Prepared quanto Unprepared. O resultado tem apenas o confronto com o protetor e nenhum vínculo desse inimigo com God. Desktop e mobile sem erros de JavaScript ou alteração do catálogo.

Capturas em `card-forge/out/qa-engage-god/`: `tankar-desktop-prepared.png`, `tankar-desktop-unprepared.png` e as versões mobile.

## Integridade e aprovação

- Aprovação explícita: “Aprovar a gravação das 357 cartas.”
- Diff aprovado: `docs/importacao-300-cartas/cards.diff`.
- SHA-256 do catálogo final: `ece32b3638eed797624104fe57c193a56c2adb3e5aef082c9e1b9c0de908a625`.
- SHA-256 do XLSX original: `afaf8dcb4eebad418e4e94690f2a774eb3dc24452cb133c6461d5a5b66326f5a`.
- Os 57 registros anteriores permanecem iguais aos anteriores à importação. Nenhum original de `FRAMES/`, `ARTS/` ou `CARDS/` foi editado, movido ou renomeado. A planilha fonte não é adicionada ao Git.

## Limites relevantes

As cartas permanecem provisórias. A maioria das novas cartas ainda não tem arte. Habilidades das 57 cartas históricas não foram convertidas silenciosamente para 2.0; os líderes usam seus atributos existentes e Domains suportados, com aviso no inspetor. Os decks iniciais são uma base de teste, sem editor de decks ou serviço online novo. God Cloth, Awaken e Ultimate não são inventados para preencher lacunas do conjunto. Os emotes são textuais; dublagem, loja e inventário remoto ficam para uma etapa futura.
