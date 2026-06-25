/* Generates on-brand SVG mockups of PrimeBeats screens for the GitHub Pages site.
 * Run with: node tools/gen-screens.js  (output -> docs/screenshots/*.svg)
 * Uses the app's real theme palette so the mockups match the product. */
const fs = require('fs');
const path = require('path');

const C = {
  bg: '#0B0B0F',
  surface: '#15151C',
  surfaceAlt: '#1E1E28',
  border: '#2A2A36',
  primary: '#1FD1A0',
  primaryDark: '#16A07C',
  accent: '#6C5CE7',
  text: '#FFFFFF',
  textMuted: '#A0A0B0',
  textFaint: '#6C6C7C',
  black: '#000000',
  white: '#FFFFFF',
};

const GRAD = [
  ['#6C5CE7', '#1FD1A0'],
  ['#FF6B6B', '#FFA94D'],
  ['#4DABF7', '#1864AB'],
  ['#F783AC', '#862E9C'],
  ['#1FD1A0', '#0CA678'],
  ['#FFD43B', '#F08C00'],
  ['#748FFC', '#3B5BDB'],
  ['#FF8787', '#E03131'],
  ['#63E6BE', '#0B7285'],
  ['#DA77F2', '#5F3DC4'],
];

const W = 320;
const H = 660;

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function gradDefs() {
  return GRAD.map(
    (g, i) =>
      `<linearGradient id="g${i}" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${g[0]}"/><stop offset="1" stop-color="${g[1]}"/></linearGradient>`,
  ).join('');
}

function note(x, y, s, color = 'rgba(255,255,255,0.92)') {
  return (
    `<g transform="translate(${x} ${y}) scale(${s})" fill="${color}">` +
    `<ellipse cx="-3" cy="6" rx="4.2" ry="3" transform="rotate(-20 -3 6)"/>` +
    `<rect x="0.6" y="-9" width="1.8" height="15"/>` +
    `<path d="M2.4 -9 q7 1 6 8 q-2 -4 -6 -3 z"/></g>`
  );
}

function tile(x, y, size, gi, r = 12) {
  return (
    `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${r}" fill="url(#g${gi})"/>` +
    note(x + size / 2, y + size / 2 - size * 0.04, size / 22)
  );
}

function txt(x, y, s, opts = {}) {
  const { size = 13, color = C.text, weight = 400, anchor = 'start', mono = false } = opts;
  const ff = mono
    ? "ui-monospace, 'SF Mono', Menlo, monospace"
    : "-apple-system, 'Segoe UI', Roboto, sans-serif";
  return `<text x="${x}" y="${y}" font-family="${ff}" font-size="${size}" font-weight="${weight}" fill="${color}" text-anchor="${anchor}">${esc(s)}</text>`;
}

function statusBar() {
  return (
    txt(20, 30, '9:41', { size: 13, weight: 700 }) +
    `<g fill="${C.text}" transform="translate(${W - 56} 22)">` +
    `<rect x="0" y="2" width="4" height="8" rx="1"/><rect x="6" y="-1" width="4" height="11" rx="1"/>` +
    `<rect x="12" y="-4" width="4" height="14" rx="1"/>` +
    `<rect x="22" y="-3" width="20" height="11" rx="2.5" fill="none" stroke="${C.text}" stroke-width="1.4"/>` +
    `<rect x="24" y="-1" width="13" height="7" rx="1.2"/></g>`
  );
}

function frame(inner) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">` +
    `<defs>${gradDefs()}` +
    `<clipPath id="screen"><rect x="0" y="0" width="${W}" height="${H}" rx="30"/></clipPath></defs>` +
    `<g clip-path="url(#screen)">` +
    `<rect x="0" y="0" width="${W}" height="${H}" fill="${C.bg}"/>` +
    statusBar() +
    inner +
    `</g><rect x="0.6" y="0.6" width="${W - 1.2}" height="${H - 1.2}" rx="30" fill="none" stroke="${C.border}" stroke-width="1.2"/></svg>`
  );
}

