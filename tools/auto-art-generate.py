#!/usr/bin/env python3
"""SSTCG image generator bridge. DISABLED until explicitly configured.

Uses already-rendered per-card prompt from Card Forge. Creates candidate art in
private local staging; auto-placement into faction Drive only with explicit opt-in.
Requires separate OpenAI API billing (ChatGPT subscription does not include it).
"""
from __future__ import annotations
import argparse
import base64
import datetime as dt
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import urllib.error
import urllib.request

from PIL import Image, ImageStat

ROOT=Path(__file__).resolve().parent.parent
BATCH=ROOT/'card-forge/out/art-production-2026-11-06'
CONFIG=Path.home()/'.config/sstcg/auto-art.json'
QUEUE=BATCH/'queue.json'
STATE=BATCH/'auto-art-generation-state.json'
STAGING=BATCH/'candidates'
DRIVE=Path.home()/'Library/CloudStorage/GoogleDrive-limattenhauer@gmail.com/Meu Drive/Lierson Jr/SAINT SEIYA TCG/ARTS'
FAC={'Athena':'ATHENA','Hades':'HADES','Poseidon':'POSEIDON','Ares':'ARES','Artemis':'ARTEMIS','Neutral':'NEUTRAL'}
DEFAULT={'enabled':False,'provider':'openai','model':'gpt-image-2.5-flare',
         'key_file':str(Path.home()/'.config/sstcg/openai-api-key'),
         'max_calls_per_day':4,'max_calls_total':20,
         'auto_install_generic':False,'quality':'medium'}
def utc():return dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
def write_json(p,obj):
 p.parent.mkdir(parents=True,exist_ok=True)
 fd,tmp=tempfile.mkstemp(dir=p.parent,prefix='.'+p.name)
 try:
  with os.fdopen(fd,'w') as f: json.dump(obj,f,ensure_ascii=False,indent=2);f.write('\n')
  os.replace(tmp,p)
 finally:
  if os.path.exists(tmp):os.unlink(tmp)
def conf():
 if not CONFIG.exists():return DEFAULT.copy()
 c=DEFAULT.copy();c.update(json.loads(CONFIG.read_text()));return c
def rows():return json.loads(QUEUE.read_text())['rows']
def image_check(p):
 with Image.open(p) as im:im.verify()
 with Image.open(p) as im:
  w,h=im.size
  if im.format!='PNG' or w<768 or h<1024 or abs(w/h-.75)>.025:raise ValueError('PNG must be at least 768x1024, ratio 3:4')
  if max(ImageStat.Stat(im.convert('RGB').resize((64,85))).stddev)<8:raise ValueError('Image blank/near-uniform')
 return w,h
def safe_kind(row):
 # Automatically accepting artwork for named characters or armor poses is unsafe.
 # Only simple non-canonical non-equipment pieces can be considered for auto-install.
 kind=str(row.get('kind') or '')
 return kind in ('Domain','Moment','Technique','Spell') and not any(token in row['name'].upper() for token in ('SEIYA','SHIRYU','HYOGA','SHUN','IKKI','ATHENA','HADES','POSEIDON','ARES','ARTEMIS','SAGA','KANON'))
def destination(row):return DRIVE/FAC[row['faction']]/(row['id']+'.png')
def approval(row, file):
 out=destination(row)
 if out.exists():raise FileExistsError('Destination already exists, no overwrite: '+str(out))
 with Image.open(file) as im: im.verify()
 out.parent.mkdir(parents=True,exist_ok=True)
 # google drive mount destination creation with x mode and no overwrite
 with out.open('xb') as fp, file.open('rb') as source:shutil.copyfileobj(source,fp)
 return str(out)
