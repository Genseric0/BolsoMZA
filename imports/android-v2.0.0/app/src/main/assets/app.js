import {
  CATEGORIES,
  INCOME_CATEGORIES,
  GOAL_ICONS,
  money,
  cents,
  centsAllowZero,
  today,
  month,
  emptyVault,
  allBalances,
  totalBalance,
  reservedTotal,
  monthStats,
  categorySpend,
  walletSpendBreakdown,
  addTransaction,
  removeTransaction,
  updateWallet,
  addGoal,
  deleteGoal,
  contributeGoal,
  withdrawGoal,
  goalSaved,
  commuteProjection,
  recordCommute,
  monthlyTrend,
  addRecurring,
  deleteRecurring,
  recurringForMonth,
  payRecurring,
  id
} from './core.js';

import {
  listUsers,
  createUser,
  loginUser,
  persist,
  backup,
  restore,
  changePassword,
  normalizeUser,
  getLastUser,
  isOnboarded,
  setOnboarded
} from './vault.js';

const root = document.getElementById('app');

let vault = null;
let key = null;
let currentUser = null;
let users = [];
let screenState = 'splash'; // 'splash' | 'onboarding' | 'login' | 'signup' | 'app'
let onboardingStep = 0;
let view = 'dashboard'; // 'dashboard' | 'transactions' | 'accounts' | 'transport' | 'goals' | 'budgets' | 'recurring' | 'reports' | 'settings'
let modal = null;
let txType = 'expense';
let goalAction = 'goal';
let period = month();
let txFilter = 'all';
let txSearch = '';
let pendingRestoreText = '';
let pendingRestoreFilename = '';
let activeWrite = Promise.resolve();
let writing = false;
let busy = false;

const esc = value =>
  String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

const fnum = n => String((n || 0) / 100);
const pct = (part, whole) => (whole > 0 ? Math.min(100, Math.max(0, Math.round((part / whole) * 100))) : 0);

const formatDate = d => {
  try {
    return new Intl.DateTimeFormat('pt-MZ', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(d + 'T12:00:00'));
  } catch {
    return d;
  }
};

const ms = p => {
  try {
    const [year, m] = String(p).split('-').map(Number);
    const label = new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(new Date(year, m - 1, 1));
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return p;
  }
};

const iconPaths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  receipt: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M7.5 15h.01M16.5 15h.01M6 18v3M18 18v3M8 7h8"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.02 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  wallet: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.2"/>',
  chart: '<path d="M4 20V5M4 20h16"/><rect x="7" y="12" width="3" height="6" rx="1"/><rect x="12" y="8" width="3" height="10" rx="1"/><rect x="17" y="5" width="3" height="13" rx="1"/>',
  pie: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  transfer: '<path d="M7 10h14l-4-4M17 14H3l4 4"/>',
  upRight: '<path d="M7 17 17 7M9 7h8v8"/>',
  downLeft: '<path d="M17 7 7 17M15 17H7V9"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 19h16"/>',
  upload: '<path d="M12 15V3m-4 4 4-4 4 4M4 19h16"/>',
  shield: '<path d="m12 2 8 4v6c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6z"/><path d="m9 12 2 2 4-4"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  logout: '<path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  filter: '<path d="M4 7h16M7 12h10m-6 5h2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v6m4-6v6"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4m8-4v4M3 10h18"/>',
  check: '<path d="m5 12 5 5L20 7"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-6.5 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="m2 2 20 20"/>',
  utensils: '<path d="M4 3v7a3 3 0 0 0 3 3v8M7 3v7M10 3v7M16 3v18m0-18c2.5 0 4 2 4 5v4h-4"/>',
  graduation: '<path d="m2 10 10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  bag: '<path d="M6 7h12l1 13H5L6 7Z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
  wifi: '<path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  sparkles: '<path d="m12 3 1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3Z"/>',
  smartphone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M12 18h.01"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7l10-5Z"/><path d="m2 12 10 5 10-5M2 17l10 5 10-5"/>',
  laptop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
  bank: '<path d="m3 9 9-6 9 6v2H3V9Z"/><path d="M5 11v7M9 11v7M15 11v7M19 11v7M3 18h18v3H3z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/>'
};

const ic = (name, size = 18) =>
  `<svg class="svg-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name] || iconPaths.info}</svg>`;

let toastTimer;
export function toast(msg, error = false) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast show' + (error ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.className = 'toast';
  }, 4000);
}

function walletIcon(type, idStr) {
  if (idStr === 'mpesa' || idStr === 'emola' || type === 'mobile') return 'smartphone';
  if (type === 'bank') return 'bank';
  if (type === 'savings') return 'shield';
  return 'wallet';
}

function categoryIcon(catName) {
  const found = CATEGORIES.find(c => c.name === catName);
  return found ? found.icon : 'layers';
}

function walletOptions(selected = 'cash', omit = '') {
  const balances = allBalances(vault);
  return vault.wallets
    .filter(w => w.id !== omit)
    .map(w => {
      const bal = balances.find(b => b.id === w.id)?.balance || 0;
      return `<option value="${esc(w.id)}" ${w.id === selected ? 'selected' : ''}>${esc(w.name)} (${esc(money(bal))})</option>`;
    })
    .join('');
}

const catOptions = (sel = 'Transporte', income = false) =>
  (income ? INCOME_CATEGORIES : CATEGORIES.map(c => c.name))
    .map(c => `<option value="${esc(c)}" ${c === sel ? 'selected' : ''}>${esc(c)}</option>`)
    .join('');

const MODULES = [
  ['dashboard', 'home', 'Visão Geral'],
  ['transactions', 'receipt', 'Histórico'],
  ['accounts', 'wallet', 'Contas'],
  ['transport', 'bus', 'Rotina Chapa'],
  ['goals', 'target', 'Metas'],
  ['budgets', 'pie', 'Orçamentos'],
  ['recurring', 'calendar', 'Pagamentos Fixos'],
  ['reports', 'chart', 'Relatórios'],
  ['settings', 'settings', 'Definições']
];

function viewTitle() {
  return ({
    dashboard: 'Visão Geral',
    transactions: 'Histórico Financeiro',
    accounts: 'Contas Financeiras',
    transport: 'Rotina de Chapa',
    goals: 'Metas de Poupança',
    budgets: 'Orçamentos Mensais',
    recurring: 'Pagamentos Fixos',
    reports: 'Relatórios & Análise',
    settings: 'Definições'
  })[view] || 'Visão Geral';
}

/* ==================== 1. SPLASH SCREEN ==================== */
function renderSplash() {
  return `
    <div class="splash-screen" data-action="skipsplash">
      <div></div>
      <div class="splash-center">
        <div class="brand-emblem">${ic('wallet', 38)}</div>
        <h1 class="splash-title">Bolso<span>MZ</span></h1>
        <p class="splash-subtitle">Gestão financeira pessoal em Meticais</p>
        <div class="splash-loader" aria-hidden="true"><div class="splash-loader-bar"></div></div>
      </div>
      <div class="splash-footer">
        <span class="security-pill">${ic('shield', 14)} Cofre Encriptado AES-256-GCM</span>
        <span>Moçambique • MZN</span>
      </div>
    </div>
  `;
}

/* ==================== 2. ONBOARDING ==================== */
const ONBOARDING_SLIDES = [
  {
    icon: 'wallet',
    tag: 'PASSO 1 DE 3 • CONTAS LOCAIS',
    title: 'Todo o teu dinheiro em Meticais, organizado num só lugar.',
    desc: 'Acompanha ao detalhe o saldo da tua Carteira, M-Pesa, e-Mola, Conta Bancária e Poupança sem misturar objetivos.',
    features: [
      'Saldos separados para Carteira, M-Pesa, e-Mola e Bancos',
      'Registo de taxas de operação móvel e transferências entre contas',
      'Cálculos exatos ao centavo em Meticais (MT)'
    ]
  },
  {
    icon: 'bus',
    tag: 'PASSO 2 DE 3 • DIA A DIA EM MOÇAMBIQUE',
    title: 'Da viagem de chapa às tuas maiores metas de poupança.',
    desc: 'Regista o transporte diário num toque, controla limites de orçamento por categoria e reserva dinheiro para os teus projetos.',
    features: [
      'Calculadora de rotina de chapa com registo diário rápido',
      'Metas de poupança protegidas contra gastos acidentais',
      'Orçamentos mensais, pagamentos fixos e relatórios visuais'
    ]
  },
  {
    icon: 'shield',
    tag: 'PASSO 3 DE 3 • PRIVACIDADE TOTAL',
    title: 'Os teus dados pertencem-te e ficam protegidos no telemóvel.',
    desc: 'O BolsoMZ funciona 100% offline. A tua base de dados é encriptada com a tua palavra-passe através de PBKDF2 e AES-256-GCM.',
    features: [
      'Funcionamento integralmente offline, sem servidores externos',
      'Exportação e restauro de cópias de segurança encriptadas',
      'Acesso protegido por palavra-passe pessoal'
    ]
  }
];

function renderOnboarding() {
  const slide = ONBOARDING_SLIDES[onboardingStep] || ONBOARDING_SLIDES[0];
  const isLast = onboardingStep >= ONBOARDING_SLIDES.length - 1;
  return `
    <div class="onboarding-shell">
      <header class="onboarding-top">
        <div class="brand-inline">
          <div class="brand-emblem sm">${ic('wallet', 20)}</div>
          <span>Bolso<em>MZ</em></span>
        </div>
        <button type="button" class="text-link" data-action="finishonboarding" data-target="${users.length ? 'login' : 'signup'}">
          Saltar ${ic('arrow', 14)}
        </button>
      </header>

      <section class="onboarding-card" aria-live="polite">
        <div class="ob-illustration">${ic(slide.icon, 32)}</div>
        <span class="ob-step-tag">${esc(slide.tag)}</span>
        <h1>${esc(slide.title)}</h1>
        <p>${esc(slide.desc)}</p>
        <div class="ob-feature-list">
          ${slide.features.map(f => `<div class="ob-feature-item"><i>${ic('check', 14)}</i><span>${esc(f)}</span></div>`).join('')}
        </div>
      </section>

      <footer class="onboarding-bottom">
        <div class="ob-dots" role="tablist" aria-label="Passos de introdução">
          ${ONBOARDING_SLIDES.map((_, idx) => `<button type="button" class="ob-dot ${idx === onboardingStep ? 'active' : ''}" data-action="obstep" data-step="${idx}" aria-label="Passo ${idx + 1}"></button>`).join('')}
        </div>
        <div class="ob-actions">
          ${onboardingStep > 0 ? `<button type="button" class="btn" data-action="obprev">${ic('back', 16)} Anterior</button>` : ''}
          ${
            isLast
              ? `<button type="button" class="btn primary full" data-action="finishonboarding" data-target="${users.length ? 'login' : 'signup'}">${users.length ? 'Entrar na minha conta' : 'Criar a minha conta'} ${ic('arrow', 16)}</button>`
              : `<button type="button" class="btn primary full" data-action="obnext">Seguinte ${ic('arrow', 16)}</button>`
          }
        </div>
      </footer>
    </div>
  `;
}