function tabBar(active) {
  const tabs = [
    ['Home', 'M3 10l7-6 7 6v8H3z'],
    ['Songs', 'M6 4h11v2H6zM6 9h11v2H6zM6 14h7v2H6z'],
    ['Albums', 'M10 3a7 7 0 100 14 7 7 0 000-14zm0 5a2 2 0 110 4 2 2 0 010-4z'],
    ['Playlists', 'M4 4h12v2H4zM4 9h12v2H4zM4 14h8v2H4z'],
    ['Search', 'M9 3a6 6 0 104 10l4 4 1-1-4-4A6 6 0 009 3z'],
  ];
  const tw = W / tabs.length;
  let out =
    `<rect x="0" y="${H - 64}" width="${W}" height="64" fill="${C.surface}"/>` +
    `<rect x="0" y="${H - 64}" width="${W}" height="1" fill="${C.border}"/>`;
  tabs.forEach((t, i) => {
    const cx = i * tw + tw / 2;
    const col = i === active ? C.primary : C.textFaint;
    out +=
      `<g transform="translate(${cx - 10} ${H - 52})" fill="${col}"><path d="${t[1]}"/></g>` +
      txt(cx, H - 22, t[0], { size: 9.5, color: col, anchor: 'middle', weight: 600 });
  });
  return out;
}

function topbar(title, right = '') {
  return (
    txt(W / 2, 64, title, { size: 16, weight: 700, anchor: 'middle' }) +
    `<g transform="translate(18 52)" fill="${C.text}"><path d="M4 8l6-6 1.4 1.4L6.8 8l4.6 4.6L10 14z"/></g>` +
    right
  );
}

function songRow(y, gi, title, artist, opts = {}) {
  const { active = false } = opts;
  return (
    (active ? `<rect x="8" y="${y - 6}" width="${W - 16}" height="52" rx="12" fill="${C.surfaceAlt}"/>` : '') +
    tile(16, y, 40, gi, 8) +
    txt(68, y + 17, title, { size: 13.5, weight: 600, color: active ? C.primary : C.text }) +
    txt(68, y + 34, artist, { size: 11.5, color: C.textMuted })
  );
}

/* ---------------- Screens ---------------- */

