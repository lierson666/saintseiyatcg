"""Exercita a exceção de Engage por comandos legais e cliques na arena real."""
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
checksum=hashlib.sha256((ROOT/'data/cards.json').read_bytes()).hexdigest()
out=ROOT/'card-forge/out/qa-engage-god'
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
    page.select_option('#setup-deck-A','rulebook2-hades')
    page.select_option('#setup-deck-B','rulebook2-ares')
    page.select_option('#setup-first','A')
    page.get_by_role('button',name='Begin duel').click()
    page.get_by_role('button',name='Keep hand',exact=True).click()
    page.get_by_role('button',name='Keep hand',exact=True).click()
    scenario=page.evaluate("""()=>{
      const g=sstcg.game;
      const send=c=>{if(!g.dispatch({...c,playerKey:g.actingPlayer}))throw Error('Comando recusado: '+JSON.stringify(c));};
      const drain=()=>{let n=0;while(g.choice||g.stack.length){if(++n>80)throw Error('Resolução não terminou');if(g.choice)send({type:'choose',optionId:(g.choice.options.find(o=>o.id==='no')||g.choice.options[0]).id});else send({type:'pass-priority'});}};
      // Desenvolve Bases e compra cartas pelas regras normais, sem modificar snapshots.
      for(let round=0;round<6;round++){
        for(let opportunity=0;opportunity<2;opportunity++){
          const key=g.actingPlayer,base=g.state.players[key].zones.hand.find(i=>g.canBase(key,i.uid));
          if(base){send({type:'base',uid:base.uid});drain();}
          send({type:'pass'});drain();
        }
      }
      if(g.actingPlayer!=='A')send({type:'pass'});
      const candidate=key=>g.state.players[key].zones.hand.filter(i=>{
        const c=g.card(i.cardId);return c.tipo==='Devotee'&&!(c.motor?.gatilhos||[]).length&&!c.keywords_en.includes('Guardian')&&c.vida+1>g.state.players.A.god.attack&&g.canPlay(key,i.uid);
      }).sort((a,b)=>g.card(a.cardId).custo-g.card(b.cardId).custo)[0];
      const a=candidate('A');if(!a)throw Error('Sem Devotee A no cenário.');send({type:'play',uid:a.uid});drain();
      const b=candidate('B');if(!b)throw Error('Sem Devotee B no cenário.');send({type:'play',uid:b.uid});drain();
      if(!g.locate(b.uid).card.prepared){send({type:'pass'});send({type:'pass'});drain();}
      if(g.actingPlayer!=='B')send({type:'pass'});
      send({type:'engage',uid:b.uid,target:{kind:'god',playerKey:'A'}});drain();
      send({type:'pass'});send({type:'strike',uid:b.uid});drain();
      if(g.actingPlayer!=='A'||g.locate(b.uid).card.prepared||g.links(b.uid).length!==1)throw Error('Cenário incorreto.');
      window.engageScenario={a:a.uid,b:b.uid};window.drainEngageScenario=drain;
      return {a:a.uid,b:b.uid,target:g.card(b.cardId).nome_exibicao_en,soul:g.state.players.A.god.soul};
    }""")
    page.locator('.arena-card[data-uid="'+scenario['a']+'"]').click()
    assert 'additional Devotee Engage' in page.locator('.arena-card-instruction').inner_text()
    page.get_by_role('button',name='Engage · 0 ENG',exact=True).click()
    target=page.locator('.v2-choice-option').filter(has_text=scenario['target'])
    assert target.count()==1
    target.click()
    page.evaluate('drainEngageScenario()')
    result=page.evaluate('({links:sstcg.game.links(engageScenario.b),prepared:sstcg.game.locate(engageScenario.b).card.prepared,soul:sstcg.game.state.players.A.god.soul})')
    assert len(result['links'])==2
    assert any(l.get('vagasExtrasGod') for l in result['links'])
    assert not result['prepared'] and result['soul']==scenario['soul']
    page.screenshot(path=str(out/'engage-adicional-desktop.png'),full_page=True)
    page.locator('.arena-card[data-uid="'+scenario['b']+'"]').click()
    assert 'additional Engage while linked to a God' in page.locator('.rule-callout').inner_text()
    page.get_by_role('button',name='Close card',exact=True).click()
    page.set_viewport_size({'width':390,'height':844})
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
    page.screenshot(path=str(out/'engage-adicional-mobile.png'),full_page=True)
    assert errors==[],errors
    browser.close()
assert hashlib.sha256((ROOT/'data/cards.json').read_bytes()).hexdigest()==checksum
print(json.dumps({'ok':True,'alvo':scenario['target'],'vinculos':len(result['links']),'erros_js':errors},ensure_ascii=False))
