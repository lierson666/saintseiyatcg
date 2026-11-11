#!/usr/bin/env python3
"""Register catalog cards missing Card Forge projects; never create fake images."""
import argparse,collections,json,pathlib,sys
ROOT=pathlib.Path(__file__).resolve().parent.parent
PROJECTS=ROOT/'card-forge/projects'
BATCH=ROOT/'card-forge/out/art-production-2026-11-06'
CATALOG=ROOT/'data/cards.json'
QUEUE=BATCH/'queue.json'
def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--apply',action='store_true')
    args=ap.parse_args()
    cards=json.loads(CATALOG.read_text())['cartas']
    data=json.loads(QUEUE.read_text())
    missing=[c for c in cards if not (PROJECTS/(c['id']+'.json')).exists()]
    existing={r['id'] for r in data['rows']}
    newrows=[]
    for c in missing:
        cid=c['id']; f=c.get('faccao','')
        if f not in ('Athena','Poseidon','Hades','Ares','Artemis','Neutral'):raise RuntimeError('Unknown faction '+cid)
        if (ROOT/'card-forge/art'/(cid+'.png')).exists():raise RuntimeError('Existing art, review manually '+cid)
        if cid in existing:raise RuntimeError('Missing project already queued, review manually '+cid)
        newrows.append(dict(id=cid,name=c.get('nome_exibicao_en',''),faction=f,kind=c.get('tipo',''),rarity=c.get('raridade',''),
                 existing=None,initial_art_absent=True,proposed=cid+'.png',prompt=f'card-forge/out/art-production-2026-11-06/{cid}.txt',status='AWAITING_ART_NO_IMAGE'))
    print('catalog',len(cards),'existing_projects',len(cards)-len(missing),'missing_projects',len(missing),
          'new_entries',len(newrows),'by_faction',dict(collections.Counter(x['faction'] for x in newrows)))
    if not args.apply:return 0
    for c in missing:
        cid=c['id']; dest=PROJECTS/(cid+'.json')
        payload={'title':'','subtitle':c.get('tagline_en') or '', 'flavour':'','art':None}
        with dest.open('x') as out:json.dump(payload,out,ensure_ascii=False,indent=2);out.write('\n')
    data['rows'].extend(newrows)
    data['count']=len(data['rows'])
    data['byFaction']=dict(collections.Counter(r['faction'] for r in data['rows']))
    with QUEUE.open('w') as out:json.dump(data,out,ensure_ascii=False,indent=2);out.write('\n')
    print('APPLIED',len(missing),'PROJECTS',len(newrows),'QUEUE_ROWS','total',len(data['rows']))
    return 0
if __name__=='__main__':sys.exit(main())
