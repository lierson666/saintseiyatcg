#!/usr/bin/env python3
"""Meteoro de Pégaso: três versões em pixel art, no estilo dos efeitos Sprite Fusion do jogo.

Desenho próprio, sem sprite de outro jogo. Gera os quadros (PNG numerados) de cada versão numa pasta; quem põe no banco
é card-forge/vfx_import.py. Só apresentação: não liga a carta nem a momento.

Quadro de 45 x 40: na mesa de 1280 x 720 o jogo desenha 1 pixel de arte = 3 px de tela e o sheet ocupa 1,35 x a altura
da carta, então 45 px de arte cobrem a carta em campo (cerca de 115 x 100 px) sem reescala.

Uso: python3 tools/vfx-meteoro-pegaso.py <pasta vazia>  →  <pasta>/{rajada,constelacao,cometa}/f000.png ...
"""
import math
import random
import sys
from pathlib import Path

from PIL import Image

W, H = 45, 40
QUADROS = 16  # 16 quadros a 20 fps = 0,8 s
CX, CY = W // 2, H // 2 - 2  # o golpe pega um pouco acima do meio da carta, no peito

# Rampa do mais apagado ao mais forte. Cada pixel guarda o nível mais alto que passou por ele: sobreposição soma brilho,
# como luz, sem misturar cores fora da paleta.
MAIN, SEC = (0x00, 0x8c, 0xb4), (0x94, 0xe3, 0xfe)
PALETA = [None,
          (*MAIN, 90),        # 1 halo externo
          (*MAIN, 170),       # 2 halo
          (0x00, 0x5e, 0x80, 255),  # 3 sombra sólida do feixe
          (*MAIN, 255),       # 4 cor principal
          (*SEC, 255),        # 5 cor secundária
          (0xe2, 0xf9, 0xff, 255),  # 6 quase branco
          (255, 255, 255, 255)]     # 7 núcleo


class Quadro:
    def __init__(self):
        self.px = [[0] * W for _ in range(H)]

    def put(self, x, y, n):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < H and n > self.px[y][x]:
            self.px[y][x] = n

    def halo(self, x, y, forte=False):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            self.put(x + dx, y + dy, 2)
        if forte:
            for dx, dy in ((1, 1), (-1, 1), (1, -1), (-1, -1), (2, 0), (-2, 0), (0, 2), (0, -2)):
                self.put(x + dx, y + dy, 1)

    def image(self):
        img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        for y, row in enumerate(self.px):
            for x, n in enumerate(row):
                if n:
                    img.putpixel((x, y), PALETA[n])
        return img


def linha(x0, y0, x1, y1):
    n = max(1, int(max(abs(x1 - x0), abs(y1 - y0))))
    return [(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n) for i in range(n + 1)]


def feixe(q, origem, alvo, t, cauda=10, grosso=False, apaga=0):
    """Meteoro a caminho do alvo: t de 0 (saindo da borda) a 1 (no alvo). A cauda esfria do branco ao azul escuro.
    Borda escura dos dois lados: o feixe precisa ler em cima de arte clara e azul. `apaga`: rastro depois do impacto."""
    ox, oy = origem
    ax, ay = alvo
    hx, hy = ox + (ax - ox) * t, oy + (ay - oy) * t
    d = math.hypot(ax - ox, ay - oy) or 1
    ux, uy = (ox - ax) / d, (oy - ay) / d  # aponta para trás
    nx, ny = -uy, ux  # lado
    cauda = cauda * (1 - .35 * apaga)
    pontos = linha(hx, hy, hx + ux * cauda, hy + uy * cauda)
    for i, (x, y) in enumerate(pontos):
        k = i / max(1, len(pontos) - 1)
        n = 7 if k < .15 else 6 if k < .35 else 5 if k < .6 else 4 if k < .85 else 3
        n -= 2 * apaga
        if n < 3:
            continue
        q.put(x, y, n)
        if grosso and k < .6:
            q.put(x + nx, y + ny, n - 1); q.put(x - nx, y - ny, n - 1)
            q.put(x + 2 * nx, y + 2 * ny, 3); q.put(x - 2 * nx, y - 2 * ny, 3)
        elif k < .7:
            q.put(x + nx, y + ny, 3); q.put(x - nx, y - ny, 3)
        if k < .2 and not apaga:
            q.halo(x, y, forte=grosso)
    if not apaga:
        q.halo(hx, hy, forte=True)


