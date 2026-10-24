"""Exercita Guarda e Rivalidade pela arena: alvo por guarda, Strike pela interface e marcação de Rivals."""
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
checksum=hashlib.sha256((ROOT/'data/cards.json').read_bytes()).hexdigest()
out=ROOT/'card-forge/out/qa-guard-rivalry'
out.mkdir(parents=True,exist_ok=True)
errors=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,channel='chrome')
    page=browser.new_page(viewport={'width':1680,'height':1100})
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.add_init_script("Math.random=()=>.41;localStorage.setItem('ssTcgSanctuary',JSON.stringify({autoPass:false,hotseatPrivacy:false,music:0,sfx:0}));")
    page.goto('http://127.0.0.1:8765/playtest/')
    page.get_by_role('button',name='Press to begin').click()
    page.get_by_role('button',name='Local battle').click()
    page.select_option('#setup-deck-A','rulebook2-athena')
    page.select_option('#setup-deck-B','rulebook2-ares')
    page.select_option('#setup-first','A')
    page.get_by_role('button',name='Begin duel').click()
    page.get_by_role('button',name='Keep hand',exact=True).click()
    page.get_by_role('button',name='Keep hand',exact=True).click()
    assert page.locator('.arena-resource--eng').count()==0,'ENG não deve aparecer na HUD'
    page.locator('[data-action="help"]').first.click()
    help_text=page.locator('.help-columns').inner_text()
    assert 'Rivalry' in help_text and 'Engage' not in help_text and 'ENG' not in help_text
    page.locator('[data-action="close-modal"]').first.click()
    scenario=page.evaluate("""()=>{
      const g=sstcg.game;
      const send=c=>{if(!g.dispatch({...c,playerKey:g.actingPlayer}))throw Error('Comando recusado: '+JSON.stringify(c));};
      const drain=()=>{let n=0;while(g.choice||g.stack.length){if(++n>80)throw Error('Resolução não terminou');if(g.choice)send({type:'choose',optionId:(g.choice.options.find(o=>o.id==='no')||g.choice.options[0]).id});else send({type:'pass-priority'});}};
      for(let round=0;round<6;round++)for(let opportunity=0;opportunity<2;opportunity++){
        const key=g.actingPlayer,base=g.state.players[key].zones.hand.find(i=>g.canBase(key,i.uid)&&g.card(i.cardId).tipo!=='Devotee');
        if(base){send({type:'base',uid:base.uid});drain();}
        send({type:'pass'});drain();
      }
      if(g.actingPlayer!=='A')send({type:'pass'});
      const candidate=key=>g.state.players[key].zones.hand.filter(i=>{const c=g.card(i.cardId);return c.tipo==='Devotee'&&!c.keywords_en.some(k=>['Guardian','Impulse','Long Range','Nimble'].includes(k))&&g.canPlay(key,i.uid);}).sort((x,y)=>key==='A'?(g.card(x.cardId).power-g.card(y.cardId).power)||(g.card(y.cardId).vida-g.card(x.cardId).vida):g.card(y.cardId).vida-g.card(x.cardId).vida)[0];
      const a=candidate('A');if(!a)throw Error('Sem Devotee A: '+g.state.players.A.zones.hand.map(i=>g.card(i.cardId).nome_exibicao_en+'/'+g.card(i.cardId).tipo+'/'+g.canPlay('A',i.uid)).join(', '));send({type:'play',uid:a.uid});drain();
      const b=candidate('B');if(!b)throw Error('Sem Devotee B');send({type:'play',uid:b.uid});drain();
      const guardedBefore=!g.strikeTargets(b.uid).some(t=>t.uid===a.uid)&&g.locate(a.uid).card.prepared;
      send({type:'pass'});send({type:'pass'});drain();
      // Nova rodada: B ataca o God e abre a própria guarda.
      if(g.actingPlayer==='A')send({type:'pass'});
      send({type:'strike',uid:b.uid,target:{kind:'god',playerKey:'A'}});drain();
      if(g.actingPlayer!=='A')throw Error('Esperava A');
      window.guardScenario={a:a.uid,b:b.uid};window.drainGuard=drain;
      return {a:a.uid,b:b.uid,target:g.card(b.cardId).nome_exibicao_en,guardedBefore,open:!g.locate(b.uid).card.prepared};
    }""")
    assert scenario['guardedBefore'],'Recém-chegado em guarda não pode ser alvo'
    assert scenario['open'],'Atacante fica Unprepared'
    page.locator('.arena-card[data-uid="'+scenario['a']+'"]').click()
    page.get_by_role('button',name='Strike',exact=True).click()
    target=page.locator('.v2-choice-option').filter(has_text=scenario['target'])
    assert target.count()==1
    assert 'Open' in target.locator('.engage-protection-note').inner_text()
    target.click()
    page.evaluate('drainGuard()')
    result=page.evaluate('({rivals:sstcg.game.rivals(guardScenario.a).length,a:sstcg.game.locate(guardScenario.a).zone,b:sstcg.game.locate(guardScenario.b).zone})')
    assert result['a']=='battlefield' and result['b']=='battlefield','O cenário precisa de dois sobreviventes'
    if True:
        assert result['rivals']==1
        page.wait_for_timeout(300)
        assert page.locator('.arena-rival-badge').count()==2
        assert page.locator('#target-lines path').count()>=1
    page.screenshot(path=str(out/'guarda-rivalidade-desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
    page.screenshot(path=str(out/'guarda-rivalidade-mobile.png'),full_page=True)
    assert errors==[],errors
    browser.close()
assert hashlib.sha256((ROOT/'data/cards.json').read_bytes()).hexdigest()==checksum
print(json.dumps({'ok':True,'resultado':result,'erros_js':errors},ensure_ascii=False))
