#!/usr/bin/env python3
# Requer Playwright no ambiente de desenvolvimento. Rode um servidor HTTP na raiz.
# python3 tools/test-playtest.py --channel chrome
# A instrumentação abaixo existe só na resposta interceptada pelo teste, nunca no produto.
from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import argparse,json,tempfile
parser=argparse.ArgumentParser(description='Regressão da arena no Chromium, usando os dados e comandos reais.')
parser.add_argument('--url',default='http://localhost:8000',help='Servidor HTTP na raiz do projeto')
parser.add_argument('--channel',default='chrome',help='Canal Playwright: chrome ou chromium')
parser.add_argument('--ai-matches',action='store_true',help='Também completar partidas contra IA em 1600×900 e 800×600')
parser.add_argument('--artifacts',help='Pasta para screenshots; padrão: pasta temporária')
args=parser.parse_args()
BASE=args.url.rstrip('/')
OUT=Path(args.artifacts or tempfile.mkdtemp(prefix='saintseiya-browser-'));OUT.mkdir(parents=True,exist_ok=True)
BRIDGE='''\nwindow.__arenaTest={get game(){return game;},render,changeSettings,start,get screen(){return screen;},get viewer(){return viewer;}};'''
ERRORS=[]
def route_app(route):
 response=route.fetch();route.fulfill(response=response,body=response.text()+BRIDGE)
def snapshot(page):
 return page.evaluate('''() => {const g=window.__arenaTest.game;return {phase:g.state.currentPhase,player:g.state.currentPlayer,acting:g.actingPlayer,victory:g.state.victory,pending:Object.keys(g.pending).filter(k=>g.pending[k]),stack:g.stack.length,primary:g.primary,revision:g.revision};}''')
def settle(page):
 page.wait_for_timeout(80)
def boot(context,local=True,first='A'):
 page=context.new_page();page.route('**/playtest/app.js?*',route_app)
 page.on('pageerror',lambda e:ERRORS.append(str(e)+' '+e.stack))
 page.on('console',lambda m:ERRORS.append(m.text) if m.type=='error' else None)
 page.on('requestfailed',lambda r:ERRORS.append(r.url+': '+r.failure))
 page.goto(BASE+'/playtest/');page.wait_for_load_state('networkidle')
 page.get_by_role('button',name='Press to begin').click()
 page.screenshot(path=str(OUT/'menu-new.png'))
 page.get_by_role('button',name='Local battle' if local else 'Battle vs AI',exact=False).click()
 page.locator('#setup-first').select_option(first)
 page.get_by_role('button',name='Begin duel').click()
 page.get_by_role('button',name='Keep hand').click()
 if local:page.get_by_role('button',name='Keep hand').click()
 return page
FIXTURE='''() => {
 const g=window.__arenaTest.game,s=g.state;
 function take(key,id,zone='battlefield'){
  const p=s.players[key];let card;
  for(const name of ['deck','hand']){const ix=p.zones[name].findIndex(i=>i.cardId===id);if(ix>=0){card=p.zones[name].splice(ix,1)[0];break;}}
  if(!card){const template=p.zones.deck[0];card={...structuredClone(template),uid:'fixture-'+key+'-'+id,cardId:id};}
  Object.assign(card,{tapped:false,summoningSick:false,enteredCombatThisTurn:false,attachedToUid:null,damageCounters:0,tempKeywords:[]});p.zones[zone].push(card);return card.uid;
 }
 for(const p of Object.values(s.players)){p.zones.battlefield=[];p.cosmo=5;p.latentCosmo=2;}
 s.currentPlayer='A';s.currentPhase='main';
 const ordinary=take('A','athena-002'),nimble=take('A','athena-005'),guardian=take('B','athena-003'),enemy=take('B','athena-004'),cloth=take('A','athena-026'),play=take('A','athena-015','hand');
 s.players.A.zones.battlefield.find(i=>i.uid===nimble).turnPowerBonus=2;
 window.__arenaTest.render();return {ordinary,nimble,guardian,enemy,cloth,play};
}'''

