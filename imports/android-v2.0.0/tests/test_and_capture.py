#!/usr/bin/env python3
"""Bateria completa de testes E2E (10 passos obrigatórios) e captura de screenshots dos 13 ecrãs do BolsoMZ v2."""

import json
import os
import shutil
import socketserver
import tempfile
import threading
import time
import http.server
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

SCREENSHOT_DIR = "artifacts/file_generation/ttl=63d/intermediate/screenshots"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)


class V2Handler(http.server.SimpleHTTPRequestHandler):
  def __init__(self, *args, **kwargs):
    super().__init__(*args, directory="v2_build", **kwargs)

  def log_message(self, fmt, *args):
    pass



def snap(driver, filename, hide_toast=True):
  if hide_toast:
    driver.execute_script("const t=document.getElementById('toast'); if(t) t.className='toast';")
  path = f"{SCREENSHOT_DIR}/{filename}"
  with open(path, "wb") as f:
    f.write(driver.get_screenshot_as_png())

def create_driver(user_data_dir, origin):
  opts = Options()
  opts.add_argument("--headless=new")
  opts.add_argument("--no-sandbox")
  opts.add_argument("--disable-dev-shm-usage")
  opts.add_argument("--disable-gpu")
  opts.add_argument("--window-size=412,915")
  opts.add_argument("--force-device-scale-factor=2")
  opts.add_argument(f"--user-data-dir={user_data_dir}")
  opts.add_argument(f"--crash-dumps-dir={user_data_dir}")
  opts.add_argument("--host-resolver-rules=MAP appassets.androidplatform.net 127.0.0.1")
  opts.add_argument(f"--unsafely-treat-insecure-origin-as-secure={origin}")
  opts.set_capability("goog:loggingPrefs", {"browser": "ALL"})
  return webdriver.Chrome(options=opts)


