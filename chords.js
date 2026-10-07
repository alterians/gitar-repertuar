// Akor şemaları: yaygın açık akorlar + diğer her şey için E/A bare kalıplarından üretim.
(function () {
  const IDX = { C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, F: 5, 'E#': 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, H: 11, Cb: 11 };
  const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

  // Telden tele: kalın Mi (E) -> ince mi (e). x = çalınmaz
  const OPEN = {
    C: 'x32010', Cmaj7: 'x32000', C7: 'x32310', Cadd9: 'x32030', Csus2: 'x30010', Csus4: 'x33010',
    D: 'xx0232', Dm: 'xx0231', D7: 'xx0212', Dm7: 'xx0211', Dmaj7: 'xx0222', Dsus2: 'xx0230', Dsus4: 'xx0233',
    E: '022100', Em: '022000', E7: '020100', Em7: '022030', Esus4: '022200', Emaj7: '021100',
    F: '133211', Fm: '133111', Fmaj7: 'xx3210', F7: '131211',
    G: '320003', G7: '320001', Gmaj7: '320002', Gsus4: '330013', Gsus2: '300033', Gadd9: '320203',
    A: 'x02220', Am: 'x02210', A7: 'x02020', Am7: 'x02010', Amaj7: 'x02120', Asus2: 'x02200', Asus4: 'x02230', Aadd9: 'x02420',
    B7: 'x21202', Bm: 'x24432', Bm7: 'x20202', Bb: 'x13331',
  };

  const E_SH = { '': [0, 2, 2, 1, 0, 0], m: [0, 2, 2, 0, 0, 0], '7': [0, 2, 0, 1, 0, 0], m7: [0, 2, 0, 0, 0, 0], maj7: [0, 2, 1, 1, 0, 0], sus4: [0, 2, 2, 2, 0, 0] };
  const A_SH = { '': [null, 0, 2, 2, 2, 0], m: [null, 0, 2, 2, 1, 0], '7': [null, 0, 2, 0, 2, 0], m7: [null, 0, 2, 0, 1, 0], maj7: [null, 0, 2, 1, 2, 0], sus2: [null, 0, 2, 2, 0, 0], sus4: [null, 0, 2, 2, 3, 0], dim: [null, 0, 1, 2, 1, null], add9: [null, 0, 2, 4, 2, 0], m7b5: [null, 0, 1, 0, 1, null] };

  const SUFFIX = { '': '', maj: '', M: '', min: 'm', m: 'm', '-': 'm', '7': '7', m7: 'm7', min7: 'm7', '-7': 'm7', maj7: 'maj7', M7: 'maj7', 'Δ': 'maj7', sus: 'sus4', sus4: 'sus4', sus2: 'sus2', '2': 'sus2', dim: 'dim', '°': 'dim', add9: 'add9', add2: 'add9', m7b5: 'm7b5', 'ø': 'm7b5' };

  function normSuffix(s) {
    s = s.replace(/[()]/g, '');
    if (s in SUFFIX) return { k: SUFFIX[s], exact: true };
    if (/^(maj7|M7|maj9)/.test(s)) return { k: 'maj7', exact: false };
    if (/^(m|min)(?!aj)/.test(s)) return { k: /7|9|11/.test(s) ? 'm7' : 'm', exact: false };
    if (/sus2/.test(s)) return { k: 'sus2', exact: false };
    if (/sus/.test(s)) return { k: 'sus4', exact: false };
    if (/7|9|11|13/.test(s)) return { k: '7', exact: false };
    return { k: '', exact: false };
  }

  function parseOpen(str) { return str.split('').map(c => (c === 'x' ? null : +c)); }

  function frets(name) {
    const m = String(name).match(/^([A-H])(#|b)?([^/]*)(?:\/.*)?$/);
    if (!m) return null;
    const idx = IDX[m[1] + (m[2] || '')];
    if (idx == null) return null;
    const ns = normSuffix(m[3]);
    const open = OPEN[NAMES[idx] + ns.k];
    if (open) return { frets: parseOpen(open), exact: ns.exact };
    const cands = [];
    if (E_SH[ns.k]) cands.push({ r: (idx - 4 + 12) % 12, sh: E_SH[ns.k] });
    if (A_SH[ns.k]) cands.push({ r: (idx - 9 + 12) % 12, sh: A_SH[ns.k] });
    if (!cands.length) return frets(NAMES[idx]);
    cands.sort((a, b) => a.r - b.r);
    const { r, sh } = cands[0];
    return { frets: sh.map(f => (f == null ? null : f + r)), exact: ns.exact };
  }

  function svg(name, width) {
    const f = frets(name);
    if (!f) return '';
    const fr = f.frets;
    const pressed = fr.filter(x => x != null && x > 0);
    const max = pressed.length ? Math.max(...pressed) : 0;
    const min = pressed.length ? Math.min(...pressed) : 1;
    const start = max <= 4 ? 1 : min;
    const rows = Math.max(5, max - start + 1);
    const L = 22, R = 92, sx = (R - L) / 5, T = 30, fs = 90 / rows, B = T + rows * fs;
    let s = `<svg class="cd" viewBox="0 0 104 ${B + 8}" width="${width || 90}" role="img" aria-label="${name}">`;
    for (let i = 0; i < 6; i++) s += `<line x1="${L + i * sx}" y1="${T}" x2="${L + i * sx}" y2="${B}" class="ln"/>`;
    for (let j = 0; j <= rows; j++) s += `<line x1="${L}" y1="${T + j * fs}" x2="${R}" y2="${T + j * fs}" class="ln"/>`;
    if (start === 1) s += `<rect x="${L - 1}" y="${T - 4}" width="${R - L + 2}" height="5" class="nut"/>`;
    else s += `<text x="${L - 6}" y="${T + fs * 0.65}" class="fn" text-anchor="end">${start}</text>`;
    // Bare
    const top = fr[5];
    const first = fr.findIndex(x => x != null);
    if (pressed.length && top === min && fr[first] === min && fr.filter(x => x === min).length >= 2) {
      const y = T + (min - start + 0.5) * fs;
      s += `<rect x="${L + first * sx - 5}" y="${y - 5}" width="${(5 - first) * sx + 10}" height="10" rx="5" class="dot"/>`;
    }
    fr.forEach((v, i) => {
      const x = L + i * sx;
      if (v == null) s += `<text x="${x}" y="${T - 10}" class="mk" text-anchor="middle">×</text>`;
      else if (v === 0) s += `<circle cx="${x}" cy="${T - 14}" r="4" class="op"/>`;
      else s += `<circle cx="${x}" cy="${T + (v - start + 0.5) * fs}" r="5.5" class="dot"/>`;
    });
    return s + '</svg>';
  }

  window.Chords = { frets, svg };
})();
