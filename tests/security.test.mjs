import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../',import.meta.url);
const read=name=>readFileSync(new URL(name,base),'utf8');
test('CSP impede scripts remotos, ligações externas e plugins',()=>{
 const html=read('index.html');
 for(const fragment of ["script-src 'self'", "connect-src 'none'", "object-src 'none'", "base-uri 'none'"])assert.ok(html.includes(fragment),`CSP ausente: ${fragment}`);
 assert.ok(!/<script[^>]+src=["']https?:/i.test(html));
});
test('o cofre usa primitivas de cifragem autenticada, nonce e salt aleatórios',()=>{
 const vault=read('vault.js');
 for(const fragment of ["PBKDF2", "AES-GCM", "SHA-256", "crypto.getRandomValues", "indexedDB.open"])assert.ok(vault.includes(fragment));
 assert.ok(!read('app.js').includes('localStorage.setItem('));
});
test('não inclui endereços, chaves, trackers ou dependências de scripts de terceiros',()=>{
 for(const name of ['app.js','core.js','vault.js','sw.js','index.html']) {
  const src=read(name);
  assert.ok(!src.includes('googletagmanager.com'));
  assert.ok(!src.includes('analytics.google.com'));
  assert.ok(!src.includes('<script src="https:'));
  assert.ok(!src.includes('eval('));
 }
});