BOT='''() => {
 const g=window.__arenaTest.game,p=g.pending,s=g.state;
 const click=(action,extra='')=>{const n=document.querySelector(`[data-action="${action}"]${extra}`);if(n&&!n.disabled){n.click();return true;}return false;};
 if(s.victory)return 'victory';
 if(p.mulligan){click('mulligan-keep');return 'mulligan';}
 if(p.payment){click('payment');return 'payment';}
 if(p.zone){if(!p.zone.selectedUid)click('zone-select',`[data-uid="${p.zone.entries[0]}"]`);else click('zone-confirm');return 'zone';}
 if(p.target||p.spell||p.equip){const target=g.targets()[0];if(target){const n=target.kind==='god'?document.querySelector(`.god-portrait[data-player="${target.playerKey}"]`):document.querySelector(`.game-card[data-uid="${target.uid}"]`);n?.click();}else click('cancel');return 'target';}
 if(g.actingPlayer==='B')return 'ai';
 if(g.stack.length||s.combat.mode==='priority'){click('primary');return 'priority';}
 if(p.declare){
  const missing=p.declare.entries.find(e=>!e.target);
  if(missing){const n=document.querySelector(`.game-card[data-uid="${missing.uid}"]`);n?.click();const t=g.targets()[0];const target=t?.kind==='god'?document.querySelector(`.god-portrait[data-player="${t.playerKey}"]`):document.querySelector(`.game-card[data-uid="${t?.uid}"]`);target?.click();}
  else if(!p.declare.entries.length)click('all-attacks');
  else click('primary');
  return 'declare';
 }
 if(s.currentPhase!=='main'){click('primary');return 'phase';}
 const hand=s.players.A.zones.hand;
 const base=hand.find(i=>g.canBase('A',i.uid));if(base){click('set-base',`[data-uid="${base.uid}"]`);return 'base';}
 const card=hand.filter(i=>['Devotee','Relic'].includes(g.card(i.cardId).tipo)&&g.canPlay('A',i.uid)&&!s.players.A.zones.battlefield.some(b=>g.card(b.cardId).nome_exibicao_en===g.card(i.cardId).nome_exibicao_en)).sort((a,b)=>(g.card(b.cardId).tipo==='Devotee')-(g.card(a.cardId).tipo==='Devotee')||(g.card(b.cardId).custo||0)-(g.card(a.cardId).custo||0))[0];
 if(card){click('play-card',`[data-uid="${card.uid}"]`);return 'play';}
 click('primary');return 'main';
}'''

