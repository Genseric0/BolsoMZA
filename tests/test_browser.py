"""Testes E2E locais (Chromium). Requer Playwright e um servidor em localhost:8000."""
import time
import mimetypes
from pathlib import Path
from playwright.sync_api import sync_playwright

URL='https://bolsomz.test/'
ROOT=Path(__file__).resolve().parents[1]

def click(page,selector): page.locator(selector).click()

def run():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
        page=browser.new_page(viewport={"width":390,"height":844}, device_scale_factor=1,accept_downloads=True,service_workers="block")
        def serve(route):
            name=route.request.url.removeprefix(URL).split("?",1)[0] or "index.html"
            path=(ROOT/name).resolve()
            if not path.is_relative_to(ROOT) or not path.is_file():
                route.fulfill(status=404,body="Not found");return
            mimetype=mimetypes.guess_type(str(path))[0] or "application/octet-stream"
            if path.suffix==".js": mimetype="application/javascript"
            route.fulfill(status=200,body=path.read_bytes(),content_type=mimetype)
        page.route("**/*",serve)
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(URL,wait_until='networkidle')
        page.screenshot(path='/mnt/data/BolsoMZ/tests/screen_auth.png',full_page=True)
        assert page.get_by_text('O teu dinheiro.').count()>0
        click(page,'[data-action="demo"]')
        assert page.get_by_text('Visão geral').count()>0
        page.screenshot(path='/mnt/data/BolsoMZ/tests/screen_demo_mobile.png',full_page=True)
        assert page.get_by_text('Novo computador').count()>0
        click(page,'[data-action="enddemo"]')
        click(page,'[data-action="authmode"][data-mode="signup"]')
        page.locator('#auth-name').fill('Teste E2E')
        page.locator('#auth-id').fill('teste.e2e')
        page.locator('#auth-pass').fill('senha-super-forte-2026')
        page.locator('#auth-confirm').fill('senha-super-forte-2026')
        page.locator('#signup-form button[type="submit"]').click()
        assert page.get_by_text('Visão geral').count()>0
        click(page,'[data-action="newtx"]')
        page.locator('#f-amount').fill('1000')
        click(page,'[data-action="txtype"][data-kind="income"]')
        page.locator('#f-amount').fill('1000')
        page.locator('#f-note').fill('Mesada mensal')
        click(page,'#tx-form button[type="submit"]')
        assert page.get_by_text('1.000,00 MT').count()>0
        click(page,'[data-action="nav"][data-view="transport"] >> nth=0')
        click(page,'[data-action="recordcommute"]')
        assert page.get_by_text('40,00 MT').count()>0
        click(page,'[data-action="nav"][data-view="goals"] >> nth=0')
        click(page,'[data-action="newgoal"]')
        page.locator('#f-name').fill('Comprar um telemóvel')
        page.locator('#f-target').fill('10000')
        click(page,'#goal-form button[type="submit"]')
        assert page.get_by_text('Comprar um telemóvel').count()>0
        click(page,'[data-action="goalflow"][data-flow="goal"]')
        page.locator('#f-amount').fill('250')
        click(page,'#goalflow-form button[type="submit"]')
        assert page.get_by_text('250,00 MT').count()>0
        page.screenshot(path='/mnt/data/BolsoMZ/tests/screen_goals_mobile.png',full_page=True)
        click(page,'[data-action="nav"][data-view="settings"] >> nth=0')
        with page.expect_download() as dl: click(page,'[data-action="backup"]')
        assert dl.value.suggested_filename.endswith('.json')
        click(page,'[data-action="logout"]')
        page.locator('#auth-id').fill('teste.e2e')
        page.locator('#auth-pass').fill('senha-super-forte-2026')
        click(page,'#login-form button[type="submit"]')
        click(page,'[data-action="nav"][data-view="goals"] >> nth=0')
        assert page.get_by_text('Comprar um telemóvel').count()>0
        assert not errors,errors
        print('OK: demonstração, cadastro, entrada, chapa, meta, backup, logout, login e persistência. JS errors:',errors)
        browser.close()

if __name__=='__main__': run()
