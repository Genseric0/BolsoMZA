// BolsoMZ v2 — Motor financeiro em Meticais (MZN), regras de negócio, validação e migração segura v1 -> v2.

export const CATEGORIES = [
  { name: 'Transporte', icon: 'bus', color: '#8B7CFF' },
  { name: 'Alimentação', icon: 'utensils', color: '#F59E0B' },
  { name: 'Faculdade', icon: 'graduation', color: '#38BDF8' },
  { name: 'Compras', icon: 'bag', color: '#EC4899' },
  { name: 'Casa', icon: 'home', color: '#14B8A6' },
  { name: 'Internet', icon: 'wifi', color: '#60A5FA' },
  { name: 'Saúde', icon: 'heart', color: '#F87171' },
  { name: 'Lazer', icon: 'sparkles', color: '#FBBF24' },
  { name: 'Taxas Móveis', icon: 'smartphone', color: '#A78BFA' },
  { name: 'Outros', icon: 'layers', color: '#94A3B8' }
];

export const INCOME_CATEGORIES = [
  'Salário',
  'Bolsa de Estudo',
  'Mesada',
  'Trabalho / Freelance',
  'Negócio / Vendas',
  'Reembolso',
  'Outros'
];

export const GOAL_ICONS = [
  { id: 'laptop', label: 'Computador & Tecnologia' },
  { id: 'shield', label: 'Fundo de Emergência' },
  { id: 'graduation', label: 'Estudos & Propina' },
  { id: 'home', label: 'Casa & Habitação' },
  { id: 'smartphone', label: 'Telemóvel & Equipamento' },
  { id: 'briefcase', label: 'Negócio Próprio' },
  { id: 'plane', label: 'Viagem & Mobilidade' },
  { id: 'target', label: 'Objetivo Pessoal' }
];

const LEGACY_EMOJI_TO_ICON = {
  '🎯': 'target',
  '💻': 'laptop',
  '📱': 'smartphone',
  '🎓': 'graduation',
  '🏠': 'home',
  '🛡️': 'shield',
  '🚗': 'plane',
  '✈️': 'plane'
};

export function id() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function today(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function month(date = today()) {
  return String(date).slice(0, 7);
}

export function cents(value) {
  const normalized = String(value ?? '').trim().replace(/\s/g, '').replace(',', '.');
  if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(normalized)) {
    throw new Error('Introduz um valor numérico válido em Meticais (até duas casas decimais).');
  }
  const [whole, frac = ''] = normalized.split('.');
  const amount = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000_000_00) {
    throw new Error('O valor deve ser superior a 0,00 MT e estar dentro do limite suportado.');
  }
  return amount;
}

export function centsAllowZero(value) {
  const raw = String(value ?? '').trim();
  if (!raw || Number(raw.replace(',', '.')) === 0) return 0;
  return cents(raw);
}

export function money(n) {
  const val = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true
  }).format(val / 100) + ' MT';
}

export function emptyVault(displayName, userId, initialOpenings = {}) {
  const now = new Date().toISOString();
  return {
    version: 1, // Mantém version: 1 para compatibilidade total com backups v1/v2
    schemaRevision: 2,
    profile: {
      name: String(displayName || '').trim() || 'Utilizador',
      userId: String(userId || '').trim().toLowerCase(),
      createdAt: now
    },
    wallets: [
      { id: 'cash', name: 'Carteira', type: 'cash', opening: Number(initialOpenings.cash || 0), color: '#8B7CFF', provider: 'Numerário' },
      { id: 'mpesa', name: 'M-Pesa', type: 'mobile', opening: Number(initialOpenings.mpesa || 0), color: '#EF4444', provider: 'Vodacom M-Pesa' },
      { id: 'emola', name: 'e-Mola', type: 'mobile', opening: Number(initialOpenings.emola || 0), color: '#F59E0B', provider: 'Movitel e-Mola' },
      { id: 'bank', name: 'Conta Bancária', type: 'bank', opening: Number(initialOpenings.bank || 0), color: '#38BDF8', provider: 'Banco Comercial' },
      { id: 'savings', name: 'Poupança', type: 'savings', opening: Number(initialOpenings.savings || 0), color: '#14B8A6', provider: 'Reservas & Metas' }
    ],
    transactions: [],
    goals: [],
    recurring: [],
    budgets: {},
    commute: {
      oneWay: 2000,
      tripsPerDay: 2,
      daysPerMonth: 22,
      walletId: 'cash',
      routeLabel: 'Casa ⇄ Faculdade / Trabalho'
    },
    createdAt: now
  };
}

