import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyVault} from '../core.js';
import {createUser,loginUser,persist,backup,restore,changePassword,listUsers,normalizeUser} from '../vault.js';

// IndexedDB fake mínimo (transaction requests async, commit only on complete).
const data=new Map();
globalThis.indexedDB={open(name,version){let req={};queueMicrotask(()=>{req.result={
 createObjectStore(){return {};},
 close(){},
 transaction(store,mode){const tx={oncomplete:null,onerror:null,onabort:null};tx.objectStore=()=>({
 get(key){return makeRequest(tx,()=>data.get(key));},
 getAll(){return makeRequest(tx,()=>Array.from(data.values()));},
 put(obj){return makeRequest(tx,()=>{data.set(obj.id,obj);return obj.id;});}
 });return tx;}
 };req.onupgradeneeded?.();req.onsuccess?.();});return req;}};
function makeRequest(tx,operation){const req={};queueMicrotask(()=>{try{req.result=operation();req.onsuccess?.();queueMicrotask(()=>tx.oncomplete?.());}catch(e){req.error=e;req.onerror?.();tx.onerror?.();}});return req;}

test('conta local cifrada, login e persistência',async()=>{
 const uid='teste.cofre';const v=emptyVault('Pessoa de Teste',uid);
 const key=await createUser({id:uid,name:'Pessoa de Teste',password:'palavra-passe-segura-2026',vault:v});
 const saved=data.get(uid);assert.equal(saved.name,'Pessoa de Teste');assert.ok(saved.ciphertext.length>100);assert.ok(!saved.ciphertext.includes('transactions'));
 assert.equal((await loginUser(uid,'palavra-passe-segura-2026')).vault.profile.name,'Pessoa de Teste');
 await assert.rejects(loginUser(uid,'errada'),/incorreta/);
 const revised={...v,profile:{...v.profile,name:'Nome Atualizado'}};
 await persist(uid,revised,key);
 assert.equal((await loginUser(uid,'palavra-passe-segura-2026')).vault.profile.name,'Nome Atualizado');
 assert.ok((await listUsers()).some(u=>u.id===uid));
});
test('backup encriptado, integridade, password verificada e sem sobrescrever',async()=>{
 const uid='teste.cofre';const exported=await backup(uid);
 assert.equal(JSON.parse(exported).kind,'bolsomz-backup');
 await assert.rejects(restore(exported,'palavra-passe-segura-2026'),/Já existe/);
 data.clear();
 await assert.rejects(restore(exported,'password-errada'),/incorreta/);
 assert.equal(await listUsers().then(a=>a.length),0);
 const restored=await restore(exported,'palavra-passe-segura-2026');assert.equal(restored,uid);
 const result=await loginUser(restored,'palavra-passe-segura-2026');assert.equal(result.vault.profile.name,'Nome Atualizado');
 await assert.rejects(restore('{bad','senha'),/JSON válido/);
});

test('alteração de palavra-passe reencripta dados e invalida a anterior',async()=>{
 const uid='teste.cofre';
 await assert.rejects(changePassword(uid,'invalida','nova-palavra-passe-2026'),/atual/);
 await assert.rejects(changePassword(uid,'palavra-passe-segura-2026','curta'),/10 caracteres/);
 const freshKey=await changePassword(uid,'palavra-passe-segura-2026','senha-renovada-muito-segura');
 assert.ok(freshKey);
 await assert.rejects(loginUser(uid,'palavra-passe-segura-2026'),/incorreta/);
 assert.equal((await loginUser(uid,'senha-renovada-muito-segura')).vault.profile.name,'Nome Atualizado');
});
