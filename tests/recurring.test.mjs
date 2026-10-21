import test from 'node:test';
import assert from 'node:assert/strict';
const {emptyVault,addRecurring,recurringForMonth,payRecurring,deleteRecurring,addTransaction,walletBalance,removeTransaction}=await import('../core.js');

test('cria pagamentos fixos com validações',()=>{
 const v=emptyVault('Ana','ana');
 assert.throws(()=>addRecurring(v,{name:'',amount:100,category:'Casa',walletId:'cash',dueDay:1}),/nome/);
 assert.throws(()=>addRecurring(v,{name:'Renda',amount:100,category:'Casa',walletId:'cash',dueDay:32}),/vencimento/);
 assert.throws(()=>addRecurring(v,{name:'Renda',amount:100,category:'Inexistente',walletId:'cash',dueDay:1}),/Categoria/);
 assert.equal(addRecurring(v,{name:'Internet',amount:15000,category:'Internet',walletId:'mpesa',dueDay:12}).recurring.length,1);
});
test('pagamento fixo é lançado uma única vez por mês e afeta saldo',()=>{
 let v=emptyVault('Ana','ana');
 v=addTransaction(v,{type:'income',amount:50000,category:'Mesada',walletId:'cash',date:'2026-10-01',note:'Salário'});
 v=addRecurring(v,{name:'Passe mensal',amount:12000,category:'Transporte',walletId:'cash',dueDay:4});
 const bill=v.recurring[0];
 assert.equal(recurringForMonth(v,'2026-10','2026-10-06')[0].status,'late');
 v=payRecurring(v,bill.id,'2026-10','2026-10-06');
 assert.equal(walletBalance(v,'cash'),38000);
 assert.equal(recurringForMonth(v,'2026-10','2026-10-06')[0].status,'paid');
 assert.throws(()=>payRecurring(v,bill.id,'2026-10','2026-10-06'),/já foi paga/);
 assert.equal(recurringForMonth(v,'2026-11','2026-11-01')[0].paid,false);
 const tx=v.transactions.find(t=>t.recurringId===bill.id);
 v=removeTransaction(v,tx.id);
 assert.equal(recurringForMonth(v,'2026-10','2026-10-06')[0].paid,false);
 v=deleteRecurring(v,bill.id);
 assert.equal(v.recurring.length,0);
});
test('vencimento 31 ajustado a fevereiro sem data inválida',()=>{
 let v=emptyVault('Ana','ana');v=addRecurring(v,{name:'Internet',amount:100,category:'Internet',walletId:'mpesa',dueDay:31});
 assert.equal(recurringForMonth(v,'2027-02','2027-02-01')[0].dueDate,'2027-02-28');
 assert.equal(recurringForMonth(v,'2028-02','2028-02-01')[0].dueDate,'2028-02-29');
});