def run_tests():
  httpd = socketserver.TCPServer(("127.0.0.1", 0), V2Handler)
  port = httpd.server_address[1]
  threading.Thread(target=httpd.serve_forever, daemon=True).start()
  origin = f"http://appassets.androidplatform.net:{port}"
  url = f"{origin}/assets/index.html"
  user_data_dir = tempfile.mkdtemp(prefix="bolsomz_v2_e2e_")

  results = []
  def record(step, passed, detail):
    status = "PASS" if passed else "FAIL"
    print(f"[{status}] {step}: {detail}")
    results.append({"step": step, "passed": passed, "detail": detail})
    if not passed:
      raise AssertionError(f"Test failed at {step}: {detail}")

  driver = create_driver(user_data_dir, origin)
  try:
    # PASSO 1: Instalar / Abrir aplicação e capturar Splash + Onboarding
    driver.get(url)
    time.sleep(0.1)
    snap(driver, "01_splash.png")
    time.sleep(0.6)
    snap(driver, "02_onboarding.png")
    ob_title = driver.find_element(By.CSS_SELECTOR, ".onboarding-card h1").text
    record("1. Inicialização, Splash e Onboarding", "Meticais" in ob_title, f"Onboarding carregado: '{ob_title}'")

    # Navegar pelos 3 passos do Onboarding
    driver.find_element(By.CSS_SELECTOR, '[data-action="obnext"]').click()
    time.sleep(0.2)
    driver.find_element(By.CSS_SELECTOR, '[data-action="obnext"]').click()
    time.sleep(0.2)
    driver.find_element(By.CSS_SELECTOR, '[data-action="finishonboarding"]').click()
    time.sleep(0.3)

    # Capturar ecrã de Registo de Conta (3. Registo)
    snap(driver, "03_registo.png")
    form_id = driver.find_element(By.TAG_NAME, "form").get_attribute("id")
    record("2a. Ecrã de Registo de Conta", form_id == "signup-form", f"Formulário ativo: {form_id}")

    # PASSO 2: Criar uma conta real
    driver.find_element(By.ID, "auth-name").send_keys("Genserico")
    driver.find_element(By.ID, "auth-user-id").send_keys("genserico.mz")
    driver.find_element(By.ID, "auth-pass").send_keys("BolsoSeguranca2026!")
    driver.find_element(By.ID, "auth-confirm").send_keys("BolsoSeguranca2026!")
    driver.find_element(By.CSS_SELECTOR, ".optional-balances summary").click()
    time.sleep(0.2)
    driver.find_element(By.ID, "init-cash").send_keys("2500")
    driver.find_element(By.ID, "init-mpesa").send_keys("8400")
    driver.find_element(By.ID, "init-emola").send_keys("1500")
    driver.find_element(By.ID, "init-bank").send_keys("24000")
    driver.find_element(By.CSS_SELECTOR, '#signup-form button[type="submit"]').click()
    time.sleep(1.5)

    toast_txt = driver.find_element(By.ID, "toast").text
    total_bal = driver.find_element(By.ID, "dashboard-total-balance").text
    record("2b. Criação de Conta Real e Encriptação", "36.400,00 MT" in total_bal, f"Toast='{toast_txt}', Saldo inicial='{total_bal}'")

    # PASSO 4: Adicionar movimentos financeiros reais e capturar todos os ecrãs
    # 4.1 Abrir modal Nova Despesa/Receita (6. Nova despesa/receita)
    driver.find_element(By.CSS_SELECTOR, '[data-action="newtx"][data-kind="expense"]').click()
    time.sleep(0.3)
    driver.find_element(By.ID, "f-amount").send_keys("450")
    driver.find_element(By.ID, "f-fee").send_keys("15")
    driver.find_element(By.ID, "f-note").send_keys("Pacote de dados mensal e-Mola")
    snap(driver, "06_nova_despesa.png")
    driver.find_element(By.CSS_SELECTOR, '#tx-form button[type="submit"]').click()
    time.sleep(1.0)

    # 4.2 Adicionar uma Receita
    driver.find_element(By.CSS_SELECTOR, '[data-action="newtx"][data-kind="income"]').click()
    time.sleep(0.3)
    driver.find_element(By.ID, "f-amount").send_keys("4500")
    driver.find_element(By.ID, "f-note-short").send_keys("Bolsa de investigação / Freelance")
    driver.find_element(By.CSS_SELECTOR, '#tx-form button[type="submit"]').click()
    time.sleep(1.0)

    # 4.3 Registar Chapa de Hoje e visitar Rotina de Chapa (8. Rotina de chapa)
    driver.find_element(By.CSS_SELECTOR, '[data-action="nav"][data-view="transport"]').click()
    time.sleep(0.3)
    driver.find_element(By.CSS_SELECTOR, '[data-action="recordcommute"]').click()
    time.sleep(1.0)
    snap(driver, "08_rotina_chapa.png")

    # 4.4 Criar Meta de Poupança e reforçar (9. Metas de poupança)
    driver.find_element(By.CSS_SELECTOR, '[data-action="nav"][data-view="goals"]').click()
    time.sleep(0.3)
    driver.find_element(By.CSS_SELECTOR, '[data-action="newgoal"]').click()
    time.sleep(0.3)
    driver.find_element(By.ID, "f-goal-name").send_keys("Portátil para Engenharia")
    driver.find_element(By.ID, "f-goal-target").send_keys("45000")
    driver.execute_script("document.getElementById('f-goal-deadline').value = '2027-06-30';")
    driver.find_element(By.CSS_SELECTOR, '#goal-form button[type="submit"]').click()
    time.sleep(1.2)
    driver.find_element(By.CSS_SELECTOR, '[data-action="goalflow"][data-flow="goal"]').click()
    time.sleep(0.3)
    driver.find_element(By.ID, "f-gf-amount").send_keys("6000")
    driver.find_element(By.CSS_SELECTOR, '#goalflow-form button[type="submit"]').click()
    time.sleep(1.2)
    snap(driver, "09_metas_poupanca.png")

    # 4.5 Configurar Orçamentos (10. Orçamentos)
    driver.find_element(By.CSS_SELECTOR, '[data-action="nav"][data-view="budgets"]').click()
    time.sleep(0.3)
    driver.find_element(By.CSS_SELECTOR, '[data-action="editbudget"]').click()
    time.sleep(0.3)
    driver.find_element(By.ID, "f-bud-Transporte").send_keys("2000")
    driver.find_element(By.ID, "f-bud-Alimentação").send_keys("4500")
    driver.find_element(By.ID, "f-bud-Internet").send_keys("1500")
    driver.find_element(By.CSS_SELECTOR, '#budget-form button[type="submit"]').click()
    time.sleep(1.2)
    snap(driver, "10_orcamentos.png")

    # 4.6 Configurar Pagamentos Fixos
    driver.find_element(By.CSS_SELECTOR, '[data-action="nav"][data-view="recurring"]').click()
    time.sleep(0.3)
    driver.find_element(By.CSS_SELECTOR, '[data-action="newrecurring"]').click()
    time.sleep(0.3)
    driver.find_element(By.ID, "f-rec-name").send_keys("Internet Fibra Casa")
    driver.find_element(By.ID, "f-rec-amount").send_keys("1850")
    driver.find_element(By.ID, "f-rec-day").clear()
    driver.find_element(By.ID, "f-rec-day").send_keys("15")
    driver.find_element(By.CSS_SELECTOR, '#recurring-form button[type="submit"]').click()
    time.sleep(1.2)

    # 4.7 Capturar Dashboard rica com dados reais (5. Dashboard)
    driver.find_element(By.CSS_SELECTOR, '[data-action="nav"][data-view="dashboard"]').click()
    time.sleep(0.4)
    expected_bal = driver.find_element(By.ID, "dashboard-total-balance").text
    snap(driver, "05_dashboard.png")
    record("4. Registo de Movimentos, Chapa, Metas e Orçamentos", "40.395,00 MT" in expected_bal, f"Saldo após movimentos: {expected_bal}")

    # 4.8 Capturar Histórico Financeiro (7. Histórico financeiro)
    driver.find_element(By.CSS_SELECTOR, '[data-action="nav"][data-view="transactions"]').click()
    time.sleep(0.3)
    snap(driver, "07_historico.png")

    # 4.9 Capturar Contas Financeiras (11. Contas financeiras)
    driver.find_element(By.CSS_SELECTOR, '[data-action="nav"][data-view="accounts"]').click()
    time.sleep(0.3)
    snap(driver, "11_contas.png")

    # 4.10 Capturar Relatórios (12. Relatórios)
    driver.find_element(By.CSS_SELECTOR, '[data-action="nav"][data-view="reports"]').click()
    time.sleep(0.3)
    snap(driver, "12_relatorios.png")

    # 4.11 Capturar Definições (13. Definições)
    driver.find_element(By.CSS_SELECTOR, '[data-action="nav"][data-view="settings"]').click()
    time.sleep(0.3)
    snap(driver, "13_definicoes.png")

    # Bloquear e sair para capturar ecrã de Login (4. Login)
    driver.find_element(By.CSS_SELECTOR, '[data-action="logout"]').click()
    time.sleep(0.4)
    snap(driver, "04_login.png")

    # PASSO 5: Encerrar completamente a aplicação (fechar instância do navegador)
    driver.quit()
    driver = None
    record("5. Encerramento da Aplicação", True, "Instância WebView/Chromium encerrada completamente.")

    # PASSO 6 & 7: Abrir novamente com o mesmo armazenamento, autenticar e confirmar persistência
    driver = create_driver(user_data_dir, origin)
    driver.get(url)
    time.sleep(0.8)  # Aguardar transição automática da Splash para Login
    login_heading = driver.find_element(By.CSS_SELECTOR, ".auth-card h1").text
    record("6a. Reabertura Direta no Login", "Desbloquear" in login_heading, f"Título ao reabrir: '{login_heading}'")

    # PASSO 8a: Testar credenciais incorretas antes do login válido
    driver.find_element(By.ID, "auth-pass").send_keys("SenhaErrada99999")
    driver.find_element(By.CSS_SELECTOR, '#login-form button[type="submit"]').click()
    time.sleep(1.2)
    wrong_pass_toast = driver.find_element(By.ID, "toast").text
    record("8a. Rejeição de Palavra-passe Incorreta", "incorreta" in wrong_pass_toast.lower(), f"Mensagem de erro: '{wrong_pass_toast}'")

    # PASSO 8b: Testar registo duplicado com o mesmo identificador
    driver.find_element(By.CSS_SELECTOR, '[data-action="authmode"][data-mode="signup"]').click()
    time.sleep(0.3)
    driver.find_element(By.ID, "auth-name").send_keys("Outro Nome")
    driver.find_element(By.ID, "auth-user-id").send_keys("GENSERICO.MZ")
    driver.find_element(By.ID, "auth-pass").send_keys("OutraSenhaForte123!")
    driver.find_element(By.ID, "auth-confirm").send_keys("OutraSenhaForte123!")
    driver.find_element(By.CSS_SELECTOR, '#signup-form button[type="submit"]').click()
    time.sleep(1.0)
    dup_toast = driver.find_element(By.ID, "toast").text
    record("8b. Bloqueio de Registo Duplicado", "já existe" in dup_toast.lower(), f"Mensagem de erro: '{dup_toast}'")

    # Voltar ao Login e autenticar com a palavra-passe correta (Passo 6 & 7)
    driver.find_element(By.CSS_SELECTOR, '[data-action="authmode"][data-mode="login"]').click()
    time.sleep(0.3)
    uid_input = driver.find_element(By.ID, "auth-user-id")
    uid_input.clear()
    uid_input.send_keys("genserico.mz")
    driver.find_element(By.ID, "auth-pass").send_keys("BolsoSeguranca2026!")
    driver.find_element(By.CSS_SELECTOR, '#login-form button[type="submit"]').click()
    time.sleep(1.5)

    reopened_bal = driver.find_element(By.ID, "dashboard-total-balance").text
    record("6b & 7. Autenticação e Persistência Integral Após Fecho", reopened_bal == expected_bal, f"Saldo persistido={reopened_bal} (esperado={expected_bal})")

    # PASSO 9: Confirmar funcionamento offline e zero dependências externas
    ext_reqs = driver.execute_script("""
      return performance.getEntriesByType('resource')
        .map(r => r.name)
        .filter(n => !n.startsWith(location.origin));
    """)
    record("9. Funcionamento 100% Offline (Zero Recursos Externos)", len(ext_reqs) == 0, f"Pedidos externos={len(ext_reqs)}")

    # PASSO 10: Testar migração / atualização de dados v1.0 para v2.0 sem perda de dados
    mig_res = driver.execute_async_script("""
      const done = arguments[0];
      (async () => {
        const core = await import('./core.js');
        const vaultMod = await import('./vault.js');
        const v1Vault = {
          version: 1,
          profile: { name: 'Utilizador V1', userId: 'conta.v1', createdAt: '2026-01-10T10:00:00.000Z' },
          wallets: [
            { id: 'cash', name: 'Carteira', type: 'cash', opening: 50000, color: '#9E83FF' },
            { id: 'mpesa', name: 'M-Pesa', type: 'mobile', opening: 120000, color: '#E99292' },
            { id: 'emola', name: 'e-Mola', type: 'mobile', opening: 30000, color: '#EDC179' },
            { id: 'bank', name: 'Banco', type: 'bank', opening: 500000, color: '#80A5EA' },
            { id: 'savings', name: 'Poupança', type: 'savings', opening: 0, color: '#8DD6B3' }
          ],
          transactions: [
            { id: 'tx-v1-1', type: 'expense', walletId: 'cash', amount: 4000, category: 'Transporte', date: '2026-10-20', note: 'Chapa v1', createdAt: '2026-10-20T08:00:00.000Z' }
          ],
          goals: [
            { id: 'g-v1-1', name: 'Meta V1', target: 100000, deadline: '', emoji: '💻' }
          ],
          recurring: [],
          budgets: { Transporte: 150000 },
          commute: { oneWay: 2000, tripsPerDay: 2, daysPerMonth: 22, walletId: 'cash' },
          createdAt: '2026-01-10T10:00:00.000Z'
        };
        await vaultMod.createUser({ id: 'conta.v1', name: 'Utilizador V1', password: 'SenhaV1Antiga123', vault: v1Vault });
        const unlocked = await vaultMod.loginUser('conta.v1', 'SenhaV1Antiga123');
        const total = core.totalBalance(unlocked.vault);
        done({
          ok: total === 696000 && unlocked.vault.goals[0].icon === 'laptop' && unlocked.vault.transactions.length === 1,
          total,
          goalIcon: unlocked.vault.goals[0].icon
        });
      })().catch(e => done({ ok: false, error: e.message }));
    """)
    record("10. Migração V1.0 -> V2.0 Sem Perda de Dados", mig_res.get("ok") is True, f"Resultado migração={mig_res}")

    logs = [l for l in driver.get_log("browser") if l.get("level") == "SEVERE"]
    record("11. Consola Limpa (Zero Erros Críticos JS)", len(logs) == 0, f"Erros severos={logs}")

    with open("artifacts/file_generation/ttl=63d/intermediate/e2e_test_results.json", "w") as f:
      json.dump(results, f, indent=2, ensure_ascii=False)
    print("\nTODOS OS TESTES E2E PASSARAM COM SUCESSO!")
  finally:
    if driver:
      driver.quit()
    httpd.shutdown()
    shutil.rmtree(user_data_dir, ignore_errors=True)


if __name__ == "__main__":
  run_tests()