/* ==================== 3 & 4. REGISTO DE CONTA & LOGIN ==================== */
function renderAuth() {
  const isSignup = screenState === 'signup';
  const lastId = getLastUser();
  const defaultId = !isSignup ? (lastId || (users[0]?.id ?? '')) : '';

  return `
    <div class="auth-page">
      <header class="auth-header">
        <div class="brand-inline">
          <div class="brand-emblem sm">${ic('wallet', 20)}</div>
          <span>Bolso<em>MZ</em></span>
        </div>
        <button type="button" class="text-link" data-action="showonboarding">
          ${ic('info', 14)} Guia inicial
        </button>
      </header>

      <main class="auth-card">
        <div class="auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected="${!isSignup}" class="auth-tab ${!isSignup ? 'active' : ''}" data-action="authmode" data-mode="login">
            Entrar
          </button>
          <button type="button" role="tab" aria-selected="${isSignup}" class="auth-tab ${isSignup ? 'active' : ''}" data-action="authmode" data-mode="signup">
            Criar Conta
          </button>
        </div>

        <h1>${isSignup ? 'Criar conta pessoal' : 'Desbloquear o teu cofre'}</h1>
        <p>${
          isSignup
            ? 'Configura o teu cofre financeiro encriptado neste dispositivo. Todos os valores são geridos em Meticais (MT).'
            : 'Introduz as tuas credenciais para acederes às tuas contas, movimentos e metas.'
        }</p>

        ${
          !isSignup && users.length > 0
            ? `<div class="saved-users-strip">
                <span class="strip-label">Contas neste dispositivo</span>
                <div class="saved-users-list">
                  ${users
                    .map(
                      u => `
                      <button type="button" class="user-chip ${u.id === defaultId ? 'selected' : ''}" data-action="pickuser" data-userid="${esc(u.id)}">
                        <span class="user-chip-avatar">${esc(u.name.slice(0, 1).toUpperCase())}</span>
                        <span>${esc(u.name)} <small style="color:var(--muted)">(${esc(u.id)})</small></span>
                      </button>`
                    )
                    .join('')}
                </div>
              </div>`
            : ''
        }

        <form id="${isSignup ? 'signup-form' : 'login-form'}" novalidate>
          ${
            isSignup
              ? `<div class="field">
                  <label for="auth-name">O teu nome</label>
                  <input required maxlength="60" class="input" id="auth-name" name="name" placeholder="Ex.: Genserico" autocomplete="name">
                </div>`
              : ''
          }

          <div class="field">
            <label for="auth-user-id">Identificador da conta</label>
            <input required minlength="3" maxlength="80" class="input" id="auth-user-id" name="userId" placeholder="Ex.: genserico.mz" value="${esc(defaultId)}" autocomplete="username" autocapitalize="none" spellcheck="false">
          </div>

          <div class="field">
            <label for="auth-pass">Palavra-passe</label>
            <div class="input-wrap">
              <input required minlength="${isSignup ? 10 : 1}" type="password" class="input" id="auth-pass" name="password" placeholder="${isSignup ? 'Mínimo de 10 caracteres' : 'A tua palavra-passe'}" autocomplete="${isSignup ? 'new-password' : 'current-password'}">
              <button type="button" class="pass-toggle" data-action="togglepass" data-target="auth-pass" aria-label="Mostrar ou ocultar palavra-passe">
                ${ic('eye', 17)}
              </button>
            </div>
            ${isSignup ? '<div class="pass-strength"><span>Proteção PBKDF2 + AES-256-GCM</span><span>Mín. 10 caracteres</span></div>' : ''}
          </div>

          ${
            isSignup
              ? `<div class="field">
                  <label for="auth-confirm">Confirmar palavra-passe</label>
                  <div class="input-wrap">
                    <input required minlength="10" type="password" class="input" id="auth-confirm" name="confirm" placeholder="Repete a palavra-passe" autocomplete="new-password">
                    <button type="button" class="pass-toggle" data-action="togglepass" data-target="auth-confirm" aria-label="Mostrar ou ocultar confirmação">
                      ${ic('eye', 17)}
                    </button>
                  </div>
                </div>

                <details class="optional-balances">
                  <summary>
                    <span>${ic('wallet', 15)} Configurar saldos iniciais (opcional)</span>
                    <span style="font-size:11px;color:var(--muted)">Em MT</span>
                  </summary>
                  <div class="fields-grid" style="margin-top:12px">
                    <div class="field">
                      <label for="init-cash">Carteira (MT)</label>
                      <input class="input" id="init-cash" name="initCash" type="number" min="0" step="0.01" placeholder="0.00">
                    </div>
                    <div class="field">
                      <label for="init-mpesa">M-Pesa (MT)</label>
                      <input class="input" id="init-mpesa" name="initMpesa" type="number" min="0" step="0.01" placeholder="0.00">
                    </div>
                    <div class="field">
                      <label for="init-emola">e-Mola (MT)</label>
                      <input class="input" id="init-emola" name="initEmola" type="number" min="0" step="0.01" placeholder="0.00">
                    </div>
                    <div class="field">
                      <label for="init-bank">Conta Bancária (MT)</label>
                      <input class="input" id="init-bank" name="initBank" type="number" min="0" step="0.01" placeholder="0.00">
                    </div>
                  </div>
                </details>`
              : ''
          }

          <button class="btn primary full" type="submit" style="margin-top:6px">
            ${ic(isSignup ? 'shield' : 'lock', 16)}
            <span>${isSignup ? 'Criar cofre e entrar' : 'Desbloquear e entrar'}</span>
          </button>
        </form>

        <div class="auth-footer-actions">
          <input type="file" id="restore-file" accept=".json,application/json" hidden>
          <button type="button" class="text-link" data-action="choosebackup">
            ${ic('upload', 15)} Restaurar cópia de segurança encriptada (.json)
          </button>
        </div>
      </main>

      <footer class="auth-bottom-note">
        ${ic('shield', 13)} Dados financeiros encriptados localmente no teu dispositivo. Guarda cópias de segurança regulares nas Definições.
      </footer>
      ${modal ? renderModal() : ''}
    </div>
  `;
}

/* ==================== 5. DASHBOARD ==================== */
function renderDashboard() {
  const stats = monthStats(vault, period);
  const total = totalBalance(vault);
  const saved = reservedTotal(vault);
  const free = Math.max(0, total - saved);
  const balances = allBalances(vault);
  const pro = commuteProjection(vault);
  const trend = monthlyTrend(vault, 6);
  const peak = Math.max(...trend.flatMap(t => [t.income, t.expense]), 100);
  const expenseCats = categorySpend(vault, period).filter(c => c.spent > 0).sort((a, b) => b.spent - a.spent);
  const upcomingBills = recurringForMonth(vault, period).filter(b => !b.paid);
  const recentTxs = vault.transactions.slice().sort(sortTx).slice(0, 5);
  const wasCommuteToday = vault.transactions.some(t => t.commuteDate === today());

  let startAngle = 0;
  const donutGradient = expenseCats.length
    ? `conic-gradient(${expenseCats
        .map(c => {
          const from = startAngle;
          startAngle += (c.spent / Math.max(stats.expense, 1)) * 100;
          return `${c.color} ${from}% ${startAngle}%`;
        })
        .join(',')})`
    : '#1f253a';

  return `
    <section class="hero-card">
      <div class="hero-top">
        <span class="hero-label">${ic('wallet', 16)} Património total nas contas</span>
        <span class="currency-tag">MZN • MT</span>
      </div>
      <div class="hero-balance" id="dashboard-total-balance">${money(total)}</div>
      <div class="hero-split">
        <div>
          <small>Disponível livre</small>
          <strong>${money(free)}</strong>
        </div>
        <div>
          <small>Reservado em metas</small>
          <strong>${money(saved)}</strong>
        </div>
      </div>
      <div class="hero-quick-actions">
        <button type="button" class="quick-act-btn" data-action="newtx" data-kind="expense">
          <span class="quick-act-icon">${ic('minus', 16)}</span>
          <span>Despesa</span>
        </button>
        <button type="button" class="quick-act-btn" data-action="newtx" data-kind="income">
          <span class="quick-act-icon">${ic('plus', 16)}</span>
          <span>Receita</span>
        </button>
        <button type="button" class="quick-act-btn" data-action="newtx" data-kind="transfer">
          <span class="quick-act-icon">${ic('transfer', 16)}</span>
          <span>Transferir</span>
        </button>
        <button type="button" class="quick-act-btn" data-action="recordcommute" ${wasCommuteToday ? 'disabled' : ''}>
          <span class="quick-act-icon">${ic('bus', 16)}</span>
          <span>${wasCommuteToday ? 'Chapa OK' : 'Chapa Hoje'}</span>
        </button>
      </div>
    </section>

    <section aria-label="As tuas contas financeiras">
      <div class="accounts-strip">
        ${balances
          .map(
            w => `
            <button type="button" class="account-mini-card" data-action="editwallet" data-id="${esc(w.id)}">
              <div class="account-mini-top">
                <span class="account-dot" style="color:${esc(w.color)}">${ic(walletIcon(w.type, w.id), 16)}</span>
                <span style="font-size:10px;color:var(--muted)">${ic('edit', 12)}</span>
              </div>
              <div>
                <small>${esc(w.name)}</small>
                <strong>${money(w.balance)}</strong>
              </div>
            </button>`
          )
          .join('')}
      </div>
    </section>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label"><span class="kpi-dot" style="background:var(--positive)"></span>Receitas</div>
        <div class="kpi-value" style="color:var(--positive)">${money(stats.income)}</div>
        <div class="kpi-sub">${esc(ms(period))}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label"><span class="kpi-dot" style="background:var(--negative)"></span>Despesas</div>
        <div class="kpi-value" style="color:var(--negative)">${money(stats.expense)}</div>
        <div class="kpi-sub">${esc(ms(period))}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label"><span class="kpi-dot" style="background:var(--accent-light)"></span>Reservado</div>
        <div class="kpi-value">${money(stats.saved)}</div>
        <div class="kpi-sub">Metas neste mês</div>
      </div>
    </div>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>Últimos movimentos</h3>
          <p>Registos financeiros mais recentes</p>
        </div>
        <button type="button" class="text-link" data-action="nav" data-view="transactions">
          Ver histórico ${ic('arrow', 14)}
        </button>
      </div>
      ${
        recentTxs.length
          ? `<div class="tx-list">${recentTxs.map(t => renderTxRow(t, false)).join('')}</div>`
          : renderEmptyState('receipt', 'Sem movimentos registados', 'Regista a tua primeira receita ou despesa para acompanhares o teu saldo em tempo real.', 'newtx', 'Registar movimento')
      }
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>Evolução de fluxo (6 meses)</h3>
          <p>Comparação mensal entre receitas e despesas</p>
        </div>
        <button type="button" class="text-link" data-action="nav" data-view="reports">
          Relatórios ${ic('arrow', 14)}
        </button>
      </div>
      <div class="chart-bars">
        ${trend
          .map(
            t => `
            <div class="bar-group" title="${esc(ms(t.period))}: Receitas ${money(t.income)} / Despesas ${money(t.expense)}">
              <div class="bar inc" style="height:${Math.max(4, Math.round((t.income / peak) * 100))}%"></div>
              <div class="bar out" style="height:${Math.max(4, Math.round((t.expense / peak) * 100))}%"></div>
            </div>`
          )
          .join('')}
      </div>
      <div class="chart-labels">${trend.map(t => `<span>${esc(t.label)}</span>`).join('')}</div>
      <div class="chart-legend">
        <span><i style="background:var(--cyan)"></i> Receitas</span>
        <span><i style="background:var(--accent)"></i> Despesas</span>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>Despesas por categoria</h3>
          <p>Distribuição em ${esc(ms(period))}</p>
        </div>
        <button type="button" class="text-link" data-action="nav" data-view="budgets">
          Orçamentos ${ic('arrow', 14)}
        </button>
      </div>
      <div class="donut-layout">
        <div class="donut-ring" style="background:${donutGradient}">
          <div class="donut-center">
            <strong>${expenseCats.length}</strong>
            <small>categorias</small>
          </div>
        </div>
        <div class="cat-list">
          ${
            expenseCats.length
              ? expenseCats
                  .slice(0, 4)
                  .map(
                    c => `
                    <div class="cat-row">
                      <div class="cat-row-left">
                        <span class="cat-swatch" style="background:${c.color}"></span>
                        <span>${esc(c.name)}</span>
                      </div>
                      <strong>${money(c.spent)} (${pct(c.spent, stats.expense)}%)</strong>
                    </div>`
                  )
                  .join('')
              : '<p style="color:var(--muted);font-size:12.5px;margin:0">Ainda não existem despesas registadas neste mês.</p>'
          }
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>Rotina de chapa & compromissos</h3>
          <p>${vault.commute.tripsPerDay} viagens/dia • Previsão mensal de ${money(pro.month)}</p>
        </div>
        <button type="button" class="text-link" data-action="nav" data-view="transport">
          Rotina ${ic('arrow', 14)}
        </button>
      </div>
      <div class="split-row" style="padding:10px 12px;background:var(--bg-elevated);border-radius:13px;border:1px solid var(--border)">
        <div>
          <strong style="font-size:13px;display:block">Custo diário de deslocação: ${money(pro.day)}</strong>
          <small style="color:var(--muted);font-size:11.5px">${upcomingBills.length ? `${upcomingBills.length} pagamento(s) fixo(s) por liquidar neste mês` : 'Sem pagamentos fixos pendentes neste mês'}</small>
        </div>
        <button type="button" class="btn sm ${wasCommuteToday ? '' : 'primary'}" data-action="recordcommute" ${wasCommuteToday ? 'disabled' : ''}>
          ${wasCommuteToday ? 'Registado' : 'Registar hoje'}
        </button>
      </div>
    </section>
  `;
}