def main():
 p=argparse.ArgumentParser()
 p.add_argument('--status',action='store_true')
 p.add_argument('--init-config',action='store_true')
 p.add_argument('--generate-one',action='store_true')
 p.add_argument('--approve',help='Card ID with reviewed image in candidates')
 p.add_argument('--id',help='Generate only this card ID')
 args=p.parse_args()
 if args.init_config:
  if CONFIG.exists():print('CONFIG_EXISTS',CONFIG);return 0
  write_json(CONFIG,DEFAULT);os.chmod(CONFIG,0o600);print('DISABLED_CONFIG_CREATED',CONFIG);return 0
 c=conf()
 state=json.loads(STATE.read_text()) if STATE.exists() else {'attempts':[],'candidates':{}}
 if args.status:
  print(json.dumps({'enabled':c['enabled'],'model':c['model'],'key_file_exists':Path(c['key_file']).exists(),'max_calls_per_day':c['max_calls_per_day'],'max_calls_total':c['max_calls_total'],'attempts':len(state['attempts']),'candidates':len(state['candidates']),'auto_install_generic':c['auto_install_generic']},indent=2));return 0
 queue=rows()
 if args.approve:
  row=next((r for r in queue if r['id']==args.approve),None)
  if not row:raise ValueError('Unknown card ID')
  file=STAGING/(row['id']+'.png')
  if not file.is_file():raise FileNotFoundError(file)
  image_check(file)
  project=ROOT/'card-forge/projects'/(row['id']+'.json')
  proj=json.loads(project.read_text())
  art=proj.get('art') or {}
  empty_new=row.get('initial_art_absent') is True and proj.get('art') is None
  if not (str(art.get('src','')).endswith('-ref.jpg') or empty_new):
   raise RuntimeError('Project is not an approved empty or reference placeholder')
  if (ROOT/'card-forge/art'/(row['id']+'.png')).exists():raise RuntimeError('Final already exists')
  print('APPROVED_COPIED_TO_DRIVE',approval(row,file))
  state['candidates'].setdefault(row['id'],{})['status']='APPROVED_FOR_INSTALL'
  write_json(STATE,state)
  return 0
 if not args.generate_one:return 0
 if not c['enabled']:
  print('GENERATION_DISABLED: configure ~/.config/sstcg/auto-art.json and API credentials')
  return 0
 if c['provider']!='openai':raise ValueError('Only openai provider supported')
 keypath=Path(c['key_file'])
 if not keypath.exists() or keypath.stat().st_mode&0o077:
  print('GENERATION_BLOCKED: secure 0600 API key file required');return 0
 key=keypath.read_text().strip()
 if not key:print('GENERATION_BLOCKED: empty API key');return 0
 today=dt.datetime.now(dt.timezone.utc).date().isoformat()
 if len(state['attempts'])>=c['max_calls_total'] or sum(x['time'].startswith(today) for x in state['attempts'])>=c['max_calls_per_day']:
  print('BUDGET_CALL_LIMIT_REACHED');return 0
 for row in queue:
  cid=row['id']
  if args.id and cid!=args.id:continue
  if destination(row).exists() or (ROOT/'card-forge/art'/(cid+'.png')).exists():continue
  p=ROOT/'card-forge/projects'/(cid+'.json')
  if not p.exists():continue
  proj=json.loads(p.read_text())
  art=proj.get('art') or {}
  if not (str(art.get('src','')).endswith('-ref.jpg') or (row.get('initial_art_absent') is True and proj.get('art') is None)):continue
  if (STAGING/(cid+'.png')).exists():continue
  prompt=(BATCH/(cid+'.txt')).read_text()
  # Not an approval to embed a frame: prompt from authoritative Card Forge.
  payload={'model':c['model'],'prompt':prompt,'size':'960x1280','quality':c['quality'],'output_format':'png','n':1}
  state['attempts'].append({'time':utc(),'id':cid,'model':c['model'],'status':'STARTED'})
  write_json(STATE,state) # account before paid request
  req=urllib.request.Request('https://api.openai.com/v1/images/generations',data=json.dumps(payload).encode(),method='POST',headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})
  try:
   with urllib.request.urlopen(req,timeout=240) as resp:
    response=json.loads(resp.read())
   raw=base64.b64decode(response['data'][0]['b64_json'])
   STAGING.mkdir(parents=True,exist_ok=True)
   f=STAGING/(cid+'.png')
   with f.open('xb') as output:output.write(raw)
   dims=image_check(f)
   status='REVIEW_NEEDED'
   if c['auto_install_generic'] and safe_kind(row):
    try:approval(row,f);status='APPROVED_FOR_INSTALL'
    except Exception as e:print('AUTO_INSTALL_BLOCKED',cid,str(e))
   state['candidates'][cid]={'status':status,'created':utc(),'dimensions':dims}
   state['attempts'][-1]['status']='OK'
   print('IMAGE_GENERATED',cid,'status',status)
  except Exception as exc:
   state['attempts'][-1]['status']='FAILED'
   state['attempts'][-1]['error']=str(exc)[:300]
   print('GENERATION_ERROR',cid,str(exc)[:200])
  finally:write_json(STATE,state)
  break
 else:print('NO_GENERATION_CANDIDATE')
 return 0
if __name__=='__main__':
 try:sys.exit(main())
 except Exception as e:print('ERROR',type(e).__name__,str(e));sys.exit(1)
