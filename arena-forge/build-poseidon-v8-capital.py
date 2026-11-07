#!/usr/bin/env python3
"""Poseidon V8 asset: one real 3D marine capital as glTF2 binary with painted texture.
Original sculptural study. Art approval still required.
Compatible with the SSTCG single-mesh GLB loader, instanced at runtime.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import math,random,struct,json,hashlib
root=Path(__file__).parent/'assets'/'poseidon-v8';root.mkdir(parents=True,exist_ok=True)
png=root/'marine-capital-painted.png'
glb=root/'poseidon-marine-capital.glb'
rng=random.Random(20261107)
S=512
im=Image.new('RGB',(S,S));p=im.load()
for y in range(S):
 for x in range(S):
  noise=rng.gauss(0,3)+7*math.sin(x*.045+y*.013)+6*math.sin(y*.086-x*.018)
  # Coastal marble: deep relief creases and ivory chalk brushed by cool sea.
  a=.46+.42*math.sin((x+y*.25)*.013)
  p[x,y]=(max(0,min(255,round(208+noise+16*a))),max(0,min(255,round(219+noise+12*a))),max(0,min(255,round(219+noise+11*a))))
draw=ImageDraw.Draw(im,'RGBA')
for k in range(150):
 x=rng.randrange(S);y=rng.randrange(S);length=rng.randrange(20,115)
 draw.line([(x,y),(x+length,y-length*.19)],fill=(44,109,127,rng.randrange(8,32)),width=rng.choice([1,2,3]))
for k in range(52):
 x=rng.randrange(S);y=rng.randrange(S);length=rng.randrange(7,35)
 draw.line([(x,y),(x+length*.6,y+length*.12)],fill=(202,157,82,36),width=rng.randint(1,2))
im.save(png,optimize=True)
V=[];N=[];UV=[];I=[]
def tri(a,b,c,uv=None):
 ax,ay,az=a;bx,by,bz=b;cx,cy,cz=c
 ab=[bx-ax,by-ay,bz-az];ac=[cx-ax,cy-ay,cz-az]
 nn=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]]
 ln=math.sqrt(sum(v*v for v in nn)) or 1;nn=[n/ln for n in nn];start=len(V)
 for k,q in enumerate((a,b,c)):
  V.append(q);N.append(nn)
  UV.append(uv[k] if uv else ((.5+.26*q[0])%1,(.5+.35*q[1])%1))
 I.extend((start,start+1,start+2))
def quad(a,b,c,d):
 tri(a,b,c);tri(a,c,d)
def ringstrip(y0,r0,y1,r1,count=40):
 for j in range(count):
  a=math.tau*j/count;b=math.tau*(j+1)/count
  q=lambda rad,y,t:(rad*math.cos(t),y,rad*math.sin(t))
  quad(q(r0,y0,a),q(r0,y0,b),q(r1,y1,b),q(r1,y1,a))
def leaf(k,count=16):
    # Soft flared marine acanthus leaf sculpt, no long triangular spikes.
    angle=math.tau*k/count
    def polar(r,y,a):
        return (r*math.cos(a),y,r*math.sin(a))
    # Each cross-section carries (height, radial offset, angular width).
    # Subtle lip curled outwards, top tucks back under the abacus.
    rings=[(-.91,1.00,.085),(-.72,1.10,.120),(-.51,1.21,.118),
           (-.30,1.26,.095),(-.15,1.21,.070),(-.085,1.13,.028)]
    for j in range(len(rings)-1):
        y0,r0,w0=rings[j];y1,r1,w1=rings[j+1]
        L0=polar(r0,y0,angle-w0);C0=polar(r0+.055,y0,angle);R0=polar(r0,y0,angle+w0)
        L1=polar(r1,y1,angle-w1);C1=polar(r1+.055,y1,angle);R1=polar(r1,y1,angle+w1)
        quad(L0,C0,C1,L1)
        quad(C0,R0,R1,C1)
    # Parallel incised relief in the leaf interior, used as a sculpted rib.
    for j in range(4):
        y0,r0,_=rings[j];y1,r1,_=rings[j+1]
        a=polar(r0+.062,y0,angle);b=polar(r1+.062,y1,angle)
        beam(a,b,.017,5)
    # Side turn-back at the top (small curved petal rather than a sharp point).
    y,r,w=rings[-1]
    tip=polar(r+.02,y-.03,angle)
    tri(polar(r,y-.05,angle-w),tip,polar(r,y-.05,angle+w))

def beam(a,b,width=.045,steps=6):
 dx=b[0]-a[0];dy=b[1]-a[1];dz=b[2]-a[2];l=math.sqrt(dx*dx+dy*dy+dz*dz)
 if l==0:return
 v=(dx/l,dy/l,dz/l)
 axis=(0,1,0) if abs(v[1])<.86 else (0,0,1)
 ux=v[1]*axis[2]-v[2]*axis[1];uy=v[2]*axis[0]-v[0]*axis[2];uz=v[0]*axis[1]-v[1]*axis[0]
 ul=math.sqrt(ux*ux+uy*uy+uz*uz);u=(ux/ul,uy/ul,uz/ul)
 w=(v[1]*u[2]-v[2]*u[1],v[2]*u[0]-v[0]*u[2],v[0]*u[1]-v[1]*u[0])
 rings=[]
 for center in (a,b):
  rings.append([tuple(center[j]+width*(u[j]*math.cos(t*math.tau/steps)+w[j]*math.sin(t*math.tau/steps)) for j in range(3)) for t in range(steps)])
 for j in range(steps):quad(rings[0][j],rings[0][(j+1)%steps],rings[1][(j+1)%steps],rings[1][j])
def spiral(cx,cz,a0,step=.18):
 pts=[]
 for n in range(11):
  t=n/10
  a=a0+t*math.pi*2.3
  r=(1-t)*step+.015
  pts.append((cx+r*math.cos(a),-.37+t*.17,cz+r*math.sin(a)))
 for a,b in zip(pts[:-1],pts[1:]):beam(a,b,.038)
# Three sculptural stepped ring shelves with proper varied radii and height.
for b in [(-.98,.90,-.90,1.04),(-.90,1.04,-.77,1.02),(-.77,1.02,-.69,1.10),(-.14,1.05,.00,1.16),(.00,1.16,.12,1.05)]:
 ringstrip(*b)
for k in range(16):leaf(k)
# Nautilus crest at cardinal axes, visibly projecting from the surface.
for k in range(8):
 a=math.tau*k/8
 spiral(1.20*math.cos(a),1.20*math.sin(a),a)
# Vertical carved riblets linking first and second gallery.
for k in range(32):
 a=math.tau*k/32;r=1.06
 beam((r*math.cos(a),-.72,r*math.sin(a)),(1.13*math.cos(a),-.19,1.13*math.sin(a)),.020,5)
# beaded dentil edging below upper ring
for k in range(40):
 a=math.tau*k/40
 beam((1.08*math.cos(a),-.16,1.08*math.sin(a)),(1.14*math.cos(a),-.12,1.14*math.sin(a)),.045,6)
assert len(I)%3==0
payload=bytearray();views=[]
def save(b,target=None):
 while len(payload)%4:payload.append(0)
 o=len(payload);payload.extend(b);x={'buffer':0,'byteOffset':o,'byteLength':len(b)}
 if target:x['target']=target
 views.append(x);return len(views)-1
v=save(b''.join(struct.pack('<fff',*a) for a in V),34962)
n=save(b''.join(struct.pack('<fff',*a) for a in N),34962)
uv=save(b''.join(struct.pack('<ff',*a) for a in UV),34962)
ix=save(b''.join(struct.pack('<I',x) for x in I),34963)
tx=save(png.read_bytes())
while len(payload)%4:payload.append(0)
js={'asset':{'version':'2.0','generator':'SSTCG Arena Forge V8 Capital Sculpt'},
'scene':0,'scenes':[{'nodes':[0]}],
'nodes':[{'name':'POS-ARC-V8-001 Marine Capital','mesh':0}],
'meshes':[{'name':'Poseidon Hand-Painted Marine Capital','primitives':[{'attributes':{'POSITION':0,'NORMAL':1,'TEXCOORD_0':2},'indices':3,'mode':4,'material':0}]}],
'materials':[{'name':'Pale Aquatic Sculpted Ivory','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':.06,'roughnessFactor':.73},'doubleSided':True}],
'images':[{'mimeType':'image/png','bufferView':tx}], 'textures':[{'source':0}],'samplers':[{'wrapS':10497,'wrapT':10497}],
'buffers':[{'byteLength':len(payload)}],'bufferViews':views,'accessors':[
{'bufferView':v,'componentType':5126,'count':len(V),'type':'VEC3','min':[min(p[i] for p in V) for i in range(3)],'max':[max(p[i] for p in V) for i in range(3)]},
{'bufferView':n,'componentType':5126,'count':len(N),'type':'VEC3'},
{'bufferView':uv,'componentType':5126,'count':len(UV),'type':'VEC2'},
{'bufferView':ix,'componentType':5125,'count':len(I),'type':'SCALAR'}]}
jsonb=json.dumps(js,separators=(',',':')).encode();jsonb+=b' '*((-len(jsonb))%4)
body=struct.pack('<I4s',len(jsonb),b'JSON')+jsonb+struct.pack('<I4s',len(payload),b'BIN\x00')+payload
glb.write_bytes(b'glTF'+struct.pack('<II',2,12+len(body))+body)
manifest={'schema':1,'asset_id':'POS-ARC-V8-001','name':'Poseidon Marine Capital','status':'development_not_art_approved','glb':glb.name,'texture':png.name,'triangles':len(I)//3,'vertices':len(V),'sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'use':'cinematic and palace background, instanced across 18 colonnade positions','license':'original SSTCG study'}
(root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