function nowPlaying() {
  const cx = W / 2;
  let s = topbar(
    'Now Playing',
    `<g fill="${C.text}" transform="translate(${W - 96} 56)">` +
      `<path d="M6 10c-3-2-5-4-5-6a2.4 2.4 0 014.4-1.3A2.4 2.4 0 0110 4c0 2-2 4-4 6z" fill="${C.primary}"/>` +
      `<rect x="22" y="2.4" width="9" height="1.8" rx="1"/><rect x="25.6" y="-1.2" width="1.8" height="9" rx="1"/>` +
      `<g transform="translate(44 -1)"><rect x="0" y="0" width="2" height="10" rx="1"/><rect x="4" y="2" width="2" height="8" rx="1"/><rect x="8" y="4" width="2" height="6" rx="1"/></g>` +
      `<g transform="translate(66 0)"><rect x="0" y="1" width="11" height="1.7" rx="1"/><rect x="0" y="5" width="11" height="1.7" rx="1"/><rect x="0" y="9" width="8" height="1.7" rx="1"/></g></g>`,
  );
  const art = 230;
  const ax = (W - art) / 2;
  const ay = 96;
  s += `<rect x="${ax}" y="${ay}" width="${art}" height="${art}" rx="20" fill="url(#g0)"/>`;
  s += note(cx, ay + art / 2 - 8, art / 22);
  s +=
    `<g transform="translate(${ax + art - 78} ${ay + art / 2 - 20})">` +
    `<rect x="0" y="0" width="62" height="40" rx="20" fill="rgba(0,0,0,0.55)"/>` +
    `<g transform="translate(14 14)" fill="${C.white}"><path d="M0 0l6 6-6 6z"/><path d="M7 0l6 6-6 6z"/></g>` +
    txt(40, 26, '+4s', { size: 13, weight: 800, anchor: 'middle' }) +
    `</g>`;
  s += txt(cx, ay + art + 36, 'Midnight City', { size: 21, weight: 800, anchor: 'middle' });
  s += txt(cx, ay + art + 58, 'M83', { size: 14, color: C.textMuted, anchor: 'middle' });
  const py = ay + art + 78;
  s +=
    `<rect x="${cx - 80}" y="${py}" width="160" height="34" rx="17" fill="none" stroke="${C.primary}" stroke-width="1.3"/>` +
    txt(cx + 8, py + 22, 'Start Smart Radio', { size: 12.5, color: C.primary, weight: 700, anchor: 'middle' });
  const by = py + 58;
  s += `<rect x="24" y="${by}" width="${W - 48}" height="4" rx="2" fill="${C.border}"/>`;
  s += `<rect x="24" y="${by}" width="120" height="4" rx="2" fill="${C.primary}"/>`;
  s += `<circle cx="144" cy="${by + 2}" r="7" fill="${C.primary}"/>`;
  s +=
    `<g transform="translate(120 ${by - 34})"><rect x="0" y="0" width="48" height="22" rx="6" fill="${C.primary}"/>` +
    txt(24, 15, '1:23', { size: 12, weight: 800, color: C.black, anchor: 'middle' }) +
    `<path d="M18 22l6 6 6-6z" fill="${C.primary}"/></g>`;
  s += txt(24, by + 22, '1:23', { size: 10.5, color: C.textMuted, mono: true });
  s += txt(W - 24, by + 22, '4:03', { size: 10.5, color: C.textMuted, mono: true, anchor: 'end' });
  const cyy = by + 60;
  s += `<g fill="none" stroke="${C.textMuted}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" transform="translate(30 ${cyy - 8})"><path d="M0 2h3l11 12h4M14 12l4 2-4 2M0 14h3l4-4M11 4l3-2-3-2"/></g>`;
  s += `<g fill="${C.text}" transform="translate(86 ${cyy - 9})"><path d="M2 0v18M4 9l13 9V0z"/></g>`;
  s += `<circle cx="${cx}" cy="${cyy}" r="30" fill="${C.primary}"/>`;
  s += `<path d="M${cx - 8} ${cyy - 12}l20 12-20 12z" fill="${C.black}"/>`;
  s += `<g fill="${C.text}" transform="translate(214 ${cyy - 9})"><path d="M16 0v18M14 9L1 0v18z"/></g>`;
  s += `<g fill="none" stroke="${C.textMuted}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" transform="translate(266 ${cyy - 8})"><path d="M3 6a3 3 0 013-3h9l-3-3M17 12a3 3 0 01-3 3H5l3 3"/></g>`;
  return frame(s);
}

function library() {
  let s = txt(20, 70, 'PrimeBeats', { size: 24, weight: 800 });
  s += `<g transform="translate(${W - 44} 52)" fill="${C.textMuted}"><path d="M9 3a6 6 0 104 10l4 4 1.4-1.4-4-4A6 6 0 009 3zm0 2a4 4 0 110 8 4 4 0 010-8z"/></g>`;
  s += `<rect x="16" y="86" width="${W - 32}" height="38" rx="12" fill="${C.surface}"/>`;
  s += `<g transform="translate(30 99)" fill="${C.textFaint}"><path d="M6 2a5 5 0 103 9l3 3 1-1-3-3A5 5 0 006 2z"/></g>`;
  s += txt(50, 110, 'Search songs, artists, albums', { size: 12.5, color: C.textFaint });
  s += txt(20, 150, 'Songs', { size: 13, weight: 700, color: C.textMuted });
  const songs = [
    [0, 'Midnight City', 'M83'],
    [3, 'Redbone', 'Childish Gambino'],
    [2, 'Instant Crush', 'Daft Punk'],
    [9, 'The Less I Know', 'Tame Impala'],
    [4, 'Nightcall', 'Kavinsky'],
    [7, 'Dreams', 'Fleetwood Mac'],
  ];
  let y = 168;
  songs.forEach((t) => {
    s += songRow(y, t[0], t[1], t[2]);
    y += 56;
  });
  const my = H - 64 - 56;
  s += `<rect x="8" y="${my}" width="${W - 16}" height="52" rx="14" fill="${C.surfaceAlt}"/>`;
  s += tile(16, my + 6, 40, 0, 8);
  s += txt(66, my + 23, 'Midnight City', { size: 12.5, weight: 600 });
  s += txt(66, my + 39, 'M83', { size: 11, color: C.textMuted });
  s += `<circle cx="${W - 36}" cy="${my + 26}" r="15" fill="${C.primary}"/>`;
  s += `<g fill="${C.black}"><rect x="${W - 41}" y="${my + 20}" width="3.4" height="12" rx="1"/><rect x="${W - 34}" y="${my + 20}" width="3.4" height="12" rx="1"/></g>`;
  s += tabBar(1);
  return frame(s);
}

