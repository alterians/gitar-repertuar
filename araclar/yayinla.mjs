// ozel/sarkilar/*.txt dosyalarını toplar:
//   ozel/repertuar.json   -> açık yedek (elle içe aktarma için, git'e girmez)
//   sarkilar.enc.json     -> AES-GCM ile şifreli kopya (siteye gider, şifre olmadan okunamaz)
// Kullanım: node araclar/yayinla.mjs
// Şifre ve tuz ozel/anahtar.json içinde; ilk çalıştırmada üretilir. Tuz değişirse telefonda şifre yeniden istenir.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OZEL = join(ROOT, 'ozel');
const ITER = 250000;
const TR = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i' };
const slug = s => s.toLocaleLowerCase('tr').replace(/[çğıöşüâî]/g, c => TR[c]).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const b64 = buf => Buffer.from(buf).toString('base64');

const songs = readdirSync(join(OZEL, 'sarkilar')).filter(f => f.endsWith('.txt')).sort().map(f => {
  const txt = readFileSync(join(OZEL, 'sarkilar', f), 'utf8').replace(/\r/g, '');
  const at = txt.indexOf('\n---\n');
  if (at < 0) throw new Error(`${f}: "---" ayıracı yok`);
  const s = {};
  for (const line of txt.slice(0, at).split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) s[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  if (!s.title) throw new Error(`${f}: title eksik`);
  s.id ||= 'ozel-' + slug(s.title);
  s.capo = +s.capo || 0;
  if (s.bpm) s.bpm = +s.bpm;
  s.tags = (s.tags || '').split(',').map(t => t.trim()).filter(Boolean);
  s.content = txt.slice(at + 5).replace(/^\n+|\n+$/g, '');
  return s;
});

const keyFile = join(OZEL, 'anahtar.json');
if (!existsSync(keyFile)) {
  const W = 'akor tel pena kapo perde nota ritim sahne gitar davul keman saz melodi nakarat ezgi tempo vokal solo koro mavi mor deniz dag ruzgar yagmur gunes yildiz bulut orman nehir cicek lale papatya kedi kartal balik tilki elma kiraz cay kahve simit bal limon zeytin incir ceviz kumsal vapur marti fener'.split(' ');
  const r = crypto.getRandomValues(new Uint32Array(5));
  const sifre = [0, 1, 2, 3].map(i => W[r[i] % W.length]).join('-') + '-' + (r[4] % 90 + 10);
  writeFileSync(keyFile, JSON.stringify({ sifre, salt: b64(crypto.getRandomValues(new Uint8Array(16))) }, null, 1));
  console.log('Yeni şifre üretildi:', sifre);
}
const { sifre, salt } = JSON.parse(readFileSync(keyFile, 'utf8'));

const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(sifre), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: Buffer.from(salt, 'base64'), iterations: ITER, hash: 'SHA-256' },
  base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const iv = crypto.getRandomValues(new Uint8Array(12));
const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(songs)));

writeFileSync(join(OZEL, 'repertuar.json'), JSON.stringify(songs, null, 1));
writeFileSync(join(ROOT, 'sarkilar.enc.json'), JSON.stringify({ v: 1, iter: ITER, salt, iv: b64(iv), data: b64(data) }));
console.log(`${songs.length} şarkı şifrelendi -> sarkilar.enc.json`);
