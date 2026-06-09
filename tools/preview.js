// フレームのテキストプレビュー（シルエット確認用）
// usage: node tools/preview.js js/characters/<id>.js [frameKey] [index]
// 例:    node tools/preview.js js/characters/jiro.js special 1
const path = require("path");

const file = process.argv[2];
const key = process.argv[3];
const idx = parseInt(process.argv[4] || "0", 10);
if (!file) {
  console.error("usage: node tools/preview.js <character.js> [frameKey] [index]");
  process.exit(2);
}

global.window = { DOT_FIGHTERS: [] };
require(path.resolve(file));
const c = global.window.DOT_FIGHTERS[0];
if (!c) { console.error("キャラクターが読み込めません"); process.exit(1); }

function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function show(rows, palette, label) {
  console.log(`--- ${label} ---`);
  for (const row of rows) {
    let line = "";
    for (const ch of row) {
      if (ch === "." || !(ch in palette)) {
        line += "  ";
      } else {
        const [r, g, b] = hexToRgb(palette[ch]);
        line += `\x1b[48;2;${r};${g};${b}m  \x1b[0m`;
      }
    }
    console.log(line);
  }
}

if (key) {
  const fr = c.frames[key];
  if (!fr || !fr[idx]) { console.error(`frames.${key}[${idx}] がありません`); process.exit(1); }
  show(fr[idx], c.palette, `${c.name} ${key}[${idx}]`);
} else {
  for (const [k, frames] of Object.entries(c.frames)) {
    frames.forEach((rows, i) => show(rows, c.palette, `${c.name} ${k}[${i}]`));
  }
}