/* ==================== 7. HISTÓRICO FINANCEIRO ==================== */
function sortTx(a, b) {
  return String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt));
}

function txMeta(tx) {
  if (tx.type === 'income') {
    return { icon: 'downLeft', title: tx.note || tx.category || 'Receita', color: 'positive', sign: '+', badgeLabel: tx.category || 'Receita' };
  }
  if (tx.type === 'expense') {
    return { icon: categoryIcon(tx.category), title: tx.note || tx.category || 'Despesa', color: 'negative', sign: '−', badgeLabel: tx.category || 'Despesa' };
  }
  if (tx.type === 'goal') {
    return { icon: 'target', title: tx.note || 'Reforço de meta', color: 'transfer', sign: '↗', badgeLabel: 'Reserva Meta' };
  }
  if (tx.type === 'unreserve') {
    return { icon: 'target', title: tx.note || 'Resgate de meta', color: 'transfer', sign: '↩', badgeLabel: 'Resgate Meta' };
  }
  return { icon: 'transfer', title: tx.note || 'Transferência entre contas', color: 'transfer', sign: '⇄', badgeLabel: 'Transferência' };
}

function renderTxRow(tx, canDelete = true) {
  const m = txMeta(tx);
  const originId = tx.walletId || tx.fromWallet;
  const originWallet = vault.wallets.find(w => w.id === originId);
  const destWallet = tx.toWallet ? vault.wallets.find(w => w.id === tx.toWallet) : null;
  const routeText = destWallet ? `${originWallet?.name || 'Conta'} → ${destWallet.name}` : (originWallet?.name || 'Conta');

  return `
    <div class="tx-row">
      <div class="tx-badge">${ic(m.icon, 18)}</div>
      <div class="tx-info">
        <strong>${esc(m.title)}</strong>
        <small>${esc(formatDate(tx.date))} • ${esc(routeText)}</small>
      </div>
      <div class="tx-right">
        <strong class="${m.color}">${m.sign} ${money(tx.amount)}</strong>
        <small>${esc(m.badgeLabel)}</small>
      </div>
      ${
        canDelete
          ? `<button type="button" class="icon-btn ghost" title="Eliminar movimento" aria-label="Eliminar movimento" data-action="confirmdeletetx" data-id="${esc(tx.id)}">
              ${ic('trash', 16)}
            </button>`
          : ''
      }
    </div>
  `;
}