function equalizer() {
  let s = topbar(
    'Equalizer',
    `<g transform="translate(${W - 64} 50)"><rect x="0" y="0" width="44" height="24" rx="12" fill="${C.primaryDark}"/><circle cx="32" cy="12" r="9" fill="${C.primary}"/></g>`,
  );
  s += txt(20, 104, 'PRESETS', { size: 11, weight: 700, color: C.textMuted });
  const presets = ['Flat', 'Rock', 'Pop', 'Jazz', 'Bass'];
  let px = 16;
  presets.forEach((p, i) => {
    const on = i === 1;
    const w = 16 + p.length * 8;
    s += `<rect x="${px}" y="118" width="${w}" height="30" rx="15" fill="${on ? C.primary : C.surface}" stroke="${on ? C.primary : C.border}"/>`;
    s += txt(px + w / 2, 137, p, { size: 12, color: on ? C.black : C.text, weight: 600, anchor: 'middle' });
    px += w + 8;
  });
  s += txt(20, 178, 'BANDS', { size: 11, weight: 700, color: C.textMuted });
  const bands = [
    ['60', 0.7],
    ['230', 0.62],
    ['910', 0.5],
    ['3.6k', 0.58],
    ['14k', 0.66],
  ];
  let y = 198;
  bands.forEach((b) => {
    const fill = b[1];
    s += txt(20, y + 6, b[0] + 'Hz', { size: 11, color: C.textMuted, mono: true });
    s += `<rect x="64" y="${y}" width="${W - 64 - 56}" height="4" rx="2" fill="${C.border}"/>`;
    s += `<rect x="64" y="${y}" width="${(W - 64 - 56) * fill}" height="4" rx="2" fill="${C.primary}"/>`;
    s += `<circle cx="${64 + (W - 64 - 56) * fill}" cy="${y + 2}" r="7" fill="${C.primary}"/>`;
    const db = Math.round((fill - 0.5) * 30);
    s += txt(W - 20, y + 6, (db >= 0 ? '+' : '') + db + ' dB', {
      size: 11,
      color: C.text,
      weight: 700,
      anchor: 'end',
      mono: true,
    });
    y += 42;
  });
  y += 6;
  s += txt(20, y, 'BASS BOOST', { size: 11, weight: 700, color: C.textMuted });
  y += 18;
  s += `<circle cx="26" cy="${y - 4}" r="4" fill="${C.primary}"/>`;
  s += txt(40, y, 'Boost', { size: 14, weight: 600 });
  s += `<g transform="translate(${W - 64} ${y - 16})"><rect x="0" y="0" width="44" height="24" rx="12" fill="${C.primaryDark}"/><circle cx="32" cy="12" r="9" fill="${C.primary}"/></g>`;
  y += 22;
  s += `<rect x="20" y="${y}" width="${W - 40 - 44}" height="4" rx="2" fill="${C.border}"/>`;
  s += `<rect x="20" y="${y}" width="${(W - 40 - 44) * 0.6}" height="4" rx="2" fill="${C.primary}"/>`;
  s += `<circle cx="${20 + (W - 40 - 44) * 0.6}" cy="${y + 2}" r="7" fill="${C.primary}"/>`;
  s += txt(W - 20, y + 6, '60%', { size: 11, weight: 700, anchor: 'end', mono: true });
  return frame(s);
}

