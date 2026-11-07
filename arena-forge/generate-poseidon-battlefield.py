#!/usr/bin/env python3
"""Original painterly ornamental decal for the Poseidon gameplay floor.
One atlas spans the whole circular platform; not a repeated low-res tile.
Keep central combat region calm. Inspired by mythic marine motifs, no external art.
"""
from PIL import Image,ImageDraw,ImageFilter
from math import sin,cos,pi,hypot
from random import Random
from pathlib import Path

N=1536;cx=cy=N/2;R=N*.46
rng=Random(62026)
out=Path(__file__).parent/'assets'/'poseidon-painterly'
out.mkdir(exist_ok=True,parents=True)

def mix(a,b,t):return tuple(int(a[k]*(1-t)+b[k]*t) for k in range(3))
im=Image.new('RGB',(N,N),(11,45,65)); pix=im.load()
for y in range(N):
 for x in range(N):
  dx=(x-cx)/(N*.5);dy=(y-cy)/(N*.5);r=hypot(dx,dy)
  p=.07*sin(dx*6.5+dy*2.1)+.05*sin(dx*14-dy*7)+.04*sin(dy*17+dx*3)
  k=max(0,min(1,.42+(1-r)*.20+p))
  pix[x,y]=mix((8,31,52),(27,83,108),k)
g=Image.new('RGBA',(N,N));dr=ImageDraw.Draw(g,'RGBA')
# directional faint marble veins: all softened and mostly around edges
for j in range(115):
 x0=rng.uniform(-N*.15,N*1.15);y0=rng.uniform(-N*.15,N*1.15)
 pts=[]
 ang=rng.uniform(-.4,.4)
 for i in range(22):
  v=i*14
  pts.append((x0+v*cos(ang),y0+v*sin(ang)+20*sin(i*.35+j*.5)))
 c=(119,176,187,rng.randint(9,31))
 dr.line(pts,fill=c,width=rng.choice([1,1,2,3]),joint='curve')
# Pigment brush hatching not everywhere; center quieter
for i in range(5600):
 x=rng.uniform(0,N);y=rng.uniform(0,N)
 r=hypot(x-cx,y-cy)/(N*.5)
 opacity=int((7+12*min(1,r))*rng.uniform(.3,1))
 length=rng.uniform(7,60)
 a=-.35+rng.uniform(-.16,.16)
 c=(115,188,197,opacity) if i%5 else (2,19,38,opacity)
 dr.line([(x,y),(x+length*cos(a),y+length*sin(a))],fill=c,width=rng.choice([1,2,2,4]))
# Gold does not enter the central visual emphasis region.
def arc_ring(radius,width,color=(216,175,103,185)):
 bbox=(cx-radius,cy-radius,cx+radius,cy+radius)
 dr.arc(bbox,0,359,fill=color,width=width)
for frac,w in [(.85,4),(.88,2),(.925,5),(.95,2)]:
 arc_ring(R*frac,w)
# Mythic ocean scrollwork at intervals around rim.
for i in range(64):
 a=2*pi*i/64
 rr=R*.90
 # miniature directional wave glyph, anchored tangent to circumference
 px=cx+rr*cos(a);py=cy+rr*sin(a)
 pts=[]
 for j in range(12):
  t=j/11
  u=(t-.5)*25
  v=4*sin(t*pi*2)*(1-t)
  pts.append((px+u*(-sin(a))+v*cos(a),py+u*cos(a)+v*sin(a)))
 dr.line(pts,fill=(212,170,99,200),width=3,joint='curve')
 # wave curling endpoint
 tx=px+13*(-sin(a));ty=py+13*cos(a)
 dr.arc((tx-6,ty-6,tx+6,ty+6),30,280,fill=(224,189,110,155),width=2)
# Four cardinal gold motif tips (subtle, near ring)
for a in [0,pi/2,pi,3*pi/2]:
 rr=R*.77;px=cx+rr*cos(a);py=cy+rr*sin(a)
 dr.ellipse((px-5,py-5,px+5,py+5),fill=(222,189,121,180))
 dr.line([(px-14,py),(px+14,py)],fill=(222,189,121,145),width=2)
outim=Image.alpha_composite(im.convert('RGBA'),g)
outim.save(out/'ceremonial-battlefield.png',optimize=True)
print(out/'ceremonial-battlefield.png', (out/'ceremonial-battlefield.png').stat().st_size)
