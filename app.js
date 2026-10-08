'use strict';

/* ---------- yardımcılar ---------- */
const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fold = s => String(s ?? '').toLocaleLowerCase('tr').replace(/[çğıöşüâî]/g, c => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i' }[c]));
const slug = s => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sarki';
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const store = {
  get(k, d) { try { const v = localStorage.getItem('rep:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('rep:' + k, JSON.stringify(v)); } catch { } },
};
let stats = store.get('stats', {});
let prefs = Object.assign({ font: 18, theme: 'dark', speed: 3 }, store.get('prefs', {}));
let localSongs = store.get('local', []);
const saveStats = () => store.set('stats', stats);
const savePrefs = () => store.set('prefs', prefs);
const saveLocal = () => store.set('local', localSongs);
const st = id => stats[id] || (stats[id] = { plays: 0, level: 0, fav: false });

/* ---------- simgeler (çizgi SVG) ---------- */
const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/>',
  star: '<path d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.3L12 17.1l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/>',
  sprout: '<path d="M12 21v-9"/><path d="M12 12c0-4 2.5-6.5 7-6.5 0 4.5-2.5 6.5-7 6.5z"/><path d="M12 14.5c0-3.3-2.2-5.5-6.5-5.5 0 3.8 2.2 5.5 6.5 5.5z"/>',
  guitar: '<path d="M14 10l6.2-6.2"/><path d="M18.4 2.6l3 3"/><path d="M11.2 8.6c-1.7-.9-3.8-.6-4.9.6-.7.8-.6 1.8-1.5 2.5-.9.6-2.2.6-2.9 1.6-1 1.5 0 3.9 1.9 5.9s4.4 2.9 5.9 1.9c1-.7 1-2 1.6-2.9.7-.9 1.7-.8 2.5-1.5 1.2-1.1 1.5-3.2.6-4.9z"/><circle cx="9" cy="15" r="1.6"/>',
  flame: '<path d="M12 22c-4 0-7-2.7-7-6.6 0-3.1 2-5.2 3.5-6.9.3 1.8 1.2 3 2.3 3.6C10.5 8.4 12.2 4.8 15 2.5c-.3 3.2 1.2 5.2 2.6 7C18.6 11 19 12.6 19 15.4 19 19.3 16 22 12 22z"/><path d="M12 22c-1.7 0-3-1.2-3-3 0-1.6 1.2-2.7 2.2-3.8.4 1.2 1.2 1.8 2 2 .2-.9.5-1.7 1.1-2.4.4 1 .7 1.8.7 2.9 0 2.2-1.3 4.3-3 4.3z"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="4.5"/><g fill="currentColor" stroke="none"><circle cx="8" cy="8" r="1.5"/><circle cx="16" cy="8" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="8" cy="16" r="1.5"/><circle cx="16" cy="16" r="1.5"/></g>',
  import: '<path d="M12 3v11M7.5 9.5 12 14l4.5-4.5"/><path d="M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3"/>',
  export: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  unlock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 7.7-1.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  music: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  capo: '<rect x="2.5" y="9" width="19" height="6" rx="3"/><path d="M7 9V5.5M17 9V5.5M7 15v3.5M17 15v3.5"/>',
  shape: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M5 8.5h14M5 14h14M9.7 3v18M14.3 3v18"/><circle cx="12" cy="11.2" r="1.3" fill="currentColor"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 10v3.5l2.5 1.5M9.5 2.5h5"/>',
  play: '<path d="M7.5 4.8v14.4a1 1 0 0 0 1.5.9l11.3-7.2a1 1 0 0 0 0-1.7L9 4a1 1 0 0 0-1.5.8z" fill="currentColor"/>',
  pause: '<rect x="6.5" y="4.5" width="4" height="15" rx="1.2" fill="currentColor"/><rect x="13.5" y="4.5" width="4" height="15" rx="1.2" fill="currentColor"/>',
  check: '<path d="M4.5 12.5l5 5L20 7"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  save: '<path d="M5 3h11l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8V3M7 21v-7h10v7"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6 7l1 13h10l1-13M10 11v5M14 11v5"/>',
  note: '<path d="M6 3h8l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M14 3v5h5M8 13h8M8 17h5"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.4A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
  broken: '<path d="M12 20s-7.5-4.6-7.5-10.4A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/><path d="M12 7l-1.6 3.6 2.8 2-1.7 3.4"/>',
  rose: '<path d="M12 11.5c-2.8 0-4.8-2-4.8-5 1.8 0 3 .6 3.6 1.4.3-1.7.8-3 1.2-3.9.4.9.9 2.2 1.2 3.9.6-.8 1.8-1.4 3.6-1.4 0 3-2 5-4.8 5z"/><path d="M12 11.5V21M12 17c-2.2 0-3.6-1.1-4-3 2.1 0 3.6 1 4 3zM12 18.5c2.2 0 3.6-1.1 4-3-2.1 0-3.6 1-4 3z"/>',
  rain: '<path d="M7 15a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17.2 7.6 3.7 3.7 0 0 1 17 15z"/><path d="M8.5 18l-1 2.5M12.5 18l-1 2.5M16.5 18l-1 2.5"/>',
  leaf: '<path d="M5 19.5C5 11 10 5 20 4.5c0 10-5.5 15.5-14 15"/><path d="M5 19.5c3-4.2 6.2-7.2 10-9.2"/>',
  vinyl: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/><path d="M12 6.2a5.8 5.8 0 0 1 5.8 5.8M12 17.8A5.8 5.8 0 0 1 6.2 12"/>',
  sparkle: '<path d="M12 3c.6 4.6 2.4 6.4 7 7-4.6.6-6.4 2.4-7 7-.6-4.6-2.4-6.4-7-7 4.6-.6 6.4-2.4 7-7z"/><path d="M18.5 15.5c.3 1.8 1 2.5 2.5 2.8-1.5.3-2.2 1-2.5 2.7-.3-1.7-1-2.4-2.5-2.7 1.5-.3 2.2-1 2.5-2.8z"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 4 2.5 17.5A2 2 0 0 0 4.2 20.5h15.6a2 2 0 0 0 1.7-3L13.7 4a2 2 0 0 0-3.4 0z"/>',
};
// Şarkı kartı görseli: renk ruh halinden, simge emojiden (tanıdıksa) ya da ruh halinden
const MOODS = { 'hüzünlü': 'rain', 'aşk': 'heart', 'neşeli': 'sun', 'isyan': 'flame', 'nostalji': 'vinyl', 'huzur': 'leaf' };
const EMOJI_IC = { '💔': 'broken', '❤️': 'heart', '❤': 'heart', '♥️': 'heart', '🥀': 'rose', '🌹': 'rose', '🔥': 'flame', '🌙': 'moon', '☀️': 'sun',
  '🌧️': 'rain', '🌧': 'rain', '😢': 'rain', '😭': 'rain', '🍂': 'leaf', '🌿': 'leaf', '🎸': 'guitar', '🎵': 'music', '🎶': 'music', '📻': 'vinyl', '🙏': 'sparkle', '✨': 'sparkle', '⭐': 'star' };
function songArt(s, cls = '') {
  const mood = (s.tags || []).find(t => MOODS[t]);
  const e = String(s.emoji || '').trim();
  const name = EMOJI_IC[e] || EMOJI_IC[e.replace(/\uFE0F/g, '')] || MOODS[mood] || 'music';
  return `<span class="art ${mood ? 'm-' + slug(mood) : 'm-none'} ${cls}">${ic(name)}</span>`;
}
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;

/* ---------- şifreli kişisel şarkılar (sarkilar.enc.json) ---------- */
let privSongs = [], privBlob = null;
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function decryptPriv(rawKey) {
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['decrypt']);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(privBlob.iv) }, key, unb64(privBlob.data));
  return JSON.parse(new TextDecoder().decode(pt));
}
async function loadPrivate() {
  try {
    privBlob = await fetch('sarkilar.enc.json').then(r => (r.ok ? r.json() : null));
    const k = store.get('pkey', null);
    if (privBlob && k && k.salt === privBlob.salt) privSongs = await decryptPriv(unb64(k.raw));
  } catch { privSongs = []; }
}
async function unlockPrivate(pass) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass.trim()), 'PBKDF2', false, ['deriveBits']);
  const raw = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: unb64(privBlob.salt), iterations: privBlob.iter, hash: 'SHA-256' }, base, 256));
  privSongs = await decryptPriv(raw); // yanlış şifrede hata fırlatır
  store.set('pkey', { salt: privBlob.salt, raw: btoa(String.fromCharCode(...raw)) });
}

