// O cofre encripta os dados financeiros antes de os persistir no IndexedDB.
const DB_NAME='bolsomz_v1', STORE='users', ITERATIONS=260000;
function base64(bytes){let str='';bytes.forEach(b=>str+=String.fromCharCode(b));return btoa(str);}
function unbase64(str){return Uint8Array.from(atob(str),c=>c.charCodeAt(0));}
function checkSupported(){if(!globalThis.crypto?.subtle||!globalThis.indexedDB)throw new Error('Este navegador precisa de IndexedDB e Web Crypto num contexto seguro (HTTPS ou localhost).');}
function openDb(){checkSupported();return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{req.result.createObjectStore(STORE,{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function perform(mode,callback){const db=await openDb();try{return await new Promise((resolve,reject)=>{const transaction=db.transaction(STORE,mode),store=transaction.objectStore(STORE);let result;const request=callback(store);request.onsuccess=()=>{result=request.result;};request.onerror=()=>reject(request.error);transaction.oncomplete=()=>resolve(result);transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error||new Error('Transação IndexedDB cancelada.'));});}finally{db.close();}}
export async function listUsers(){return (await perform('readonly',s=>s.getAll())).map(u=>({id:u.id,name:u.name,updatedAt:u.updatedAt}));}
export async function getUser(id){return await perform('readonly',s=>s.get(id));}
async function putUser(record){await perform('readwrite',s=>s.put(record));}
async function derive(password,salt,iterations){const raw=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations,hash:'SHA-256'},raw,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
async function encrypt(data,key){const iv=crypto.getRandomValues(new Uint8Array(12)),plaintext=new TextEncoder().encode(JSON.stringify(data));const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,plaintext);return {iv:base64(iv),ciphertext:base64(new Uint8Array(encrypted))};}
async function decrypt(record,key){const decoded=await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(record.iv)},key,unbase64(record.ciphertext));return JSON.parse(new TextDecoder().decode(decoded));}
export function normalizeUser(s){return String(s||'').trim().toLowerCase();}
export async function createUser({id,name,password,vault}){
  id=normalizeUser(id);
  if(!/^[a-z0-9._@+-]{3,80}$/.test(id))throw new Error('Utiliza um identificador com 3 a 80 caracteres (sem espaços ou acentos).');
  if(!name.trim()||name.trim().length>60)throw new Error('Introduz um nome válido.');
  if(password.length<10)throw new Error('Usa uma palavra-passe com, pelo menos, 10 caracteres.');
  if(await getUser(id))throw new Error('Já existe uma conta local com este identificador.');
  const salt=crypto.getRandomValues(new Uint8Array(16)),key=await derive(password,salt,ITERATIONS);
  const payload=await encrypt(vault,key);
  await putUser({id,name:name.trim(),salt:base64(salt),iterations:ITERATIONS,...payload,updatedAt:new Date().toISOString(),schema:1});
  return key;
}
export async function loginUser(id,password){const record=await getUser(normalizeUser(id));if(!record)throw new Error('Conta local inexistente neste dispositivo.');try {const key=await derive(password,unbase64(record.salt),record.iterations);const vault=await decrypt(record,key);if(!vault||vault.version!==1||!Array.isArray(vault.transactions))throw new Error('Dados incompatíveis.');return {key,vault,record};}catch(e){throw new Error('Palavra-passe incorreta ou dados inválidos.');}}
export async function persist(id,vault,key){const record=await getUser(id);if(!record)throw new Error('Conta não encontrada.');await putUser({...record,...await encrypt(vault,key),updatedAt:new Date().toISOString()});}

export async function changePassword(id,oldPassword,newPassword) {
  if(typeof newPassword!=='string'||newPassword.length<10)throw new Error('A nova palavra-passe precisa de 10 caracteres ou mais.');
  if(oldPassword===newPassword)throw new Error('A nova palavra-passe deve ser diferente da anterior.');
  const record=await getUser(id);
  if(!record)throw new Error('Conta local inexistente.');
  let payload;
  try{
    const previous=await derive(oldPassword,unbase64(record.salt),record.iterations);
    payload=await decrypt(record,previous);
  }catch{throw new Error('A palavra-passe atual não está correta.');}
  if(payload.version!==1||!Array.isArray(payload.transactions))throw new Error('Cofre incompatível.');
  const salt=crypto.getRandomValues(new Uint8Array(16)),newKey=await derive(newPassword,salt,ITERATIONS);
  const crypted=await encrypt(payload,newKey);
  await putUser({...record,salt:base64(salt),iterations:ITERATIONS,...crypted,updatedAt:new Date().toISOString()});
  return newKey;
}
export async function backup(id){const record=await getUser(id);if(!record)throw new Error('Conta inexistente.');return JSON.stringify({kind:'bolsomz-backup',format:1,user:record},null,2);}
export async function restore(fileText,password){if(fileText.length>12_000_000)throw new Error('Cópia de segurança demasiado grande.');let parsed;try{parsed=JSON.parse(fileText);}catch{throw new Error('O ficheiro não contém JSON válido.');}
 if(parsed?.kind!=='bolsomz-backup'||parsed.format!==1)throw new Error('Esta cópia de segurança não pertence ao BolsoMZ.');
 const record=parsed.user;
 if(!record||record.schema!==1||!record.id||!record.name||!record.salt||!record.iv||!record.ciphertext||record.iterations<100000||record.iterations>1000000||normalizeUser(record.id)!==record.id)throw new Error('Cópia de segurança incompleta ou inválida.');
 let vault;try{const key=await derive(password,unbase64(record.salt),record.iterations);vault=await decrypt(record,key);}catch{throw new Error('Palavra-passe da cópia de segurança incorreta ou ficheiro danificado.');}
 if(vault.version!==1||!Array.isArray(vault.wallets)||!Array.isArray(vault.transactions)||!Array.isArray(vault.goals))throw new Error('Dados incompatíveis.');
 if(await getUser(record.id))throw new Error('Já existe uma conta com este identificador. Por segurança, não sobrescrevemos os dados existentes.');
 await putUser(record);return record.id;
}