export function migrateVault(v, fallbackName = 'Utilizador', fallbackId = 'conta') {
  if (!v || typeof v !== 'object') {
    return emptyVault(fallbackName, fallbackId);
  }
  const base = emptyVault(
    v.profile?.name || fallbackName,
    v.profile?.userId || fallbackId
  );
  const wallets = Array.isArray(v.wallets) && v.wallets.length
    ? v.wallets.map(w => ({
        id: String(w.id),
        name: w.id === 'bank' && w.name === 'Banco' ? 'Conta Bancária' : String(w.name || 'Conta'),
        type: ['cash', 'mobile', 'bank', 'savings'].includes(w.type) ? w.type : 'cash',
        opening: Number.isSafeInteger(w.opening) && w.opening >= 0 ? w.opening : 0,
        color: w.color || '#8B7CFF',
        provider: w.provider || (w.id === 'mpesa' ? 'Vodacom M-Pesa' : w.id === 'emola' ? 'Movitel e-Mola' : w.type === 'bank' ? 'Banco Comercial' : w.type === 'savings' ? 'Reservas & Metas' : 'Numerário')
      }))
    : base.wallets;

  // Garantir que a conta savings existe sempre
  if (!wallets.some(w => w.id === 'savings')) {
    wallets.push({ id: 'savings', name: 'Poupança', type: 'savings', opening: 0, color: '#14B8A6', provider: 'Reservas & Metas' });
  }

  const goals = Array.isArray(v.goals)
    ? v.goals.map(g => ({
        ...g,
        id: String(g.id || id()),
        name: String(g.name || 'Meta'),
        target: Number.isSafeInteger(g.target) && g.target > 0 ? g.target : 100000,
        deadline: g.deadline || '',
        icon: g.icon || LEGACY_EMOJI_TO_ICON[g.emoji] || 'target',
        emoji: g.emoji || '🎯'
      }))
    : [];

  const commute = {
    oneWay: Number.isSafeInteger(v.commute?.oneWay) && v.commute.oneWay > 0 ? v.commute.oneWay : 2000,
    tripsPerDay: Number.isInteger(v.commute?.tripsPerDay) && v.commute.tripsPerDay >= 1 ? v.commute.tripsPerDay : 2,
    daysPerMonth: Number.isInteger(v.commute?.daysPerMonth) && v.commute.daysPerMonth >= 1 ? v.commute.daysPerMonth : 22,
    walletId: wallets.some(w => w.id === v.commute?.walletId) ? v.commute.walletId : 'cash',
    routeLabel: String(v.commute?.routeLabel || 'Casa ⇄ Faculdade / Trabalho')
  };

  return {
    ...v,
    version: 1,
    schemaRevision: 2,
    profile: {
      name: String(v.profile?.name || fallbackName).trim(),
      userId: String(v.profile?.userId || fallbackId).trim().toLowerCase(),
      createdAt: v.profile?.createdAt || v.createdAt || base.createdAt
    },
    wallets,
    transactions: Array.isArray(v.transactions) ? v.transactions : [],
    goals,
    recurring: Array.isArray(v.recurring) ? v.recurring : [],
    budgets: v.budgets && typeof v.budgets === 'object' ? v.budgets : {},
    commute,
    createdAt: v.createdAt || base.createdAt
  };
}

export function walletBalance(v, walletId) {
  const wallet = v.wallets.find(w => w.id === walletId);
  if (!wallet) throw new Error('Conta financeira não encontrada.');
  return v.transactions.reduce((sum, t) => {
    if (t.type === 'income' && t.walletId === walletId) return sum + t.amount;
    if (t.type === 'expense' && t.walletId === walletId) return sum - t.amount;
    if (['transfer', 'goal', 'unreserve'].includes(t.type)) {
      if (t.fromWallet === walletId) sum -= t.amount;
      if (t.toWallet === walletId) sum += t.amount;
    }
    return sum;
  }, wallet.opening);
}

export function walletFlow(v, walletId, period = null) {
  const txs = period ? v.transactions.filter(t => t.date.startsWith(period)) : v.transactions;
  let inflows = 0;
  let outflows = 0;
  for (const t of txs) {
    if (t.type === 'income' && t.walletId === walletId) inflows += t.amount;
    else if (t.type === 'expense' && t.walletId === walletId) outflows += t.amount;
    else if (['transfer', 'goal', 'unreserve'].includes(t.type)) {
      if (t.toWallet === walletId) inflows += t.amount;
      if (t.fromWallet === walletId) outflows += t.amount;
    }
  }
  return { inflows, outflows };
}