const LEVELS = [{ i: '🌱', ic: 'sprout', n: 'Öğreniyorum' }, { i: '🎸', ic: 'guitar', n: 'Çalabiliyorum' }, { i: '🔥', ic: 'flame', n: 'Ezber' }];
const lvlIc = l => ic(LEVELS[l].ic, 'lv' + l);

function allSongs() {
  const seen = {};
  const b = (window.SONGS || []).map(s => {
    let id = s.id || slug(s.title);
    while (seen[id]) id += '-2';
    seen[id] = 1;
    return { ...s, id, builtin: true };
  });
  const priv = privSongs.map(s => ({ ...s, builtin: true }));
  const privIds = new Set(priv.map(s => s.id));
  return b.concat(priv, localSongs.filter(s => !privIds.has(s.id)).map(s => ({ ...s, builtin: false })));
}

/* ---------- müzik ---------- */
const NOTE = { C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, F: 5, 'E#': 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, H: 11, Cb: 11 };
const DISP = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
const CHORD_RE = /^([A-H])(#|b)?((?:maj|min|dim|aug|sus|add|m|M|\d|\+|-|\(|\)|#|b|°|ø|Δ)*)(?:\/([A-H])(#|b)?)?$/;
const EXTRA_RE = /^(\||\|\||-|–|\/|%|x\d+|\(x\d+\)|\d+x|N\.?C\.?|\.\.\.?|\(|\))$/i;
const mod = n => ((n % 12) + 12) % 12;

const isChord = t => CHORD_RE.test(t);
function transposeChord(ch, n) {
  if (!n) return ch;
  const m = ch.match(CHORD_RE);
  if (!m) return ch;
  let out = DISP[mod(NOTE[m[1] + (m[2] || '')] + n)] + m[3];
  if (m[4]) out += '/' + DISP[mod(NOTE[m[4] + (m[5] || '')] + n)];
  return out;
}
function parseKey(k) {
  const m = String(k || '').trim().match(/^([A-H])(#|b)?(m(?!aj))?/);
  return m ? { i: NOTE[m[1] + (m[2] || '')], minor: !!m[3] } : null;
}
const keyName = (k, n) => DISP[mod(k.i + n)] + (k.minor ? 'm' : '');
const EASY_MAJ = [0, 2, 4, 7, 9], EASY_MIN = [9, 4, 2];
const isEasy = (k, n) => (k.minor ? EASY_MIN : EASY_MAJ).includes(mod(k.i + n));

/* ---------- şarkı metni ayrıştırma ---------- */
function isChordLine(t) {
  const toks = t.trim().split(/\s+/);
  let c = 0;
  for (const x of toks) {
    if (isChord(x)) c++;
    else if (!EXTRA_RE.test(x)) return false;
  }
  return c > 0;
}
function parseInline(raw) {
  const segs = [];
  const re = /\[([^\]]+)\]/g;
  let last = 0, chord = null, m;
  while ((m = re.exec(raw))) {
    const text = raw.slice(last, m.index);
    if (text || chord) segs.push({ chord, text });
    chord = m[1].trim();
    last = re.lastIndex;
  }
  segs.push({ chord, text: raw.slice(last) });
  return segs;
}
function mergeChordLine(chordRaw, lyricRaw) {
  chordRaw = chordRaw.replace(/\t/g, '    ');
  let lyric = lyricRaw.replace(/\t/g, '    ');
  const pos = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(chordRaw))) if (isChord(m[0])) pos.push({ p: m.index, c: m[0] });
  const need = pos.length ? pos[pos.length - 1].p + 1 : 0;
  if (lyric.length < need) lyric = lyric.padEnd(need, ' ');
  const segs = [];
  if (pos.length && pos[0].p > 0) segs.push({ chord: null, text: lyric.slice(0, pos[0].p) });
  pos.forEach((x, k) => segs.push({ chord: x.c, text: lyric.slice(x.p, k + 1 < pos.length ? pos[k + 1].p : undefined) }));
  return segs;
}
function parseContent(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const out = [];
  const special = t => t.startsWith('#') || t.startsWith('>');
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i], tr = raw.trim();
    if (!tr) { if (out.length && out[out.length - 1].type !== 'empty') out.push({ type: 'empty' }); continue; }
    if (tr.startsWith('#')) { out.push({ type: 'section', text: tr.replace(/^#+\s*/, '') }); continue; }
    if (tr.startsWith('>')) { out.push({ type: 'note', text: tr.replace(/^>\s*/, '') }); continue; }
    if (!raw.includes('[') && isChordLine(tr)) {
      const nx = lines[i + 1], nt = nx == null ? '' : nx.trim();
      if (nt && !special(nt) && !nx.includes('[') && !isChordLine(nt)) {
        out.push({ type: 'line', segs: mergeChordLine(raw, nx) });
        i++;
      } else out.push({ type: 'chords', items: tr.split(/\s+/) });
      continue;
    }
    if (/\[[^\]]+\]/.test(raw)) {
      const segs = parseInline(raw);
      if (segs.every(s => !s.text.trim())) out.push({ type: 'chords', items: segs.map(s => s.chord).filter(Boolean) });
      else if (segs.every(s => !s.text.trim() || EXTRA_RE.test(s.text.trim()) || !s.chord))
        out.push({ type: 'chords', items: segs.flatMap(s => [s.chord, ...s.text.trim().split(/\s+/)]).filter(Boolean) });
      else out.push({ type: 'line', segs });
      continue;
    }
    out.push({ type: 'line', segs: [{ chord: null, text: raw.trim() }] });
  }
  while (out.length && out[out.length - 1].type === 'empty') out.pop();
  while (out.length && out[0].type === 'empty') out.shift();
  return out;
}
const chordsIn = parsed => parsed.flatMap(b => b.type === 'line' ? b.segs.map(s => s.chord).filter(Boolean) : b.type === 'chords' ? b.items.filter(isChord) : []);

/* ---------- tema / sheet / toast ---------- */
function applyTheme() {
  document.documentElement.dataset.theme = prefs.theme;
  $('meta[name=theme-color]').content = prefs.theme === 'dark' ? '#17120e' : '#fbf6ee';
}
function openSheet(html) {
  $('#sheetBody').innerHTML = html;
  $('#sheetWrap').classList.remove('hidden');
}
function closeSheet() { $('#sheetWrap').classList.add('hidden'); }
$('#sheetWrap').addEventListener('click', e => { if (e.target.hasAttribute('data-close')) closeSheet(); });

let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2600);
}
function confetti() {
  const em = ['🎸', '🎶', '✨', '🎵', '⭐', '🔥'];
  for (let i = 0; i < 24; i++) {
    const s = document.createElement('span');
    s.className = 'confetti';
    s.textContent = pick(em);
    s.style.left = Math.random() * 100 + 'vw';
    s.style.animationDelay = Math.random() * 0.4 + 's';
    s.style.fontSize = 16 + Math.random() * 18 + 'px';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 2200);
  }
}

