/* Generates the Android Auto drawables for the carmedia module:
 *  - custom action icons (Like/Loop/Radio)
 *  - browse category icons
 *  - themed gradient "music skeleton" artwork variants
 * Run: node tools/gen-car-drawables.js */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'modules', 'carmedia', 'android', 'src', 'main', 'res', 'drawable');
fs.mkdirSync(OUT, { recursive: true });

// White 24dp icon (tinted by Android Auto).
function icon(paths) {
  const body = paths
    .map((d) => `  <path android:fillColor="#FFFFFFFF" android:pathData="${d}"/>`)
    .join('\n');
  return `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">\n${body}\n</vector>\n`;
}

const NOTE = 'M12,3v10.55c-0.59,-0.34 -1.27,-0.55 -2,-0.55c-2.21,0 -4,1.79 -4,4s1.79,4 4,4s4,-1.79 4,-4V7h4V3h-6z';

const icons = {
  ic_pb_like: [
    'M16.5,3c-1.74,0 -3.41,0.81 -4.5,2.09C10.91,3.81 9.24,3 7.5,3C4.42,3 2,5.42 2,8.5c0,3.78 3.4,6.86 8.55,11.54L12,21.35l1.45,-1.32C18.6,15.36 22,12.28 22,8.5C22,5.42 19.58,3 16.5,3zM12.1,18.55l-0.1,0.1l-0.1,-0.1C7.14,14.24 4,11.39 4,8.5C4,6.5 5.5,5 7.5,5c1.54,0 3.04,0.99 3.57,2.36h1.87C13.46,5.99 14.96,5 16.5,5C18.5,5 20,6.5 20,8.5C20,11.39 16.86,14.24 12.1,18.55z',
  ],
  ic_pb_like_on: [
    'M12,21.35l-1.45,-1.32C5.4,15.36 2,12.28 2,8.5C2,5.42 4.42,3 7.5,3c1.74,0 3.41,0.81 4.5,2.09C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.42 22,8.5c0,3.78 -3.4,6.86 -8.55,11.54L12,21.35z',
  ],
  ic_pb_loop: ['M7,7h10v3l4,-4l-4,-4v3H5v6h2V7zM17,17H7v-3l-4,4l4,4v-3h12v-6h-2V17z'],
  ic_pb_loop_on: [
    'M7,7h10v3l4,-4l-4,-4v3H5v6h2V7zM17,17H7v-3l-4,4l4,4v-3h12v-6h-2V17zM13,15h1V9h-1l-2,1v1h2V15z',
  ],
  ic_pb_radio: [
    'M3.24,6.15C2.51,6.43 2,7.17 2,8v12c0,1.1 0.89,2 2,2h16c1.11,0 2,-0.9 2,-2V8c0,-1.1 -0.89,-2 -2,-2H8.3l8.26,-3.34L15.88,1L3.24,6.15zM7,20c-1.66,0 -3,-1.34 -3,-3s1.34,-3 3,-3s3,1.34 3,3s-1.34,3 -3,3zM20,12h-2v-2h-2v2H4V8h16V12z',
  ],
  ic_cat_songs: [NOTE],
  ic_cat_playlists: ['M4,6h16v2H4zM4,11h16v2H4zM4,16h10v2H4z'],
  ic_cat_foryou: [
    'M19,9l1.25,-2.75L23,5l-2.75,-1.25L19,1l-1.25,2.75L15,5l2.75,1.25L19,9zM11.5,9.5L9,4L6.5,9.5L1,12l5.5,2.5L9,20l2.5,-5.5L17,12L11.5,9.5zM19,15l-1.25,2.75L15,19l2.75,1.25L19,23l1.25,-2.75L23,19l-2.75,-1.25L19,15z',
  ],
  ic_cat_most: [
    'M13.5,0.67s0.74,2.65 0.74,4.8c0,2.06 -1.35,3.73 -3.41,3.73c-2.07,0 -3.63,-1.67 -3.63,-3.73l0.03,-0.36C5.21,7.51 4,10.62 4,14c0,4.42 3.58,8 8,8s8,-3.58 8,-8C20,8.61 17.41,3.8 13.5,0.67zM11.71,19c-1.78,0 -3.22,-1.4 -3.22,-3.14c0,-1.62 1.05,-2.76 2.81,-3.12c1.77,-0.36 3.6,-1.21 4.62,-2.58c0.39,1.29 0.59,2.65 0.59,4.04C16.51,16.85 14.36,19 11.71,19z',
  ],
  ic_cat_recent: [
    'M13,3c-4.97,0 -9,4.03 -9,9H1l3.89,3.89l0.07,0.14L9,12H6c0,-3.87 3.13,-7 7,-7s7,3.13 7,7s-3.13,7 -7,7c-1.93,0 -3.68,-0.79 -4.94,-2.06l-1.42,1.42C8.27,19.99 10.51,21 13,21c4.97,0 9,-4.03 9,-9s-4.03,-9 -9,-9zM12,8v5l4.28,2.54l0.72,-1.21l-3.5,-2.08V8H12z',
  ],
};

// Gradient music-skeleton artwork (512dp), tinted by hash → one of 6.
const GRADS = [
  ['#6C5CE7', '#1FD1A0'],
  ['#FF6B6B', '#FFA94D'],
  ['#4DABF7', '#1864AB'],
  ['#F783AC', '#862E9C'],
  ['#1FD1A0', '#0CA678'],
  ['#DA77F2', '#5F3DC4'],
];

function art(a, b) {
  // scaled note path (24->512 ~ x21.3, centered)
  return `<vector xmlns:android="http://schemas.android.com/apk/res/android" xmlns:aapt="http://schemas.android.com/aapt" android:width="512dp" android:height="512dp" android:viewportWidth="512" android:viewportHeight="512">
  <path android:pathData="M0,0h512v512h-512z">
    <aapt:attr name="android:fillColor">
      <gradient android:type="linear" android:startX="0" android:startY="0" android:endX="512" android:endY="512">
        <item android:offset="0" android:color="${a}FF"/>
        <item android:offset="1" android:color="${b}FF"/>
      </gradient>
    </aapt:attr>
  </path>
  <path android:fillColor="#33FFFFFF" android:pathData="M96,150c-30,-18 -50,-40 -50,-60a24,24 0 0 1 44,-13a24,24 0 0 1 50,9c0,20 -20,42 -44,64z"/>
  <path android:fillColor="#22FFFFFF" android:pathData="M430,420c-22,-13 -36,-29 -36,-43a17,17 0 0 1 31,-9a17,17 0 0 1 36,6c0,14 -14,30 -31,46z"/>
  <path android:fillColor="#FFFFFFFF" android:pathData="M236,150v150c-13,-7 -28,-12 -44,-12c-49,0 -88,39 -88,88s39,88 88,88s88,-39 88,-88V238h88v-88h-132z"/>
</vector>
`;
}

let n = 0;
for (const [name, paths] of Object.entries(icons)) {
  fs.writeFileSync(path.join(OUT, name + '.xml'), icon(paths));
  n++;
}
GRADS.forEach((g, i) => {
  fs.writeFileSync(path.join(OUT, `ic_art_${i}.xml`), art(g[0], g[1]));
  n++;
});
console.log('wrote', n, 'drawables to', OUT);
