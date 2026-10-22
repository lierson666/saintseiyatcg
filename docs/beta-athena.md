# Athena Beta v0.1

Gauntlet oficial para testar o jogo usando apenas Athena.

## Objetivo

Esta beta existe para validar:

- estrutura de turno
- combate entre Devotees e contra o God
- timing de Technique e Moment
- uso de Cloths, Weapons e Relics
- funcionamento de Awaken e Ultimate
- keywords ativas da pool Athena
- clareza de regras antes da expansao para outras faccoes

## Estrutura da beta

- Formato: Athena vs Athena
- God oficial: `Athena, Goddess of Hope`
- Decks oficiais: `5`
- Tamanho do deck: `60`
- Proxies: permitidos

## Como abrir a versao jogavel

Na raiz do projeto:

```bash
python3 -m http.server 8000
```

Depois abra no navegador:

- `http://localhost:8000/playtest/`

O playtest e manual:

- a mesa inicia com 7 cartas para cada jogador
- voce escolhe qualquer 2 decks da gauntlet
- pode comprar cartas, mover entre zonas, virar cartas e marcar counters
- as regras nao sao automatizadas por completo; a interface funciona como mesa de teste

## Domains oficiais de Athena

### Sanctuary

Type: `Domain`

`Devotees you control get +0/+1.`

### Star Hill

Type: `Domain`

`At the beginning of your turn, generate 1 Latent Cosmo.`

### Coliseum

Type: `Domain`

`Once per game, choose target Devotee you control. It gets +1/+0 and gains Pierce until end of turn.`

## Nomes normalizados

- `Shina, Silver Saint` deve ser lido como `Shaina, Silver Saint`
- `Coliseu` e o nome interno em portugues
- `Coliseum` e o nome publico em ingles

## Decks oficiais

### 1. Seiya Aggro / Pressure / Cloth Burst

Domain fixo: `Coliseum`

Foco de validacao:

- pressao
- Long Range
- Pierce
- Cloth burst

```text
4x Seiya, Pegasus Saint
2x Marin, Silver Saint
2x Shaina, Silver Saint
4x Sanctuary Soldier
4x Sanctuary Archer
3x Cosmo Apprentice
3x Star Hill Monk

2x Aiolos, Sagittarius Gold Saint
1x Saga, Gemini Gold Saint

2x Sagittarius Cloth
1x Leo Cloth
1x Libra Cloth
1x Virgo Cloth

2x Libra Sword
1x Sagittarius Bowl

1x Staff of Athena
1x Athena Amphora
1x Pope Dagger

2x Cosmo Blessing
2x Sanctuary Guardians
2x Seal of Athena
2x Athena's Protection
1x Divine Barrier
1x Relic Blessing

2x Sanctuary Blessing
2x Rise, Saint!
2x Call the Cloth
2x Repair Cloth
2x Exile Evil
2x Return from Tartarus
2x Unfaith Purge
```

### 2. Shiryu Tank / Cloth Control / Value

Domain fixo: `Sanctuary`

Foco de validacao:

- Guardian
- tank
- Cloth damage
- repair
- value

```text
4x Shiryu, Dragon Saint
2x Marin, Silver Saint
2x Shaina, Silver Saint
4x Sanctuary Guard
4x Sanctuary Healer
3x Cloth Repairer
3x Star Hill Monk
2x Cosmo Apprentice

2x Aldebaran, Taurus Gold Saint
1x Saga, Gemini Gold Saint

2x Libra Cloth
1x Virgo Cloth
1x Sagittarius Cloth
1x Aquarius Cloth
1x Leo Cloth

1x Libra Sword
1x Libra Spear
1x Libra Tonfa
1x Libra Shield

1x Staff of Athena
1x Athena Amphora
1x Athena Seal

2x Athena's Protection
2x Divine Barrier
2x Relic Blessing
2x Shatter Faith
2x Seal of Athena

2x Repair Cloth
2x Call the Cloth
2x Sanctuary Blessing
2x Rise, Saint!
2x Return from Tartarus
```

### 3. Hyoga Control / Seal / Freeze

Domain fixo: `Star Hill`

Foco de validacao:

- Seal
- controle
- travamento progressivo

```text
4x Hyoga, Cygnus Saint
2x Marin, Silver Saint
2x Shaina, Silver Saint
4x Star Hill Monk
4x Cosmo Apprentice
3x Sanctuary Guard
3x Sanctuary Healer

2x Camus, Aquarius Gold Saint
1x Saga, Gemini Gold Saint

2x Aquarius Cloth
1x Virgo Cloth
1x Libra Cloth
1x Leo Cloth

1x Libra Tonfa
1x Libra Spear
1x Libra Shield

1x Staff of Athena
1x Athena Amphora
1x Athena Seal

3x Seal of Athena
2x Athena's Protection
2x Shatter Faith
2x Divine Barrier
2x Smite the Evil
1x Relic Blessing

2x Unfaith Purge
2x Exile Evil
2x Sanctuary Blessing
2x Call the Cloth
2x Repair Cloth
2x Return from Tartarus
```

