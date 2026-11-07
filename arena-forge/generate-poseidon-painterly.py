#!/usr/bin/env python3
"""SSTCG original painterly texture studies for Poseidon palace.
Non-photographic repeatable pigment and hand-directed stylized marble veins.
Deterministic artist-defined strokes; not external assets.
"""
from PIL import Image, ImageDraw, ImageFilter
from random import Random
from math import sin, cos, pi
from pathlib import Path
out=Path(__file__).parent/'assets'/'poseidon-painterly'
out.mkdir(parents=True,exist_ok=True)
S=768

def blend(a,b,t):return tuple(int(a[i]*(1-t)+b[i]*t) for i in range(3))
def stroke_wrapped(draw,pts,color,width):
    for ox in [-S,0,S]:
        for oy in [-S,0,S]:
            q=[(int(x+ox),int(y+oy)) for x,y in pts]
            draw.line(q,fill=color,width=width,joint='curve')

def generate(name,base,wash,shadow,ink,gold,seed):
    rng=Random(seed)
    # Broad brush wash (painterly directionality, nonphotographic)
    im=Image.new('RGB',(S,S),base)
    brush=Image.new('RGBA',(S,S),(0,0,0,0)); d=ImageDraw.Draw(brush,'RGBA')
    for i in range(2800):
        x=rng.uniform(0,S);y=rng.uniform(0,S)
        ang=-.34+rng.uniform(-.30,.30)
        length=rng.uniform(12,110)
        tint=wash if rng.random()>.28 else shadow
        alpha=rng.randint(5,22)
        stroke_wrapped(d,[(x-length*cos(ang)/2,y-length*sin(ang)/2),(x+length*cos(ang)/2,y+length*sin(ang)/2)],(*tint,alpha),rng.randint(2,9))
    brush=brush.filter(ImageFilter.GaussianBlur(.65))
    im=Image.alpha_composite(im.convert('RGBA'),brush)
    veins=Image.new('RGBA',(S,S),(0,0,0,0));v=ImageDraw.Draw(veins,'RGBA')
    # Large authored flowing marble veins in diagonal orientation, broken and faceted
    for j in range(24 if name!='seabed-rock' else 33):
        y=rng.uniform(-S,S)
        x=-S*.3
        pts=[]
        while x<=S*1.3:
            drift=32*sin((x+y)*.009+j*1.8)+13*sin(x*.032+j*.8)
            pts.append((x,y+x*.29+drift));x+=rng.randint(9,23)
        color=(*ink,rng.randint(25,70))
        stroke_wrapped(v,pts,color,rng.randint(1,3))
        if j%3==0: stroke_wrapped(v,[(x,y+5) for x,y in pts],(*wash,65),1)
    # Painted grain chips: not obvious pebbles or rigid grids
    for j in range(550):
        x=rng.randrange(S);y=rng.randrange(S);r=rng.choice([1,1,1,2,3])
        c=(*gold,rng.randrange(8,35)) if j%37==0 else (*shadow,rng.randrange(10,50))
        v.line([(x,y),(x+r*2,y-r//2)],fill=c,width=r)
    im=Image.alpha_composite(im,veins).convert('RGB')
    p=out/(name+'.png');im.save(p,optimize=True)
    print(p, p.stat().st_size)

generate('temple-marble',(223,230,231),(244,239,223),(146,175,189),(92,125,146),(216,176,112),101)
generate('ceremonial-ivory',(235,235,225),(249,245,237),(179,193,192),(129,157,172),(218,175,102),202)
generate('seabed-rock',(55,90,104),(112,146,150),(24,58,79),(16,53,77),(133,186,184),303)