def estrela(q, x, y, idade, grande=False):
    """Impacto em quatro tempos: cruz branca, cruz longa com diagonais, anel aberto, brasa."""
    r = 2 if grande else 1
    if grande and idade <= 1:  # núcleo cheio: o golpe final tem que pesar mais que os outros
        for dx in range(-2, 3):
            for dy in range(-2, 3):
                if abs(dx) + abs(dy) <= 3 - idade:
                    q.put(x + dx, y + dy, 7 if abs(dx) + abs(dy) <= 1 + (1 - idade) else 6)
        for i in range(3, 10 - idade * 2):  # raios longos em cruz
            n = 6 if i < 6 else 5 if i < 8 else 4
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q.put(x + dx * i, y + dy * i, n)
    if idade == 0:
        for i in range(-2 - r, 3 + r):
            q.put(x + i, y, 7 if abs(i) <= r else 5)
            q.put(x, y + i, 7 if abs(i) <= r else 5)
        for d in (1, -1):
            q.put(x + d, y + d, 6); q.put(x - d, y + d, 6)
        q.halo(x, y, forte=True)
        for i in range(-3 - r, 4 + r):
            q.put(x + i, y + 1, 2); q.put(x + i, y - 1, 2); q.put(x + 1, y + i, 2); q.put(x - 1, y + i, 2)
    elif idade == 1:
        q.put(x, y, 7)
        for i in range(1, 5 + r * 2):
            n = 6 if i < 3 else 5 if i < 5 else 4
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                q.put(x + dx * i, y + dy * i, n)
        for i in range(1, 3 + r):
            for dx, dy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
                q.put(x + dx * i, y + dy * i, 4 if i > 1 else 5)
        q.halo(x, y)
    elif idade == 2:
        rr = 4 + r * 2
        for a in range(0, 360, 30):
            q.put(x + math.cos(math.radians(a)) * rr, y + math.sin(math.radians(a)) * rr, 5 if a % 90 == 0 else 4)
        q.put(x, y, 5)
    elif idade == 3:
        q.put(x, y, 4)
        for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2)):
            q.put(x + dx, y + dy, 3)


class Faiscas:
    """O que sobra: faíscas que saem dos impactos, caem devagar e piscam antes de apagar."""
    def __init__(self, rnd):
        self.rnd, self.vivas = rnd, []

    def solta(self, x, y, n, forca=1.0):
        for _ in range(n):
            a = self.rnd.uniform(0, math.tau)
            v = self.rnd.uniform(.8, 2.2) * forca
            self.vivas.append([x, y, math.cos(a) * v, math.sin(a) * v - .6, self.rnd.randint(4, 8)])

    def passo(self, q):
        for f in self.vivas:
            x, y, vx, vy, vida = f
            n = 6 if vida > 5 else 5 if vida > 3 else 4 if vida > 1 else 3
            if vida <= 2 and int(x * 7 + y) % 2:  # pisca antes de sumir
                n = 0
            if n:
                q.put(x, y, n)
                if vida > 5:
                    q.put(x - vx * .5, y - vy * .5, 3)
            f[0] += vx; f[1] += vy; f[2] *= .82; f[3] = vy * .82 + .25; f[4] -= 1
        self.vivas = [f for f in self.vivas if f[4] > 0]


def origem_baixo(rnd, alvo):
    """De onde vem o soco: de baixo, da carta de quem ataca, abrindo em leque."""
    ax, _ = alvo
    return (CX + (ax - CX) * 2.4 + rnd.uniform(-6, 6), H + rnd.uniform(4, 10))


def rajada():
    """A: muitos meteoros em sequência, de dois em dois, cada um com sua estrela; faíscas no fim."""
    rnd = random.Random(1987)
    golpes = []
    for i in range(15):
        alvo = (CX + rnd.choice([-1, 1]) * rnd.uniform(1, 13), CY + rnd.uniform(-11, 9))
        golpes.append({'parte': i * .58, 'alvo': alvo, 'de': origem_baixo(rnd, alvo), 'cauda': rnd.randint(13, 19)})
    fa, quadros = Faiscas(rnd), []
    for f in range(QUADROS):
        q = Quadro()
        for g in golpes:
            idade = f - g['parte']
            if 0 <= idade < 2:
                feixe(q, g['de'], g['alvo'], min(1, .3 + .7 * idade / 1.5), cauda=g['cauda'])
            hit = f - math.ceil(g['parte'] + 2)
            if hit in (0, 1):
                feixe(q, g['de'], g['alvo'], 1, cauda=g['cauda'], apaga=hit + 1)
            if 0 <= hit <= 3:
                ax, ay = map(round, g['alvo'])
                estrela(q, ax, ay, hit)
                if hit == 0:
                    fa.solta(ax, ay, 2)
        fa.passo(q)
        quadros.append(q)
    return quadros


