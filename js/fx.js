// ヒットエフェクト・パーティクル・画面揺れ
const FX = (() => {
  let parts = [];
  let shake = 0;

  function spark(x, y, color, n = 10, power = 3.5) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = power * (0.4 + Math.random() * 0.8);
      parts.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 1.2,
        life: 14 + (Math.random() * 10) | 0,
        color,
        size: 2 + (Math.random() * 3) | 0,
        grav: 0.18,
      });
    }
  }

  // 必殺技の輪っかエフェクト（area用）
  function ring(x, y, color, radius) {
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      parts.push({
        x: x + Math.cos(a) * 10,
        y: y + Math.sin(a) * 10,
        vx: Math.cos(a) * (radius / 12),
        vy: Math.sin(a) * (radius / 12),
        life: 16,
        color,
        size: 3,
        grav: 0,
      });
    }
  }

  // 上昇する小判・木の葉等
  function rise(x, y, color, n = 8) {
    for (let i = 0; i < n; i++) {
      parts.push({
        x: x + (Math.random() - 0.5) * 80,
        y: y - Math.random() * 20,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -2 - Math.random() * 2.5,
        life: 24 + (Math.random() * 14) | 0,
        color,
        size: 3,
        grav: 0.06,
      });
    }
  }

  function addShake(v) {
    shake = Math.max(shake, v);
  }

  function update() {
    shake *= 0.86;
    if (shake < 0.3) shake = 0;
    parts = parts.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.grav;
      p.life--;
      return p.life > 0;
    });
  }

  function draw(ctx) {
    for (const p of parts) {
      ctx.fillStyle = p.color;
      const s = p.life < 5 ? Math.max(1, p.size - 1) : p.size;
      ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
    }
  }

  function offset() {
    if (shake <= 0) return [0, 0];
    return [(Math.random() - 0.5) * shake * 2, (Math.random() - 0.5) * shake * 1.4];
  }

  function clear() {
    parts = [];
    shake = 0;
  }

  return { spark, ring, rise, addShake, update, draw, offset, clear };
})();
