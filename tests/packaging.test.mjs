import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
test('todas as rotas do service worker existem no pacote web',()=>{
 const src=read('sw.js').toString();
 const match=src.match(/const FILES=\[([^\]]+)\]/);
 assert.ok(match);
 const arr=[...match[1].matchAll(/'([^']+)'/g)].map(m=>m[1].replace(/^\.\//,''));
 for(const file of arr)if(file)assert.ok(existsSync(new URL('../'+file,import.meta.url)),file);
 const manifest=JSON.parse(read('manifest.webmanifest'));
 assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons)assert.ok(existsSync(new URL('../'+icon.src,import.meta.url)));
});
test('projeto Android usa domínio seguro e possui todos os ficheiros web empacotados',()=>{
 const java=read('android/app/src/main/java/mz/bolso/app/MainActivity.java').toString();
 assert.match(java,/WebViewAssetLoader/);assert.match(java,/setAllowFileAccess\(false\)/);
 assert.match(java,/setDomStorageEnabled\(true\)/);
 assert.match(java,/onShowFileChooser/);
 const manifest=read('android/app/src/main/AndroidManifest.xml').toString();
 assert.match(manifest,/android:allowBackup="false"/);
 for(const path of ['index.html','app.css','app.js','core.js','vault.js','sw.js','manifest.webmanifest','assets/icon-192.png']){
  assert.equal(read('android/app/src/main/assets/'+path).toString(),read(path).toString(),path+' divergente; executa npm run android:sync');
 }
});
