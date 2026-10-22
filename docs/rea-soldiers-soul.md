# REA — Os Cavaleiros do Zodíaco: Alma dos Soldados (PS3, LatAm)

Referência visual para o Saint Seiya TCG. Nenhum asset do jogo entra neste repositório: as texturas
extraídas ficam fora do projeto e servem só para estudo de estilo.

## O que é o arquivo

- `MOBILE GAMES/…Alma dos Soldados (Latin America) (En,Fr,Es,Pt).zip` → ISO de PS3 (7,4 GB, volume `PS3VOLUME`).
- A ISO monta no macOS (`hdiutil attach -readonly`) e os arquivos do jogo estão legíveis.
- Engine da Dimps (mesma família de Dragon Ball Xenoverse), build de 10/08/2015. Middleware CRI (CPK, ACB/AWB, USM).

## Estrutura de `PS3_GAME/USRDIR`

| Arquivo | Tamanho | Conteúdo |
|---|---|---|
| `resource.cpk` | 1,9 GB | 6.172 arquivos: personagens, cenários, VFX, textos, cutscenes em engine |
| `localize.cpk` | 2,6 GB | 3.344 arquivos: UI por idioma (`ui/BR`, `EN`, `FR`, `JP`, `NS`) e vozes |
| `resource.h` | 1,3 MB | índice C de todo o `resource.cpk` (ID → caminho) |
| `resource/movie/*.usm` | 2,5 GB | 4 vídeos CRI (abertura e episódios) |
| `archive/adam_shader/*.emz` | — | shaders da engine ("Adam") |
| `EBOOT.BIN` | 36 MB | executável (SELF assinado) |

## Formatos

| Extensão | Qtd | O que é |
|---|---|---|
| `.emo` | 870 | malha 3D |
| `.emm` | 896 | materiais |
| `.emb` | 1.218 + 400 | pacote de texturas; dentro, GTF do PS3 (quase tudo DXT5, algumas DXT1 e ARGB) |
| `.ema` | 3.034 | animações: corpo, câmera (`.cam`), cutscenes (`.demNN`), golpe especial (`.bba`), menu (`.menu`), rosto (`.fce`) |
| `.amk` | 998 | sincronização de voz e lábio |
| `.acb/.awb` | 1.699 / 1.161 | áudio CRI (HCA): vozes, BGM, SE |
| `.ems` | 81 | layout de tela da UI |
| `.rtt` | 206 | rótulos de batalha e luta (`BTL_<arco>_<luta>_<round>_<char>`) |
| `.2ry`, `.fcm/.fdm/.fma`, `.cmb` | — | física de capa e cabelo, expressões faciais, combos |

Os personagens usam um código de 3 letras: `SEY` Seiya, `SGA` Saga, `ALB` Alberich, `HGN` Hagen, `DTH` Máscara da Morte, `SHK` Shaka e assim por diante. São 113 pastas em `resource/chara/`.

Cada personagem tem cerca de 60 arquivos: modelo base mais variantes `_00/_03/_07` (armaduras), `BOSS`, `MENU`, câmeras e animações de cutscene. As vozes ficam em `BT_` (batalha), `CHSL_` (seleção de personagem) e `MENU_`.

A dublagem brasileira está completa: 836 arquivos em `localize.cpk:resource/sound/BR/`.

## Achados de estilo (o que vale copiar como técnica)

1. **Toon shading com rampa 1D.** Cada material usa uma textura de cor base chapada (cores lisas, sem pintura de luz) e uma faixa de rampa de 3 tons (sombra, meio-tom, luz) por material: pele, cabelo, roupa.
   - No Three.js, o equivalente é `MeshToonMaterial` com `gradientMap` de 3 pixels por material.
2. **Matcap para o brilho das armaduras.** As armaduras usam esferas de reflexo (sphere map) com anel escuro e borda estourada: dourado (Ouro), azul (Bronze/Pégaso), prata, vermelho.
   - É isso que dá o "brilho de anime" no metal sem iluminação real.
   - No Three.js: `MeshMatcapMaterial`, ou um matcap somado ao toon.
3. **Normal map leve** só nos relevos da armadura (`_04`); olhos em texturas separadas, para trocar expressão.
4. **UI:**
   - **Fundos:** escuros com molduras em arabescos dourado-bronze (`gauge.png`).
   - **Acentos:** flares de luz branca e dourada (`menu_JP/MENU_eff`, `cha_sel/plt03`).
   - **Seleção:** botões em faixas com fade lateral.
   - **Retratos de batalha:** quadrados, com fundo de cor por personagem (cerca de 190 ícones).
   - **Cores dos jogadores:** J1 a J8 com cor própria; os números são dourados com contorno.
5. **Feedback de combate:**
   - **Textos grandes:** "K.O.", "Combo!", "Sucesso!" em letreiro gradiente amarelo-vermelho com contorno grosso.
   - **Barras de vida:** finas, ornamentadas, e a barra de boss é separada (`gauge_BOSS_PLT`).

## Ferramentas (em `tools/rea-ps3/`)

Escritas para este REA, só com Python e Pillow:

```bash
python3 -I tools/rea-ps3/cpk.py list <arquivo.cpk> <saida.tsv>
python3 -I tools/rea-ps3/cpk.py extract <arquivo.cpk> <pasta> 'resource/ui/*'
uv run --no-project --with pillow python -I tools/rea-ps3/emb2png.py <pasta_emb> <pasta_png>
uv run --no-project --with pillow python -I tools/rea-ps3/sheet.py <prancha.png> <pasta_png>...
```

- `cpk.py`: lê o TOC `@UTF` e descomprime CRILAYLA.
- `emb2png.py`: converte GTF DXT1/3/5 e A8R8G8B8 em PNG. Em 3.275 texturas convertidas, 19 falharam por estarem num formato raro.

## Não feito / limites

- **Modelos 3D (`.emo`) e animações (`.ema`):** não convertidos. As ferramentas de Xenoverse que existem esperam PC little-endian e não PS3 big-endian.
- **Áudio (ACB/AWB → HCA):** não decodificado. Para isso precisa do `vgmstream`.
- **Vídeos `.usm`:** não demuxados.
- **Direitos autorais:** tudo é propriedade da Bandai Namco e da Toei. Use só como referência de técnica e estilo; não coloque arte, voz ou modelo deles no TCG.
