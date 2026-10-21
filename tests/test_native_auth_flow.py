"""UI end-to-end against a simulated Android storage bridge, not a device security test."""
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright
from test_visual_preview import bundle
ROOT=Path(__file__).resolve().parents[1]
BRIDGE=r'''(() => {
 const data=new Map(), tokens=new Map();
 const ok=x=>JSON.stringify({ok:true,...x}), bad=x=>JSON.stringify({ok:false,error:x});
 window.BolsoMZVault={
  listUsers(){return ok({users:[...data.values()].map(r=>({id:r.id,name:r.name,updatedAt:'now'}))})},
  exists(id){return ok({exists:data.has(id)})},
  createUser(id,name,password,vault){if(data.has(id))return bad('Conta já existente.');data.set(id,{id,name,password,vault:JSON.parse(vault)});tokens.set(id,'token-'+id);return ok({token:'token-'+id})},
  loginUser(id,password){const r=data.get(id);if(!r||r.password!==password)return bad('Palavra-passe incorreta.');tokens.set(id,'token-'+id);return ok({token:'token-'+id,record:{id,name:r.name},vault:r.vault})},
  persist(id,t,vault){const r=data.get(id);if(!r||tokens.get(id)!==t)return bad('Sessão inválida.');r.vault=JSON.parse(vault);return ok({})},
  endSession(id,t){if(tokens.get(id)===t)tokens.delete(id);return ok({})},
  backup(id,t){return ok({backup:'{}'})},
  changePassword(id,t,oldpw,newpw){const r=data.get(id);if(!r||r.password!==oldpw)return bad('Palavra-passe incorreta.');r.password=newpw;return ok({})}
 };
})();'''

with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path=shutil.which('chromium') or None,args=['--no-sandbox'])
 for viewport in [{'width':390,'height':844},{'width':1365,'height':860}]:
  page=browser.new_page(viewport=viewport)
  page.set_default_timeout(6500)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content('<!doctype html><html lang="pt"><meta charset="utf-8"><style>'+ (ROOT/'app.css').read_text()+'</style><body><div id="app"></div><div id="toast" class="toast"></div></body></html>')
  page.add_script_tag(content=BRIDGE)
  page.add_script_tag(content=bundle())
  page.get_by_text('Bem-vindo de volta').wait_for()
  assert page.locator('[data-action="demo"]').count()==0
  page.locator('[data-action="authmode"]').click()
  page.locator('#auth-name').fill('Utilizador de Teste')
  page.locator('#auth-id').fill('conta.teste')
  page.locator('#auth-pass').fill('SenhaSegura2026!')
  page.locator('#auth-confirm').fill('SenhaSegura2026!')
  page.locator('#signup-form button[type="submit"]').click()
  page.wait_for_timeout(1700)
  page.get_by_text('Visão geral').first.wait_for()
  assert page.get_by_text('Conta pessoal').count()>=1
  page.locator('[data-action="newtx"]').first.click()
  page.locator('[data-action="txtype"][data-kind="income"]').click()
  page.locator('#f-amount').fill('4500')
  page.locator('#f-note').fill('Bolsa de estudo')
  page.locator('#tx-form button[type="submit"]').click()
  page.get_by_text('Bolsa de estudo').first.wait_for()
  page.locator('[data-action="nav"][data-view="settings"]').last.click() if viewport['width']<700 else page.locator('[data-action="nav"][data-view="settings"]').first.click()
  page.locator('[data-action="logout"]').click()
  page.get_by_text('Bem-vindo de volta').wait_for()
  page.locator('#auth-pass').fill('SenhaIncorreta2026!')
  page.locator('#login-form button[type="submit"]').click()
  page.get_by_text('Palavra-passe incorreta.',exact=False).first.wait_for()
  assert page.locator('form#login-form').count()==1
  page.locator('#auth-pass').fill('SenhaSegura2026!')
  page.locator('#login-form button[type="submit"]').click()
  page.get_by_text('Visão geral').first.wait_for()
  assert page.get_by_text('Bolsa de estudo').count()>=1,'Transaction lost after logout/login'
  assert not errors,errors
  if viewport['width']<700:
   page.screenshot(path=str(ROOT/'tests'/'auth_v11_login_success_mobile.png'))
  print('PASS registration, wrong password, login, persisted transaction; viewport:',viewport)
  page.close()
 browser.close()
