// キャラクターデータ検証ツール
// usage: node tools/validate.js js/characters/<id>.js
const path = require("path");

const file = process.argv[2];
if (!file) {
  console.error("usage: node tools/validate.js <character.js>");
  process.exit(2);
}

global.window = { DOT_FIGHTERS: [] };
try {
  require(path.resolve(file));
} catch (e) {
  console.error("FAIL: ファイルの読み込みでエラー:", e.message);
  process.exit(1);
}

const list = global.window.DOT_FIGHTERS;
const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

if (!Array.isArray(list) || list.length !== 1) {
  console.error("FAIL: window.DOT_FIGHTERS に1体だけ push してください (現在 " + (list ? list.length : 0) + "体)");
  process.exit(1);
}
const c = list[0];

// --- 基本フィールド ---
if (typeof c.id !== "string" || !/^[a-z0-9_]+$/.test(c.id)) err("id は英小文字/数字/_ のみの文字列にしてください");
for (const k of ["name", "title", "catchphrase", "winQuote", "themeColor"]) {
  if (typeof c[k] !== "string" || !c[k]) err(`${k} が未設定です`);
}
if (c.themeColor && !/^#[0-9a-fA-F]{6}$/.test(c.themeColor)) err("themeColor は #rrggbb 形式");

// --- palette ---
if (!c.palette || typeof c.palette !== "object") {
  err("palette がありません");
} else {
  for (const [ch, col] of Object.entries(c.palette)) {
    if (ch.length !== 1) err(`palette キーは1文字: "${ch}"`);
    if (ch === ".") err('palette キーに "." は使えません（透明予約）');
    if (!/^#[0-9a-fA-F]{6}$/.test(col)) err(`palette["${ch}"] は #rrggbb 形式: ${col}`);
  }
  const n = Object.keys(c.palette).length;
  if (n < 4) warn(`パレット色数が少なめです (${n}色)`);
  if (n > 24) warn(`パレット色数が多すぎます (${n}色)`);
}

// --- frames ---
const FRAME_SPEC = { idle: 2, walk: 2, light: 2, heavy: 2, special: 2, hit: 1, guard: 1, jump: 1, ko: 1 };
function checkFrame(rows, label, size) {
  if (!Array.isArray(rows) || rows.length !== size) {
    err(`${label}: ${size}行の配列である必要があります (現在 ${Array.isArray(rows) ? rows.length : typeof rows})`);
    return;
  }
  let solid = 0;
  let feet = 0;
  rows.forEach((row, y) => {
    if (typeof row !== "string" || row.length !== size) {
      err(`${label} 行${y}: ${size}文字の文字列である必要があります (現在 ${typeof row === "string" ? row.length + "文字" : typeof row})`);
      return;
    }
    for (const ch of row) {
      if (ch === ".") continue;
      if (!c.palette || !(ch in c.palette)) {
        err(`${label} 行${y}: パレットにない文字 "${ch}"`);
        return;
      }
      solid++;
      if (y >= size - 4) feet++;
    }
  });
  return { solid, feet };
}

if (!c.frames || typeof c.frames !== "object") {
  err("frames がありません");
} else {
  for (const [key, count] of Object.entries(FRAME_SPEC)) {
    const fr = c.frames[key];
    if (!Array.isArray(fr) || fr.length !== count) {
      err(`frames.${key} は ${count} 枚必要です (現在 ${Array.isArray(fr) ? fr.length : typeof fr})`);
      continue;
    }
    fr.forEach((rows, i) => {
      const r = checkFrame(rows, `frames.${key}[${i}]`, 48);
      if (r) {
        if (r.solid < 300) warn(`frames.${key}[${i}]: 非透明ピクセルが少なめ (${r.solid}個) — スカスカに見えるかも`);
        if (key !== "jump" && key !== "ko" && r.feet === 0) warn(`frames.${key}[${i}]: 下4行にピクセルがありません（接地感がないかも）`);
      }
    });
  }
  for (const key of Object.keys(c.frames)) {
    if (!(key in FRAME_SPEC)) warn(`frames.${key} は仕様外のキーです（無視されます）`);
  }
}

// --- stats ---
function range(obj, key, lo, hi, label) {
  if (!obj || typeof obj[key] !== "number") { err(`${label}.${key} が数値ではありません`); return; }
  if (obj[key] < lo || obj[key] > hi) warn(`${label}.${key}=${obj[key]} は推奨範囲 ${lo}〜${hi} 外です`);
}
if (!c.stats) err("stats がありません");
else {
  range(c.stats, "hp", 90, 110, "stats");
  range(c.stats, "speed", 1.6, 2.6, "stats");
  range(c.stats, "jumpPower", 6.5, 8.5, "stats");
  range(c.stats, "weight", 0.8, 1.2, "stats");
}

// --- moves ---
if (!c.moves) err("moves がありません");
else {
  const l = c.moves.light, h = c.moves.heavy, s = c.moves.special;
  if (!l) err("moves.light がありません");
  else {
    range(l, "damage", 4, 6, "light"); range(l, "range", 24, 34, "light");
    range(l, "startup", 3, 5, "light"); range(l, "active", 3, 5, "light");
    range(l, "recovery", 6, 10, "light"); range(l, "knockback", 1, 3, "light");
  }
  if (!h) err("moves.heavy がありません");
  else {
    range(h, "damage", 9, 13, "heavy"); range(h, "range", 30, 44, "heavy");
    range(h, "startup", 8, 13, "heavy"); range(h, "active", 4, 6, "heavy");
    range(h, "recovery", 14, 20, "heavy"); range(h, "knockback", 5, 8, "heavy");
  }
  if (!s) err("moves.special がありません");
  else {
    if (typeof s.name !== "string" || !s.name) err("special.name（技名）が未設定です");
    if (!["projectile", "rush", "area"].includes(s.type)) err(`special.type は projectile/rush/area のいずれか: ${s.type}`);
    range(s, "damage", 14, 20, "special");
    if (s.meterCost !== 100) err("special.meterCost は 100 固定です");
    range(s, "startup", 10, 18, "special");
    range(s, "recovery", 16, 26, "special");
    if (s.type === "projectile") {
      range(s, "speed", 3, 5, "special(projectile)");
      if (!s.sprite || !Array.isArray(s.sprite.frames) || s.sprite.frames.length !== 2) {
        err("special.sprite.frames は 16x16 を2枚");
      } else {
        const pal = s.sprite.palette || c.palette;
        s.sprite.frames.forEach((rows, i) => {
          if (!Array.isArray(rows) || rows.length !== 16) { err(`special.sprite.frames[${i}]: 16行必要`); return; }
          rows.forEach((row, y) => {
            if (typeof row !== "string" || row.length !== 16) { err(`special.sprite.frames[${i}] 行${y}: 16文字必要`); return; }
            for (const ch of row) {
              if (ch !== "." && !(ch in pal)) err(`special.sprite.frames[${i}] 行${y}: パレットにない文字 "${ch}"`);
            }
          });
        });
      }
    }
    if (s.type === "rush") {
      range(s, "distance", 80, 140, "special(rush)");
      range(s, "rushSpeed", 6, 8, "special(rush)");
    }
    if (s.type === "area") {
      range(s, "radius", 50, 70, "special(area)");
    }
  }
}

// --- sfxProfile ---
if (!c.sfxProfile || typeof c.sfxProfile.attack !== "string" || typeof c.sfxProfile.special !== "string") {
  err("sfxProfile { attack, special } が必要です");
}

// --- 結果 ---
for (const w of warns) console.log("WARN:", w);
if (errors.length) {
  for (const e of errors) console.log("ERROR:", e);
  console.log(`\nFAIL: ${errors.length} 件のエラー`);
  process.exit(1);
}
console.log(`\nPASS: ${c.name} (${c.id}) — エラーなし、警告 ${warns.length} 件`);