function smartRadio() {
  let s = topbar('Smart Radio queue');
  s +=
    `<g transform="translate(20 92)">` +
    `<rect x="0" y="0" width="${W - 40}" height="56" rx="14" fill="${C.surfaceAlt}"/>` +
    `<g transform="translate(16 14)" fill="${C.primary}"><path d="M6 10c-3-2-5-4-5-6a2.4 2.4 0 014.4-1.3A2.4 2.4 0 0110 4c0 2-2 4-4 6z"/></g>` +
    txt(40, 26, 'Smart Radio', { size: 13, weight: 700 }) +
    txt(40, 43, 'Picking songs that match your taste', { size: 11, color: C.textMuted }) +
    `<rect x="${W - 78} " y="18" width="42" height="20" rx="10" fill="${C.accent}"/>` +
    txt(W - 57, 32, 'ML', { size: 11, weight: 800, color: C.text, anchor: 'middle' }) +
    `</g>`;
  s += txt(20, 178, 'UP NEXT', { size: 11, weight: 700, color: C.textMuted });
  const q = [
    [4, 'Nightcall', 'Kavinsky', true],
    [0, 'Midnight City', 'M83', false],
    [9, 'The Less I Know', 'Tame Impala', false],
    [3, 'Redbone', 'Childish Gambino', false],
    [6, 'Genesis', 'Grimes', false],
    [2, 'Instant Crush', 'Daft Punk', false],
  ];
  let y = 196;
  q.forEach((t) => {
    if (t[3]) {
      s += `<rect x="8" y="${y - 6}" width="${W - 16}" height="52" rx="12" fill="${C.surfaceAlt}"/>`;
      s += `<g transform="translate(26 ${y + 9})" fill="${C.primary}"><path d="M0 4h3l4-3v12l-4-3H0z"/><path d="M11 5a4 4 0 010 7" fill="none" stroke="${C.primary}" stroke-width="1.6"/></g>`;
    } else {
      s += tile(16, y, 40, t[0], 8);
    }
    s += txt(68, y + 17, t[1], { size: 13.5, weight: 600, color: t[3] ? C.primary : C.text });
    s += txt(68, y + 34, t[2], { size: 11.5, color: C.textMuted });
    s += `<g transform="translate(${W - 36} ${y + 12})" fill="${C.textFaint}"><rect x="0" y="0" width="16" height="2" rx="1"/><rect x="0" y="6" width="16" height="2" rx="1"/><rect x="0" y="12" width="16" height="2" rx="1"/></g>`;
    y += 56;
  });
  return frame(s);
}

function playlists() {
  let s = txt(20, 70, 'Playlists', { size: 24, weight: 800 });
  const cards = [
    ['Most Played', 4],
    ['Recently Played', 2],
    ['Made for You', 9],
  ];
  let y = 92;
  cards.forEach((c) => {
    s += `<rect x="16" y="${y}" width="${W - 32}" height="64" rx="16" fill="${C.surface}"/>`;
    s += tile(28, y + 12, 40, c[1], 10);
    s += txt(84, y + 30, c[0], { size: 15, weight: 700 });
    s += txt(84, y + 48, 'Smart playlist', { size: 11.5, color: C.textMuted });
    s += `<g transform="translate(${W - 40} ${y + 26})"><path d="M0 0l8 6-8 6z" fill="${C.primary}"/></g>`;
    y += 76;
  });
  s += txt(20, y + 22, 'YOUR PLAYLISTS', { size: 11, weight: 700, color: C.textMuted });
  y += 38;
  const pls = [
    [7, 'Late Night Drive', '24 songs'],
    [5, 'Focus Flow', '18 songs'],
    [3, 'Throwbacks', '52 songs'],
  ];
  pls.forEach((p) => {
    s += songRow(y, p[0], p[1], p[2]);
    y += 56;
  });
  s += tabBar(3);
  return frame(s);
}