export function allBalances(v) {
  return v.wallets.map(w => {
    const flow = walletFlow(v, w.id);
    return {
      ...w,
      balance: walletBalance(v, w.id),
      inflows: flow.inflows,
      outflows: flow.outflows
    };
  });
}

export function totalBalance(v) {
  return allBalances(v).reduce((sum, w) => sum + w.balance, 0);
}

export function goalSaved(v, goalId) {
  return v.transactions.reduce(
    (sum, t) =>
      t.goalId === goalId
        ? sum + (t.type === 'goal' ? t.amount : 0) - (t.type === 'unreserve' ? t.amount : 0)
        : sum,
    0
  );
}

export function reservedTotal(v) {
  return v.goals.reduce((s, g) => s + goalSaved(v, g.id), 0);
}

export function monthStats(v, period = month()) {
  const tx = v.transactions.filter(t => t.date.startsWith(period));
  const expenses = tx.filter(t => t.type === 'expense');
  const income = tx.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0);
  const expense = expenses.reduce((a, t) => a + t.amount, 0);
  const goalIn = tx.filter(t => t.type === 'goal').reduce((a, t) => a + t.amount, 0);
  const goalOut = tx.filter(t => t.type === 'unreserve').reduce((a, t) => a + t.amount, 0);
  const saved = Math.max(0, goalIn - goalOut);
  return { income, expense, saved, net: income - expense, expenses, count: tx.length };
}

export function categorySpend(v, period = month()) {
  const expenses = monthStats(v, period).expenses;
  return CATEGORIES.map(c => ({
    ...c,
    spent: expenses.filter(t => t.category === c.name).reduce((a, t) => a + t.amount, 0),
    count: expenses.filter(t => t.category === c.name).length
  }));
}

export function walletSpendBreakdown(v, period = month()) {
  const expenses = monthStats(v, period).expenses;
  const total = expenses.reduce((a, t) => a + t.amount, 0);
  return v.wallets
    .map(w => {
      const spent = expenses.filter(t => t.walletId === w.id).reduce((a, t) => a + t.amount, 0);
      return {
        ...w,
        spent,
        share: total > 0 ? Math.round((spent / total) * 100) : 0
      };
    })
    .filter(w => w.spent > 0 || w.type !== 'savings')
    .sort((a, b) => b.spent - a.spent);
}

export function assertSafe(v) {
  for (const w of v.wallets) {
    if (walletBalance(v, w.id) < 0) {
      throw new Error(`Saldo insuficiente na conta ${w.name}. Verifica o saldo disponível antes de registar.`);
    }
  }
  for (const g of v.goals) {
    if (goalSaved(v, g.id) < 0) {
      throw new Error(`A meta ${g.name} não pode ficar com saldo negativo.`);
    }
  }
  if (reservedTotal(v) > walletBalance(v, 'savings')) {
    throw new Error('O saldo da conta Poupança não pode ficar inferior ao total reservado nas tuas metas.');
  }
}

export function addTransaction(v, entry) {
  if (!Number.isSafeInteger(entry.amount) || entry.amount <= 0) {
    throw new Error('O montante da operação é inválido.');
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) ||
    Number.isNaN(new Date(entry.date + 'T12:00:00').getTime()) ||
    new Date(entry.date + 'T12:00:00').toISOString().slice(0, 10) !== entry.date
  ) {
    throw new Error('Introduz uma data válida.');
  }
  if (!['income', 'expense', 'transfer', 'goal', 'unreserve'].includes(entry.type)) {
    throw new Error('Tipo de movimento inválido.');
  }
  if (['income', 'expense'].includes(entry.type)) {
    if (!v.wallets.some(w => w.id === entry.walletId)) {
      throw new Error('Seleciona uma conta financeira válida.');
    }
    if (entry.type === 'expense' && !CATEGORIES.some(c => c.name === entry.category)) {
      throw new Error('Seleciona uma categoria válida para a despesa.');
    }
  } else {
    if (
      !v.wallets.some(w => w.id === entry.fromWallet) ||
      !v.wallets.some(w => w.id === entry.toWallet) ||
      entry.fromWallet === entry.toWallet
    ) {
      throw new Error('Seleciona contas de origem e destino diferentes e válidas.');
    }
    if (['goal', 'unreserve'].includes(entry.type) && !v.goals.some(g => g.id === entry.goalId)) {
      throw new Error('Meta de poupança não encontrada.');
    }
  }

  const now = new Date().toISOString();
  const newTx = { ...entry, id: id(), createdAt: now };
  const txList = [...v.transactions, newTx];

  // Suporte opcional para taxa de operação móvel (M-Pesa / e-Mola / Bancos)
  if (entry.fee && Number.isSafeInteger(entry.fee) && entry.fee > 0) {
    const feeWallet = entry.type === 'transfer' ? entry.fromWallet : entry.walletId;
    txList.push({
      id: id(),
      type: 'expense',
      walletId: feeWallet,
      amount: entry.fee,
      category: 'Taxas Móveis',
      date: entry.date,
      note: `Taxa de operação (${entry.note || (entry.type === 'transfer' ? 'Transferência' : 'Movimento')})`,
      createdAt: now
    });
  }

  const draft = { ...v, transactions: txList };
  assertSafe(draft);
  return draft;
}