with sync_playwright() as p:
 browser=p.chromium.launch(channel=args.channel,headless=True)
 context=browser.new_context(viewport={'width':1600,'height':900},reduced_motion='reduce')
 context.add_init_script("if(location.origin==="+json.dumps(BASE)+")localStorage.setItem('ssTcgSanctuary',JSON.stringify({autoPass:false,hotseatPrivacy:false,effects:false,aiSpeed:'fast',phaseStops:['main','combat']}));")
 page=boot(context,first='B')
 assert snapshot(page)['player']=='B'
 page.locator('.primary-action').click();assert snapshot(page)['phase']=='draw'
 page.keyboard.press('Space');assert snapshot(page)['phase']=='main'
 fixture=page.evaluate(FIXTURE)
 # Guardian obriga alvo; Nimble libera a rota até o Deus.
 page.locator('.primary-action').click()
 page.locator(f'.game-card[data-uid="{fixture["ordinary"]}"]').click()
 assert page.locator('.god-portrait[data-player="B"]').get_attribute('class').find('is-legal-target')<0
 assert page.locator(f'.game-card[data-uid="{fixture["guardian"]}"]').get_attribute('class').find('is-legal-target')>=0
 assert 'Guardian' in page.locator('.guardian-rule').inner_text()
 page.screenshot(path=str(OUT/'guardian-protection.png'))
 page.locator('[data-action="cancel"]').first.click()
 page.locator('.primary-action').click()
 page.locator(f'.game-card[data-uid="{fixture["nimble"]}"]').click()
 expect(page.locator('.god-portrait[data-player="B"]')).to_have_class('god-portrait is-legal-target')
 assert 'Nimble' in page.locator('.guardian-rule').inner_text()
 page.screenshot(path=str(OUT/'nimble-bypass.png'))
 before=page.evaluate('window.__arenaTest.game.state.players.B.god.soul')
 page.locator('.primary-action').click();assert snapshot(page)['acting']=='B'
 page.locator('.primary-action').click()
 page.wait_for_function("window.__arenaTest.game.state.combat.mode===null")
 after=page.evaluate('window.__arenaTest.game.state.players.B.god.soul')
 assert after<before
 print('PASS Guardian/Nimble visual targets and real combat',flush=True)
 # Pagamento manual, pilha e resolução de carta.
 page.evaluate("window.__arenaTest.changeSettings({fullControl:true})")
 uid=fixture['play']
 page.locator(f'.game-card[data-uid="{uid}"]').hover()
 page.locator(f'[data-action="play-card"][data-uid="{uid}"]').click()
 expect(page.locator('.payment-dialog')).to_be_visible()
 page.locator('[data-action="payment"]').first.click()
 assert snapshot(page)['stack']==1
 page.locator('.primary-action').click()
 assert not snapshot(page)['stack']
 assert page.locator(f'.field-card[data-uid="{uid}"]').count()==1
 print('PASS manual payment, action stack and permanent resolves',flush=True)
 # Equipar usa escolhas no campo, sem mover carta para outra zona.
 page.locator(f'.field-card[data-uid="{fixture["cloth"]}"]').hover()
 page.locator(f'[data-action="card-ability"][data-uid="{fixture["cloth"]}"]').click()
 assert 'equip' in snapshot(page)['pending']
 page.locator(f'.field-card[data-uid="{fixture["ordinary"]}"]').click()
 assert page.evaluate(f"window.__arenaTest.game.locate('A','{fixture['cloth']}').card.attachedToUid") == fixture['ordinary']
 print('PASS equip workflow and attached rendering',flush=True)
 # Layouts reais com campo populado e sem modais.
 for w,h,name in [(1600,900,'battle-1600'),(800,600,'battle-800'),(390,844,'battle-mobile')]:
  page.set_viewport_size({'width':w,'height':h});settle(page)
  assert page.locator('body').evaluate('(n)=>n.scrollWidth<=innerWidth')
  rect=page.locator('.primary-action').bounding_box();assert rect['x']>=0 and rect['x']+rect['width']<=w+1
  page.screenshot(path=str(OUT/f'{name}.png'))
 page.set_viewport_size({'width':1600,'height':900})
 page.get_by_role('button',name='Duel options',exact=True).click()
 expect(page.locator('.pause-dialog')).to_be_visible()
 page.locator('[data-setting="fullControl"]').uncheck()
 page.locator('.pause-dialog .gold-button[data-action="close-modal"]').click()
 page.get_by_role('button',name='Duel options',exact=True).click()
 page.get_by_role('button',name='Concede',exact=True).click()
 page.get_by_role('button',name='Concede',exact=True).click()
 expect(page.locator('.victory-dialog')).to_be_visible()
 page.get_by_role('button',name='Main menu',exact=True).click()
 page.get_by_role('button',name='Collection',exact=False).click()
 page.locator('#collection-search').fill('Shiryu, Dragon Saint');page.wait_for_timeout(240)
 expect(page.locator('.collection-card')).to_have_count(1)
 page.locator('.collection-card').click();expect(page.locator('.inspector-dialog')).to_be_visible()
 page.get_by_role('button',name='Close card details').click();page.get_by_role('button',name='Main menu',exact=True).click()
 print('PASS layouts, settings, concede, collection and inspector',flush=True)
 page.close()
 assert not ERRORS,ERRORS
 print('PASS no console errors, JavaScript exceptions or failed requests',flush=True)
 print('Screenshots:',OUT,flush=True)
 if args.ai_matches:
  for width,height in [(1600,900),(800,600)]:
   context=browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce')
   context.add_init_script("if(location.origin==="+json.dumps(BASE)+")localStorage.setItem('ssTcgSanctuary',JSON.stringify({autoPass:false,hotseatPrivacy:false,effects:false,aiSpeed:'fast'}));")
   def speed(route):
    response=route.fetch();body=response.text().replace("uiSettings.aiSpeed==='fast'?90","uiSettings.aiSpeed==='fast'?5").replace('COMBAT_STEP_DELAY_MS=240','COMBAT_STEP_DELAY_MS=5');route.fulfill(response=response,body=body)
   context.route('**/playtest/engine.js?*',speed)
   page=boot(context,local=False,first='A')
   last_revision=-1;stalled=0;steps=0
   for steps in range(5000):
    action=page.evaluate(BOT)
    if action=='victory':break
    if steps%200==0:print('AI match',width,'steps',steps,snapshot(page),flush=True)
    page.wait_for_timeout(12 if action=='ai' else 4)
    revision=page.evaluate('window.__arenaTest.game.revision')
    stalled=stalled+1 if revision==last_revision else 0;last_revision=revision
    assert stalled<140,('stalled',action,snapshot(page),page.evaluate('window.__arenaTest.game.state.log.slice(-8)'))
   final=snapshot(page);assert final['victory'],final
   print('PASS full AI match',width,steps,final['victory'],flush=True)
   page.screenshot(path=str(OUT/f'ai-victory-{width}.png'));page.close();context.close()
 assert not ERRORS,ERRORS
 browser.close()