### 4. Shun Control / Bounce / Defense

Domain fixo: `Sanctuary`

Foco de validacao:

- Nimble
- bounce
- defesa
- jogo longo

```text
4x Shun, Andromeda Saint
2x Marin, Silver Saint
2x Shaina, Silver Saint
4x Sanctuary Guard
4x Sanctuary Healer
4x Star Hill Monk
4x Cosmo Apprentice

1x Saga, Gemini Gold Saint
1x Camus, Aquarius Gold Saint
1x Aldebaran, Taurus Gold Saint

2x Virgo Cloth
1x Aquarius Cloth
1x Libra Cloth
1x Leo Cloth

1x Libra Shield
1x Libra Tonfa
1x Libra Spear

1x Staff of Athena
1x Athena Amphora
1x Athena Seal

2x Seal of Athena
2x Athena's Protection
2x Divine Barrier
2x Smite the Evil
2x Relic Blessing
2x Shatter Faith

2x Unfaith Purge
2x Return from Tartarus
2x Sanctuary Blessing
2x Call the Cloth
2x Rise, Saint!
```

### 5. Ikki Midrange / Recursion / Burst

Domain fixo: `Coliseum`

Foco de validacao:

- Tartarus
- retorno
- burst
- pressao de finalizacao

```text
4x Ikki, Phoenix Saint
2x Marin, Silver Saint
2x Shaina, Silver Saint
4x Sanctuary Archer
4x Sanctuary Soldier
3x Cosmo Apprentice
3x Star Hill Monk

1x Aiolos, Sagittarius Gold Saint
1x Saga, Gemini Gold Saint
1x Deathmask, Cancer Gold Saint

2x Leo Cloth
1x Sagittarius Cloth
1x Libra Cloth
1x Aquarius Cloth

2x Libra Sword
1x Sagittarius Bowl
1x Libra Spear

1x Staff of Athena
1x Athena Amphora
1x Pope Dagger

2x Athena's Protection
2x Seal of Athena
2x Smite the Evil
2x Divine Barrier
2x Shatter Faith

2x Rise, Saint!
2x Sanctuary Blessing
2x Call the Cloth
2x Repair Cloth
2x Return from Tartarus
2x Exile Evil
1x Unfaith Purge
```

## Proxies

Cartas `design-ready` podem entrar normalmente como proxy textual.

Cada proxy deve mostrar:

- nome em ingles
- tipo e subtipo
- custo
- Cosmoble
- stats relevantes
- texto completo
- id interno

Proxies esperados na gauntlet:

- `Athena's Protection`
- `Seal of Athena`
- `Shatter Faith`
- `Divine Barrier`
- `Relic Blessing`
- `Smite the Evil`
- `Sanctuary Blessing`
- `Exile Evil`
- `Call the Cloth`
- `Repair Cloth`
- `Return from Tartarus`
- `Sanctuary Guardians`
- `Unfaith Purge`
- `Rise, Saint!`
- `Sanctuary`
- `Star Hill`
- `Coliseum`

## Roteiro da gauntlet

Rodar o round-robin inicial com estes pairings:

1. Seiya vs Shiryu
2. Seiya vs Hyoga
3. Seiya vs Shun
4. Seiya vs Ikki
5. Shiryu vs Hyoga
6. Shiryu vs Shun
7. Shiryu vs Ikki
8. Hyoga vs Shun
9. Hyoga vs Ikki
10. Shun vs Ikki

Depois do baseline, rodar 5 partidas extras dirigidas para:

1. Mulligan e Latent Cosmo
2. Cloth damage e Repair
3. Respostas com Technique
4. Awaken e Awaken Ability
5. Ultimate e finalizacao

## Checklist de cobertura

Tipos ativos:

- God
- Domain
- Devotee
- Relic
- Technique
- Moment

Keywords ativas:

- Guardian
- Nimble
- Long Range
- Pierce
- Impulse
- Sealed
- Unfaith

Regras que precisam aparecer na beta:

- Devotee vs Devotee
- Devotee vs God
- Prepared / Unprepared
- Latent Cosmo
- Tartarus
- Void
- Legendary rule
- Evolution
- Awaken
- Awaken Ability
- Ultimate
- Cloth damage e recovery
- Relic permanecendo em campo apos a morte do portador

## Criterios de aceite

- Os 5 decks vencem ao menos 1 partida no ciclo inicial
- Todos os 3 Domains aparecem em jogo
- Pelo menos 1 partida chega em Awaken
- Pelo menos 1 Ultimate resolve
- Nenhuma interacao central depende de regra implicita fora da documentacao
- Pelo menos 1 proxy e usado sem bloquear a partida
