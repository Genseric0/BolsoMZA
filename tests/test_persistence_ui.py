"""Teste visual do rollback se persistência falhar (Chromium isolado sem IndexedDB real)."""
from playwright.sync_api import sync_playwright
from test_visual_preview import bundle,ROOT

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':390,'height':844})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content('<html><head><meta charset="utf-8"><style>'+ (ROOT/'app.css').read_text()+'</style></head><body><div id="app"></div><div id="toast" class="toast"></div></body></html>')
    page.add_script_tag(content=bundle())
    page.evaluate('''() => { vault=demoVault(); demo=false; currentUser='test.local'; key={}; persist=async()=>{throw new Error('Armazenamento indisponível');}; view='dashboard';render(); }''')
    original=page.evaluate('vault.transactions.length')
    page.locator('[data-action="newtx"]').first.click()
    page.locator('[data-action="txtype"][data-kind="income"]').click()
    page.locator('#f-amount').fill('100')
    page.locator('#f-note').fill('Não deve ficar gravado')
    page.locator('#tx-form button[type="submit"]').click()
    page.get_by_text('Armazenamento indisponível').wait_for()
    assert page.evaluate('vault.transactions.length')==original, 'UI alterada apesar de erro de persistência'
    assert not errors,errors
    print('OK: falha de armazenamento não faz movimentos fantasma nem lança erro JavaScript')
    browser.close()