# Pontos de uma constelação estilizada (desenho próprio): um quadrado e uma asa, como a figura do céu.
CONSTELACAO = [(-10, -3), (-2, -5), (-1, 4), (-10, 5), (5, -8), (11, -12), (7, 1), (14, 3), (-15, -9), (-17, 10)]
LIGACOES = [(0, 1), (1, 2), (2, 3), (3, 0), (1, 4), (4, 5), (2, 6), (6, 7), (0, 8), (3, 9)]


def constelacao():
    """B: as estrelas acendem na carta, cada uma leva um meteoro no ritmo e a figura inteira brilha no fim."""
    rnd = random.Random(1986)
    pts = [(CX + x, CY + y) for x, y in CONSTELACAO]
    fa, quadros = Faiscas(rnd), []
    ordem = [8, 0, 3, 9, 1, 2, 4, 6, 5, 7]
    chegada = {p: 2 + i * .85 for i, p in enumerate(ordem)}
    de = {p: origem_baixo(rnd, pts[p]) for p in ordem}
    for f in range(QUADROS):
        q = Quadro()
        for i, (x, y) in enumerate(pts):
            if f >= i * .25 and f < chegada[i]:  # estrela esperando o golpe: pisca
                q.put(x, y, 6 if (f + i) % 2 else 5)
                q.halo(x, y)
            t0 = chegada[i] - 1.4
            if t0 <= f < chegada[i]:
                feixe(q, de[i], (x, y), (f - t0) / 1.4 + .3, cauda=11)
            hit = f - math.ceil(chegada[i])
            if 0 <= hit <= 3:
                estrela(q, x, y, hit)
                if hit == 0:
                    fa.solta(x, y, 2, .8)
            if f >= chegada[i] + 3:
                q.put(x, y, 5 if f < 13 else 4)
        if 11 <= f <= 13:  # a figura liga: as linhas acendem do branco ao azul
            n = {11: 6, 12: 5, 13: 3}[f]
            for a, b in LIGACOES:
                for x, y in linha(*pts[a], *pts[b]):
                    q.put(x, y, n)
                    if f == 11:
                        q.put(x, y - 1, 2); q.put(x, y + 1, 2)
            if f == 11:
                for x, y in pts:
                    q.halo(x, y, forte=True)
        if f == 12:
            for x, y in pts:
                fa.solta(x, y, 1, .6)
        fa.passo(q)
        quadros.append(q)
    return quadros


def cometa():
    """C: centenas de feixes finos, cada vez mais densos, e um meteoro grande que fecha no peito com onda de choque."""
    rnd = random.Random(1972)
    fa, quadros = Faiscas(rnd), []
    for f in range(QUADROS):
        q = Quadro()
        if f < 10:  # cada quadro: feixes de um quadro só, que cruzam a carta inteira (linhas de velocidade)
            for _ in range(2 + f // 2):
                alvo = (CX + rnd.uniform(-15, 15), CY + rnd.uniform(-12, 10))
                o = origem_baixo(rnd, alvo)
                feixe(q, o, alvo, rnd.uniform(.75, 1), cauda=rnd.randint(16, 26))
                if rnd.random() < .5:
                    estrela(q, round(alvo[0]), round(alvo[1]), 1 if f % 2 else 3)
        if 7 <= f < 10:  # o grande, vindo do meio
            feixe(q, (CX - 6, H + 10), (CX, CY), (f - 7) / 3 + .34, cauda=20, grosso=True)
        hit = f - 10
        if 0 <= hit <= 3:
            estrela(q, CX, CY, hit, grande=True)
        if 1 <= hit <= 4:  # onda de choque: anel que abre e se desfaz em pontos
            rr = 4 + hit * 4
            for a in range(0, 360, 8 if hit < 3 else 16):
                x, y = CX + math.cos(math.radians(a)) * rr, CY + math.sin(math.radians(a)) * rr * .8
                q.put(x, y, 7 - hit)
                if hit < 3:
                    q.put(x + math.cos(math.radians(a)), y + math.sin(math.radians(a)) * .8, 3)
        if hit == 0:
            fa.solta(CX, CY, 12, 1.4)
        fa.passo(q)
        quadros.append(q)
    return quadros


VERSOES = {'rajada': rajada, 'constelacao': constelacao, 'cometa': cometa}

if __name__ == '__main__':
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    out = Path(sys.argv[1])
    for nome, fazer in VERSOES.items():
        pasta = out / nome
        pasta.mkdir(parents=True, exist_ok=True)
        for i, q in enumerate(fazer()):
            q.image().save(pasta / f'f{i:03d}.png')
        print(pasta)