export function removeTransaction(v, txId) {
  if (!v.transactions.some(t => t.id === txId)) {
    throw new Error('Movimento não encontrado.');
  }
  const draft = { ...v, transactions: v.transactions.filter(t => t.id !== txId) };
  assertSafe(draft);
  return draft;
}

export function updateWallet(v, { walletId, name, opening, provider }) {
  const target = v.wallets.find(w => w.id === walletId);
  if (!target) throw new Error('Conta financeira não encontrada.');
  const cleanName = String(name || target.name).trim();
  if (!cleanName || cleanName.length > 35) {
    throw new Error('O nome da conta deve ter entre 1 e 35 caracteres.');
  }
  if (v.wallets.some(w => w.id !== walletId && w.name.toLowerCase() === cleanName.toLowerCase())) {
    throw new Error('Já existe outra conta com este nome.');
  }
  if (!Number.isSafeInteger(opening) || opening < 0) {
    throw new Error('O saldo inicial deve ser zero ou superior.');
  }
  const draft = {
    ...v,
    wallets: v.wallets.map(w =>
      w.id === walletId
        ? { ...w, name: cleanName, opening, provider: String(provider ?? w.provider ?? '').trim() }
        : w
    )
  };
  assertSafe(draft);
  return draft;
}

export function addGoal(v, { name, target, deadline, icon, emoji }) {
  if (!name?.trim() || name.trim().length > 55) {
    throw new Error('O nome da meta deve ter até 55 caracteres.');
  }
  if (!Number.isSafeInteger(target) || target <= 0) {
    throw new Error('Define um valor objetivo válido para a meta.');
  }
  if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    throw new Error('Data-limite inválida.');
  }
  const chosenIcon = icon || LEGACY_EMOJI_TO_ICON[emoji] || 'target';
  return {
    ...v,
    goals: [
      ...v.goals,
      {
        id: id(),
        name: name.trim(),
        target,
        deadline: deadline || '',
        icon: chosenIcon,
        emoji: emoji || '🎯'
      }
    ]
  };
}

export function deleteGoal(v, goalId) {
  const goal = v.goals.find(g => g.id === goalId);
  if (!goal) throw new Error('Meta inexistente.');
  if (goalSaved(v, goalId) > 0) {
    throw new Error('Resgata primeiro o saldo reservado nesta meta antes de a eliminar.');
  }
  return {
    ...v,
    goals: v.goals.filter(g => g.id !== goalId),
    transactions: v.transactions.filter(t => t.goalId !== goalId)
  };
}

export function contributeGoal(v, goalId, amount, walletId, date = today()) {
  if (walletId === 'savings') {
    throw new Error('Seleciona uma conta de origem diferente da Poupança.');
  }
  const goal = v.goals.find(g => g.id === goalId);
  if (!goal) throw new Error('Meta inexistente.');
  if (goalSaved(v, goalId) + amount > goal.target) {
    throw new Error('Este reforço ultrapassa o valor total definido para a meta.');
  }
  return addTransaction(v, {
    type: 'goal',
    goalId,
    amount,
    fromWallet: walletId,
    toWallet: 'savings',
    date,
    note: `Reserva: ${goal.name}`
  });
}

