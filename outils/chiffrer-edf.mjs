#!/usr/bin/env node
/* ROTA — chiffrement des données EDF (roulement + grilles de paie)
 * ------------------------------------------------------------------
 * Usage :
 *   node outils/chiffrer-edf.mjs prive/edf-data.json "ta phrase secrète" > site/edf.enc.json
 *
 * Algorithme : PBKDF2-SHA256 (600 000 itérations) → clé AES-256-GCM.
 * Le fichier produit peut être public : sans la phrase, il est illisible.
 * NE JAMAIS mettre prive/edf-data.json sur GitHub.
 * Pour changer le code : relancer ce script avec la nouvelle phrase,
 * remplacer site/edf.enc.json, incrémenter la version (sw.js + ROTA_BUILD).
 */
import { readFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';

const [, , file, pass] = process.argv;
if (!file || !pass) {
  console.error('Usage : node chiffrer-edf.mjs <edf-data.json> "<phrase secrète>"');
  process.exit(1);
}
if (pass.length < 12) {
  console.error('Phrase trop courte : 12 caractères minimum (une phrase de plusieurs mots est idéale).');
  process.exit(1);
}

const ITER = 600000;
const enc = new TextEncoder();
const data = enc.encode(JSON.stringify(JSON.parse(readFileSync(file, 'utf8'))));
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));

const base = await crypto.subtle.importKey('raw', enc.encode(pass.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER },
  base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data));

const b64 = (u) => Buffer.from(u).toString('base64');
process.stdout.write(JSON.stringify({ v: 1, kdf: 'PBKDF2-SHA256', iter: ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct) }));