/* ---------- ana sayfa ---------- */
const GREETINGS = ['Bugün hangi şarkı? 🎶', 'Parmaklar ısındı mı? 🔥', 'Bir kapo, bir çay, bir şarkı ☕', 'Akort tamam mı? 🎸', 'Sahne senin 🎤', 'Nasır yapma zamanı 💪'];
let filter = { q: '', tag: null };

function showHome() {
  stopSong();
  const songs = allSongs();
  const ezber = songs.filter(s => st(s.id).level === 2).length;
  const plays = songs.reduce((a, s) => a + (st(s.id).plays || 0), 0);
  app.innerHTML = `
  <div class="home">
    <header class="home-head">
      <div><h1><span class="logo">${ic('guitar')}</span>Repertuarım</h1><p class="greet">${pick(GREETINGS)}</p></div>
      <button class="icon-btn" id="themeBtn" aria-label="Tema">${ic(prefs.theme === 'dark' ? 'sun' : 'moon')}</button>
    </header>
    <div class="stats">
      <div><b data-n="${songs.length}">${songs.length}</b><span>şarkı</span></div>
      <div><b data-n="${ezber}">${ezber}</b><span>${ic('flame', 'lv2')} ezber</span></div>
      <div><b data-n="${plays}">${plays}</b><span>kez çalındı</span></div>
    </div>
    ${privBlob && !privSongs.length ? `
    <form class="lock" id="lockForm">
      <b>${ic('lock')} Kişisel şarkıların kilitli</b>
      <span class="muted">Şifreyi bir kez gir, bu telefon hatırlar.</span>
      <div class="lock-row"><input id="lockPass" type="password" placeholder="Şifre" autocomplete="current-password" autocapitalize="none"><button class="big" type="submit">Aç</button></div>
    </form>` : ''}
    <button class="dice" id="diceBtn"><span class="die">${ic('dice')}</span> Ne çalsam?</button>
    <input id="q" class="search" type="search" placeholder="Şarkı, sanatçı ya da sözden ara…" value="${esc(filter.q)}" autocomplete="off">
    <div class="chips" id="chips"></div>
    <ul class="list" id="list"></ul>
    <footer class="home-foot">
      <button id="importBtn" class="link">${ic('import')} Şarkı dosyası yükle (.json)</button>
      <input id="importFile" type="file" accept=".json,application/json" hidden>
      <button id="exportBtn" class="link">${ic('export')} Uygulamada eklediğim şarkıları dışa aktar</button>
    </footer>
    <a class="fab" href="#/edit/" aria-label="Şarkı ekle">${ic('plus')}</a>
  </div>`;
  renderChips(songs);
  renderList(true);
  countUp();
  $('#q').addEventListener('input', e => { filter.q = e.target.value; renderList(); });
  $('#themeBtn').onclick = () => { prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark'; savePrefs(); applyTheme(); showHome(); };
  $('#diceBtn').onclick = rollDice;
  $('#exportBtn').onclick = exportLocal;
  if ($('#lockForm')) $('#lockForm').onsubmit = async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true; btn.textContent = '…';
    try {
      await unlockPrivate($('#lockPass').value);
      confetti();
      toast(`🔓 ${privSongs.length} şarkı açıldı!`);
      showHome();
    } catch {
      btn.disabled = false; btn.textContent = 'Aç';
      toast('Şifre yanlış 🙈');
    }
  };
  $('#importBtn').onclick = () => $('#importFile').click();
  $('#importFile').onchange = e => { if (e.target.files[0]) importSongs(e.target.files[0]); };
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// İstatistik sayıları 0'dan sayarak gelsin
function countUp() {
  if (reducedMotion()) return;
  document.querySelectorAll('.stats b[data-n]').forEach(b => {
    const n = +b.dataset.n, t0 = performance.now();
    if (!n) return;
    const step = now => {
      const p = Math.min(1, (now - t0) / 700);
      b.textContent = Math.round(n * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

// Özel şarkı dosyası: aynı id'li şarkıyı günceller, yenileri ekler. Telefonda yerel saklanır.
async function importSongs(file) {
  try {
    const data = JSON.parse(await file.text());
    const list = Array.isArray(data) ? data : data.songs;
    if (!Array.isArray(list)) throw new Error();
    let added = 0, updated = 0;
    for (const s of list) {
      if (!s || !s.title || !s.content) continue;
      const song = { ...s, id: s.id || 'imp-' + slug(s.title) };
      const i = localSongs.findIndex(x => x.id === song.id);
      if (i >= 0) { localSongs[i] = song; updated++; } else { localSongs.push(song); added++; }
    }
    saveLocal();
    toast(`📥 ${added} yeni, ${updated} güncellendi`);
    showHome();
  } catch {
    toast('Dosya okunamadı 😕 (.json olmalı)');
  }
}

function renderChips(songs) {
  const tags = [...new Set(songs.flatMap(s => s.tags || []))].sort((a, b) => a.localeCompare(b, 'tr'));
  const chips = [[null, 'Tümü'], ['__fav', ic('star', 'starc') + 'Favori'], ['__lv2', lvlIc(2) + 'Ezber'], ['__lv0', lvlIc(0) + 'Öğreniyorum'], ...tags.map(t => [t, '#' + esc(t)])];
  const el = $('#chips');
  el.innerHTML = chips.map(([v, l]) => `<button class="chip ${filter.tag === v ? 'on' : ''}" data-v="${esc(v ?? '')}">${l}</button>`).join('');
  el.onclick = e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    filter.tag = b.dataset.v || null;
    renderChips(songs);
    renderList(true);
  };
}

function renderList(anim = false) {
  const q = fold(filter.q.trim());
  const songs = allSongs().filter(s => {
    const x = st(s.id);
    if (filter.tag === '__fav' && !x.fav) return false;
    if (filter.tag === '__lv2' && x.level !== 2) return false;
    if (filter.tag === '__lv0' && x.level !== 0) return false;
    if (filter.tag && !filter.tag.startsWith('__') && !(s.tags || []).includes(filter.tag)) return false;
    if (!q) return true;
    return fold([s.title, s.artist, (s.tags || []).join(' '), (s.content || '').replace(/\[[^\]]*\]/g, '')].join(' ')).includes(q);
  }).sort((a, b) => (st(b.id).fav - st(a.id).fav) || a.title.localeCompare(b.title, 'tr'));

  const list = $('#list');
  list.classList.toggle('anim', anim);
  list.innerHTML = songs.length ? songs.map((s, i) => {
    const x = st(s.id);
    const key = songKey(s);
    return `<li style="--i:${Math.min(i, 12)}"><a class="card" href="#/song/${encodeURIComponent(s.id)}">
      ${songArt(s)}
      <span class="info"><span class="title">${esc(s.title)}</span>
        <span class="sub">${key ? `<span class="badge">${esc(keyName(key, 0))}</span>` : ''}${s.capo ? `<span class="badge capo">Kapo ${s.capo}</span>` : ''}<span class="artist">${esc(s.artist || '')}${x.plays ? ` · ${x.plays}×` : ''}</span></span></span>
      <span class="side"><span class="lvl" title="${LEVELS[x.level].n}">${lvlIc(x.level)}</span>${x.fav ? `<span class="fav">${ic('star', 'starc on')}</span>` : ''}</span>
    </a></li>`;
  }).join('') : `<li class="empty">Hiç şarkı bulunamadı 🤷<br><small>Filtreyi değiştir ya da ＋ ile ekle</small></li>`;
}

function rollDice() {
  const songs = allSongs();
  if (!songs.length) return toast('Önce birkaç şarkı ekle 🙂');
  // Az çalınanlar biraz daha şanslı
  const w = songs.map(s => 1 / (1 + (st(s.id).plays || 0)));
  let r = Math.random() * w.reduce((a, b) => a + b, 0), chosen = songs[0];
  for (let i = 0; i < songs.length; i++) { r -= w[i]; if (r <= 0) { chosen = songs[i]; break; } }
  openSheet(`<div class="roll"><div class="roll-die">${ic('dice')}</div><div class="roll-name" id="rollName">…</div><div id="rollAct"></div></div>`);
  let n = 0;
  const iv = setInterval(() => {
    const s = n++ < 12 ? pick(songs) : chosen;
    $('#rollName').innerHTML = `${songArt(s, 'sm')} ${esc(s.title)}<small>${esc(s.artist || '')}</small>`;
    if (n > 12) {
      clearInterval(iv);
      $('#rollName').classList.add('done');
      $('#rollAct').innerHTML = `<a class="big" href="#/song/${encodeURIComponent(chosen.id)}">${ic('guitar')} Hadi çal!</a><button class="link" id="again">${ic('dice')} Bir daha</button>`;
      $('#again').onclick = rollDice;
      $('#rollAct a').onclick = closeSheet;
    }
  }, 70 + n * 4);
}

function exportLocal() {
  if (!localSongs.length) return toast('Uygulamadan eklenmiş şarkı yok');
  const data = localSongs.map(({ id, ...s }) => s);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'yeni-sarkilar.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Dosya indirildi 📦');
}

/* ---------- şarkı ekranı ---------- */
let cur = null, scrollRAF = null, wakeLock = null;

function songKey(song, parsed) {
  if (song.key) return parseKey(song.key);
  const first = chordsIn(parsed || parseContent(song.content))[0];
  const k = parseKey(first);
  return k ? { i: mod(k.i + (song.capo || 0)), minor: k.minor } : null;
}

function showSong(id) {
  const song = allSongs().find(s => s.id === id);
  if (!song) { location.hash = '#/'; return; }
  const x = st(id);
  const parsed = parseContent(song.content);
  cur = { song, parsed, key: songKey(song, parsed), t: x.t || 0, capo: x.capo != null && x.capoBase === (song.capo || 0) ? x.capo : (song.capo || 0) };
  app.innerHTML = `
  <div class="song">
    <header class="song-head">
      <a href="#/" class="icon-btn" aria-label="Geri">${ic('back')}</a>
      <div class="titles"><h2>${songArt(song, 'sm')} ${esc(song.title)}</h2><p>${esc(song.artist || '')}</p></div>
      <button class="icon-btn" id="favBtn" aria-label="Favori">${ic('star', 'starc' + (x.fav ? ' on' : ''))}</button>
    </header>
    ${song.capo ? `<div class="capo-banner">${ic('capo')} KAPO ${esc(song.capo)}. PERDE</div>` : ''}
    <div class="info-row" id="infoRow"></div>
    <div class="strip" id="strip"></div>
    ${song.notes ? `<div class="notes">${ic('note')} ${esc(song.notes)}</div>` : ''}
    <article class="body" id="body" style="font-size:${prefs.font}px"></article>
    <div class="end">
      <button id="playedBtn" class="big">${ic('check')} Çaldım!</button>
      ${song.builtin ? '' : `<a class="link" href="#/edit/${encodeURIComponent(id)}">${ic('edit')} Düzenle</a>`}
    </div>
  </div>
  <nav class="toolbar">
    <div class="grp"><button data-a="t-" aria-label="Ton düşür">−</button><span class="lbl" id="tLbl"></span><button data-a="t+" aria-label="Ton yükselt">+</button></div>
    <button data-a="capo" id="capoBtn" class="pill"></button>
    <div class="grp"><button data-a="f-">A−</button><button data-a="f+">A+</button></div>
    <div class="grp"><button data-a="scroll" id="scrollBtn" aria-label="Otomatik kaydır">${ic('play')}</button><button data-a="spd" id="spdBtn" aria-label="Hız"></button></div>
  </nav>`;
  renderSong();
  window.scrollTo(0, 0);

  $('#favBtn').onclick = () => { x.fav = !x.fav; saveStats(); $('#favBtn').innerHTML = ic('star', 'starc' + (x.fav ? ' on' : '')); toast(x.fav ? 'Favorilere eklendi ⭐' : 'Favorilerden çıkarıldı'); };
  $('#playedBtn').onclick = played;
  $('.toolbar').onclick = e => { const b = e.target.closest('[data-a]'); if (b) act(b.dataset.a); };
  const chordTap = e => { const c = e.target.closest('[data-c]'); if (c) showChord(c.dataset.c); };
  $('#body').onclick = chordTap;
  $('#strip').onclick = chordTap;
  $('#infoRow').onclick = e => {
    if (e.target.closest('#lvlChip')) { x.level = (x.level + 1) % 3; saveStats(); renderSong(); toast(LEVELS[x.level].i + ' ' + LEVELS[x.level].n); }
    else if (e.target.closest('#keyChip')) openCapo();
  };
  requestWake();
}

const shapeShift = () => cur.t - (cur.capo - (cur.song.capo || 0));

function renderSong() {
  const { song, parsed, key } = cur;
  const x = st(song.id);
  const sh = shapeShift();
  const chips = [];
  if (key) chips.push(`<button class="ichip" id="keyChip">${ic('music')} Ton <b>${keyName(key, cur.t)}</b></button>`);
  chips.push(`<button class="ichip" onclick="openCapo()">${ic('capo')} ${cur.capo ? `Kapo <b>${cur.capo}</b>` : 'Kapo yok'}</button>`);
  if (key && cur.capo) chips.push(`<span class="ichip">${ic('shape')} Şekil <b>${keyName(key, cur.t - cur.capo)}</b></span>`);
  if (song.bpm) chips.push(`<span class="ichip">${ic('timer')} <b>${esc(song.bpm)}</b> bpm</span>`);
  chips.push(`<button class="ichip" id="lvlChip">${lvlIc(x.level)} ${LEVELS[x.level].n}</button>`);
  if (x.plays) chips.push(`<span class="ichip">${ic('play')} ${x.plays}×</span>`);
  $('#infoRow').innerHTML = chips.join('');

  const uniq = [...new Set(chordsIn(parsed).map(c => transposeChord(c, sh)))];
  $('#strip').innerHTML = uniq.map(c => `<button class="mini" data-c="${esc(c)}">${Chords.svg(c, 52) || '<span class="nod">?</span>'}<span>${esc(c)}</span></button>`).join('');

  $('#body').innerHTML = parsed.map(b => {
    if (b.type === 'empty') return '<div class="gap"></div>';
    if (b.type === 'section') return `<h3 class="sec">${esc(b.text)}</h3>`;
    if (b.type === 'note') return `<p class="cmt">${esc(b.text)}</p>`;
    if (b.type === 'chords') return `<div class="cline">${b.items.map(t => isChord(t) ? chordSpan(t, sh) : `<span class="x">${esc(t)}</span>`).join('')}</div>`;
    return renderLine(b.segs, sh);
  }).join('');

  $('#tLbl').textContent = cur.t ? (cur.t > 0 ? '+' : '') + cur.t : 'Ton';
  $('#capoBtn').textContent = 'Kapo ' + cur.capo;
  $('#spdBtn').textContent = '×' + prefs.speed;
}

const chordSpan = (c, sh) => { const t = transposeChord(c, sh); return `<span class="c" data-c="${esc(t)}">${esc(t)}</span>`; };

function renderLine(segs, sh) {
  const hasC = segs.some(s => s.chord);
  let h = '';
  for (const s of segs) {
    const pieces = s.text.replace(/\s+/g, ' ').match(/\S+ ?| /g) || [''];
    pieces.forEach((p, i) => {
      if (i === 0 && s.chord) h += `<span class="w">${chordSpan(s.chord, sh)}<span class="t">${p ? esc(p) : '&nbsp;'}</span></span>`;
      else h += `<span class="w"><span class="t">${esc(p)}</span></span>`;
    });
  }
  return `<div class="line${hasC ? ' hc' : ''}">${h}</div>`;
}

function act(a) {
  const x = st(cur.song.id);
  if (a === 't-' || a === 't+') { cur.t += a === 't+' ? 1 : -1; if (Math.abs(cur.t) > 11) cur.t = 0; x.t = cur.t; saveStats(); renderSong(); }
  else if (a === 'capo') openCapo();
  else if (a === 'f-' || a === 'f+') { prefs.font = Math.min(34, Math.max(12, prefs.font + (a === 'f+' ? 2 : -2))); savePrefs(); $('#body').style.fontSize = prefs.font + 'px'; }
  else if (a === 'scroll') scrollRAF ? stopScroll() : startScroll();
  else if (a === 'spd') { prefs.speed = prefs.speed % 8 + 1; savePrefs(); $('#spdBtn').textContent = '×' + prefs.speed; }
}

function openCapo() {
  const { key } = cur;
  if (!key) return toast('Bu şarkıda ton bilgisi bulunamadı');
  let opts = '';
  for (let c = 0; c <= 9; c++) {
    const n = cur.t - c, easy = isEasy(key, n);
    opts += `<button class="capo-opt${c === cur.capo ? ' on' : ''}${easy ? ' easy' : ''}" data-capo="${c}"><b>${c ? 'Kapo ' + c : 'Kapo yok'}</b><span>${keyName(key, n)} şekli${easy ? ' ⭐' : ''}</span></button>`;
  }
  openSheet(`
    <h3 class="sh-title">${ic('capo')} Kapo & Ton</h3>
    <p class="big-key">Duyulan ton: <b>${keyName(key, cur.t)}</b>${cur.t ? ` <small>(orijinal ${keyName(key, 0)})</small>` : ''}</p>
    <div class="row3">
      <button data-s="-1">− ½ ses</button><button data-s="0">Orijinal</button><button data-s="1">+ ½ ses</button>
    </div>
    <p class="muted">Aynı tonda kalıp kapoyu değiştirebilirsin. ⭐ = kolay akor şekilleri</p>
    <div class="capo-grid">${opts}</div>`);
  $('#sheetBody').onclick = e => {
    const x = st(cur.song.id);
    const c = e.target.closest('[data-capo]'), s = e.target.closest('[data-s]');
    if (c) { cur.capo = +c.dataset.capo; x.capo = cur.capo; x.capoBase = cur.song.capo || 0; }
    else if (s) { cur.t = s.dataset.s === '0' ? 0 : cur.t + +s.dataset.s; if (Math.abs(cur.t) > 11) cur.t = 0; x.t = cur.t; }
    else return;
    saveStats(); renderSong(); openCapo();
  };
}
window.openCapo = openCapo;

function showChord(name) {
  const f = Chords.frets(name);
  openSheet(`<div class="chord-big">
    <h3>${esc(name)}</h3>
    ${f ? Chords.svg(name, 200) : '<p class="muted">Bu akorun şeması yok 😅</p>'}
    ${f && !f.exact ? '<p class="muted">Basitleştirilmiş şema</p>' : ''}
    ${cur && cur.capo ? `<p class="muted">Kapo ${cur.capo}. perdede — şema kapoya göre</p>` : ''}
  </div>`);
  $('#sheetBody').onclick = null;
}

function played() {
  const x = st(cur.song.id);
  x.plays = (x.plays || 0) + 1;
  x.last = Date.now();
  saveStats();
  confetti();
  const p = x.plays;
  let msg = pick(['Harika! 🎉', 'Alkışlar! 👏', 'Efsane! 🤘', 'Tüyler diken diken 🔥', 'Bravo! 🎶']) + ` ${p}. kez çaldın`;
  if (p === 1) msg = 'İlk kez çaldın! 🎉 Hayırlı olsun';
  if (p === 10 && x.level < 2) msg = '🏆 10 kez! Bunu ezbere almış sayılırsın';
  if (p === 3 && x.level === 0) { x.level = 1; saveStats(); msg = '🎸 3 kez oldu — "Çalabiliyorum" seviyesine geçtin!'; }
  toast(msg);
  renderSong();
}

function startScroll() {
  let last = performance.now(), acc = 0;
  $('#scrollBtn').innerHTML = ic('pause');
  $('#scrollBtn').classList.add('on');
  const step = now => {
    acc += (now - last) / 1000 * prefs.speed * 9;
    last = now;
    if (acc >= 1) { window.scrollBy(0, Math.floor(acc)); acc -= Math.floor(acc); }
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) return stopScroll();
    scrollRAF = requestAnimationFrame(step);
  };
  scrollRAF = requestAnimationFrame(step);
}
function stopScroll() {
  cancelAnimationFrame(scrollRAF);
  scrollRAF = null;
  const b = $('#scrollBtn');
  if (b) { b.innerHTML = ic('play'); b.classList.remove('on'); }
}
async function requestWake() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch { }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && cur) requestWake(); });
function stopSong() {
  stopScroll();
  cur = null;
  if (wakeLock) { wakeLock.release().catch(() => { }); wakeLock = null; }
}

