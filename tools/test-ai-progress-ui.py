"""Regressão do relógio real da IA: escolhas durante efeitos não podem parar a rodada."""
import argparse
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url',default='http://127.0.0.1:8765')
args=parser.parse_args()
OUT=ROOT/'card-forge/out/qa-ai-progress';OUT.mkdir(parents=True,exist_ok=True)
errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,channel='chrome')
 page=browser.new_page(viewport={'width':1440,'height':1000})
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.add_init_script("Math.random=()=>.41;localStorage.setItem('ssTcgSanctuary',JSON.stringify({autoPass:false,hotseatPrivacy:false,aiSpeed:'fast',music:0,sfx:0}));")
 def cards(route):
  data=route.fetch().json()
  # A cópia de teste força a escolha que antes bloqueava o agendador; o catálogo real é preservado.
  for c in data['cartas']:
   if c.get('revisao_regras')=='2.0' and c['tipo']=='Devotee':
    c.setdefault('motor',{}).setdefault('gatilhos',[]).append({'evento':'entrada','efeitos':[{'op':'opcional','custo':0,'efeitos':[]}]})
  route.fulfill(json=data)
 page.route('**/data/cards.json*',cards)
 page.goto(args.url+'/playtest/');page.wait_for_load_state('networkidle')
 page.get_by_role('button',name='Press to begin').click()
 page.get_by_role('button',name='Battle vs AI',exact=False).click()
 page.select_option('#setup-first','A');page.get_by_role('button',name='Begin duel').click()
 page.get_by_role('button',name='Keep hand',exact=True).click()
 page.wait_for_function('sstcg.game.state.phase==="actions"')
 page.evaluate('window.__aiChoices=0;window.__aiMonitor=setInterval(()=>{const g=sstcg.game;if(g?.resolving&&g.choice?.playerKey==="B")window.__aiChoices++;},5)')
 deadline=time.monotonic()+60;choices=0;actions=0
 while time.monotonic()<deadline:
  status=page.evaluate('''()=>{const g=sstcg.game,s=g.state;return {round:s.round,victory:s.victory,actor:g.actingPlayer,revision:g.revision,resolving:g.resolving,choice:g.choice?.playerKey};}''')
  if status['victory'] or status['round']>=8:break
  if status['choice']=='B' and status['resolving']:choices+=1
  if status['actor']=='A':
   assert page.evaluate('sstcg.game.stepAI()'),status
   actions+=1
  else:
   page.wait_for_function('(revision)=>sstcg.game.revision>revision||sstcg.game.state.victory',arg=status['revision'],timeout=2500)
 assert status['round']>=8 or status['victory'],status
 choices=page.evaluate('window.__aiChoices')
 assert choices>0,'O cenário não observou a escolha da IA durante resolução.'
 assert errors==[],errors
 page.screenshot(path=str(OUT/'partida-avancando.png'),full_page=True)
 browser.close()
print(json.dumps({'ok':True,'rodada':status['round'],'escolhas_ia_em_resolucao':choices,'acoes_jogador':actions,'erros_js':errors},ensure_ascii=False))