export function withdrawGoal(v, goalId, amount, walletId, date = today()) {
  const goal = v.goals.find(g => g.id === goalId);
  if (!goal) throw new Error('Meta inexistente.');
  if (walletId === 'savings') {
    throw new Error('Escolhe uma conta de destino diferente da Poupança.');
  }
  if (amount > goalSaved(v, goalId)) {
    throw new Error('O valor a resgatar é superior ao montante reservado nesta meta.');
  }
  return addTransaction(v, {
    type: 'unreserve',
    goalId,
    amount,
    fromWallet: 'savings',
    toWallet: walletId,
    date,
    note: `Resgate: ${goal.name}`
  });
}

export function commuteProjection(v) {
  const c = v.commute;
  return {
    day: c.oneWay * c.tripsPerDay,
    week: c.oneWay * c.tripsPerDay * Math.min(7, Math.round(c.daysPerMonth / 4.3)),
    month: c.oneWay * c.tripsPerDay * c.daysPerMonth,
    year: c.oneWay * c.tripsPerDay * c.daysPerMonth * 12
  };
}

export function recordCommute(v, date = today(), customTrips = null) {
  if (v.transactions.some(t => t.commuteDate === date)) {
    throw new Error('O transporte desta data já foi registado.');
  }
  const trips = customTrips && Number.isInteger(customTrips) && customTrips > 0 ? customTrips : v.commute.tripsPerDay;
  const route = v.commute.routeLabel || 'Deslocação diária';
  return addTransaction(v, {
    type: 'expense',
    walletId: v.commute.walletId,
    amount: v.commute.oneWay * trips,
    category: 'Transporte',
    date,
    note: `Chapa (${trips}x) — ${route}`,
    commuteDate: date
  });
}

export function addRecurring(v, { name, amount, category, walletId, dueDay }) {
  if (!name?.trim() || name.trim().length > 65) {
    throw new Error('Indica uma descrição até 65 caracteres.');
  }
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error('Montante mensal inválido.');
  }
  if (!CATEGORIES.some(c => c.name === category)) {
    throw new Error('Categoria inválida.');
  }
  if (!v.wallets.some(w => w.id === walletId)) {
    throw new Error('Conta financeira inválida.');
  }
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
    throw new Error('O dia de vencimento deve estar entre 1 e 31.');
  }
  return {
    ...v,
    recurring: [
      ...(v.recurring || []),
      { id: id(), name: name.trim(), amount, category, walletId, dueDay }
    ]
  };
}

export function deleteRecurring(v, billId) {
  if (!(v.recurring || []).some(b => b.id === billId)) {
    throw new Error('Compromisso mensal não encontrado.');
  }
  return {
    ...v,
    recurring: v.recurring.filter(b => b.id !== billId)
  };
}

export function recurringForMonth(v, period = month(), anchor = today()) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    throw new Error('Período mensal inválido.');
  }
  const [year, m] = period.split('-').map(Number);
  const lastDay = new Date(year, m, 0).getDate();
  return (v.recurring || [])
    .map(b => {
      const day = String(Math.min(b.dueDay, lastDay)).padStart(2, '0');
      const dueDate = period + '-' + day;
      const payment = v.transactions.find(
        t => t.recurringId === b.id && t.recurringPeriod === period
      );
      return {
        ...b,
        dueDate,
        paid: !!payment,
        paidTxId: payment?.id || null,
        status: payment ? 'paid' : dueDate < anchor ? 'late' : 'pending'
      };
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function payRecurring(v, billId, period = month(), date = today()) {
  const b = (v.recurring || []).find(x => x.id === billId);
  if (!b) throw new Error('Compromisso mensal não encontrado.');
  if (recurringForMonth(v, period, date).some(x => x.id === billId && x.paid)) {
    throw new Error('Este compromisso já foi liquidado neste mês.');
  }
  const effectiveDate = date.startsWith(period)
    ? date
    : recurringForMonth(v, period, date).find(x => x.id === billId)?.dueDate || (period + '-01');
  return addTransaction(v, {
    type: 'expense',
    amount: b.amount,
    category: b.category,
    walletId: b.walletId,
    date: effectiveDate,
    note: b.name,
    recurringId: b.id,
    recurringPeriod: period
  });
}

export function monthlyTrend(v, numberOfMonths = 6, anchor = new Date()) {
  return Array.from({ length: numberOfMonths }, (_, index) => {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - (numberOfMonths - 1 - index), 1);
    const period = month(today(d));
    const s = monthStats(v, period);
    const label = new Intl.DateTimeFormat('pt-PT', { month: 'short' })
      .format(d)
      .replace('.', '');
    return {
      period,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      ...s
    };
  });
}
