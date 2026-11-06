# Artemis V2.0 — direção de arte

Aprovada pelo autor em 06/11/2026 (master prompt Artemis V2.0). Código: `card-forge/art-direction/artemis-v2.js`.

Artemis é Lua, caça, autoridade divina e julgamento celeste. Não é uma facção genérica de floresta. O verde da moldura é identidade de jogo, não obrigação: nenhum personagem precisa ser verde.

O universo de Saint Seiya é a referência visual dominante. Fantasia medieval genérica fica fora.

## Hierarquia da facção

Todos os grupos abaixo pertencem mecanicamente à facção Artemis. A diferença está no visual, na narrativa e na armadura.

| Família | Quem | Referência | Armadura |
| --- | --- | --- | --- |
| Divine Lunar Court | Ártemis, divindades lunares, sacerdotisas | Next Dimension | Armadura divina, nunca Cloth nem Glory |
| Satellites — Temple Guard | Satélites tradicionais, comandantes | Calisto e as Satélites de Next Dimension | Moonplate leve, motivos de meia-lua |
| Black Satellites — Attack Squads | Unidades de ataque e perseguição | La Scoumoune (Next Dimension) | Moonplate negra, placas sobrepostas |
| Celestial Angels — Olympian Warriors | Anjos dos deuses do Olimpo | Tenkai-hen Josō Overture (2004); Next Dimension só quando a versão do personagem for essa | Glory |
| Glories — Celestial Armors | As armaduras dos Anjos | A Glory do portador no mesmo filme | Família própria (`docs/glory-equipment-system.md`) |

Regras que valem para todas as famílias:

- Uma Satélite parece uma Satélite, não um Cavaleiro de Bronze com armadura verde.
- Uma Black Satellite parece uma guerreira da força ofensiva lunar: menos ornamento sacerdotal, mais disciplina militar, furtividade e movimento.
- Um Anjo Celeste parece um guerreiro do Olimpo, não um anjo religioso. Não tem auréola. Só tem asas quando o desenho canônico ou um projeto original aprovado tem.
- Uma Glory parece uma Glory. Não é Moonplate, não é Cloth e não herda as patentes da Moonplate.
- Nenhuma Glory nem armadura de Artemis copia o visual das armaduras de Athena.
- Filme e mangá não se misturam no mesmo desenho sem indicação explícita. A continuidade de cada carta fica no projeto do Forge (`identidade.continuidade`).

## Perfis do gerador de prompts

O Card Forge escolhe o perfil pela carta, e o autor pode trocar no campo **Perfil Artemis V2** do gerador de arte. As notas do autor continuam acima de tudo.

| Perfil | Escolhido automaticamente quando a carta é |
| --- | --- |
| `artemis_divine` | o God Artemis |
| `celestial_glory` | Equipment com subtipo Glory |
| `celestial_angel` | Devotee com subtipo Angel |
| `black_satellite` | Black Moon, Black Moon Huntress ou Black Satellite |
| `lunar_divinity` | Lunar Divinity ou Titan |
| `lunar_priestess` | Divine Vessel ou Acolyte |
| `lunar_guardian` | Lunar Guardian |
| `temple_satellite` | Satellite |
| `sacred_beast` | Sacred Beast |

Cartas fora dessa lista (Nature Spirit, Forest Guardian, técnicas, Domains, Moonplates) seguem só a identidade da facção. Assim nada já aprovado muda de cara.

Cada perfil define hierarquia, referência canônica, continuidade, paleta, materiais, silhueta, anatomia, armadura, vestuário, ornamentos, armas, símbolos, ambientes, luz, composição, restrições, elementos proibidos e grau de liberdade criativa. Os elementos proibidos entram no prompt negativo.

A identidade de Artemis no gerador (`GODS.Artemis` em `card-forge/art-prompt.js`) mudou de "natureza e poder lunar" para "autoridade lunar e caça divina": templos gregos ao luar, arquitetura lunar, céu noturno e terras de caça sagradas. A paleta passou a prata, branco lunar e ouro celeste, com o verde como acento.

O arquétipo `Angel` (`card-forge/art-taxonomy.js`) deixou de dizer "winged servant". Agora descreve um guerreiro celeste numa Glory, sem auréola, com asas só quando o desenho canônico tem.

Calisto, La Scoumoune, Theseus, Icarus, Touma, Odysseus e Ártemis passaram a contar como personagens canônicos no gerador. Para eles o prompt pede as imagens de referência.

## Personagens existentes preservados

Nenhuma arte aprovada foi trocada. Seguem como estão: 361 Calisto, 363 La Scoumoune, 365 Daphne, 367 Hermia, 371 Chandra, 373 Selene, 375 The First Moon Guardian e 377 Chloris. Calisto e La Scoumoune são a referência das Satélites canônicas.

## Pendências de direção

- **Moon Guardians 437–440:** não foram renomeados. Falta uma proposta separada para as identidades e para a narrativa dos sete guardiões.
- **Excesso de floresta:** muitas cartas de Artemis usam floresta, raízes e vegetação: Forest Guardian, Nature Spirit, Domains 428, 429 e 504, e várias técnicas. A direção futura reduz esse peso. As cartas e criaturas aprovadas não foram mexidas; revisar uma a uma, com o autor.
- **Referências canônicas das Glories:** as imagens do filme ainda não estão registradas no Armor Forge. Os três projetos estão em DRAFT (`docs/glory-equipment-system.md`).