/* ---------- şarkı ekle / düzenle ---------- */
function showEditor(id) {
  stopSong();
  const s = id ? localSongs.find(x => x.id === id) : null;
  if (id && !s) { location.hash = '#/'; return; }
  const v = s || { title: '', artist: '', key: '', capo: 0, bpm: '', emoji: '🎵', tags: [], notes: '', content: '' };
  app.innerHTML = `
  <div class="editor">
    <header class="song-head">
      <a href="${s ? '#/song/' + encodeURIComponent(s.id) : '#/'}" class="icon-btn" aria-label="Geri">${ic('back')}</a>
      <div class="titles"><h2>${s ? 'Şarkıyı düzenle' : 'Yeni şarkı'}</h2><p>Bu cihazda saklanır</p></div>
    </header>
    <form id="ef">
      <div class="r2"><label class="emo-in">Simge<input name="emoji" value="${esc(v.emoji)}" maxlength="4"></label><label class="grow">Şarkı adı *<input name="title" required value="${esc(v.title)}"></label></div>
      <label>Sanatçı<input name="artist" value="${esc(v.artist)}"></label>
      <div class="r3">
        <label>Kapo<input name="capo" type="number" min="0" max="12" inputmode="numeric" value="${esc(v.capo || 0)}"></label>
        <label>Ton <small>(duyulan)</small><input name="key" placeholder="ör. Am" value="${esc(v.key)}"></label>
        <label>BPM<input name="bpm" type="number" inputmode="numeric" value="${esc(v.bpm)}"></label>
      </div>
      <label>Etiketler <small>(virgülle)</small><input name="tags" placeholder="türkçe, slow" value="${esc((v.tags || []).join(', '))}"></label>
      <label>Not<input name="notes" placeholder="Ritim: A - A Y - Y A Y" value="${esc(v.notes)}"></label>
      <label>Sözler & akorlar *
        <textarea name="content" rows="14" required placeholder="# Nakarat&#10;[Am]Yağmur yağar [F]ince ince&#10;&#10;ya da&#10;&#10;Am           F&#10;Yağmur yağar ince ince">${esc(v.content)}</textarea>
      </label>
      <p class="muted">İpucu: Bir siteden kopyaladığın "akor satırı üstte" formatı da olduğu gibi çalışır.</p>
      <button class="big" type="submit">${ic('save')} Kaydet</button>
      ${s ? `<button class="link danger" type="button" id="delBtn">${ic('trash')} Şarkıyı sil</button>` : ''}
    </form>
  </div>`;
  $('#ef').onsubmit = e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const song = {
      id: s ? s.id : 'local-' + Date.now().toString(36),
      title: f.title.trim(), artist: f.artist.trim(), key: f.key.trim(),
      capo: +f.capo || 0, bpm: f.bpm ? +f.bpm : '', emoji: f.emoji.trim() || '🎵',
      tags: f.tags.split(',').map(t => t.trim()).filter(Boolean), notes: f.notes.trim(), content: f.content,
    };
    if (s) localSongs[localSongs.indexOf(s)] = song; else localSongs.push(song);
    saveLocal();
    toast('Kaydedildi 🎶');
    location.hash = '#/song/' + encodeURIComponent(song.id);
  };
  if (s) $('#delBtn').onclick = () => {
    const b = $('#delBtn');
    if (!b.dataset.sure) { b.dataset.sure = 1; b.innerHTML = ic('alert') + ' Emin misin? Tekrar dokun'; return; }
    localSongs = localSongs.filter(x => x !== s);
    saveLocal();
    toast('Silindi');
    location.hash = '#/';
  };
}

/* ---------- yönlendirme ---------- */
let lastDepth = -1, homeScroll = 0;
function route() {
  closeSheet();
  const h = decodeURIComponent(location.hash);
  const depth = h.startsWith('#/edit/') ? 2 : h.startsWith('#/song/') ? 1 : 0;
  const prev = lastDepth;
  if (prev === 0 && depth > 0) homeScroll = window.scrollY;
  const render = () => {
    if (depth === 1) showSong(h.slice(7));
    else if (depth === 2) showEditor(h.slice(7));
    else { showHome(); if (prev > 0) window.scrollTo(0, homeScroll); }
  };
  const dir = depth >= prev ? 'fwd' : 'back';
  const first = prev < 0;
  lastDepth = depth;
  if (first || reducedMotion()) return render();
  document.documentElement.dataset.dir = dir;
  if (document.startViewTransition) document.startViewTransition(render);
  else { render(); app.firstElementChild?.classList.add('enter-' + dir); }
}
window.addEventListener('hashchange', route);
applyTheme();
loadPrivate().finally(route);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  const hadSW = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { });
  // Yeni sürüm devreye girince bir kez yenile
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSW && !sessionStorage.reloaded) { sessionStorage.reloaded = 1; location.reload(); } });
}
