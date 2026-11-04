# VFX Forge V3

Expansão do gestor de animações do Star Hill (`star-hill/animacoes.js`). Não é outro aplicativo. Tudo é apresentação: nenhuma regra, custo ou atributo muda, e a Engine 3.0 continua decidindo a partida.

## O que já existia

| Parte | Onde |
| --- | --- |
| Gestor e catálogo | `star-hill/animacoes.js`, `shared/anim-picker.js` |
| Sprite Fusion e sprite sheets | `playtest/divine/pixel-vfx.js`, `playtest/divine/vendor/sprite-fusion` |
| Importação | `card-forge/vfx_import.py`, `data/vfx-catalog.json` |
| Vínculos por momento | `data/card-animations.json` (padrão → facção → carta → linha de habilidade) |
| Cena 3D | `playtest/divine/scene.js` (Three.js) |

O Pixi não estava instalado. Roda ao lado do Three.js, com canvas próprio.

## Matriz de compatibilidade

| Tecnologia | Versão | Licença | Situação | Motivo |
| --- | --- | --- | --- | --- |
| pixi.js | 8.22.0 | MIT | Instalado | `shared/vendor/pixi-fx.js`, 182 KB comprimido, junto com pixi-filters |
| pixi-filters | 6.1.5 | MIT | Instalado | Mesmo pacote |
| dotlottie-web | 0.82.1 | MIT | Instalado | `shared/vendor/dotlottie/`, 1,3 MB, só baixa quando uma camada Lottie toca |
| Theatre.js core | 0.7.2 | Apache-2.0 | Não instalado | O Composer cobre a linha do tempo com poucas linhas e a Web Animations API; dependência a mais não compensa |
| Theatre.js studio | 0.7.2 | AGPL-3.0 | Não incorporar | Licença incompatível com o produto sem análise explícita |
| Rigby2D | beta pública | MIT ou Apache-2.0 | Não instalado | Precisa de arte em camadas (PSD). As artes do jogo são planas. Sem pacote npm; MCP é instalação manual (`.mcpb`) |
| DragonBones / Animo | 5.7.4 | Runtime MIT; editor Animo AGPL-3.0 | Não instalado | Mesmo bloqueio. Exportar pelo Animo é permitido (o exportado é MIT), mas não há rig para tocar |
| Spine | 4.3 | Licença comercial | Evitar | Rigby2D exporta formato compatível, mas o runtime oficial do Spine exige licença paga |

**Decisão esquelética:** um runtime só, quando houver a primeira carta em camadas. Rigby2D é o candidato: rigging por PSD, runtime JavaScript próprio e licença permissiva. A categoria Skeletal Animation aparece no catálogo como reconhecida e sem runtime.

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `shared/vfx/presets.js` | Dados e regras puras: shaders, holográficos, presets de facção, perfis, plano de camadas |
| `shared/vfx/shader-fx.js` | Um renderer Pixi desenha tudo e copia o quadro para cada carta. Carregado sob demanda |
| `shared/vfx/card-mount.js` | Põe o efeito sobre a arte, entre a ilustração e a moldura. Sem efeito, nada é baixado |
| `shared/vfx/composer.js` | Toca composições. Nunca segura a fila do director |
| `star-hill/animacoes-composer.js` | Composer, Living Cards e holográficos no Star Hill |
| `card-forge/vfx-fields.js` | Aba Animações do Card Forge |
| `data/vfx-studio.json` | Composições, efeito por carta (id estável) e holográfico por raridade |
| `data/vfx-lottie/` | Lottie de autoria do projeto |
| `tools/build-pixi-fx.sh` | Refaz os pacotes em `shared/vendor/`, fora do repositório |

## Vínculos

- **Momentos** (`data/card-animations.json`): aceitam `shader:<id>`, `lottie:<id>` e `comp:<id>` além dos efeitos antigos. Valem para padrão, facção, carta e linha de habilidade. Quem escolhe é o seletor de sempre.
- **Carta** (`data/vfx-studio.json`, `cartas`): `idle`, `inspecao`, `holo`, `forca`, `velocidade`, `cor`.
- **Raridade** (`raridades`): só as reais do jogo. O servidor recusa raridade desconhecida.
  - Common → Common Shine; Uncommon → Rare Foil; Legendary → Mythic Cosmic; Divine → Divine Holographic.
  - Epic Prism e Alternate Art Special ficam disponíveis por carta. O jogo não tem raridade Rare, Epic ou Mythic.

## Perfis

Seguem o ajuste Graphics do jogo.

| Perfil | Quando | Cartas vivas | Composição |
| --- | --- | --- | --- |
| LOW | `phone`, `low` ou movimento reduzido | 0 (quadro parado) | Sem shader, câmera e Lottie; partículas a 40% |
| MEDIUM | `medium` | 2, a 24 fps | Um shader; partículas a 70% |
| HIGH | `high`, `ultra` | 6, a 30 fps | Dois shaders; filtros prontos do Pixi |

Abaixo de 22 fps por 4 s, desce um perfil sozinho. `prefers-reduced-motion` e o ajuste do jogo só deixam tocar áudio. `window.__divine.vfx.stats()` mostra perfil, fps e memória.

## Limites conhecidos

- **Shader não distorce a mesa.** A mesa é DOM e uma camada WebGL não lê o que está atrás dela. Water e Refraction distorcem a arte da carta; sobre a mesa viram luz somada. No Great Flood, isso cobre a aura e a água, sem distorcer de fato o cenário.
- **Great Flood:** a composição salva faz a carta avançar, a câmera aproximar, a aura e a água aparecerem, partículas e um flash passarem. As cartas afetadas não recuam individualmente: o Composer só recebe a carta do momento.
- **Peça da mesa:** o efeito soma luz, sem copiar a arte, para não desalinhar do enquadramento. Distorção só aparece na mão, na inspeção e no Card Forge.
- **Vínculo por keyword, tipo de carta e evento de interface** não existe. Hoje os vínculos são por momento, carta, facção, habilidade e raridade.
- **Áudio na composição** exige caminho de arquivo; não há seletor da biblioteca de sons.
- **Ainda sem:** Living Card esquelético. O movimento das cartas é procedural, por shader.
- **Sem testar:** Safari e iOS (o `foreignObject` com canvas tem histórico de falhas nesse navegador), aparelho real e a coleção com login.