function share() {
  let s = topbar(
    'Share music',
    txt(W - 18, 64, 'Clear', { size: 13.5, color: C.primary, weight: 700, anchor: 'end' }),
  );
  s += txt(20, 96, 'Select songs to send to another PrimeBeats', { size: 12, color: C.textMuted });
  s += txt(20, 112, 'user — via your phone’s share sheet.', { size: 12, color: C.textMuted });

  const songs = [
    [0, 'Midnight City', 'M83', true],
    [3, 'Redbone', 'Childish Gambino', true],
    [2, 'Instant Crush', 'Daft Punk', false],
    [9, 'The Less I Know', 'Tame Impala', true],
    [4, 'Nightcall', 'Kavinsky', false],
    [7, 'Dreams', 'Fleetwood Mac', false],
  ];
  let y = 138;
  songs.forEach((t) => {
    s += tile(16, y, 44, t[0], 8);
    s += txt(72, y + 18, t[1], { size: 14, weight: 600 });
    s += txt(72, y + 35, t[2], { size: 12, color: C.textMuted });
    const cbx = W - 32;
    if (t[3]) {
      s += `<circle cx="${cbx}" cy="${y + 22}" r="11" fill="${C.primary}"/>`;
      s += `<path d="M${cbx - 5} ${y + 22}l3 3 6-6" stroke="${C.black}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    } else {
      s += `<circle cx="${cbx}" cy="${y + 22}" r="10.5" fill="none" stroke="${C.textFaint}" stroke-width="1.6"/>`;
    }
    y += 56;
  });

  // Footer send button.
  const fy = H - 78;
  s += `<rect x="0" y="${fy - 14}" width="${W}" height="${H - (fy - 14)}" fill="${C.bg}"/>`;
  s += `<rect x="0" y="${fy - 14}" width="${W}" height="1" fill="${C.border}"/>`;
  s += `<rect x="16" y="${fy}" width="${W - 32}" height="48" rx="24" fill="${C.primary}"/>`;
  s += `<g transform="translate(118 ${fy + 16})" fill="none" stroke="${C.black}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="3" cy="8" r="2.4"/><circle cx="13" cy="3" r="2.4"/><circle cx="13" cy="13" r="2.4"/><path d="M5.1 6.9l5.8-2.8M5.1 9.1l5.8 2.8"/></g>`;
  s += txt(W / 2 + 10, fy + 30, 'Send 3 songs', { size: 16, weight: 800, color: C.black, anchor: 'middle' });
  return frame(s);
}

function androidAuto() {
  const AW = 760;
  const AH = 440;
  const rail = 72;
  const cx0 = rail + 30;
  let g = `<rect x="0" y="0" width="${AW}" height="${AH}" fill="#0A0A0E"/>`;

  // Left Android-Auto app rail.
  g += `<rect x="0" y="0" width="${rail}" height="${AH}" fill="${C.surface}"/>`;
  g += `<circle cx="${rail / 2}" cy="58" r="20" fill="url(#g0)"/>` + note(rail / 2, 56, 20 / 22);
  g += `<g fill="none" stroke="${C.textFaint}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">`;
  g += `<g transform="translate(${rail / 2 - 11} 116)"><path d="M11 1l9 20-9-5-9 5z"/></g>`; // nav
  g += `<g transform="translate(${rail / 2 - 11} 176)"><path d="M3 5a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H9l-4 4v-4H5a2 2 0 01-2-2z"/></g>`; // messages
  g += `<g transform="translate(${rail / 2 - 10} ${AH - 52})"><path d="M9 2L3 9l6 7"/></g>`; // back
  g += `</g>`;

  // Header.
  g += txt(cx0, 52, 'PrimeBeats', { size: 22, weight: 800 });
  g += txt(cx0, 74, 'Songs', { size: 13, color: C.textMuted, weight: 600 });

  // Two-column browse grid.
  const songs = [
    [0, 'Midnight City', 'M83'],
    [3, 'Redbone', 'Childish Gambino'],
    [9, 'The Less I Know', 'Tame Impala'],
    [4, 'Nightcall', 'Kavinsky'],
    [2, 'Instant Crush', 'Daft Punk'],
    [7, 'Dreams', 'Fleetwood Mac'],
  ];
  const colW = (AW - rail - 60) / 2;
  songs.forEach((t, i) => {
    const col = i % 2;
    const rowI = Math.floor(i / 2);
    const x = cx0 + col * (colW + 12);
    const y = 96 + rowI * 62;
    g += `<rect x="${x}" y="${y}" width="${colW}" height="52" rx="12" fill="${C.surface}"/>`;
    g += tile(x + 8, y + 8, 36, t[0], 8);
    g += txt(x + 54, y + 24, t[1], { size: 13.5, weight: 600 });
    g += txt(x + 54, y + 40, t[2], { size: 11.5, color: C.textMuted });
  });

  // Now-playing bar.
  const npY = AH - 90;
  g += `<rect x="${rail}" y="${npY}" width="${AW - rail}" height="90" fill="${C.surfaceAlt}"/>`;
  g += tile(cx0, npY + 17, 56, 0, 10);
  g += txt(cx0 + 72, npY + 38, 'Midnight City', { size: 16, weight: 700 });
  g += txt(cx0 + 72, npY + 60, 'M83', { size: 13, color: C.textMuted });
  const tcx = AW - 150;
  g += `<g fill="${C.text}" transform="translate(${tcx} ${npY + 36})"><path d="M2 0v18M4 9l13 9V0z"/></g>`;
  g += `<circle cx="${tcx + 70}" cy="${npY + 45}" r="26" fill="${C.primary}"/>`;
  g += `<path d="M${tcx + 62} ${npY + 33}l18 12-18 12z" fill="${C.black}"/>`;
  g += `<g fill="${C.text}" transform="translate(${tcx + 120} ${npY + 36})"><path d="M16 0v18M14 9L1 0v18z"/></g>`;

  // Voice chip ("play X from PrimeBeats").
  const chipW = 320;
  const chipX = rail + (AW - rail) / 2 - chipW / 2;
  const chipY = npY - 56;
  g += `<rect x="${chipX}" y="${chipY}" width="${chipW}" height="42" rx="21" fill="${C.accent}"/>`;
  g += `<g transform="translate(${chipX + 18} ${chipY + 11})" fill="#fff"><rect x="3" y="0" width="8" height="13" rx="4"/><path d="M0 9a7 7 0 0014 0M7 16v4M3 22h8" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></g>`;
  g += txt(chipX + chipW / 2 + 12, chipY + 26, 'Play Midnight City from PrimeBeats', {
    size: 13,
    weight: 700,
    color: '#fff',
    anchor: 'middle',
  });

  // Top status strip.
  g += txt(cx0, 24, '12:30', { size: 12, color: C.textMuted, weight: 600 });

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${AW}" height="${AH}" viewBox="0 0 ${AW} ${AH}" role="img">` +
    `<defs>${gradDefs()}<clipPath id="car"><rect x="0" y="0" width="${AW}" height="${AH}" rx="18"/></clipPath></defs>` +
    `<g clip-path="url(#car)">${g}</g>` +
    `<rect x="0.7" y="0.7" width="${AW - 1.4}" height="${AH - 1.4}" rx="18" fill="none" stroke="${C.border}" stroke-width="1.4"/></svg>`
  );
}

const screens = {
  'now-playing': nowPlaying(),
  library: library(),
  equalizer: equalizer(),
  'smart-radio': smartRadio(),
  playlists: playlists(),
  share: share(),
  'android-auto': androidAuto(),
};

const outDir = path.join(__dirname, '..', 'docs', 'screenshots');
fs.mkdirSync(outDir, { recursive: true });
for (const [name, svg] of Object.entries(screens)) {
  fs.writeFileSync(path.join(outDir, name + '.svg'), svg);
  console.log('wrote', name + '.svg', svg.length, 'bytes');
}
