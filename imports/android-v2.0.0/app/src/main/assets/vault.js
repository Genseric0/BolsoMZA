// BolsoMZ v2 — Cofre criptográfico (PBKDF2-HMAC-SHA256 + AES-256-GCM) com persistência redundante em IndexedDB.
import { migrateVault } from './core.js';

const DB_NAME = 'bolsomz_v1';
const STORE = 'users';
const ITERATIONS = 260000;
const LS_PREFIX = 'bolsomz_v1_record:';
const LS_LAST_USER = 'bolsomz_v2_last_user';
const LS_ONBOARDED = 'bolsomz_v2_onboarded';

function base64(bytes) {
  let str = '';
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) {
    str += String.fromCharCode(arr[i]);
  }
  return btoa(str);
}

function unbase64(str) {
  const bin = atob(String(str || '').trim());
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function checkSupported() {
  if (!globalThis.crypto?.subtle) {
    throw new Error('O motor de encriptação segura não está disponível neste dispositivo.');
  }
}

function readMirrorRecord(id) {
  try {
    const raw = globalThis.localStorage?.getItem(LS_PREFIX + id);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.id === id && parsed.ciphertext ? parsed : null;
  } catch {
    return null;
  }
}

function writeMirrorRecord(record) {
  try {
    if (record && record.id) {
      globalThis.localStorage?.setItem(LS_PREFIX + record.id, JSON.stringify(record));
    }
  } catch {
    // Ignorar se localStorage atingir quota; IndexedDB é o armazenamento primário.
  }
}

function listMirrorRecords() {
  const results = [];
  try {
    const ls = globalThis.localStorage;
    if (!ls) return results;
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && k.startsWith(LS_PREFIX)) {
        const rec = readMirrorRecord(k.slice(LS_PREFIX.length));
        if (rec) results.push(rec);
      }
    }
  } catch {
    // Sem acesso ao mirror
  }
  return results;
}

function openDb() {
  checkSupported();
  if (!globalThis.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Não foi possível aceder ao armazenamento local.'));
      req.onblocked = () => resolve(null);
    } catch (err) {
      reject(err);
    }
  });
}

async function perform(mode, callback) {
  let db = null;
  try {
    db = await openDb();
  } catch {
    db = null;
  }
  if (!db) return undefined;
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const store = transaction.objectStore(STORE);
      let result;
      const request = callback(store);
      if (request) {
        request.onsuccess = () => { result = request.result; };
        request.onerror = () => reject(request.error);
      }
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('Operação de armazenamento interrompida.'));
    });
  } finally {
    try { db.close(); } catch {}
  }
}

export async function listUsers() {
  const byId = new Map();
  try {
    const idbRecords = await perform('readonly', s => s.getAll());
    if (Array.isArray(idbRecords)) {
      for (const u of idbRecords) {
        if (u && u.id) byId.set(u.id, u);
      }
    }
  } catch {
    // Fallback para mirror encriptado
  }
  for (const m of listMirrorRecords()) {
    const existing = byId.get(m.id);
    if (!existing || String(m.updatedAt || '') > String(existing.updatedAt || '')) {
      byId.set(m.id, m);
    }
  }
  return Array.from(byId.values())
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
    .map(u => ({ id: u.id, name: u.name, updatedAt: u.updatedAt }));
}

export async function getUser(id) {
  const norm = normalizeUser(id);
  let idbRec = null;
  try {
    idbRec = await perform('readonly', s => s.get(norm));
  } catch {
    idbRec = null;
  }
  const mirrorRec = readMirrorRecord(norm);
  if (idbRec && mirrorRec) {
    return String(mirrorRec.updatedAt || '') > String(idbRec.updatedAt || '') ? mirrorRec : idbRec;
  }
  return idbRec || mirrorRec || undefined;
}

async function putUser(record) {
  writeMirrorRecord(record);
  await perform('readwrite', s => s.put(record));
}

async function derive(password, salt, iterations) {
  const raw = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(String(password)),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(data, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);
  return {
    iv: base64(iv),
    ciphertext: base64(new Uint8Array(encrypted))
  };
}

async function decrypt(record, key) {
  const decoded = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unbase64(record.iv) },
    key,
    unbase64(record.ciphertext)
  );
  return JSON.parse(new TextDecoder().decode(decoded));
}

export function normalizeUser(s) {
  return String(s || '').trim().toLowerCase();
}

export function getLastUser() {
  try { return globalThis.localStorage?.getItem(LS_LAST_USER) || ''; } catch { return ''; }
}

export function setLastUser(id) {
  try {
    if (id) globalThis.localStorage?.setItem(LS_LAST_USER, normalizeUser(id));
  } catch {}
}

export function isOnboarded() {
  try { return globalThis.localStorage?.getItem(LS_ONBOARDED) === '1'; } catch { return false; }
}

export function setOnboarded() {
  try { globalThis.localStorage?.setItem(LS_ONBOARDED, '1'); } catch {}
}

