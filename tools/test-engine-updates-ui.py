"""Fluxo visual do atualizador com provedor simulado; não executa IA nem grava o projeto."""
import argparse
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--url',default='http://127.0.0.1:8765')
args=parser.parse_args()
OUT=ROOT/'card-forge/out/qa-engine-updates';OUT.mkdir(parents=True,exist_ok=True)
files=['data/cards.json','docs/guia-do-jogo.md','data/game-settings.json','playtest/engine-v2.js']
before={f:hashlib.sha256((ROOT/f).read_bytes()).hexdigest() for f in files}
errors=[];calls=[];job=None;applied=False;fail=False
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,channel='chrome')
 page=browser.new_page(viewport={'width':1440,'height':1000})
 page.on('pageerror',lambda e:errors.append(str(e)))
 def motor(route):
  global job,applied
  request=route.request;path=request.url.split('/api/star-hill/')[1]
  if request.method=='POST':calls.append((path,request.post_data_json))
  if path=='motor':data={'disponivel':True,'testes_disponiveis':True,'aplicado':{'sincronizado':True} if applied else None}
  elif path=='motor/gerar':
   job={'id':'ab'*16,'estado':'proposta','mensagem':'Confira o diff.','resumo':'Ajusta uma regra aprovada. <script>window.__injected=1</script>',
        'diff':'--- playtest/engine-v2.js\n+++ playtest/engine-v2.js\n-estado anterior\n+estado proposto\n',
        'cobertura':['Regra de exemplo do Livro aprovado.'],'pendencias':[],'arquivos':['playtest/engine-v2.js'],'testes':[]};data=job
  elif path=='motor/validar':
   job.update(estado='testes_falharam' if fail else 'validado',mensagem='Falha de teste.' if fail else 'Testes aprovados.',testes=[{'nome':'Cenários do motor','ok':not fail,'log':'Falhou' if fail else '3 cenários aprovados'}]);data=job
  elif path=='motor/aplicar':
   assert request.post_data_json['confirmar'] is True
   assert job['estado']=='validado'
   applied=True;job.update(estado='aplicado',mensagem='Abra uma nova partida.');data=job
  elif path.startswith('motor/trabalhos/'):data=job
  else:raise AssertionError(path)
  route.fulfill(json=data)
 page.route('**/api/star-hill/motor**',motor)
 page.goto(args.url+'/star-hill/#regras');page.wait_for_load_state('networkidle')
 expect(page.get_by_role('button',name='Gerar atualização pelo texto')).to_be_enabled()
 original=page.locator('#rules-text').input_value()
 page.locator('#rules-text').fill(original+'\nRascunho de teste.')
 page.locator('[data-motor=generate]').click()
 expect(page.locator('.engine-error')).to_contain_text('grave o Livro')
 assert not calls
 page.locator('#undo').click();expect(page.locator('#rules-text')).to_have_value(original)
 page.locator('[data-motor=generate]').click()
 expect(page.locator('.engine-job')).to_contain_text('Proposta pronta')
 page.locator('[data-motor=review]').click()
 expect(page.locator('#engine-diff')).to_contain_text('estado proposto')
 assert page.locator('#engine-review script').count()==0
 assert page.evaluate('window.__injected') is None
 assert page.locator('[data-motor=apply]').count()==0
 page.locator('[data-motor=validate]').click()
 expect(page.locator('.engine-job')).to_contain_text('Pronto para aprovação')
 page.locator('[data-motor=review]').click()
 expect(page.locator('[data-motor=apply]')).to_be_disabled()
 page.locator('#engine-confirm').check()
 expect(page.locator('[data-motor=apply]')).to_be_enabled()
 page.screenshot(path=str(OUT/'revisao-desktop.png'),full_page=True)
 page.locator('[data-motor=apply]').click()
 expect(page.locator('.engine-job')).to_contain_text('Atualização aplicada')
 expect(page.locator('.engine-ok')).to_contain_text('sincronizados')
 assert [path for path,body in calls]==['motor/gerar','motor/validar','motor/aplicar']
 fail=True
 page.locator('[data-motor=generate]').click();page.locator('[data-motor=review]').click();page.locator('[data-motor=validate]').click()
 expect(page.locator('.engine-job')).to_contain_text('Testes precisam de correção')
 page.locator('[data-motor=review]').click()
 assert page.locator('[data-motor=apply]').count()==0
 page.locator('[data-motor=close]').first.click()
 for width,height in [(1440,1000),(1024,768),(390,844)]:
  page.set_viewport_size({'width':width,'height':height})
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'),width
  page.locator('#engine-editor').screenshot(path=str(OUT/f'motor-{width}.png'))
 assert errors==[],errors
 browser.close()
for f in files:assert hashlib.sha256((ROOT/f).read_bytes()).hexdigest()==before[f],f
print(json.dumps({'ok':True,'geracao':'simulada','gravacoes_reais':0,'erros_js':errors},ensure_ascii=False))