function renderTransactions() {
  const filtered = vault.transactions
    .filter(t => t.date.startsWith(period))
    .filter(t => txFilter === 'all' || t.type === txFilter)
    .filter(t => {
      if (!txSearch) return true;
      const wName = vault.wallets.find(w => w.id === (t.walletId || t.fromWallet))?.name || '';
      const haystack = `${t.note || ''} ${t.category || ''} ${wName}`.toLowerCase();
      return haystack.includes(txSearch.toLowerCase());
    })
    .sort(sortTx);

  const sumIn = filtered.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const sumOut = filtered.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0);

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Histórico de Movimentos</h2>
          <p>${filtered.length} registo(s) em ${esc(ms(period))}</p>
        </div>
        <button type="button" class="btn sm primary" data-action="newtx">
          ${ic('plus', 15)} Novo
        </button>
      </div>

      <form id="search-form" class="filter-bar">
        <input class="input" style="flex:2;min-width:160px" name="query" placeholder="Pesquisar descrição, categoria ou conta…" value="${esc(txSearch)}" aria-label="Pesquisar movimentos">
        <input class="input" style="flex:1;min-width:135px" type="month" name="month" value="${esc(period)}" required aria-label="Mês">
        <button class="btn sm" type="submit">${ic('search', 14)} Filtrar</button>
      </form>

      <div class="filter-pills" role="tablist" aria-label="Filtrar por tipo">
        ${[
          ['all', 'Todos'],
          ['expense', 'Despesas'],
          ['income', 'Receitas'],
          ['transfer', 'Transferências'],
          ['goal', 'Metas']
        ]
          .map(
            ([val, label]) =>
              `<button type="button" class="filter-pill ${txFilter === val ? 'active' : ''}" data-action="settxfilter" data-filter="${val}">${label}</button>`
          )
          .join('')}
      </div>

      <div class="split-row" style="padding:10px 12px;background:var(--bg-elevated);border-radius:12px;margin-bottom:12px;font-size:12px">
        <span>Entradas: <strong style="color:var(--positive)">+${money(sumIn)}</strong></span>
        <span>Saídas: <strong style="color:var(--negative)">−${money(sumOut)}</strong></span>
      </div>

      ${
        filtered.length
          ? `<div class="tx-list">${filtered.map(t => renderTxRow(t, true)).join('')}</div>`
          : renderEmptyState('search', 'Nenhum movimento encontrado', 'Altera os filtros de pesquisa ou adiciona um novo movimento financeiro.', 'newtx', 'Adicionar movimento')
      }
    </section>
  `;
}

/* ==================== 8. ROTINA DE CHAPA ==================== */
function renderTransport() {
  const c = vault.commute;
  const p = commuteProjection(vault);
  const periodTxs = vault.transactions.filter(
    t => t.date.startsWith(period) && t.category === 'Transporte' && t.type === 'expense'
  );
  const actualSpent = periodTxs.reduce((s, t) => s + t.amount, 0);
  const wasToday = vault.transactions.some(t => t.commuteDate === today());
  const defaultWallet = vault.wallets.find(w => w.id === c.walletId)?.name || 'Carteira';

  return `
    <section class="hero-card">
      <div class="hero-top">
        <span class="hero-label">${ic('bus', 16)} ${esc(c.routeLabel || 'Rotina de Transporte (Chapa)')}</span>
        <span class="currency-tag">${esc(defaultWallet)}</span>
      </div>
      <div class="hero-balance">${money(p.month)} <small style="font-size:13px;font-weight:500;color:#cbd5e1">/ mês estimado</small></div>
      <div class="hero-split">
        <div>
          <small>Custo diário (${c.tripsPerDay} viagens)</small>
          <strong>${money(p.day)}</strong>
        </div>
        <div>
          <small>Gasto real em ${esc(ms(period))}</small>
          <strong>${money(actualSpent)}</strong>
        </div>
      </div>
      <div class="hstack" style="flex-wrap:wrap">
        <button type="button" class="btn primary" style="flex:1" data-action="recordcommute" ${wasToday ? 'disabled' : ''}>
          ${ic(wasToday ? 'check' : 'bus', 16)}
          <span>${wasToday ? 'Chapa de hoje já registado' : `Registar chapa de hoje (${money(p.day)})`}</span>
        </button>
        <button type="button" class="btn" data-action="newtx" data-kind="expense" data-presetcat="Transporte">
          ${ic('plus', 15)} Viagem avulsa
        </button>
      </div>
    </section>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Bilhete unitário</div>
        <div class="kpi-value">${money(c.oneWay)}</div>
        <div class="kpi-sub">1 viagem</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Semana estimada</div>
        <div class="kpi-value">${money(p.week)}</div>
        <div class="kpi-sub">${c.tripsPerDay} viagens/dia</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Projeção anual</div>
        <div class="kpi-value">${money(p.year)}</div>
        <div class="kpi-sub">12 meses (${c.daysPerMonth} dias/mês)</div>
      </div>
    </div>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>Configurar a minha rotina de transporte</h3>
          <p>Ajusta a tarifa do chapa, número de ligações diárias e conta utilizada</p>
        </div>
      </div>
      <form id="commute-form" class="fields-grid">
        <div class="field span2">
          <label for="commute-route">Nome do percurso</label>
          <input class="input" id="commute-route" name="routeLabel" maxlength="60" value="${esc(c.routeLabel || 'Casa ⇄ Faculdade / Trabalho')}" placeholder="Ex.: Baixa ⇄ Campus UEM">
        </div>
        <div class="field">
          <label for="commute-price">Tarifa por viagem (MT)</label>
          <input class="input" id="commute-price" name="oneWay" required type="number" min="0.01" step="0.01" value="${fnum(c.oneWay)}">
        </div>
        <div class="field">
          <label for="commute-trips">Viagens por dia</label>
          <input class="input" id="commute-trips" name="trips" required type="number" min="1" max="10" step="1" value="${c.tripsPerDay}">
        </div>
        <div class="field">
          <label for="commute-days">Dias de deslocação por mês</label>
          <input class="input" id="commute-days" name="days" required type="number" min="1" max="31" step="1" value="${c.daysPerMonth}">
        </div>
        <div class="field">
          <label for="commute-wallet">Conta de pagamento</label>
          <select class="select" id="commute-wallet" name="wallet">${walletOptions(c.walletId, 'savings')}</select>
        </div>
        <div class="field span2">
          <button type="submit" class="btn primary full">${ic('check', 16)} Guardar parâmetros da rotina</button>
        </div>
      </form>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>Histórico de transporte em ${esc(ms(period))}</h3>
          <p>${periodTxs.length} deslocação(ões) registada(s)</p>
        </div>
      </div>
      ${
        periodTxs.length
          ? `<div class="tx-list">${periodTxs.sort(sortTx).slice(0, 8).map(t => renderTxRow(t, true)).join('')}</div>`
          : '<p style="color:var(--muted);font-size:12.5px;margin:0">Ainda não registaste despesas de transporte neste mês.</p>'
      }
    </section>
  `;
}

/* ==================== 9. METAS DE POUPANÇA ==================== */
function renderGoals() {
  const saved = reservedTotal(vault);
  const totalTarget = vault.goals.reduce((a, g) => a + g.target, 0);

  return `
    <section class="panel">
      <div class="split-row">
        <div>
          <span class="badge">${ic('target', 13)} POUPANÇA RESERVADA</span>
          <h2 style="font-size:26px;margin:8px 0 4px;letter-spacing:-0.8px">${money(saved)}</h2>
          <p style="margin:0;color:var(--muted);font-size:12.5px">
            ${totalTarget ? `Objetivo global acumulado: ${money(totalTarget)} (${pct(saved, totalTarget)}%)` : 'Cria objetivos concretos e reserva Meticais na conta Poupança.'}
          </p>
        </div>
        <button type="button" class="btn primary" data-action="newgoal">
          ${ic('plus', 16)} Nova Meta
        </button>
      </div>
    </section>

    ${
      vault.goals.length
        ? `<div class="cards-grid">
            ${vault.goals
              .map(g => {
                const s = goalSaved(vault, g.id);
                const rest = Math.max(0, g.target - s);
                const progress = pct(s, g.target);
                const monthsLeft = g.deadline
                  ? Math.max(1, (new Date(g.deadline + 'T12:00:00') - new Date()) / (1000 * 60 * 60 * 24 * 30.4))
                  : null;
                return `
                  <article class="item-card">
                    <div>
                      <div class="item-card-top">
                        <span class="item-icon-box">${ic(g.icon || 'target', 20)}</span>
                        <span class="badge ${progress >= 100 ? 'ok' : ''}">${progress}% concluído</span>
                      </div>
                      <h3 style="margin:12px 0 4px;font-size:16px">${esc(g.name)}</h3>
                      <small style="color:var(--muted);font-size:11.5px">${g.deadline ? 'Prazo: ' + esc(formatDate(g.deadline)) : 'Sem prazo fixo'}</small>
                      <div style="font-size:22px;font-weight:800;margin-top:10px">${money(s)}</div>
                      <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
                      <div class="split-row" style="font-size:11.5px;color:var(--muted)">
                        <span>Faltam ${money(rest)}</span>
                        <strong>Alvo: ${money(g.target)}</strong>
                      </div>
                      ${
                        monthsLeft && rest > 0
                          ? `<div class="callout" style="margin-top:10px;padding:8px 10px;font-size:11.5px">
                              Ritmo sugerido: <strong>${money(Math.ceil(rest / monthsLeft))}/mês</strong>
                            </div>`
                          : ''
                      }
                    </div>
                    <div class="hstack" style="margin-top:8px">
                      <button type="button" class="btn sm primary" style="flex:1" data-action="goalflow" data-goal="${esc(g.id)}" data-flow="goal">
                        ${ic('plus', 14)} Reforçar
                      </button>
                      <button type="button" class="btn sm" style="flex:1" data-action="goalflow" data-goal="${esc(g.id)}" data-flow="unreserve" ${s <= 0 ? 'disabled' : ''}>
                        Resgatar
                      </button>
                      <button type="button" class="icon-btn ghost" title="Eliminar meta" aria-label="Eliminar meta" data-action="confirmdeletegoal" data-id="${esc(g.id)}">
                        ${ic('trash', 15)}
                      </button>
                    </div>
                  </article>`;
              })
              .join('')}
          </div>`
        : renderEmptyState('target', 'Ainda não definiste metas de poupança', 'Cria uma meta para um computador, fundo de emergência, propinas ou projeto pessoal.', 'newgoal', 'Criar primeira meta')
    }
  `;
}

/* ==================== 10. ORÇAMENTOS ==================== */
function renderBudgets() {
  const data = categorySpend(vault, period);
  const totalBudget = Object.values(vault.budgets || {}).reduce((a, b) => a + b, 0);
  const totalSpent = data.reduce((a, b) => a + b.spent, 0);
  const diff = totalBudget - totalSpent;

  return `
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Orçamento Definido</div>
        <div class="kpi-value">${money(totalBudget)}</div>
        <div class="kpi-sub">${esc(ms(period))}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Gasto Registado</div>
        <div class="kpi-value" style="color:var(--negative)">${money(totalSpent)}</div>
        <div class="kpi-sub">${totalBudget ? pct(totalSpent, totalBudget) + '% do orçamento' : 'Sem tecto global'}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Margem Restante</div>
        <div class="kpi-value" style="color:${diff >= 0 ? 'var(--positive)' : 'var(--negative)'}">${money(diff)}</div>
        <div class="kpi-sub">${diff >= 0 ? 'Dentro do planeado' : 'Acima do limite'}</div>
      </div>
    </div>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Limites Mensais por Categoria</h2>
          <p>Acompanha o consumo de ${esc(ms(period))} face ao planeado</p>
        </div>
        <button type="button" class="btn sm primary" data-action="editbudget">
          ${ic('edit', 14)} Definir Limites
        </button>
      </div>

      <div class="tx-list">
        ${data
          .map(c => {
            const limit = vault.budgets[c.name] || 0;
            const ratio = limit > 0 ? pct(c.spent, limit) : c.spent > 0 ? 100 : 0;
            const stateClass = limit > 0 && c.spent > limit ? 'over' : limit > 0 && ratio >= 80 ? 'warn' : '';
            const statusText = !limit
              ? 'Sem limite'
              : c.spent > limit
              ? `Excedido em ${money(c.spent - limit)}`
              : `${ratio}% utilizado`;
            return `
              <div style="padding:12px 0;border-bottom:1px solid var(--border-subtle)">
                <div class="split-row">
                  <div class="hstack">
                    <span class="tx-badge" style="width:34px;height:34px;color:${c.color}">${ic(c.icon, 16)}</span>
                    <div>
                      <strong style="font-size:13.5px;display:block">${esc(c.name)}</strong>
                      <small style="color:var(--muted);font-size:11px">${esc(statusText)}</small>
                    </div>
                  </div>
                  <div style="text-align:right">
                    <strong style="font-size:13.5px;display:block">${money(c.spent)}</strong>
                    <small style="color:var(--muted);font-size:11px">${limit ? 'de ' + money(limit) : 'Sem tecto'}</small>
                  </div>
                </div>
                <div class="progress-track" style="margin:8px 0 0">
                  <div class="progress-fill ${stateClass}" style="width:${ratio}%"></div>
                </div>
              </div>`;
          })
          .join('')}
      </div>
    </section>
  `;
}

/* ==================== 11. CONTAS FINANCEIRAS ==================== */
function renderAccounts() {
  const all = allBalances(vault);
  const total = totalBalance(vault);

  return `
    <section class="panel">
      <div class="split-row" style="flex-wrap:wrap;gap:12px">
        <div>
          <span class="badge">${ic('wallet', 13)} SALDO CONSOLIDADO</span>
          <h2 style="font-size:28px;margin:8px 0 4px;letter-spacing:-0.9px">${money(total)}</h2>
          <p style="margin:0;color:var(--muted);font-size:12.5px">Soma de Carteira, M-Pesa, e-Mola, Bancos e Poupança</p>
        </div>
        <div class="hstack">
          <button type="button" class="btn sm subtle" data-action="newtx" data-kind="transfer">
            ${ic('transfer', 14)} Transferir
          </button>
          <button type="button" class="btn sm primary" data-action="newwallet">
            ${ic('plus', 14)} Nova Conta
          </button>
        </div>
      </div>
    </section>

    <div class="cards-grid">
      ${all
        .map(
          w => `
          <article class="item-card">
            <div>
              <div class="item-card-top">
                <span class="item-icon-box" style="color:${esc(w.color)}">${ic(walletIcon(w.type, w.id), 20)}</span>
                <span class="badge">${esc(w.provider || (w.type === 'mobile' ? 'Carteira Móvel' : w.type === 'bank' ? 'Banco' : w.type === 'savings' ? 'Poupança' : 'Numerário'))}</span>
              </div>
              <h3 style="margin:12px 0 2px;font-size:16px">${esc(w.name)}</h3>
              <div style="font-size:23px;font-weight:800;margin:6px 0 12px">${money(w.balance)}</div>
              <div style="font-size:11.5px;color:var(--muted);display:flex;flex-direction:column;gap:4px;padding-top:10px;border-top:1px solid var(--border-subtle)">
                <div class="split-row"><span>Saldo inicial configurado:</span><strong>${money(w.opening)}</strong></div>
                <div class="split-row"><span>Total de entradas:</span><strong style="color:var(--positive)">+${money(w.inflows)}</strong></div>
                <div class="split-row"><span>Total de saídas:</span><strong style="color:var(--negative)">−${money(w.outflows)}</strong></div>
              </div>
            </div>
            <div class="hstack" style="margin-top:8px">
              <button type="button" class="btn sm full" data-action="editwallet" data-id="${esc(w.id)}">
                ${ic('edit', 14)} Ajustar saldo inicial / Editar
              </button>
            </div>
          </article>`
        )
        .join('')}
    </div>
  `;
}

/* ==================== PAGAMENTOS FIXOS (RECORRENTES) ==================== */
function renderRecurring() {
  const list = recurringForMonth(vault, period);
  const pending = list.filter(b => !b.paid);
  const totalPending = pending.reduce((n, b) => n + b.amount, 0);

  return `
    <section class="panel">
      <div class="split-row" style="flex-wrap:wrap;gap:12px">
        <div>
          <span class="badge">${ic('calendar', 13)} COMPROMISSOS MENSAIS</span>
          <h2 style="font-size:25px;margin:8px 0 4px">${money(totalPending)} <small style="font-size:13px;color:var(--muted);font-weight:500">por pagar em ${esc(ms(period))}</small></h2>
          <p style="margin:0;color:var(--muted);font-size:12.5px">Cada pagamento só é descontado da conta quando o confirmas.</p>
        </div>
        <button type="button" class="btn sm primary" data-action="newrecurring">
          ${ic('plus', 14)} Novo Fixo
        </button>
      </div>
    </section>

    <section class="panel">
      <form id="billperiod-form" class="filter-bar">
        <input aria-label="Mês de pagamentos" type="month" name="month" class="input" style="max-width:200px" required value="${esc(period)}">
        <button class="btn sm" type="submit">Consultar mês</button>
      </form>

      ${
        list.length
          ? `<div class="tx-list">
              ${list
                .map(b => {
                  const wName = vault.wallets.find(w => w.id === b.walletId)?.name || 'Conta';
                  return `
                    <div class="tx-row">
                      <div class="tx-badge" style="flex-direction:column;gap:0;font-weight:800;font-size:13px">
                        <span>${b.dueDate.slice(-2)}</span>
                        <small style="font-size:8.5px;color:var(--muted)">DIA</small>
                      </div>
                      <div class="tx-info">
                        <strong>${esc(b.name)}</strong>
                        <small>${esc(b.category)} • ${esc(wName)} • <span style="color:${b.paid ? 'var(--positive)' : b.status === 'late' ? 'var(--negative)' : 'var(--warning)'}">${b.paid ? 'Pago' : b.status === 'late' ? 'Em atraso' : 'Pendente'}</span></small>
                      </div>
                      <div class="tx-right">
                        <strong>${money(b.amount)}</strong>
                        <div class="hstack" style="margin-top:6px;justify-content:flex-end">
                          <button type="button" ${b.paid ? 'disabled' : ''} class="btn sm ${b.paid ? '' : 'primary'}" data-action="confirmpayrecurring" data-id="${esc(b.id)}">
                            ${b.paid ? 'Liquidado' : 'Pagar'}
                          </button>
                          <button type="button" class="icon-btn ghost" title="Eliminar regra mensal" aria-label="Eliminar compromisso" data-action="confirmdeleterecurring" data-id="${esc(b.id)}">
                            ${ic('trash', 15)}
                          </button>
                        </div>
                      </div>
                    </div>`;
                })
                .join('')}
            </div>`
          : renderEmptyState('calendar', 'Sem pagamentos fixos configurados', 'Adiciona renda, internet, propina da faculdade ou pacotes mensais para controlares os prazos.', 'newrecurring', 'Adicionar pagamento fixo')
      }
    </section>
  `;
}

/* ==================== 12. RELATÓRIOS & ANÁLISE ==================== */
function renderReports() {
  const stats = monthStats(vault, period);
  const trend = monthlyTrend(vault, 6);
  const peak = Math.max(...trend.flatMap(t => [t.income, t.expense]), 100);
  const cats = categorySpend(vault, period).filter(c => c.spent > 0).sort((a, b) => b.spent - a.spent);
  const byWallet = walletSpendBreakdown(vault, period);
  const savingsRate = stats.income > 0 ? Math.round(((stats.income - stats.expense) / stats.income) * 100) : 0;
  const dailyAvg = Math.round(stats.expense / 30);
  const transportSpent = cats.find(c => c.name === 'Transporte')?.spent || 0;
  const transportShare = stats.expense > 0 ? pct(transportSpent, stats.expense) : 0;

  let startAngle = 0;
  const donutGradient = cats.length
    ? `conic-gradient(${cats
        .map(c => {
          const from = startAngle;
          startAngle += (c.spent / Math.max(stats.expense, 1)) * 100;
          return `${c.color} ${from}% ${startAngle}%`;
        })
        .join(',')})`
    : '#1f253a';

  return `
    <section class="panel">
      <div class="split-row" style="flex-wrap:wrap;gap:10px">
        <div>
          <h2>Relatório Financeiro • ${esc(ms(period))}</h2>
          <p style="margin:3px 0 0;color:var(--muted);font-size:12px">Análise detalhada de receitas, despesas, canais de pagamento e poupança</p>
        </div>
        <div class="hstack">
          <form id="reportperiod-form" class="hstack">
            <input type="month" name="month" class="input" style="min-height:36px;padding:6px 10px;max-width:155px" value="${esc(period)}" aria-label="Mês do relatório">
            <button type="submit" class="btn sm">Ver</button>
          </form>
          <button type="button" class="btn sm subtle" data-action="csv">
            ${ic('download', 14)} CSV
          </button>
        </div>
      </div>
    </section>

    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Saldo Líquido do Mês</div>
        <div class="kpi-value" style="color:${stats.net >= 0 ? 'var(--positive)' : 'var(--negative)'}">${stats.net >= 0 ? '+' : ''}${money(stats.net)}</div>
        <div class="kpi-sub">Taxa líquida: ${savingsRate}%</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Média Diária de Gasto</div>
        <div class="kpi-value">${money(dailyAvg)}</div>
        <div class="kpi-sub">${stats.count} movimento(s) no mês</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Peso do Transporte</div>
        <div class="kpi-value">${transportShare}%</div>
        <div class="kpi-sub">${money(transportSpent)} em Transporte</div>
      </div>
    </div>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>Histórico Comparativo (Últimos 6 Meses)</h3>
          <p>Receitas vs. Despesas em Meticais</p>
        </div>
      </div>
      <div class="chart-bars">
        ${trend
          .map(
            t => `
            <div class="bar-group">
              <div class="bar inc" style="height:${Math.max(4, Math.round((t.income / peak) * 100))}%"></div>
              <div class="bar out" style="height:${Math.max(4, Math.round((t.expense / peak) * 100))}%"></div>
            </div>`
          )
          .join('')}
      </div>
      <div class="chart-labels">${trend.map(t => `<span>${esc(t.label)}</span>`).join('')}</div>
      <table class="report-table" style="margin-top:14px">
        <thead>
          <tr>
            <th>Mês</th>
            <th class="num">Receitas</th>
            <th class="num">Despesas</th>
            <th class="num">Resultado</th>
          </tr>
        </thead>
        <tbody>
          ${trend
            .map(
              t => `
              <tr>
                <td><strong>${esc(ms(t.period))}</strong></td>
                <td class="num" style="color:var(--positive)">${money(t.income)}</td>
                <td class="num" style="color:var(--negative)">${money(t.expense)}</td>
                <td class="num"><strong>${money(t.income - t.expense)}</strong></td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>Despesas por Categoria em ${esc(ms(period))}</h3>
          <p>Peso percentual e valor exato por área</p>
        </div>
      </div>
      <div class="donut-layout" style="margin-bottom:16px">
        <div class="donut-ring" style="background:${donutGradient}">
          <div class="donut-center">
            <strong>${money(stats.expense)}</strong>
            <small>total gasto</small>
          </div>
        </div>
        <div class="cat-list">
          ${
            cats.length
              ? cats
                  .map(
                    c => `
                    <div class="cat-row">
                      <div class="cat-row-left">
                        <span class="cat-swatch" style="background:${c.color}"></span>
                        <span>${esc(c.name)} (${c.count})</span>
                      </div>
                      <strong>${money(c.spent)} • ${pct(c.spent, stats.expense)}%</strong>
                    </div>`
                  )
                  .join('')
              : '<p style="color:var(--muted);font-size:12.5px;margin:0">Sem despesas registadas neste período.</p>'
          }
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>Despesas por Canal / Conta</h3>
          <p>Utilização de Carteira, M-Pesa, e-Mola e Bancos em ${esc(ms(period))}</p>
        </div>
      </div>
      <table class="report-table">
        <thead>
          <tr>
            <th>Conta Financeira</th>
            <th class="num">Despesas no Mês</th>
            <th class="num">Quota</th>
          </tr>
        </thead>
        <tbody>
          ${byWallet
            .map(
              w => `
              <tr>
                <td>${esc(w.name)}</td>
                <td class="num">${money(w.spent)}</td>
                <td class="num"><strong>${w.share}%</strong></td>
              </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </section>
  `;
}

/* ==================== 13. DEFINIÇÕES ==================== */
function renderSettings() {
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Perfil & Segurança do Cofre</h2>
          <p>Conta local ativa neste dispositivo</p>
        </div>
        <span class="badge ok">${ic('shield', 13)} AES-256-GCM</span>
      </div>
      <div class="split-row" style="padding:14px;background:var(--bg-elevated);border-radius:15px;border:1px solid var(--border);margin-bottom:14px">
        <div class="hstack">
          <div class="avatar">${esc(vault.profile.name.slice(0, 1).toUpperCase())}</div>
          <div>
            <strong style="font-size:15px;display:block">${esc(vault.profile.name)}</strong>
            <small style="color:var(--muted);font-size:12px">Identificador: ${esc(currentUser)} • Moeda: MZN (MT)</small>
          </div>
        </div>
        <button type="button" class="btn sm" data-action="editprofile">
          ${ic('edit', 14)} Editar nome
        </button>
      </div>
      <div class="hstack" style="flex-wrap:wrap">
        <button type="button" class="btn" style="flex:1" data-action="changepass">
          ${ic('lock', 15)} Alterar palavra-passe
        </button>
        <button type="button" class="btn danger" style="flex:1" data-action="logout">
          ${ic('logout', 15)} Bloquear e sair
        </button>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>Cópias de Segurança & Exportação</h3>
          <p>Guarda uma cópia encriptada dos teus dados ou exporta para folha de cálculo</p>
        </div>
      </div>
      <p style="color:var(--text-secondary);font-size:12.5px;margin:0 0 14px">
        Os teus dados financeiros permanecem exclusivamente no teu telemóvel. Exporta regularmente uma cópia de segurança encriptada (.json) para poderes recuperar a tua conta caso mudes de telemóvel.
      </p>
      <div class="hstack" style="flex-wrap:wrap">
        <button type="button" class="btn primary" style="flex:1" data-action="backup">
          ${ic('download', 15)} Exportar Backup Encriptado (.json)
        </button>
        <button type="button" class="btn" style="flex:1" data-action="csv">
          ${ic('download', 15)} Exportar Movimentos (.csv)
        </button>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>Módulos e Ferramentas</h3>
          <p>Acesso direto a todas as áreas do BolsoMZ</p>
        </div>
      </div>
      <div class="hstack" style="flex-wrap:wrap">
        <button type="button" class="btn sm" data-action="nav" data-view="recurring">${ic('calendar', 14)} Pagamentos Fixos</button>
        <button type="button" class="btn sm" data-action="nav" data-view="transport">${ic('bus', 14)} Rotina de Chapa</button>
        <button type="button" class="btn sm" data-action="nav" data-view="budgets">${ic('pie', 14)} Orçamentos</button>
        <button type="button" class="btn sm" data-action="nav" data-view="goals">${ic('target', 14)} Metas de Poupança</button>
        <button type="button" class="btn sm" data-action="nav" data-view="reports">${ic('chart', 14)} Relatórios</button>
        <button type="button" class="btn sm" data-action="showonboarding">${ic('info', 14)} Rever Apresentação</button>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>Sobre o BolsoMZ</h3>
          <p>Versão 2.0 • Finanças Pessoais para Moçambique</p>
        </div>
      </div>
      <p style="color:var(--muted);font-size:12px;margin:0;line-height:1.6">
        Concebido para gerir Carteira, M-Pesa, e-Mola, Contas Bancárias, Rotina de Chapa, Orçamentos e Metas de Poupança com funcionamento integralmente offline e proteção criptográfica PBKDF2 (260.000 iterações SHA-256) + AES-256-GCM.
      </p>
    </section>
  `;
}

function renderEmptyState(iconName, titleText, descText, actionName, actionLabel) {
  return `
    <div class="empty-state">
      <div class="empty-icon">${ic(iconName, 22)}</div>
      <strong>${esc(titleText)}</strong>
      <p>${esc(descText)}</p>
      ${actionName ? `<button type="button" class="btn sm primary" data-action="${esc(actionName)}">${ic('plus', 14)} ${esc(actionLabel)}</button>` : ''}
    </div>
  `;
}

/* ==================== 6. MODALS (NOVA DESPESA/RECEITA, CONTAS, METAS, RESTAURO, CONFIRMAÇÃO) ==================== */
function modalBox(titleText, bodyHtml) {
  return `
    <div class="modal-backdrop" data-action="backdrop">
      <section role="dialog" aria-modal="true" aria-label="${esc(titleText)}" class="modal-sheet">
        <div class="modal-header">
          <h2>${esc(titleText)}</h2>
          <button type="button" class="icon-btn" data-action="closemodal" aria-label="Fechar">${ic('close', 17)}</button>
        </div>
        ${bodyHtml}
      </section>
    </div>
  `;
}

function renderModal() {
  if (!modal) return '';

  if (modal.type === 'transaction') {
    const isIncome = txType === 'income';
    const isTransfer = txType === 'transfer';
    const presetCategory = modal.presetCat || (isIncome ? 'Salário' : 'Transporte');

    return modalBox(
      isIncome ? 'Registar Nova Receita' : isTransfer ? 'Transferir Entre Contas' : 'Registar Nova Despesa',
      `
        <div class="segment-control" role="tablist">
          ${[
            ['expense', 'Despesa'],
            ['income', 'Receita'],
            ['transfer', 'Transferência']
          ]
            .map(
              ([k, label]) =>
                `<button type="button" class="segment-btn ${k === txType ? 'active' : ''}" data-action="txtype" data-kind="${k}">${label}</button>`
            )
            .join('')}
        </div>

        <form id="tx-form" class="fields-grid">
          <div class="field span2">
            <label for="f-amount">Valor (MT)</label>
            <input id="f-amount" name="amount" class="input" type="number" min="0.01" step="0.01" required placeholder="Ex.: 150.00">
            <div class="preset-chips">
              ${[20, 50, 100, 200, 500, 1000]
                .map(v => `<button type="button" class="preset-chip" data-action="presetamount" data-val="${v}">${v} MT</button>`)
                .join('')}
            </div>
          </div>

          ${
            isTransfer
              ? `<div class="field">
                  <label for="f-from">Conta de origem</label>
                  <select id="f-from" name="fromWallet" class="select">${walletOptions('cash')}</select>
                </div>
                <div class="field">
                  <label for="f-to">Conta de destino</label>
                  <select id="f-to" name="toWallet" class="select">${walletOptions('mpesa')}</select>
                </div>`
              : `<div class="field">
                  <label for="f-wallet">Conta financeira</label>
                  <select id="f-wallet" name="walletId" class="select">${walletOptions('cash', 'savings')}</select>
                </div>
                <div class="field">
                  <label for="f-category">Categoria</label>
                  <select id="f-category" name="category" class="select">${catOptions(presetCategory, isIncome)}</select>
                </div>`
          }

          <div class="field">
            <label for="f-date">Data</label>
            <input id="f-date" name="date" type="date" class="input" required value="${today()}">
          </div>

          ${
            !isIncome
              ? `<div class="field">
                  <label for="f-fee">Taxa M-Pesa / e-Mola (opcional, MT)</label>
                  <input id="f-fee" name="fee" class="input" type="number" min="0" step="0.01" placeholder="0.00">
                </div>`
              : `<div class="field">
                  <label for="f-note-short">Referência</label>
                  <input id="f-note-short" name="note" class="input" maxlength="100" placeholder="Ex.: Salário mensal">
                </div>`
          }

          ${
            !isIncome
              ? `<div class="field span2">
                  <label for="f-note">Descrição</label>
                  <input id="f-note" name="note" class="input" maxlength="100" placeholder="${isTransfer ? 'Ex.: Levantamento / transferência para M-Pesa' : 'Ex.: Almoço, pacote de dados, chapa'}">
                </div>`
              : ''
          }

          <div class="field span2" style="margin-top:4px">
            <button type="submit" class="btn primary full">
              ${ic('check', 16)} Guardar ${isIncome ? 'receita' : isTransfer ? 'transferência' : 'despesa'}
            </button>
          </div>
        </form>
      `
    );
  }

  if (modal.type === 'goal') {
    return modalBox(
      'Criar Meta de Poupança',
      `
        <form id="goal-form" class="fields-grid">
          <div class="field span2">
            <label for="f-goal-name">Nome do objetivo</label>
            <input id="f-goal-name" class="input" name="name" required maxlength="55" placeholder="Ex.: Comprar computador portátil">
          </div>
          <div class="field">
            <label for="f-goal-target">Valor objetivo (MT)</label>
            <input id="f-goal-target" class="input" name="target" type="number" step="0.01" min="0.01" required placeholder="Ex.: 35000">
          </div>
          <div class="field">
            <label for="f-goal-icon">Ícone da meta</label>
            <select class="select" name="icon" id="f-goal-icon">
              ${GOAL_ICONS.map(g => `<option value="${esc(g.id)}">${esc(g.label)}</option>`).join('')}
            </select>
          </div>
          <div class="field span2">
            <label for="f-goal-deadline">Data-limite pretendida (opcional)</label>
            <input id="f-goal-deadline" class="input" name="deadline" type="date">
          </div>
          <div class="field span2">
            <button class="btn primary full" type="submit">${ic('check', 16)} Criar meta de poupança</button>
          </div>
        </form>
      `
    );
  }

  if (modal.type === 'goalflow') {
    const g = vault.goals.find(x => x.id === modal.goalId);
    if (!g) return '';
    const isSave = goalAction === 'goal';
    return modalBox(
      `${isSave ? 'Reforçar Meta' : 'Resgatar da Meta'}: ${g.name}`,
      `
        <div class="callout" style="margin-top:0;margin-bottom:14px">
          ${ic('target', 16)}
          <div>Reservado atualmente: <strong>${money(goalSaved(vault, g.id))}</strong> de ${money(g.target)}</div>
        </div>
        <form class="fields-grid" id="goalflow-form">
          <div class="field span2">
            <label for="f-gf-amount">Montante (MT)</label>
            <input class="input" id="f-gf-amount" type="number" name="amount" min="0.01" step="0.01" required placeholder="Ex.: 500.00">
          </div>
          <div class="field span2">
            <label for="f-gf-wallet">${isSave ? 'Transferir a partir da conta' : 'Devolver para a conta'}</label>
            <select class="select" id="f-gf-wallet" name="walletId">${walletOptions('cash', 'savings')}</select>
          </div>
          <div class="field span2">
            <button class="btn primary full" type="submit">${ic('check', 16)} ${isSave ? 'Confirmar reforço' : 'Confirmar resgate'}</button>
          </div>
        </form>
      `
    );
  }

  if (modal.type === 'budget') {
    return modalBox(
      'Definir Orçamentos Mensais (MT)',
      `
        <p style="color:var(--muted);font-size:12.5px;margin:0 0 14px">Define o limite mensal para cada categoria. Deixa em branco ou zero se não quiseres limite.</p>
        <form class="fields-grid" id="budget-form">
          ${CATEGORIES.map(
            c => `
            <div class="field">
              <label for="f-bud-${esc(c.name)}">${esc(c.name)} (MT)</label>
              <input id="f-bud-${esc(c.name)}" class="input" name="${esc(c.name)}" type="number" min="0" step="0.01" placeholder="Sem limite" value="${vault.budgets[c.name] ? fnum(vault.budgets[c.name]) : ''}">
            </div>`
          ).join('')}
          <div class="field span2" style="margin-top:6px">
            <button type="submit" class="btn primary full">${ic('check', 16)} Guardar limites mensais</button>
          </div>
        </form>
      `
    );
  }

  if (modal.type === 'recurring') {
    return modalBox(
      'Novo Pagamento Fixo Mensal',
      `
        <form id="recurring-form" class="fields-grid">
          <div class="field span2">
            <label for="f-rec-name">Descrição do compromisso</label>
            <input id="f-rec-name" class="input" name="name" required maxlength="65" placeholder="Ex.: Pacote de Internet / Propina">
          </div>
          <div class="field">
            <label for="f-rec-amount">Valor mensal (MT)</label>
            <input id="f-rec-amount" class="input" name="amount" type="number" min="0.01" step="0.01" required placeholder="Ex.: 1500.00">
          </div>
          <div class="field">
            <label for="f-rec-day">Dia de vencimento (1–31)</label>
            <input id="f-rec-day" class="input" name="dueDay" type="number" min="1" max="31" step="1" required value="10">
          </div>
          <div class="field">
            <label for="f-rec-cat">Categoria</label>
            <select class="select" id="f-rec-cat" name="category">${catOptions('Internet')}</select>
          </div>
          <div class="field">
            <label for="f-rec-wallet">Conta habitual</label>
            <select class="select" id="f-rec-wallet" name="walletId">${walletOptions('mpesa', 'savings')}</select>
          </div>
          <div class="field span2">
            <button class="btn primary full" type="submit">${ic('check', 16)} Guardar pagamento fixo</button>
          </div>
        </form>
      `
    );
  }

  if (modal.type === 'wallet') {
    return modalBox(
      'Adicionar Nova Conta Financeira',
      `
        <form id="wallet-form" class="fields-grid">
          <div class="field span2">
            <label for="f-wal-name">Nome da conta</label>
            <input id="f-wal-name" class="input" name="name" required maxlength="35" placeholder="Ex.: Millennium bim / BCI">
          </div>
          <div class="field">
            <label for="f-wal-type">Tipo de conta</label>
            <select class="select" id="f-wal-type" name="type">
              <option value="bank">Conta Bancária</option>
              <option value="mobile">Carteira Móvel</option>
              <option value="cash">Numerário / Cofre</option>
            </select>
          </div>
          <div class="field">
            <label for="f-wal-open">Saldo inicial (MT)</label>
            <input id="f-wal-open" class="input" name="opening" type="number" min="0" step="0.01" value="0">
          </div>
          <div class="field span2">
            <button class="btn primary full" type="submit">${ic('check', 16)} Criar conta financeira</button>
          </div>
        </form>
      `
    );
  }

  if (modal.type === 'editwallet') {
    const w = vault.wallets.find(x => x.id === modal.walletId);
    if (!w) return '';
    return modalBox(
      `Configurar Conta: ${w.name}`,
      `
        <form id="editwallet-form" class="fields-grid">
          <input type="hidden" name="walletId" value="${esc(w.id)}">
          <div class="field span2">
            <label for="f-ew-name">Nome da conta</label>
            <input id="f-ew-name" class="input" name="name" required maxlength="35" value="${esc(w.name)}">
          </div>
          <div class="field">
            <label for="f-ew-provider">Instituição / Descrição</label>
            <input id="f-ew-provider" class="input" name="provider" maxlength="40" value="${esc(w.provider || '')}">
          </div>
          <div class="field">
            <label for="f-ew-open">Saldo inicial base (MT)</label>
            <input id="f-ew-open" class="input" name="opening" type="number" min="0" step="0.01" required value="${fnum(w.opening)}">
          </div>
          <div class="field span2">
            <button class="btn primary full" type="submit">${ic('check', 16)} Atualizar conta financeira</button>
          </div>
        </form>
      `
    );
  }

  if (modal.type === 'editprofile') {
    return modalBox(
      'Editar Nome de Perfil',
      `
        <form id="profile-form" class="fields-grid">
          <div class="field span2">
            <label for="f-prof-name">Como preferes ser tratado?</label>
            <input id="f-prof-name" class="input" name="name" required maxlength="60" value="${esc(vault.profile.name)}">
          </div>
          <div class="field span2">
            <button class="btn primary full" type="submit">${ic('check', 16)} Guardar nome</button>
          </div>
        </form>
      `
    );
  }

  if (modal.type === 'password') {
    return modalBox(
      'Alterar Palavra-passe do Cofre',
      `
        <p style="color:var(--muted);font-size:12.5px;margin:0 0 14px">O teu cofre será reencriptado com uma nova chave AES-256-GCM.</p>
        <form id="password-form" class="fields-grid">
          <div class="field span2">
            <label for="f-pw-old">Palavra-passe atual</label>
            <input id="f-pw-old" name="old" type="password" class="input" required autocomplete="current-password">
          </div>
          <div class="field span2">
            <label for="f-pw-new">Nova palavra-passe (mínimo 10 caracteres)</label>
            <input id="f-pw-new" name="new" type="password" class="input" minlength="10" required autocomplete="new-password">
          </div>
          <div class="field span2">
            <label for="f-pw-confirm">Confirmar nova palavra-passe</label>
            <input id="f-pw-confirm" name="confirm" type="password" class="input" minlength="10" required autocomplete="new-password">
          </div>
          <div class="field span2">
            <button class="btn primary full" type="submit">${ic('shield', 16)} Atualizar e reencriptar cofre</button>
          </div>
        </form>
      `
    );
  }

  if (modal.type === 'restore') {
    return modalBox(
      'Restaurar Cópia de Segurança',
      `
        <p style="color:var(--text-secondary);font-size:12.5px;margin:0 0 14px">
          Ficheiro selecionado: <strong>${esc(pendingRestoreFilename || 'backup.json')}</strong>.<br>
          Introduz a palavra-passe com que esta cópia foi protegida para desencriptar e restaurar a conta.
        </p>
        <form id="restore-form" class="fields-grid">
          <div class="field span2">
            <label for="f-restore-pass">Palavra-passe da cópia de segurança</label>
            <div class="input-wrap">
              <input id="f-restore-pass" name="password" type="password" class="input" required placeholder="Palavra-passe da cópia">
              <button type="button" class="pass-toggle" data-action="togglepass" data-target="f-restore-pass" aria-label="Mostrar palavra-passe">
                ${ic('eye', 17)}
              </button>
            </div>
          </div>
          <div class="field span2">
            <button type="submit" class="btn primary full">${ic('upload', 16)} Desencriptar e restaurar conta</button>
          </div>
        </form>
      `
    );
  }

  if (modal.type === 'confirm') {
    return modalBox(
      modal.title || 'Confirmar Operação',
      `
        <p style="color:var(--text-secondary);font-size:13.5px;margin:0 0 18px;line-height:1.6">${esc(modal.message)}</p>
        <div class="hstack">
          <button type="button" class="btn full" data-action="closemodal">Cancelar</button>
          <button type="button" class="btn ${modal.danger ? 'danger' : 'primary'} full" data-action="${esc(modal.confirmAction)}" data-id="${esc(modal.targetId || '')}">
            ${esc(modal.confirmLabel || 'Confirmar')}
          </button>
        </div>
      `
    );
  }

  return '';
}

/* ==================== MAIN SHELL RENDER ==================== */
function render() {
  if (screenState === 'splash') {
    root.innerHTML = renderSplash();
    return;
  }
  if (screenState === 'onboarding') {
    root.innerHTML = renderOnboarding();
    return;
  }
  if (!vault || screenState === 'login' || screenState === 'signup') {
    root.innerHTML = renderAuth();
    return;
  }

  const displayDate = new Intl.DateTimeFormat('pt-MZ', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
  const viewRenderers = {
    dashboard: renderDashboard,
    transactions: renderTransactions,
    accounts: renderAccounts,
    transport: renderTransport,
    goals: renderGoals,
    budgets: renderBudgets,
    recurring: renderRecurring,
    reports: renderReports,
    settings: renderSettings
  };

  root.innerHTML = `
    <div class="app-container">
      <header class="top-bar">
        <div class="top-user">
          <div class="avatar">${esc(vault.profile.name.slice(0, 1).toUpperCase())}</div>
          <div class="top-user-meta">
            <span class="greeting">${esc(vault.profile.name)} • ${esc(displayDate)}</span>
            <h1 class="screen-heading">${esc(viewTitle())}</h1>
          </div>
        </div>
        <div class="top-bar-actions">
          <button type="button" class="icon-btn" title="Nova operação" aria-label="Nova operação" data-action="newtx">
            ${ic('plus', 18)}
          </button>
          <button type="button" class="icon-btn" title="Definições" aria-label="Definições" data-action="nav" data-view="settings">
            ${ic('settings', 18)}
          </button>
          <button type="button" class="icon-btn" title="Bloquear cofre" aria-label="Bloquear cofre" data-action="logout">
            ${ic('lock', 17)}
          </button>
        </div>
      </header>

      <nav class="module-strip" aria-label="Módulos financeiros">
        ${MODULES.map(
          ([k, iconName, label]) => `
            <button type="button" class="module-pill ${view === k ? 'active' : ''}" data-action="nav" data-view="${k}">
              ${ic(iconName, 14)}
              <span>${esc(label)}</span>
            </button>`
        ).join('')}
      </nav>

      <main>
        ${(viewRenderers[view] || renderDashboard)()}
      </main>
    </div>

    <nav class="bottom-nav" aria-label="Navegação principal">
      <div class="bottom-nav-inner">
        <button type="button" class="nav-item ${view === 'dashboard' ? 'active' : ''}" data-action="nav" data-view="dashboard">
          ${ic('home', 20)}
          <span>Início</span>
        </button>
        <button type="button" class="nav-item ${view === 'transactions' ? 'active' : ''}" data-action="nav" data-view="transactions">
          ${ic('receipt', 20)}
          <span>Histórico</span>
        </button>
        <button type="button" class="nav-fab" data-action="newtx" aria-label="Registar movimento">
          ${ic('plus', 24)}
        </button>
        <button type="button" class="nav-item ${view === 'accounts' ? 'active' : ''}" data-action="nav" data-view="accounts">
          ${ic('wallet', 20)}
          <span>Contas</span>
        </button>
        <button type="button" class="nav-item ${view === 'reports' ? 'active' : ''}" data-action="nav" data-view="reports">
          ${ic('chart', 20)}
          <span>Relatórios</span>
        </button>
      </div>
    </nav>

    ${modal ? renderModal() : ''}
  `;
  requestAnimationFrame(() => {
    document.querySelector('.module-pill.active')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  });
}

async function commit(next, message = 'Alterações guardadas no cofre.') {
  if (writing) {
    throw new Error('Aguarda um momento enquanto guardamos a operação anterior.');
  }
  writing = true;
  try {
    const job = persist(currentUser, structuredClone(next), key);
    activeWrite = job;
    await job;
    vault = next;
    render();
    toast(message);
  } catch (error) {
    render();
    throw error;
  } finally {
    writing = false;
  }
}

function closeModal() {
  modal = null;
  render();
}

function download(filename, content, mime) {
  if (globalThis.BolsoMZAndroid?.saveFile) {
    globalThis.BolsoMZAndroid.saveFile(filename, content, mime);
    return;
  }
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

const safeCsv = value => {
  let text = String(value ?? '');
  if (/^[\s]*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
};

function makeCsv() {
  const rows = [
    ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor MT', 'Conta Origem', 'Conta Destino'],
    ...vault.transactions
      .slice()
      .sort(sortTx)
      .map(t => [
        t.date,
        t.type,
        t.category || '',
        t.note || '',
        (t.amount / 100).toFixed(2),
        vault.wallets.find(w => w.id === (t.walletId || t.fromWallet))?.name || '',
        vault.wallets.find(w => w.id === t.toWallet)?.name || ''
      ])
  ];
  return '\ufeff' + rows.map(r => r.map(safeCsv).join(';')).join('\r\n');
}

/* ==================== ACTION HANDLERS ==================== */
async function runAction(btn) {
  const act = btn.dataset.action;
  try {
    if (writing && ['recordcommute', 'deletegoal', 'deletetx', 'payrecurring', 'deleterecurring'].includes(act)) {
      throw new Error('Aguarda a conclusão da gravação anterior.');
    }

    if (act === 'skipsplash') {
      users = await listUsers();
      screenState = users.length > 0 ? 'login' : isOnboarded() ? 'signup' : 'onboarding';
      render();
    } else if (act === 'showonboarding') {
      onboardingStep = 0;
      screenState = 'onboarding';
      render();
    } else if (act === 'obnext') {
      onboardingStep = Math.min(ONBOARDING_SLIDES.length - 1, onboardingStep + 1);
      render();
    } else if (act === 'obprev') {
      onboardingStep = Math.max(0, onboardingStep - 1);
      render();
    } else if (act === 'obstep') {
      onboardingStep = Number(btn.dataset.step) || 0;
      render();
    } else if (act === 'finishonboarding') {
      setOnboarded();
      screenState = btn.dataset.target || (users.length ? 'login' : 'signup');
      render();
    } else if (act === 'authmode') {
      screenState = btn.dataset.mode === 'signup' ? 'signup' : 'login';
      modal = null;
      render();
    } else if (act === 'pickuser') {
      const input = document.getElementById('auth-user-id');
      if (input) input.value = btn.dataset.userid || '';
      document.querySelectorAll('.user-chip').forEach(c => c.classList.toggle('selected', c === btn));
      document.getElementById('auth-pass')?.focus();
    } else if (act === 'togglepass') {
      const target = document.getElementById(btn.dataset.target);
      if (target) {
        target.type = target.type === 'password' ? 'text' : 'password';
      }
    } else if (act === 'nav') {
      view = btn.dataset.view || 'dashboard';
      modal = null;
      render();
      window.scrollTo(0, 0);
    } else if (act === 'settxfilter') {
      txFilter = btn.dataset.filter || 'all';
      render();
    } else if (act === 'newtx') {
      txType = btn.dataset.kind || 'expense';
      modal = { type: 'transaction', presetCat: btn.dataset.presetcat || '' };
      render();
    } else if (act === 'presetamount') {
      const input = document.getElementById('f-amount');
      if (input) input.value = btn.dataset.val || '';
    } else if (act === 'txtype') {
      txType = btn.dataset.kind || 'expense';
      render();
    } else if (act === 'newgoal') {
      modal = { type: 'goal' };
      render();
    } else if (act === 'goalflow') {
      goalAction = btn.dataset.flow || 'goal';
      modal = { type: 'goalflow', goalId: btn.dataset.goal };
      render();
    } else if (act === 'editbudget') {
      modal = { type: 'budget' };
      render();
    } else if (act === 'newrecurring') {
      modal = { type: 'recurring' };
      render();
    } else if (act === 'newwallet') {
      modal = { type: 'wallet' };
      render();
    } else if (act === 'editwallet') {
      modal = { type: 'editwallet', walletId: btn.dataset.id };
      render();
    } else if (act === 'editprofile') {
      modal = { type: 'editprofile' };
      render();
    } else if (act === 'changepass') {
      modal = { type: 'password' };
      render();
    } else if (act === 'closemodal') {
      closeModal();
    } else if (act === 'logout') {
      await activeWrite.catch(() => {});
      vault = null;
      key = null;
      currentUser = null;
      modal = null;
      users = await listUsers();
      screenState = 'login';
      render();
      toast('Sessão terminada e cofre bloqueado.');
    } else if (act === 'recordcommute') {
      await commit(recordCommute(vault), 'Despesa de chapa de hoje registada.');
    } else if (act === 'confirmdeletetx') {
      modal = {
        type: 'confirm',
        title: 'Eliminar movimento financeiro',
        message: 'Tens a certeza de que pretendes eliminar este movimento? O saldo da conta será recalculado imediatamente.',
        confirmAction: 'deletetx',
        confirmLabel: 'Eliminar movimento',
        targetId: btn.dataset.id,
        danger: true
      };
      render();
    } else if (act === 'deletetx') {
      const targetId = btn.dataset.id;
      modal = null;
      await commit(removeTransaction(vault, targetId), 'Movimento eliminado.');
    } else if (act === 'confirmdeletegoal') {
      modal = {
        type: 'confirm',
        title: 'Eliminar meta de poupança',
        message: 'Confirmas a eliminação desta meta? Só é possível eliminar metas sem saldo reservado.',
        confirmAction: 'deletegoal',
        confirmLabel: 'Eliminar meta',
        targetId: btn.dataset.id,
        danger: true
      };
      render();
    } else if (act === 'deletegoal') {
      const targetId = btn.dataset.id;
      modal = null;
      await commit(deleteGoal(vault, targetId), 'Meta eliminada.');
    } else if (act === 'confirmpayrecurring') {
      const b = recurringForMonth(vault, period).find(x => x.id === btn.dataset.id);
      modal = {
        type: 'confirm',
        title: 'Confirmar pagamento mensal',
        message: `Confirmas a liquidação de "${b?.name || 'compromisso'}" no valor de ${money(b?.amount || 0)}? O montante será debitado da conta selecionada.`,
        confirmAction: 'payrecurring',
        confirmLabel: 'Confirmar pagamento',
        targetId: btn.dataset.id,
        danger: false
      };
      render();
    } else if (act === 'payrecurring') {
      const targetId = btn.dataset.id;
      modal = null;
      const dueDate = recurringForMonth(vault, period).find(b => b.id === targetId)?.dueDate;
      await commit(
        payRecurring(vault, targetId, period, period === month() ? today() : dueDate),
        'Pagamento mensal registado.'
      );
    } else if (act === 'confirmdeleterecurring') {
      modal = {
        type: 'confirm',
        title: 'Remover regra de pagamento fixo',
        message: 'Desejas remover este compromisso mensal? Os pagamentos já efetuados permanecem no histórico.',
        confirmAction: 'deleterecurring',
        confirmLabel: 'Remover compromisso',
        targetId: btn.dataset.id,
        danger: true
      };
      render();
    } else if (act === 'deleterecurring') {
      const targetId = btn.dataset.id;
      modal = null;
      await commit(deleteRecurring(vault, targetId), 'Compromisso mensal removido.');
    } else if (act === 'backup') {
      await activeWrite;
      download(`BolsoMZ-backup-${today()}.json`, await backup(currentUser), 'application/json');
      toast('Cópia de segurança encriptada exportada.');
    } else if (act === 'csv') {
      download(`BolsoMZ-movimentos-${today()}.csv`, makeCsv(), 'text/csv;charset=utf-8');
      toast('Relatório CSV exportado com sucesso.');
    } else if (act === 'choosebackup') {
      document.getElementById('restore-file')?.click();
    }
  } catch (e) {
    toast(e.message || 'Não foi possível concluir a operação.', true);
  }
}

root.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  if (btn.dataset.action === 'backdrop') {
    if (e.target !== btn) return;
    closeModal();
    return;
  }
  runAction(btn);
});

/* ==================== FORM SUBMISSIONS (DOM-CLOBBERING SAFE) ==================== */
root.addEventListener('submit', async e => {
  e.preventDefault();
  if (busy) return;
  busy = true;

  const f = e.target;
  // Uso estrito de getAttribute('id') para impedir DOM Clobbering por inputs internos
  const formId = f.getAttribute('id') || '';
  const d = new FormData(f);
  const s = k => String(d.get(k) || '').trim();
  const raw = k => String(d.get(k) ?? '');

  try {
    if (formId === 'signup-form') {
      const pass = raw('password');
      const conf = raw('confirm');
      if (pass !== conf) {
        throw new Error('A confirmação da palavra-passe não coincide.');
      }
      const uid = normalizeUser(s('userId') || s('id'));
      const displayName = s('name');
      const initialOpenings = {
        cash: centsAllowZero(s('initCash')),
        mpesa: centsAllowZero(s('initMpesa')),
        emola: centsAllowZero(s('initEmola')),
        bank: centsAllowZero(s('initBank')),
        savings: 0
      };
      const val = emptyVault(displayName, uid, initialOpenings);
      key = await createUser({ id: uid, name: displayName, password: pass, vault: val });
      currentUser = uid;
      vault = val;
      users = await listUsers();
      screenState = 'app';
      view = 'dashboard';
      modal = null;
      render();
      toast(`Conta criada com sucesso. Bem-vindo, ${displayName}!`);
    } else if (formId === 'login-form') {
      const uid = normalizeUser(s('userId') || s('id'));
      const pass = raw('password');
      const result = await loginUser(uid, pass);
      vault = result.vault;
      key = result.key;
      currentUser = result.record.id;
      users = await listUsers();
      screenState = 'app';
      view = 'dashboard';
      modal = null;
      render();
      toast(`Bem-vindo de volta, ${vault.profile.name}!`);
    } else if (formId === 'tx-form') {
      const amount = cents(s('amount'));
      const date = s('date');
      const note = s('note');
      const fee = centsAllowZero(s('fee'));
      const entry = { type: txType, amount, date, note, fee };
      if (txType === 'transfer') {
        entry.fromWallet = s('fromWallet');
        entry.toWallet = s('toWallet');
      } else {
        entry.walletId = s('walletId');
        entry.category = s('category');
      }
      const next = addTransaction(vault, entry);
      modal = null;
      await commit(next, 'Movimento registado com sucesso.');
    } else if (formId === 'goal-form') {
      const next = addGoal(vault, {
        name: s('name'),
        target: cents(s('target')),
        deadline: s('deadline'),
        icon: s('icon')
      });
      modal = null;
      await commit(next, 'Meta de poupança criada.');
    } else if (formId === 'goalflow-form') {
      const amount = cents(s('amount'));
      const wallet = s('walletId');
      const next =
        goalAction === 'goal'
          ? contributeGoal(vault, modal.goalId, amount, wallet)
          : withdrawGoal(vault, modal.goalId, amount, wallet);
      modal = null;
      await commit(next, goalAction === 'goal' ? 'Reforço transferido para a meta.' : 'Valor resgatado da meta.');
    } else if (formId === 'budget-form') {
      const data = {};
      for (const c of CATEGORIES) {
        const val = s(c.name);
        if (val && Number(val.replace(',', '.')) > 0) {
          data[c.name] = cents(val);
        }
      }
      modal = null;
      await commit({ ...vault, budgets: data }, 'Orçamentos mensais atualizados.');
    } else if (formId === 'wallet-form') {
      const name = s('name');
      const type = s('type');
      const opening = centsAllowZero(s('opening'));
      if (!name || name.length > 35) throw new Error('Introduz um nome válido para a conta.');
      if (vault.wallets.some(w => w.name.toLowerCase() === name.toLowerCase())) {
        throw new Error('Já existe uma conta financeira com este nome.');
      }
      if (!['cash', 'mobile', 'bank'].includes(type)) throw new Error('Tipo de conta inválido.');
      const palette = { cash: '#8B7CFF', mobile: '#F59E0B', bank: '#38BDF8' };
      modal = null;
      await commit(
        {
          ...vault,
          wallets: [
            ...vault.wallets,
            {
              id: id(),
              name,
              type,
              opening,
              color: palette[type] || '#8B7CFF',
              provider: type === 'mobile' ? 'Carteira Móvel' : type === 'bank' ? 'Conta Bancária' : 'Numerário'
            }
          ]
        },
        'Nova conta financeira adicionada.'
      );
    } else if (formId === 'editwallet-form') {
      const next = updateWallet(vault, {
        walletId: s('walletId'),
        name: s('name'),
        opening: centsAllowZero(s('opening')),
        provider: s('provider')
      });
      modal = null;
      await commit(next, 'Conta financeira atualizada.');
    } else if (formId === 'profile-form') {
      const name = s('name');
      if (!name || name.length > 60) throw new Error('Introduz um nome válido.');
      modal = null;
      await commit({ ...vault, profile: { ...vault.profile, name } }, 'Nome de perfil atualizado.');
    } else if (formId === 'commute-form') {
      const cost = cents(s('oneWay'));
      const trips = Number(s('trips'));
      const days = Number(s('days'));
      const walletId = s('wallet');
      const routeLabel = s('routeLabel') || 'Casa ⇄ Faculdade / Trabalho';
      if (
        !Number.isInteger(trips) ||
        trips < 1 ||
        trips > 10 ||
        !Number.isInteger(days) ||
        days < 1 ||
        days > 31 ||
        !vault.wallets.some(w => w.id === walletId)
      ) {
        throw new Error('Verifica os valores introduzidos na rotina de transporte.');
      }
      await commit(
        { ...vault, commute: { oneWay: cost, tripsPerDay: trips, daysPerMonth: days, walletId, routeLabel } },
        'Rotina de transporte atualizada.'
      );
    } else if (formId === 'recurring-form') {
      const next = addRecurring(vault, {
        name: s('name'),
        amount: cents(s('amount')),
        category: s('category'),
        walletId: s('walletId'),
        dueDay: Number(s('dueDay'))
      });
      modal = null;
      await commit(next, 'Pagamento fixo mensal adicionado.');
    } else if (formId === 'password-form') {
      const oldPass = raw('old');
      const newPass = raw('new');
      const confPass = raw('confirm');
      if (newPass !== confPass) {
        throw new Error('A confirmação da nova palavra-passe não coincide.');
      }
      await activeWrite;
      key = await changePassword(currentUser, oldPass, newPass);
      modal = null;
      render();
      toast('Palavra-passe atualizada e cofre reencriptado.');
    } else if (formId === 'restore-form') {
      const pass = raw('password');
      const uid = await restore(pendingRestoreText, pass);
      pendingRestoreText = '';
      pendingRestoreFilename = '';
      modal = null;
      users = await listUsers();
      screenState = 'login';
      render();
      toast(`Conta "${uid}" restaurada com sucesso. Introduz a palavra-passe para entrar.`);
    } else if (formId === 'billperiod-form' || formId === 'reportperiod-form') {
      period = s('month') || month();
      render();
    } else if (formId === 'search-form') {
      txSearch = s('query');
      period = s('month') || month();
      render();
    }
  } catch (err) {
    toast(err.message || 'Não foi possível processar o pedido.', true);
  } finally {
    busy = false;
  }
});

root.addEventListener('change', async e => {
  if (e.target?.id !== 'restore-file') return;
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 12_000_000) {
      throw new Error('O ficheiro excede o tamanho máximo permitido (12 MB).');
    }
    pendingRestoreText = await file.text();
    pendingRestoreFilename = file.name;
    modal = { type: 'restore' };
    render();
  } catch (err) {
    toast(err.message || 'Erro ao ler o ficheiro de cópia de segurança.', true);
  } finally {
    e.target.value = '';
  }
});

window.bolsoAndroidBack = () => {
  if (modal) {
    closeModal();
    return true;
  }
  if (vault && view !== 'dashboard') {
    view = 'dashboard';
    render();
    return true;
  }
  if (!vault && screenState === 'signup' && users.length > 0) {
    screenState = 'login';
    render();
    return true;
  }
  return false;
};

window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && modal) closeModal();
});

async function initialize() {
  try {
    render(); // Mostra a Splash Screen imediatamente
    users = await listUsers();

    // Limpar eventuais Service Workers antigos no WebView Android para evitar conflitos de cache
    if (globalThis.BolsoMZAndroid && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())).catch(() => {});
    } else if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    setTimeout(() => {
      if (screenState === 'splash') {
        screenState = users.length > 0 ? 'login' : isOnboarded() ? 'signup' : 'onboarding';
        render();
      }
    }, 450);
  } catch (e) {
    root.innerHTML = `
      <div class="auth-page">
        <div class="auth-card">
          <h1>Não foi possível iniciar o cofre</h1>
          <p>${esc(e.message || 'O armazenamento seguro não está acessível neste ambiente.')}</p>
        </div>
      </div>
    `;
  }
}

initialize();
