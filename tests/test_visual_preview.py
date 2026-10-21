"""Preview visual offline: não é teste de autenticação, apenas smoke test da interface.
A política de navegação do ambiente de teste bloqueia navegação a URLs, então
injetamos o bundle num documento about:blank sem persistir dados.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]

def bundle():
    core=(ROOT/'core.js').read_text().replace('export ','').replace('return crypto.randomUUID();',"return 'preview-'+Math.random().toString(36).slice(2);")
    vault=(ROOT/'vault.js').read_text().replace('export ','')
    app='\n'.join(line for line in (ROOT/'app.js').read_text().splitlines() if not line.startswith('import {'))
    app=app.replace('users=await listUsers();renderAuth();','users=[];renderAuth();')
    app=app.replace("if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});",'')
    return core+'\n'+vault+'\n'+app

def run():
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  for name,width,height in [('mobile',390,844),('desktop',1365,850)]:
   page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   css=(ROOT/'app.css').read_text()
   page.set_content('<!doctype html><html><head><meta charset="utf-8"><style>'+css+'</style></head><body><div id="app"></div><div id="toast" class="toast"></div></body></html>')
   page.add_script_tag(content=bundle())
   assert page.get_by_text('Bem-vindo de volta').count()==1,errors
   page.screenshot(path=str(ROOT/'tests'/f'preview_auth_{name}.png'),full_page=True)
   page.locator('[data-action="demo"]').click()
   assert page.get_by_text('Visão geral').count()==1,errors
   assert page.get_by_text('Novo computador').count()>=1,errors
   page.screenshot(path=str(ROOT/'tests'/f'preview_dashboard_{name}.png'),full_page=True)
   page.locator('[data-action="nav"][data-view="goals"]').last.click() if name=='mobile' else page.locator('[data-action="nav"][data-view="goals"]').first.click()
   assert page.get_by_text('Metas de poupança').count()==1,errors
   page.screenshot(path=str(ROOT/'tests'/f'preview_goals_{name}.png'),full_page=True)
   page.locator('[data-action="nav"][data-view="settings"]').last.click() if name=='mobile' else None
   page.locator('[data-action="nav"][data-view="transport"]').last.click() if name=='mobile' else page.locator('[data-action="nav"][data-view="transport"]').first.click()
   assert page.get_by_text('Rotina & chapa').count()==1,errors
   page.screenshot(path=str(ROOT/'tests'/f'preview_transport_{name}.png'),full_page=True)
   # Interações em demonstração: registo de chapa, nova despesa, escape de HTML.
   page.locator('[data-action="recordcommute"]').click()
   assert page.get_by_text('Chapa de hoje registado').count()>=1, errors
   page.locator('[data-action="newtx"]').first.click()
   page.locator('#f-amount').fill('13.50')
   page.locator('#f-note').fill('<img src=x onerror=alert(1)>')
   page.locator('#tx-form button[type="submit"]').click()
   assert page.locator('img').count()==0, 'Texto de transação não foi escapado'
   page.locator('[data-action="nav"][data-view="settings"]').last.click() if name=='mobile' else page.locator('[data-action="nav"][data-view="settings"]').first.click()
   page.locator('[data-action="nav"][data-view="budgets"]').last.click() if name=='mobile' else page.locator('[data-action="nav"][data-view="budgets"]').first.click()
   page.locator('[data-action="editbudget"]').click()
   page.locator('[name="Transporte"]').fill('2500')
   page.locator('#budget-form button[type="submit"]').click()
   assert page.get_by_text('2.500,00 MT').count()>=1
   page.screenshot(path=str(ROOT/'tests'/f'preview_budget_{name}.png'),full_page=True)
   # Pagamentos fixos: criar regra, verificar estado e registar o lançamento em demo.
   if name=='mobile': page.locator('[data-action="nav"][data-view="settings"]').last.click()
   page.locator('[data-action="nav"][data-view="recurring"]').last.click() if name=='mobile' else page.locator('[data-action="nav"][data-view="recurring"]').first.click()
   assert page.get_by_text('Os teus pagamentos. Sem surpresas.').count()==1,errors
   page.locator('[data-action="newrecurring"]').first.click()
   page.locator('#f-name').fill('Mensalidade de internet')
   page.locator('#f-amount').fill('150')
   page.locator('#f-dueDay').fill('12')
   page.locator('#f-category').select_option('Internet')
   page.locator('#f-wallet').select_option('mpesa')
   page.locator('#recurring-form button[type="submit"]').click()
   page.get_by_text('Mensalidade de internet').first.wait_for()
   assert page.get_by_text('Mensalidade de internet').count()>0,errors
   page.evaluate("document.getElementById('toast').className='toast'")
   page.screenshot(path=str(ROOT/'tests'/f'preview_recurring_{name}.png'),full_page=True)
   page.on('dialog',lambda d:d.accept())
   page.locator('[data-action="payrecurring"]').first.click()
   page.get_by_text('Pago',exact=True).first.wait_for()
   assert page.get_by_text('Pago',exact=True).count()>=1,errors
   assert not errors, errors
   print('OK visual',name,'dashboard/goals/transport/budgets/recurring, no JS errors')
   page.close()
  browser.close()

if __name__=='__main__':run()