export async function createUser({ id, name, password, vault }) {
  id = normalizeUser(id);
  const cleanName = String(name || '').trim();
  const rawPass = String(password ?? '');
  if (!/^[a-z0-9._@+-]{3,80}$/.test(id)) {
    throw new Error('Utiliza um identificador com 3 a 80 caracteres (apenas letras, números, ponto, hífen ou @).');
  }
  if (!cleanName || cleanName.length > 60) {
    throw new Error('Introduz o teu nome (até 60 caracteres).');
  }
  if (rawPass.length < 10) {
    throw new Error('A palavra-passe deve ter pelo menos 10 caracteres.');
  }
  if (await getUser(id)) {
    throw new Error('Já existe uma conta registada com este identificador neste dispositivo.');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await derive(rawPass, salt, ITERATIONS);
  const normalizedVault = migrateVault(vault, cleanName, id);
  const payload = await encrypt(normalizedVault, key);
  const record = {
    id,
    name: cleanName,
    salt: base64(salt),
    iterations: ITERATIONS,
    ...payload,
    updatedAt: new Date().toISOString(),
    schema: 1
  };
  await putUser(record);
  setLastUser(id);
  setOnboarded();
  return key;
}

export async function loginUser(id, password) {
  const normId = normalizeUser(id);
  if (!normId) {
    throw new Error('Introduz o identificador da tua conta.');
  }
  const rawPass = String(password ?? '');
  if (!rawPass) {
    throw new Error('Introduz a tua palavra-passe.');
  }
  const record = await getUser(normId);
  if (!record) {
    throw new Error('Conta não encontrada neste dispositivo. Verifica o identificador ou cria uma conta nova.');
  }
  let unlockedVault;
  let key;
  try {
    key = await derive(rawPass, unbase64(record.salt), record.iterations);
    unlockedVault = await decrypt(record, key);
  } catch {
    throw new Error('Palavra-passe incorreta. Tenta novamente.');
  }
  if (!unlockedVault || ![1, 2].includes(unlockedVault.version) || !Array.isArray(unlockedVault.transactions)) {
    throw new Error('Os dados do cofre estão num formato incompatível.');
  }
  const migrated = migrateVault(unlockedVault, record.name, record.id);
  // Se houve migração de estrutura v1 -> v2, persistir de forma transparente
  await putUser({
    ...record,
    ...(await encrypt(migrated, key)),
    updatedAt: new Date().toISOString()
  });
  setLastUser(record.id);
  setOnboarded();
  return { key, vault: migrated, record };
}

export async function persist(id, vault, key) {
  const normId = normalizeUser(id);
  const record = await getUser(normId);
  if (!record) {
    throw new Error('Sessão inválida: conta não encontrada.');
  }
  const normalizedVault = migrateVault(vault, record.name, normId);
  const encrypted = await encrypt(normalizedVault, key);
  const updated = {
    ...record,
    name: normalizedVault.profile?.name || record.name,
    ...encrypted,
    updatedAt: new Date().toISOString()
  };
  await putUser(updated);
}

export async function changePassword(id, oldPassword, newPassword) {
  const normId = normalizeUser(id);
  const rawOld = String(oldPassword ?? '');
  const rawNew = String(newPassword ?? '');
  if (rawNew.length < 10) {
    throw new Error('A nova palavra-passe precisa de ter pelo menos 10 caracteres.');
  }
  if (rawOld === rawNew) {
    throw new Error('A nova palavra-passe deve ser diferente da palavra-passe atual.');
  }
  const record = await getUser(normId);
  if (!record) {
    throw new Error('Conta não encontrada neste dispositivo.');
  }
  let payload;
  try {
    const previous = await derive(rawOld, unbase64(record.salt), record.iterations);
    payload = await decrypt(record, previous);
  } catch {
    throw new Error('A palavra-passe atual está incorreta.');
  }
  if (!payload || ![1, 2].includes(payload.version) || !Array.isArray(payload.transactions)) {
    throw new Error('Estrutura do cofre incompatível.');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const newKey = await derive(rawNew, salt, ITERATIONS);
  const crypted = await encrypt(migrateVault(payload, record.name, normId), newKey);
  await putUser({
    ...record,
    salt: base64(salt),
    iterations: ITERATIONS,
    ...crypted,
    updatedAt: new Date().toISOString()
  });
  return newKey;
}

export async function backup(id) {
  const record = await getUser(normalizeUser(id));
  if (!record) {
    throw new Error('Conta não encontrada para exportação.');
  }
  return JSON.stringify({ kind: 'bolsomz-backup', format: 1, user: record }, null, 2);
}

export async function restore(fileText, password) {
  if (!fileText || fileText.length > 12_000_000) {
    throw new Error('O ficheiro de cópia de segurança excede o limite máximo (12 MB).');
  }
  let parsed;
  try {
    parsed = JSON.parse(fileText);
  } catch {
    throw new Error('O ficheiro selecionado não é uma cópia de segurança válida.');
  }
  if (parsed?.kind !== 'bolsomz-backup' || parsed.format !== 1) {
    throw new Error('Este ficheiro não é uma cópia de segurança do BolsoMZ.');
  }
  const record = parsed.user;
  if (
    !record ||
    record.schema !== 1 ||
    !record.id ||
    !record.name ||
    !record.salt ||
    !record.iv ||
    !record.ciphertext ||
    record.iterations < 100000 ||
    record.iterations > 1000000 ||
    normalizeUser(record.id) !== record.id
  ) {
    throw new Error('A cópia de segurança está incompleta ou corrompida.');
  }
  let vault;
  let key;
  try {
    key = await derive(String(password ?? ''), unbase64(record.salt), record.iterations);
    vault = await decrypt(record, key);
  } catch {
    throw new Error('Palavra-passe incorreta para esta cópia de segurança.');
  }
  if (!vault || ![1, 2].includes(vault.version) || !Array.isArray(vault.wallets) || !Array.isArray(vault.transactions) || !Array.isArray(vault.goals)) {
    throw new Error('Os dados da cópia de segurança são incompatíveis.');
  }
  if (await getUser(record.id)) {
    throw new Error('Já existe uma conta com o identificador "' + record.id + '" neste dispositivo.');
  }
  const migrated = migrateVault(vault, record.name, record.id);
  const reencrypted = await encrypt(migrated, key);
  await putUser({
    ...record,
    ...reencrypted,
    updatedAt: new Date().toISOString()
  });
  setLastUser(record.id);
  setOnboarded();
  return record.id;
}
