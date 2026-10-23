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

- **61 testes automatizados, todos aprovados.** Incluem rodadas/compras, AÇÕES/ENG, prioridade, Engage, Guardian/Nimble, dano persistente, Long Range/Cheater, Pierce, Unfaith, Latent por AÇÃO, substituição de armadura, múltiplas armas, Owner/evolução, Multiguard com redução de capacidade, Awaken/Ultimate, Afterlife, unicidade por efeito, correção de SST-03-010 e textos que exigem revisão de efeitos. Oito cenários cobrem orientação contextual, privacidade, histórico completo, ordem das entradas e escape de HTML.
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

## Exceção de Engage contra Unprepared vinculado a God

Confirmada pelo autor em 23/10/2026. Os cenários adicionais verificam:

- Prepared/Unprepared não restringe Engage livre, em nenhuma combinação de atacante e defensor.
- Um alvo Unprepared vinculado a God aparece no seletor e recebe uma vaga adicional, em ambos os lados; o vínculo com God e o estado permanecem, sem dano ou ENG adicional.
- Alvo Prepared ocupado, alvo ocupado apenas com Devotee e uma terceira vaga sem Multiguard continuam bloqueados.
- Preparar depois mantém os vínculos; Strike escolhe um oponente e somente ele retalia. Preparar em resposta antes do novo vínculo impede sua criação.
- Guardian e IA usam a nova elegibilidade. Multiguard soma a vaga excepcional; troca preserva o marcador mesmo Prepared. Encerrar o vínculo com God elimina a vaga e seu marcador.
- O navegador desenvolve recursos, joga os Devotees, estabelece o confronto com God e realiza Strike por comandos legais; a interface então permite escolher o Devotee Unprepared como novo alvo. O resultado tem dois vínculos, sem dano adicional. Desktop e mobile sem erros de JavaScript ou alteração do catálogo.

Capturas: `card-forge/out/qa-engage-god/engage-adicional-desktop.png` e `engage-adicional-mobile.png`.

## Integridade e aprovação

- Aprovação explícita: “Aprovar a gravação das 357 cartas.”
- Diff aprovado: `docs/importacao-300-cartas/cards.diff`.
- SHA-256 do catálogo final: `ece32b3638eed797624104fe57c193a56c2adb3e5aef082c9e1b9c0de908a625`.
- SHA-256 do XLSX original: `afaf8dcb4eebad418e4e94690f2a774eb3dc24452cb133c6461d5a5b66326f5a`.
- Os 57 registros anteriores permanecem iguais aos anteriores à importação. Nenhum original de `FRAMES/`, `ARTS/` ou `CARDS/` foi editado, movido ou renomeado. A planilha fonte não é adicionada ao Git.

## Limites relevantes

As cartas permanecem provisórias. A maioria das novas cartas ainda não tem arte. Habilidades das 57 cartas históricas não foram convertidas silenciosamente para 2.0; os líderes usam seus atributos existentes e Domains suportados, com aviso no inspetor. Os decks iniciais são uma base de teste, sem editor de decks ou serviço online novo. God Cloth, Awaken e Ultimate não são inventados para preencher lacunas do conjunto. Os emotes são textuais; dublagem, loja e inventário remoto ficam para uma etapa futura.
