// BolsoMZ — regras financeiras independentes da interface.
export const CATEGORIES = [
  {name:'Transporte',icon:'🚌',color:'#B9A0FF'},
  {name:'Alimentação',icon:'🍽️',color:'#FAAE78'},
  {name:'Faculdade',icon:'🎓',color:'#8BA4FF'},
  {name:'Compras',icon:'🛍️',color:'#E68BCD'},
  {name:'Casa',icon:'🏠',color:'#73C9B3'},
  {name:'Internet',icon:'📶',color:'#82C6F3'},
  {name:'Saúde',icon:'💊',color:'#E8988D'},
  {name:'Lazer',icon:'🎮',color:'#E1C087'},
  {name:'Outros',icon:'✨',color:'#9AA5B5'}
];
export const INCOME_CATEGORIES = ['Salário','Bolsa','Mesada','Trabalho','Vendas','Outros'];
export function id() { return crypto.randomUUID(); }
export function today(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
export function month(date = today()) { return date.slice(0, 7); }
export function cents(value) {
  const normalized = String(value).trim().replace(/\s/g,'').replace(',','.');
  if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(normalized)) throw new Error('Introduz um valor válido (até duas casas decimais).');
  const [whole, frac=''] = normalized.split('.');
  const amount = Number(whole)*100 + Number(frac.padEnd(2,'0'));
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000_000_00) throw new Error('O valor precisa de ser maior que zero e dentro do limite permitido.');
  return amount;
}
export function money(n) { return new Intl.NumberFormat('de-DE', {minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:true}).format((n||0)/100)+' MT'; }
export function emptyVault(displayName, userId) {
  return {
    version:1,profile:{name:displayName,userId,createdAt:new Date().toISOString()},
    wallets:[
      {id:'cash',name:'Carteira',type:'cash',opening:0,color:'#9E83FF'},
      {id:'mpesa',name:'M-Pesa',type:'mobile',opening:0,color:'#E99292'},
      {id:'emola',name:'e-Mola',type:'mobile',opening:0,color:'#EDC179'},
      {id:'bank',name:'Banco',type:'bank',opening:0,color:'#80A5EA'},
      {id:'savings',name:'Poupança',type:'savings',opening:0,color:'#8DD6B3'}
    ],transactions:[],goals:[],recurring:[],budgets:{},
    commute:{oneWay:2000,tripsPerDay:2,daysPerMonth:22,walletId:'cash'},
    createdAt:new Date().toISOString()
  };
}
export function walletBalance(v, walletId) {
  const wallet = v.wallets.find(w=>w.id===walletId);
  if (!wallet) throw new Error('Conta financeira não encontrada.');
  return v.transactions.reduce((sum,t)=>{
    if(t.type==='income' && t.walletId===walletId) return sum+t.amount;
    if(t.type==='expense' && t.walletId===walletId) return sum-t.amount;
    if(['transfer','goal','unreserve'].includes(t.type)) {
      if(t.fromWallet===walletId) sum-=t.amount;
      if(t.toWallet===walletId) sum+=t.amount;
    }
    return sum;
  },wallet.opening);
}
export function allBalances(v) { return v.wallets.map(w=>({...w,balance:walletBalance(v,w.id)})); }
export function totalBalance(v) { return allBalances(v).reduce((sum,w)=>sum+w.balance,0); }
export function goalSaved(v,goalId) { return v.transactions.reduce((sum,t)=>t.goalId===goalId?(sum+(t.type==='goal'?t.amount:0)-(t.type==='unreserve'?t.amount:0)):sum,0); }
export function reservedTotal(v) { return v.goals.reduce((s,g)=>s+goalSaved(v,g.id),0); }
export function monthStats(v,period=month()) {
  const tx=v.transactions.filter(t=>t.date.startsWith(period));
  const expenses=tx.filter(t=>t.type==='expense');
  return {income:tx.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount,0),expense:expenses.reduce((a,t)=>a+t.amount,0),
    saved:tx.filter(t=>t.type==='goal').reduce((a,t)=>a+t.amount,0),expenses};
}
export function categorySpend(v,period=month()) {
  return CATEGORIES.map(c=>({...c,spent:monthStats(v,period).expenses.filter(t=>t.category===c.name).reduce((a,t)=>a+t.amount,0)}));
}
export function assertSafe(v) {
  for (const w of v.wallets) if(walletBalance(v,w.id)<0) throw new Error(`Saldo insuficiente na conta ${w.name}.`);
  for (const g of v.goals) if(goalSaved(v,g.id)<0) throw new Error(`A meta ${g.name} não pode ter saldo negativo.`);
  if (reservedTotal(v)>walletBalance(v,'savings')) throw new Error('A conta Poupança não pode ficar abaixo do montante reservado para metas.');
}
export function addTransaction(v,entry) {
  if(!Number.isSafeInteger(entry.amount)||entry.amount<=0) throw new Error('Valor de transação inválido.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)||Number.isNaN(new Date(entry.date+'T12:00:00').getTime())||new Date(entry.date+'T12:00:00').toISOString().slice(0,10)!==entry.date) throw new Error('Data inválida.');
  if(!['income','expense','transfer','goal','unreserve'].includes(entry.type)) throw new Error('Tipo de transação inválido.');
  if(['income','expense'].includes(entry.type)) {
    if(!v.wallets.some(w=>w.id===entry.walletId)) throw new Error('Conta financeira inválida.');
    if(entry.type==='expense'&&!CATEGORIES.some(c=>c.name===entry.category)) throw new Error('Categoria inválida.');
  } else {
    if (!v.wallets.some(w=>w.id===entry.fromWallet)||!v.wallets.some(w=>w.id===entry.toWallet)||entry.fromWallet===entry.toWallet) throw new Error('Seleciona contas diferentes e válidas.');
    if(['goal','unreserve'].includes(entry.type)&&!v.goals.some(g=>g.id===entry.goalId)) throw new Error('Meta não encontrada.');
  }
  const draft={...v,transactions:[...v.transactions,{...entry,id:id(),createdAt:new Date().toISOString()}]};
  assertSafe(draft);
  return draft;
}
export function removeTransaction(v,txId) {
  if(!v.transactions.some(t=>t.id===txId)) throw new Error('Transação não encontrada.');
  const draft={...v,transactions:v.transactions.filter(t=>t.id!==txId)};
  assertSafe(draft);
  return draft;
}
export function addGoal(v, {name,target,deadline,emoji}) {
  if(!name?.trim()||name.trim().length>55) throw new Error('O nome da meta deve ter até 55 caracteres.');
  if(!Number.isSafeInteger(target)||target<=0) throw new Error('Meta financeira inválida.');
  if(deadline&&!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) throw new Error('Data da meta inválida.');
  return {...v,goals:[...v.goals,{id:id(),name:name.trim(),target,deadline:deadline||'',emoji:emoji||'🎯'}]};
}
export function deleteGoal(v,goalId) {
  const goal=v.goals.find(g=>g.id===goalId);
  if(!goal) throw new Error('Meta inexistente.');
  if(goalSaved(v,goalId)>0) throw new Error('Retira primeiro o dinheiro reservado na meta antes de a eliminar.');
  return {...v,goals:v.goals.filter(g=>g.id!==goalId),transactions:v.transactions.filter(t=>t.goalId!==goalId)};
}
export function contributeGoal(v,goalId,amount,walletId,date=today()) {
  if(walletId==='savings') throw new Error('Seleciona uma conta de origem diferente da Poupança.');
  const goal=v.goals.find(g=>g.id===goalId);
  if(!goal) throw new Error('Meta inexistente.');
  if(goalSaved(v,goalId)+amount>goal.target) throw new Error('O valor ultrapassa o objetivo da meta.');
  return addTransaction(v,{type:'goal',goalId,amount,fromWallet:walletId,toWallet:'savings',date,note:`Reserva: ${goal.name}`});
}
export function withdrawGoal(v,goalId,amount,walletId,date=today()) {
  const goal=v.goals.find(g=>g.id===goalId);
  if(!goal) throw new Error('Meta inexistente.');
  if(walletId==='savings') throw new Error('Escolhe uma conta diferente da Poupança.');
  if(amount>goalSaved(v,goalId)) throw new Error('O valor ultrapassa o montante reservado na meta.');
  return addTransaction(v,{type:'unreserve',goalId,amount,fromWallet:'savings',toWallet:walletId,date,note:`Retirada: ${goal.name}`});
}
export function commuteProjection(v) {const c=v.commute;return {day:c.oneWay*c.tripsPerDay,month:c.oneWay*c.tripsPerDay*c.daysPerMonth,year:c.oneWay*c.tripsPerDay*c.daysPerMonth*12};}
export function recordCommute(v,date=today()) {
  if(v.transactions.some(t=>t.commuteDate===date)) throw new Error('Já registaste o transporte desta data.');
  return addTransaction(v,{type:'expense',walletId:v.commute.walletId,amount:v.commute.oneWay*v.commute.tripsPerDay,category:'Transporte',date,note:'Chapa — ida e volta para a faculdade',commuteDate:date});
}

// Pagamentos fixos: uma regra mensal nunca gera lançamentos automaticamente.
// O utilizador confirma cada pagamento; um ID + período impedem duplicações.
export function addRecurring(v, {name,amount,category,walletId,dueDay}) {
  if(!name?.trim()||name.trim().length>65) throw new Error('Indica um nome de pagamento com até 65 caracteres.');
  if(!Number.isSafeInteger(amount)||amount<=0) throw new Error('Valor mensal inválido.');
  if(!CATEGORIES.some(c=>c.name===category)) throw new Error('Categoria inválida.');
  if(!v.wallets.some(w=>w.id===walletId)) throw new Error('Conta financeira inválida.');
  if(!Number.isInteger(dueDay)||dueDay<1||dueDay>31) throw new Error('Dia de vencimento inválido.');
  return {...v,recurring:[...(v.recurring||[]),{id:id(),name:name.trim(),amount,category,walletId,dueDay}]};
}
export function deleteRecurring(v,billId){
  if(!(v.recurring||[]).some(b=>b.id===billId)) throw new Error('Pagamento fixo inexistente.');
  return {...v,recurring:v.recurring.filter(b=>b.id!==billId)};
}
export function recurringForMonth(v,period=month(),anchor=today()){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period))throw new Error('Mês inválido.');
  const [year,m]=period.split('-').map(Number),lastDay=new Date(year,m,0).getDate();
  return (v.recurring||[]).map(b=>{
    const day=String(Math.min(b.dueDay,lastDay)).padStart(2,'0');
    const dueDate=period+'-'+day;
    const payment=v.transactions.find(t=>t.recurringId===b.id&&t.recurringPeriod===period);
    return {...b,dueDate,paid:!!payment,status:payment?'paid':(dueDate<anchor?'late':'pending')};
  }).sort((a,b)=>a.dueDate.localeCompare(b.dueDate));
}
export function payRecurring(v,billId,period=month(),date=today()){
  const b=(v.recurring||[]).find(x=>x.id===billId);
  if(!b)throw new Error('Pagamento fixo inexistente.');
  if(recurringForMonth(v,period,date).some(x=>x.id===billId&&x.paid))throw new Error('Esta despesa fixa já foi paga neste mês.');
  if(!date.startsWith(period))throw new Error('A data de pagamento deve pertencer ao mês escolhido.');
  return addTransaction(v,{type:'expense',amount:b.amount,category:b.category,walletId:b.walletId,date,note:b.name,recurringId:b.id,recurringPeriod:period});
}
export function monthlyTrend(v,numberOfMonths=6,anchor=new Date()) {
  return Array.from({length:numberOfMonths},(_,index)=>{
    const d=new Date(anchor.getFullYear(),anchor.getMonth()-(numberOfMonths-1-index),1);
    const period=month(today(d)),s=monthStats(v,period);
    return {period,label:new Intl.DateTimeFormat('pt-PT',{month:'short'}).format(d).replace('.',''),...s};
  });
}
export function demoVault() {
  let v=emptyVault('Visitante','demo');
  const d=today(), period=month();
  v={...v,wallets:v.wallets.map(w=>({...w,opening:({'cash':104000,'mpesa':480000,'emola':90000,'bank':1610000,'savings':0}[w.id])||0}))};
  v=addGoal(v,{name:'Novo computador',target:4500000,emoji:'💻',deadline:''});
  v=addGoal(v,{name:'Reserva de emergência',target:2000000,emoji:'🛡️',deadline:''});
  v=contributeGoal(v,v.goals[0].id,620000,'bank',d);
  v=contributeGoal(v,v.goals[1].id,310000,'bank',d);
  for(const [n,amt,category,walletId] of [['Chapa para faculdade',4000,'Transporte','cash'],['Almoço na faculdade',14500,'Alimentação','mpesa'],['Pacote de internet',25000,'Internet','mpesa'],['Material de estudo',18000,'Faculdade','cash'],['Compras do mês',55000,'Compras','bank'],['Chapa para faculdade',4000,'Transporte','cash']]){
    v=addTransaction(v,{type:'expense',amount:amt,category,walletId,date:d,note:n});
  }
  v={...v,budgets:{Transporte:200000,Alimentação:120000,Internet:80000,Faculdade:150000,Compras:125000}};
  return v;
}
