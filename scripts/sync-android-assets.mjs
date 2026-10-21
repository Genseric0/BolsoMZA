import {copyFileSync,mkdirSync,readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
const root=new URL('../',import.meta.url).pathname;
const dst=join(root,'android/app/src/main/assets');
mkdirSync(dst,{recursive:true});mkdirSync(join(dst,'assets'),{recursive:true});
for(const file of ['index.html','app.css','app.js','core.js','vault.js','manifest.webmanifest','sw.js'])copyFileSync(join(root,file),join(dst,file));
for(const file of ['icon.svg','icon-192.png','icon-512.png'])copyFileSync(join(root,'assets',file),join(dst,'assets',file));
console.log('Android: assets copiados para o projeto nativo.');
