#!/usr/bin/env python3
"""V9 Poseidon portal relief plaque: ORIGINAL 3D bas-relief marine ornamental panel.
Self-contained GLB 2.0; one mesh + embedded PNG. Intended for paired door-side niches.
Not a final sculpted statue.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import math,random,json,struct,hashlib
out=Path(__file__).parent/'assets'/'poseidon-v9'
out.mkdir(parents=True,exist_ok=True)
png=out/'portal-relief-painted.png';glb=out/'poseidon-portal-relief.glb'
rng=random.Random(99);S=512
im=Image.new('RGB',(S,S),(187,203,201));px=im.load()
for y in range(S):
 for x in range(S):
  noise=8*math.sin(x*.018+y*.024)+6*math.sin(y*.085-x*.02)+rng.gauss(0,3.2)
  px[x,y]=(max(0,min(255,int(202+noise))),max(0,min(255,int(215+noise))),max(0,min(255,int(212+noise*.75))))
brush=ImageDraw.Draw(im,'RGBA')
for i in range(160):
 x=rng.randint(0,S);y=rng.randint(0,S);L=rng.randint(9,110)
 brush.line([(x,y),(x+L,y-L*.16)],fill=(40,97,116,rng.randint(8,45)),width=rng.choice([1,2,3]))
# Reserved miniature pigment swatch for raised ornamental geometry.
# Sculptural body samples ivory; accent polygons sample warm aged gold.
for yy in range(180,345):
 for xx in range(467,507):
  g=rng.gauss(0,7)+6*math.sin(xx*.15+yy*.035)
  px[xx,yy]=(max(0,min(255,round(207+g))),max(0,min(255,round(159+g*.72))),max(0,min(255,round(87+g*.38))))
im.save(png,optimize=True)
verts=[];norms=[];uvs=[];ids=[]
ornamental=False
def tri(a,b,c):
 ab=[b[i]-a[i] for i in range(3)];ac=[c[i]-a[i] for i in range(3)]
 n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]]
 l=math.sqrt(sum(v*v for v in n)) or 1;n=[v/l for v in n];st=len(verts)
 for v in (a,b,c):verts.append(v);norms.append(n);uvs.append((.95,.5) if ornamental else ((v[0]+1.5)/3,(v[1]+2.1)/4.2))
 ids.extend((st,st+1,st+2))
def quad(a,b,c,d):tri(a,b,c);tri(a,c,d)
def prism(w,h,d,z=0,x=0,y=0):
 w/=2;h/=2;d/=2
 p=[(x-w,y-h,z-d),(x+w,y-h,z-d),(x+w,y+h,z-d),(x-w,y+h,z-d),
    (x-w,y-h,z+d),(x+w,y-h,z+d),(x+w,y+h,z+d),(x-w,y+h,z+d)]
 for q in [(0,1,2,3),(4,7,6,5),(0,4,5,1),(3,2,6,7),(0,3,7,4),(1,5,6,2)]:
  quad(*[p[k] for k in q])
def ribbon(points,w,z=.35):
 for a,b in zip(points[:-1],points[1:]):
  dx=b[0]-a[0];dy=b[1]-a[1];l=math.hypot(dx,dy) or 1;nx=-dy*w/(2*l);ny=dx*w/(2*l)
  quad((a[0]+nx,a[1]+ny,z),(b[0]+nx,b[1]+ny,z),(b[0]-nx,b[1]-ny,z),(a[0]-nx,a[1]-ny,z))
def arc(cx,cy,r,begin,end,w,z=.35,steps=16):
 ribbon([(cx+r*math.cos(begin+(end-begin)*i/steps),cy+r*math.sin(begin+(end-begin)*i/steps)) for i in range(steps+1)],w,z)
# base stone, outer carved inset and swept maritime relief
prism(2.6,4.2,.24,-.12)
prism(2.35,3.96,.07,.04)
for w,h in [(2.40,3.99),(2.15,3.70)]:
 x=w/2;y=h/2
 ribbon([(-x,-y),(x,-y),(x,y),(-x,y),(-x,-y)],.055,.20)
ornamental=True
# stylized trident above hippocampus wave and clam shell at foot
ribbon([(0,-.15),(0,1.30)],.10,.35)
for sg in [-1,1]:
 ribbon([(0,.72),(sg*.31,.65),(sg*.53,.84),(sg*.52,1.15)],.085,.35)
 # spearhead and side flukes
 tip=(sg*.52,1.48,.35);tri((sg*.41,1.12,.35),(sg*.63,1.12,.35),tip)
tri((-.15,1.30,.35),(.15,1.30,.35),(0,1.70,.35))
# broad painted sea wave with crescent crest and curled nautilus
for k in range(3):
 y=-1.38+k*.43
 pts=[]
 for i in range(25):
  x=-.92+1.84*i/24
  pts.append((x,y+.11*math.sin((x+.92)*math.pi*2+k*.4)))
 ribbon(pts,.065,.35)
arc(.62,-.95,.29,-.85,4.3,.09,.35,20)
arc(-.47,-1.49,.24,-.8,4.2,.075,.35,18)
# fan-shell petals at the base, modest low-relief
for j in range(9):
 a=math.pi*.10+j*.10*math.pi
 ribbon([(0,-1.74),(.43*math.cos(a),-1.74+.39*math.sin(a))],.044,.26)
# flourishes in corners
for sx in (-1,1):
 for sy in (-1,1):
  arc(sx*.82,sy*1.50,.20,0,math.pi*1.5,.046,.35,13)
# glTF single mesh, embedded texture
buf=bytearray();views=[]
def put(data,target=None):
 while len(buf)%4:buf.append(0)
 off=len(buf);buf.extend(data)
 view={'buffer':0,'byteOffset':off,'byteLength':len(data)}
 if target:view['target']=target
 views.append(view);return len(views)-1
pv=put(b''.join(struct.pack('<fff',*v) for v in verts),34962)
nv=put(b''.join(struct.pack('<fff',*v) for v in norms),34962)
uv=put(b''.join(struct.pack('<ff',*v) for v in uvs),34962)
ix=put(b''.join(struct.pack('<I',k) for k in ids),34963)
image=put(png.read_bytes())
while len(buf)%4:buf.append(0)
j={'asset':{'version':'2.0','generator':'SSTCG Painterly Portal V9'},'scene':0,'scenes':[{'nodes':[0]}],
'nodes':[{'mesh':0,'name':'POS-ARC-V9-001 Marine Portal Bas Relief'}],
'meshes':[{'primitives':[{'attributes':{'POSITION':0,'NORMAL':1,'TEXCOORD_0':2},'indices':3,'material':0,'mode':4}]}],
'materials':[{'name':'Painted Marble Door Relief','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':.07,'roughnessFactor':.82},'doubleSided':True}],
'images':[{'bufferView':image,'mimeType':'image/png'}],'textures':[{'source':0}],
'buffers':[{'byteLength':len(buf)}],'bufferViews':views,
'accessors':[{'bufferView':pv,'componentType':5126,'count':len(verts),'type':'VEC3','min':[min(v[i] for v in verts) for i in range(3)],'max':[max(v[i] for v in verts) for i in range(3)]},
{'bufferView':nv,'componentType':5126,'count':len(verts),'type':'VEC3'},
{'bufferView':uv,'componentType':5126,'count':len(verts),'type':'VEC2'},
{'bufferView':ix,'componentType':5125,'count':len(ids),'type':'SCALAR'}]}
raw=json.dumps(j,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
body=struct.pack('<I4s',len(raw),b'JSON')+raw+struct.pack('<I4s',len(buf),b'BIN\x00')+buf
glb.write_bytes(b'glTF'+struct.pack('<II',2,12+len(body))+body)
manifest={'id':'POS-ARC-V9-001','name':'Poseidon Marine Portal Relief','status':'dev_preview_not_art_approved','glb':glb.name,'texture':png.name,
'triangles':len(ids)//3,'vertices':len(verts),'sha256':hashlib.sha256(glb.read_bytes()).hexdigest(),'usage':'mirrored stone plaques on either side of inner shrine portal; cinematic only','license':'original SSTCG asset'}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
