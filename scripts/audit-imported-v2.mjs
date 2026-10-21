// Executa verificações sobre o snapshot recebido, sem alterar o produto.
// Exit 1 indica requisitos de integridade ainda não satisfeitos; ver o JSON emitido.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

const root = new URL('../imports/android-v2.0.0/app/src/main/assets/', import.meta.url);
const coreText = fs.readFileSync(new URL('core.js', root), 'utf8');
const coreUrl = 'data:text/javascript;base64,' + Buffer.from(coreText).toString('base64');
const c = await import(coreUrl);
const vaultText = fs.readFileSync(new URL('vault.js', root), 'utf8').replace("'./core.js'", JSON.stringify(coreUrl));
const vault = await import('data:text/javascript;base64,' + Buffer.from(vaultText).toString('base64'));
if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
const results = [];
async function check(id, description, run) {
  try { const evidence = await run(); results.push({ id, description, status: 'PASS', evidence }); }
  catch (error) { results.push({ id, description, status: 'FAIL', evidence: error.message.split('\n')[0] }); }
}
const base = () => c.emptyVault('Pessoa de teste', 'teste.auditoria', { cash: 100000 });
const date = '2026-10-21';

await check('M01', 'Valores decimais são convertidos para centavos inteiros', () => {
  assert.equal(c.cents('0,29'), 29); assert.equal(c.cents('12.34'), 1234);
  assert.throws(() => c.cents('1.005')); return '0,29 MT = 29 centavos; 3 casas decimais rejeitadas.';
});
await check('M02', 'Receitas e despesas atualizam o saldo por conta e o total', () => {
  let v = c.addTransaction(base(), { type: 'income', walletId: 'mpesa', amount: 2000, date });
  v = c.addTransaction(v, { type: 'expense', walletId: 'cash', category: 'Internet', amount: 1500, date });
  assert.equal(c.walletBalance(v, 'cash'), 98500); assert.equal(c.walletBalance(v, 'mpesa'), 2000);
  assert.equal(c.totalBalance(v), 100500); return 'Total = 1.005,00 MT.';
});
await check('M03', 'Transferência interna conserva o total e cobra apenas a taxa', () => {
  const v = c.addTransaction(base(), { type: 'transfer', fromWallet: 'cash', toWallet: 'mpesa', amount: 20000, fee: 1000, date });
  assert.equal(c.totalBalance(v), 99000); assert.equal(c.walletBalance(v, 'cash'), 79000);
  assert.equal(c.walletBalance(v, 'mpesa'), 20000); return '1.000,00 -> 990,00 MT com taxa de 10,00 MT.';
});
await check('M04', 'Reservar e resgatar poupança conserva o património', () => {
  let v = c.addGoal(base(), { name: 'Curso', target: 50000 }); const id = v.goals[0].id;
  v = c.contributeGoal(v, id, 20000, 'cash', date); assert.equal(c.totalBalance(v), 100000);
  v = c.withdrawGoal(v, id, 5000, 'cash', date); assert.equal(c.goalSaved(v, id), 15000);
  assert.equal(c.totalBalance(v), 100000); return 'Reserva final 150,00 MT; património 1.000,00 MT.';
});
await check('M05', 'Data inexistente e despesa sem saldo são rejeitadas', () => {
  assert.throws(() => c.addTransaction(base(), { type: 'income', walletId: 'cash', amount: 100, date: '2026-02-30' }));
  assert.throws(() => c.addTransaction(base(), { type: 'expense', walletId: 'cash', category: 'Casa', amount: 100001, date }));
  return '30/02 e saldo insuficiente rejeitados.';
});
await check('G01', 'Eliminar uma transferência e a respetiva taxa como um único grupo', () => {
  let v = c.addTransaction(base(), { type: 'transfer', fromWallet: 'cash', toWallet: 'mpesa', amount: 20000, fee: 1000, date });
  v = c.removeTransaction(v, v.transactions.find(t => t.type === 'transfer').id);
  if (v.transactions.length || c.totalBalance(v) !== 100000) throw new Error('Fica uma taxa isolada de 10,00 MT; total 990,00 MT. Não existe vínculo/grupo de operação.');
  return 'Sem taxa órfã.';
});
await check('G02', 'Mesmo pedido de importação/sincronização é idempotente', () => {
  const entry = { type: 'income', walletId: 'cash', amount: 1000, date, idempotencyKey: 'pedido-unico' };
  let v = c.addTransaction(base(), entry); v = c.addTransaction(v, entry);
  if (v.transactions.length !== 1) throw new Error('A mesma idempotencyKey cria 2 receitas; total 1.020,00 MT em vez de 1.010,00 MT.');
});
await check('G03', 'Soma de saldos mantém o intervalo inteiro seguro', () => {
  const v = c.addTransaction(c.emptyVault('Teste', 'limite', { cash: Number.MAX_SAFE_INTEGER }), { type: 'income', walletId: 'cash', amount: 1, date });
  if (!Number.isSafeInteger(c.totalBalance(v))) throw new Error('O motor aceita saldo acumulado fora de Number.MAX_SAFE_INTEGER.');
});
await check('G04', 'Registo falha quando nenhum armazenamento consegue gravar', async () => {
  const previousIDB = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
  const previousLS = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: undefined });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem() { return null; }, setItem() { throw new Error('QuotaExceeded'); }, length: 0, key() { return null; } } });
    let rejected = false;
    try { await vault.createUser({ id: 'teste.sem.disco', name: 'Teste', password: 'Senha de teste 2026', vault: base() }); }
    catch { rejected = true; }
    if (!rejected) throw new Error('createUser resolve com sucesso, mas listUsers devolve ' + (await vault.listUsers()).length + ' contas; nenhuma gravação confirmada.');
  } finally {
    if (previousIDB) Object.defineProperty(globalThis, 'indexedDB', previousIDB); else delete globalThis.indexedDB;
    if (previousLS) Object.defineProperty(globalThis, 'localStorage', previousLS); else delete globalThis.localStorage;
  }
});
const report = {
  target: 'imports/android-v2.0.0',
  checks: results.length, passed: results.filter(r => r.status === 'PASS').length,
  unmet_requirements: results.filter(r => r.status === 'FAIL').length, results
};
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.unmet_requirements ? 1 : 0;
