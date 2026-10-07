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

const LEVELS = [{ i: '🌱', n: 'Öğreniyorum' }, { i: '🎸', n: 'Çalabiliyorum' }, { i: '🔥', n: 'Ezber' }];

function allSongs() {
  const seen = {};
  const b = (window.SONGS || []).map(s => {
    let id = s.id || slug(s.title);
    while (seen[id]) id += '-2';
    seen[id] = 1;
    return { ...s, id, builtin: true };
  });
  return b.concat(localSongs.map(s => ({ ...s, builtin: false })));
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
      <div><h1>🎸 Repertuarım</h1><p class="greet">${pick(GREETINGS)}</p></div>
      <button class="icon-btn" id="themeBtn" aria-label="Tema">${prefs.theme === 'dark' ? '☀️' : '🌙'}</button>
    </header>
    <div class="stats">
      <div><b>${songs.length}</b><span>şarkı</span></div>
      <div><b>${ezber}</b><span>🔥 ezber</span></div>
      <div><b>${plays}</b><span>kez çalındı</span></div>
    </div>
    <button class="dice" id="diceBtn"><span class="die">🎲</span> Ne çalsam?</button>
    <input id="q" class="search" type="search" placeholder="Şarkı, sanatçı ya da sözden ara…" value="${esc(filter.q)}" autocomplete="off">
    <div class="chips" id="chips"></div>
    <ul class="list" id="list"></ul>
    <footer class="home-foot">
      <button id="importBtn" class="link">📥 Şarkı dosyası yükle (.json)</button>
      <input id="importFile" type="file" accept=".json,application/json" hidden>
      <button id="exportBtn" class="link">⬇️ Uygulamada eklediğim şarkıları dışa aktar</button>
    </footer>
    <a class="fab" href="#/edit/" aria-label="Şarkı ekle">＋</a>
  </div>`;
  renderChips(songs);
  renderList();
  $('#q').addEventListener('input', e => { filter.q = e.target.value; renderList(); });
  $('#themeBtn').onclick = () => { prefs.theme = prefs.theme === 'dark' ? 'light' : 'dark'; savePrefs(); applyTheme(); showHome(); };
  $('#diceBtn').onclick = rollDice;
  $('#exportBtn').onclick = exportLocal;
  $('#importBtn').onclick = () => $('#importFile').click();
  $('#importFile').onchange = e => { if (e.target.files[0]) importSongs(e.target.files[0]); };
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
  const chips = [[null, 'Tümü'], ['__fav', '⭐ Favori'], ['__lv2', '🔥 Ezber'], ['__lv0', '🌱 Öğreniyorum'], ...tags.map(t => [t, '#' + t])];
  const el = $('#chips');
  el.innerHTML = chips.map(([v, l]) => `<button class="chip ${filter.tag === v ? 'on' : ''}" data-v="${esc(v ?? '')}">${esc(l)}</button>`).join('');
  el.onclick = e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    filter.tag = b.dataset.v || null;
    renderChips(songs);
    renderList();
  };
}

function renderList() {
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

  $('#list').innerHTML = songs.length ? songs.map(s => {
    const x = st(s.id);
    const key = songKey(s);
    return `<li><a class="card" href="#/song/${encodeURIComponent(s.id)}">
      <span class="emo">${esc(s.emoji || '🎵')}</span>
      <span class="info"><span class="title">${esc(s.title)}</span><span class="artist">${esc(s.artist || '')}${x.plays ? ` · ${x.plays}× çalındı` : ''}</span></span>
      <span class="meta">${x.fav ? '<span>⭐</span>' : ''}${key ? `<span class="badge">${esc(keyName(key, 0))}</span>` : ''}${s.capo ? `<span class="badge capo">K${s.capo}</span>` : ''}<span class="lvl" title="${LEVELS[x.level].n}">${LEVELS[x.level].i}</span></span>
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
  openSheet(`<div class="roll"><div class="roll-die">🎲</div><div class="roll-name" id="rollName">…</div><div id="rollAct"></div></div>`);
  let n = 0;
  const iv = setInterval(() => {
    const s = n++ < 12 ? pick(songs) : chosen;
    $('#rollName').innerHTML = `<span>${esc(s.emoji || '🎵')}</span> ${esc(s.title)}<small>${esc(s.artist || '')}</small>`;
    if (n > 12) {
      clearInterval(iv);
      $('#rollName').classList.add('done');
      $('#rollAct').innerHTML = `<a class="big" href="#/song/${encodeURIComponent(chosen.id)}">Hadi çal! 🎸</a><button class="link" id="again">Bir daha 🎲</button>`;
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
  cur = { song, parsed, key: songKey(song, parsed), t: x.t || 0, capo: x.capo ?? (song.capo || 0) };
  app.innerHTML = `
  <div class="song">
    <header class="song-head">
      <a href="#/" class="icon-btn" aria-label="Geri">‹</a>
      <div class="titles"><h2>${esc(song.emoji || '🎵')} ${esc(song.title)}</h2><p>${esc(song.artist || '')}</p></div>
      <button class="icon-btn" id="favBtn" aria-label="Favori">${x.fav ? '⭐' : '☆'}</button>
    </header>
    ${song.capo ? `<div class="capo-banner">🔩 KAPO ${esc(song.capo)}. PERDE</div>` : ''}
    <div class="info-row" id="infoRow"></div>
    <div class="strip" id="strip"></div>
    ${song.notes ? `<div class="notes">📝 ${esc(song.notes)}</div>` : ''}
    <article class="body" id="body" style="font-size:${prefs.font}px"></article>
    <div class="end">
      <button id="playedBtn" class="big">✅ Çaldım!</button>
      ${song.builtin ? '' : `<a class="link" href="#/edit/${encodeURIComponent(id)}">✏️ Düzenle</a>`}
    </div>
  </div>
  <nav class="toolbar">
    <div class="grp"><button data-a="t-" aria-label="Ton düşür">−</button><span class="lbl" id="tLbl"></span><button data-a="t+" aria-label="Ton yükselt">+</button></div>
    <button data-a="capo" id="capoBtn" class="pill"></button>
    <div class="grp"><button data-a="f-">A−</button><button data-a="f+">A+</button></div>
    <div class="grp"><button data-a="scroll" id="scrollBtn" aria-label="Otomatik kaydır">▶</button><button data-a="spd" id="spdBtn" aria-label="Hız"></button></div>
  </nav>`;
  renderSong();
  window.scrollTo(0, 0);

  $('#favBtn').onclick = () => { x.fav = !x.fav; saveStats(); $('#favBtn').textContent = x.fav ? '⭐' : '☆'; toast(x.fav ? 'Favorilere eklendi ⭐' : 'Favorilerden çıkarıldı'); };
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
  if (key) chips.push(`<button class="ichip" id="keyChip">🎵 Ton <b>${keyName(key, cur.t)}</b></button>`);
  chips.push(`<button class="ichip" onclick="openCapo()">🔩 ${cur.capo ? `Kapo <b>${cur.capo}</b>` : 'Kapo yok'}</button>`);
  if (key && cur.capo) chips.push(`<span class="ichip">✋ Şekil <b>${keyName(key, cur.t - cur.capo)}</b></span>`);
  if (song.bpm) chips.push(`<span class="ichip">⏱ <b>${esc(song.bpm)}</b> bpm</span>`);
  chips.push(`<button class="ichip" id="lvlChip">${LEVELS[x.level].i} ${LEVELS[x.level].n}</button>`);
  if (x.plays) chips.push(`<span class="ichip">▶ ${x.plays}×</span>`);
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
    <h3 class="sh-title">🔩 Kapo & Ton</h3>
    <p class="big-key">Duyulan ton: <b>${keyName(key, cur.t)}</b>${cur.t ? ` <small>(orijinal ${keyName(key, 0)})</small>` : ''}</p>
    <div class="row3">
      <button data-s="-1">− ½ ses</button><button data-s="0">Orijinal</button><button data-s="1">+ ½ ses</button>
    </div>
    <p class="muted">Aynı tonda kalıp kapoyu değiştirebilirsin. ⭐ = kolay akor şekilleri</p>
    <div class="capo-grid">${opts}</div>`);
  $('#sheetBody').onclick = e => {
    const x = st(cur.song.id);
    const c = e.target.closest('[data-capo]'), s = e.target.closest('[data-s]');
    if (c) { cur.capo = +c.dataset.capo; x.capo = cur.capo; }
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
  $('#scrollBtn').textContent = '⏸';
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
  if (b) { b.textContent = '▶'; b.classList.remove('on'); }
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
      <a href="${s ? '#/song/' + encodeURIComponent(s.id) : '#/'}" class="icon-btn">‹</a>
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
      <button class="big" type="submit">💾 Kaydet</button>
      ${s ? '<button class="link danger" type="button" id="delBtn">🗑 Şarkıyı sil</button>' : ''}
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
    if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = '⚠️ Emin misin? Tekrar dokun'; return; }
    localSongs = localSongs.filter(x => x !== s);
    saveLocal();
    toast('Silindi');
    location.hash = '#/';
  };
}

/* ---------- yönlendirme ---------- */
function route() {
  closeSheet();
  const h = decodeURIComponent(location.hash);
  if (h.startsWith('#/song/')) showSong(h.slice(7));
  else if (h.startsWith('#/edit/')) showEditor(h.slice(7));
  else showHome();
}
window.addEventListener('hashchange', route);
applyTheme();
route();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
