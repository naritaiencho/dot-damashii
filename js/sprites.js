// ドット絵スプライト構築（テキストグリッド → Canvas）
const Sprites = (() => {
  function frameToCanvas(rows, palette) {
    const h = rows.length;
    const w = rows[0].length;
    const cv = document.createElement("canvas");
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext("2d");
    for (let y = 0; y < h; y++) {
      const row = rows[y];
      for (let x = 0; x < w; x++) {
        const ch = row[x];
        if (ch === ".") continue;
        const col = palette[ch];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    return cv;
  }

  function flipped(cv) {
    const out = document.createElement("canvas");
    out.width = cv.width;
    out.height = cv.height;
    const ctx = out.getContext("2d");
    ctx.translate(cv.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(cv, 0, 0);
    return out;
  }

  // キャラ定義から全フレームのcanvasを構築（r=右向き, l=左向き）
  function build(def) {
    const out = { frames: {}, projectile: null };
    for (const [key, list] of Object.entries(def.frames)) {
      out.frames[key] = list.map((rows) => {
        const r = frameToCanvas(rows, def.palette);
        return { r, l: flipped(r) };
      });
    }
    const sp = def.moves.special;
    if (sp.type === "projectile" && sp.sprite) {
      const pal = sp.sprite.palette || def.palette;
      out.projectile = sp.sprite.frames.map((rows) => {
        const r = frameToCanvas(rows, pal);
        return { r, l: flipped(r) };
      });
    }
    return out;
  }

  return { build, frameToCanvas };
})();
