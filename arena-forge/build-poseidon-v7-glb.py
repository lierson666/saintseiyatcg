#!/usr/bin/env python3
"""Author an original Poseidon sacred trident 3D asset in valid binary glTF 2.0.
Only Python stdlib + Pillow for texture. All geometry is generated and baked.
Delivers a reproducible first model in the Arena Forge V7 pipeline.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import math,random,json,struct,hashlib
HERE=Path(__file__).resolve().parent
OUT=HERE/'assets'/'poseidon-v7';OUT.mkdir(parents=True,exist_ok=True)
TEX=OUT/'sacred-trident-painted.png'
GLB=OUT/'poseidon-sacred-trident.glb'
rng=random.Random(2707)
S=512
im=Image.new('RGB',(S,S),(183,133,64))
pix=im.load()
for y in range(S):
 for x in range(S):
  grain=math.sin(x*.052+y*.015)*7+math.sin(x*.013-y*.07)*5
  rough=rng.gauss(0,6)
  pat=9*math.sin(x*.13+y*.04)*math.sin(y*.07)
  t=grain+rough+pat
  pix[x,y]=(max(0,min(255,int(191+t))),max(0,min(255,int(144+t*.75))),max(0,min(255,int(77+t*.48))))
draw=ImageDraw.Draw(im,'RGBA')
for i in range(140):
 x=rng.randint(0,S);y=rng.randint(0,S);l=rng.randint(15,94)
 draw.line((x,y,x+l*.8,y+l*.15),fill=(56,83,80,rng.randint(10,45)),width=rng.choice([1,2,3]))
for i in range(85):
 x=rng.randint(0,S);y=rng.randint(0,S)
 draw.arc((x-9,y-4,x+9,y+4),rng.randint(0,90),rng.randint(140,300),fill=(255,226,164,40),width=2)
im.save(TEX,optimize=True)
# Write a single mesh with painted texture and 3D volume.
vertices=[];normals=[];uvs=[];indices=[]
def vert(p,normal,uv):
 vertices.append(tuple(p));normals.append(tuple(normal));uvs.append(tuple(uv));return len(vertices)-1
def triangle(a,b,c,uvbase=.5):
 ax,ay,az=a;bx,by,bz=b;cx,cy,cz=c
 u=(bx-ax,by-ay,bz-az);v=(cx-ax,cy-ay,cz-az)
 n=(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])
 l=math.sqrt(sum(e*e for e in n)) or 1;n=tuple(e/l for e in n)
 start=len(vertices)
 for p,uv in [(a,(.15,uvbase)),(b,(.55,uvbase)),(c,(.4,min(.98,uvbase+.25)))]:
  vert(p,n,uv)
 indices.extend([start,start+1,start+2])
def quad(a,b,c,d):
 triangle(a,b,c);triangle(a,c,d)
def beam(a,b,r1,r2=None,sides=10):
 if r2 is None:r2=r1
 dx=b[0]-a[0];dy=b[1]-a[1];dz=b[2]-a[2]
 ln=math.sqrt(dx*dx+dy*dy+dz*dz)
 if ln<1e-8:return
 e=(dx/ln,dy/ln,dz/ln)
 axis=(0,0,1) if abs(e[2])<.85 else (0,1,0)
 ux=e[1]*axis[2]-e[2]*axis[1];uy=e[2]*axis[0]-e[0]*axis[2];uz=e[0]*axis[1]-e[1]*axis[0]
 uln=math.sqrt(ux*ux+uy*uy+uz*uz);u=(ux/uln,uy/uln,uz/uln)
 v=(e[1]*u[2]-e[2]*u[1],e[2]*u[0]-e[0]*u[2],e[0]*u[1]-e[1]*u[0])
 rings=[]
 for center,r in [(a,r1),(b,r2)]:
  rings.append([tuple(center[j]+r*(u[j]*math.cos(i*2*math.pi/sides)+v[j]*math.sin(i*2*math.pi/sides)) for j in range(3)) for i in range(sides)])
 for i in range(sides):
  k=(i+1)%sides;quad(rings[0][i],rings[0][k],rings[1][k],rings[1][i])
 # end caps
 for i in range(1,sides-1):
  triangle(rings[0][0],rings[0][i+1],rings[0][i])
  triangle(rings[1][0],rings[1][i],rings[1][i+1])
def route(points,radius,sides=10):
 for i in range(len(points)-1):beam(points[i],points[i+1],radius,sides=sides)
def tip(x,y,z,rx=.17,height=.5):
 r=rx
 ring=[(x+r*math.cos(k*math.pi/4),y,z+r*math.sin(k*math.pi/4)) for k in range(8)]
 for i in range(8):triangle(ring[i],ring[(i+1)%8],(x,y+height,z))
def gem(cx,cy,cz,r=.13):
 top=(cx,cy+r*1.3,cz);bottom=(cx,cy-r,cz)
 around=[(cx+r*math.cos(k*math.pi/4),cy,cz+r*math.sin(k*math.pi/4)) for k in range(8)]
 for i in range(8):
  triangle(top,around[i],around[(i+1)%8])
  triangle(bottom,around[(i+1)%8],around[i])
# Sacred trident: physical tapered spear with ornate fork curvature.
beam((0,-1.7,0),(0,1.42,0),.105,sides=12)
beam((0,-1.75,0),(0,-1.4,0),.16,sides=12)
beam((0,-.68,0),(0,-.42,0),.18,sides=12)
beam((0,.50,0),(0,.70,0),.145,sides=12)
# Fork arms across x, with bends then long vertical prongs
for sign in [-1,1]:
 pts=[(0,.85,0),(sign*.32,.72,0),(sign*.66,.86,0),(sign*.87,1.10,0),(sign*.88,1.55,0)]
 route(pts,.085,10)
 tip(sign*.88,1.53,0,.13,.44)
 beam((sign*.64,.18,0),(sign*.73,.36,0),.11,sides=8)
 beam((sign*.73,.36,0),(sign*.60,.54,0),.07,sides=8)
# Central long and raised spike
beam((0,1.4,0),(0,1.68,0),.11,.085,10)
tip(0,1.65,0,.18,.55)
# Sacred center: elongated gold boss and ornamental spiraling collars
gem(0,.56,.06,.18)
for sign in [-1,1]:
 gem(sign*.37,.78,.08,.09)
 route([(sign*.09,-.32,.025),(sign*.21,-.21,.04),(sign*.24,-.09,.04),(sign*.13,-.005,.04)],.036,8)
# Engraved double braided handle (real geometric helices)
for sign in [-1,1]:
 pts=[(sign*.10*math.cos(i*.29),-1.27+i*.055,.10*math.sin(i*.29)) for i in range(23)]
 route(pts,.023,6)
# More robust local 3D extent, fine sculptural gold metal work
assert len(vertices)>1000
# buffer = position, normal, uv, index, image. glTF stored embedded in GLB.
blob=bytearray();views=[]
def store(data,target=None):
 while len(blob)%4:blob.append(0)
 off=len(blob);blob.extend(data);v={'buffer':0,'byteOffset':off,'byteLength':len(data)}
 if target:v['target']=target
 views.append(v);return len(views)-1
pos=store(b''.join(struct.pack('<fff',*p) for p in vertices),34962)
norm=store(b''.join(struct.pack('<fff',*p) for p in normals),34962)
uv=store(b''.join(struct.pack('<ff',*p) for p in uvs),34962)
ix=store(b''.join(struct.pack('<I',i) for i in indices),34963)
png=TEX.read_bytes();texidx=store(png)
a_min=[min(p[i] for p in vertices) for i in range(3)]
a_max=[max(p[i] for p in vertices) for i in range(3)]
gltf={'asset':{'version':'2.0','generator':'SSTCG Poseidon V7 Original Sculpt Pipeline'},
 'scene':0,'scenes':[{'nodes':[0]}],
 'nodes':[{'mesh':0,'name':'Sacred Trident of Poseidon'}],
 'meshes':[{'name':'POS-MON-V7-001 Sacred Trident','primitives':[{'attributes':{'POSITION':0,'NORMAL':1,'TEXCOORD_0':2},'indices':3,'material':0,'mode':4}]}],
 'materials':[{'name':'Poseidon Painterly Ancient Gold','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':.60,'roughnessFactor':.39},'doubleSided':True}],
 'textures':[{'source':0}],'samplers':[{'wrapS':10497,'wrapT':10497}],
 'images':[{'bufferView':texidx,'mimeType':'image/png'}],
 'buffers':[{'byteLength':0}],'bufferViews':views,
 'accessors':[{'bufferView':pos,'componentType':5126,'count':len(vertices),'type':'VEC3','min':a_min,'max':a_max},
              {'bufferView':norm,'componentType':5126,'count':len(vertices),'type':'VEC3'},
              {'bufferView':uv,'componentType':5126,'count':len(vertices),'type':'VEC2'},
              {'bufferView':ix,'componentType':5125,'count':len(indices),'type':'SCALAR'}]}
while len(blob)%4:blob.append(0)
gltf['buffers'][0]['byteLength']=len(blob)
j=json.dumps(gltf,separators=(',',':')).encode()
j+=b' ' * ((4-len(j)%4)%4)
body=struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(blob),b'BIN\x00')+blob
GLB.write_bytes(b'glTF'+struct.pack('<II',2,12+len(body))+body)
manifest={'asset_id':'POS-MON-V7-001','name':'Poseidon Sacred Trident','glb':GLB.name,'texture':TEX.name,
 'model_type':'original procedural sculpt study','status':'preview_not_approved',
 'vertices':len(vertices),'triangles':len(indices)//3,'sha256':hashlib.sha256(GLB.read_bytes()).hexdigest(),
 'dimensions':[round(a_max[i]-a_min[i],3) for i in range(3)],
 'usage':'Cinematic temple interior; never cover battlefield; original V6 as fallback',
 'license':'original SSTCG geometry and paint','schema':1}
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
