// ステージ背景（プログラム生成ドット絵）640x360
const Stages = (() => {
  const W = 640, H = 360, GROUND = 320;

  function make(drawFn, name) {
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    drawFn(ctx);
    return { name, canvas: cv };
  }

  function rect(ctx, x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h);
  }

  // ============ 夕焼け商店街 ============
  function shotengai(ctx) {
    // 夕焼けグラデーション（バンド状）
    const sky = ["#2a1438", "#5c1f4a", "#8e2c4e", "#c44a3a", "#e87436", "#f9a13b"];
    sky.forEach((c, i) => rect(ctx, 0, i * 36, W, 36, c));
    // 地平線近くの残光と街の暗がり
    rect(ctx, 0, 216, W, 30, "#f9b85c");
    rect(ctx, 0, 246, W, GROUND - 246, "#33182e");
    // 太陽
    rect(ctx, 268, 116, 104, 104, "#ffd24a");
    rect(ctx, 280, 104, 80, 128, "#ffd24a");
    rect(ctx, 256, 128, 128, 80, "#ffd24a");
    rect(ctx, 284, 120, 72, 96, "#ffe88a");
    // 遠景ビル群シルエット
    const blds = [[0, 150, 70, 80], [60, 130, 50, 100], [120, 160, 64, 70], [196, 145, 40, 85], [410, 140, 56, 90], [470, 160, 70, 70], [540, 125, 60, 105], [598, 150, 42, 80]];
    for (const [x, y, w, h] of blds) {
      rect(ctx, x, y, w, 230 - y + 80, "#3a1830");
      // 窓
      for (let wy = y + 8; wy < 222; wy += 14) {
        for (let wx = x + 6; wx < x + w - 8; wx += 12) {
          if ((wx * 7 + wy * 13) % 5 < 2) rect(ctx, wx, wy, 5, 7, "#ffb84d");
        }
      }
    }
    // 商店建物（左右）
    function shop(x, awning1, awning2, signC) {
      rect(ctx, x, 196, 120, 124, "#5c3a2e");
      rect(ctx, x + 4, 200, 112, 36, "#7a4a36");
      // 庇（赤白 or 青白テント）
      for (let i = 0; i < 10; i++) rect(ctx, x + i * 12, 236, 12, 16, i % 2 ? awning1 : awning2);
      // 看板
      rect(ctx, x + 16, 204, 88, 26, signC);
      rect(ctx, x + 20, 208, 80, 18, "#fff3d6");
      // 店先
      rect(ctx, x + 12, 262, 40, 58, "#2e1a14");
      rect(ctx, x + 64, 262, 44, 44, "#3c2a20");
      rect(ctx, x + 68, 266, 36, 18, "#ffb84d");
    }
    shop(-20, "#d83a2e", "#fff3d6", "#d83a2e");
    shop(540, "#2e5cd8", "#fff3d6", "#2e7a3c");
    // 電柱と電線
    rect(ctx, 96, 60, 8, 260, "#241018");
    rect(ctx, 80, 84, 40, 6, "#241018");
    rect(ctx, 84, 110, 32, 5, "#241018");
    ctx.strokeStyle = "#241018";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(104, 88); ctx.quadraticCurveTo(320, 130, 640, 92); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(104, 114); ctx.quadraticCurveTo(320, 158, 640, 118); ctx.stroke();
    // 提灯の列
    for (let i = 0; i < 8; i++) {
      const lx = 150 + i * 50;
      const ly = 120 + Math.round(Math.sin(i * 1.1) * 6) + (i % 2) * 4;
      rect(ctx, lx, ly, 4, 8, "#241018");
      rect(ctx, lx - 5, ly + 8, 14, 18, "#ff4a2e");
      rect(ctx, lx - 3, ly + 10, 10, 14, "#ff7a4a");
      rect(ctx, lx - 1, ly + 26, 6, 3, "#241018");
    }
    // 道路
    rect(ctx, 0, GROUND, W, 40, "#4a4450");
    rect(ctx, 0, GROUND, W, 4, "#6a6478");
    for (let i = 0; i < 8; i++) rect(ctx, i * 88, 338, 48, 8, "#8a8498");
  }

  // ============ 銭湯「ドット湯」 ============
  function sento(ctx) {
    // タイル壁
    rect(ctx, 0, 0, W, GROUND, "#bfe3e8");
    for (let y = 0; y < GROUND; y += 24) {
      for (let x = 0; x < W; x += 32) {
        rect(ctx, x, y, 31, 23, (x + y) % 64 === 0 ? "#cfeef2" : "#bfe3e8");
        rect(ctx, x, y + 23, 32, 1, "#8fb8c0");
        rect(ctx, x + 31, y, 1, 24, "#8fb8c0");
      }
    }
    // 富士山の壁画
    rect(ctx, 120, 30, 400, 180, "#7ec4e8");
    rect(ctx, 120, 30, 400, 8, "#3a6a8a");
    // 山体
    for (let i = 0; i < 70; i++) {
      const t = i / 70;
      const w = 24 + t * 336;
      rect(ctx, 320 - w / 2, 60 + i * 2, w, 2, "#4a6aa8");
    }
    // 冠雪
    for (let i = 0; i < 22; i++) {
      const t = i / 70;
      const w = 24 + t * 336;
      rect(ctx, 320 - w / 2, 60 + i * 2, w, 2, "#ffffff");
    }
    rect(ctx, 290, 100, 16, 6, "#ffffff"); rect(ctx, 330, 96, 20, 8, "#ffffff");
    // 雲
    rect(ctx, 160, 56, 48, 10, "#ffffff"); rect(ctx, 172, 50, 28, 8, "#ffffff");
    rect(ctx, 440, 70, 56, 10, "#ffffff"); rect(ctx, 452, 64, 30, 8, "#ffffff");
    // 壁画の枠
    rect(ctx, 112, 22, 416, 8, "#8a5a3a"); rect(ctx, 112, 210, 416, 8, "#8a5a3a");
    rect(ctx, 112, 22, 8, 196, "#8a5a3a"); rect(ctx, 520, 22, 8, 196, "#8a5a3a");
    // 「ゆ」のれん（左）
    rect(ctx, 20, 40, 70, 90, "#2e4a9e");
    rect(ctx, 20, 40, 70, 8, "#1a2a5e");
    rect(ctx, 42, 60, 8, 40, "#ffffff"); rect(ctx, 34, 76, 32, 8, "#ffffff");
    rect(ctx, 58, 64, 8, 28, "#ffffff"); rect(ctx, 50, 96, 24, 8, "#ffffff");
    // 桶と椅子
    rect(ctx, 556, 270, 44, 22, "#f2c14e"); rect(ctx, 560, 274, 36, 4, "#c08a2e");
    rect(ctx, 558, 292, 6, 28, "#f2c14e"); rect(ctx, 592, 292, 6, 28, "#f2c14e");
    rect(ctx, 36, 286, 36, 14, "#e8a83e"); rect(ctx, 40, 300, 6, 20, "#c08a2e"); rect(ctx, 62, 300, 6, 20, "#c08a2e");
    // 湯気
    for (let i = 0; i < 6; i++) {
      rect(ctx, 60 + i * 100, 230 - (i % 3) * 18, 18, 10, "rgba(255,255,255,0.55)");
      rect(ctx, 70 + i * 100, 218 - (i % 3) * 18, 12, 8, "rgba(255,255,255,0.4)");
    }
    // 床タイル
    rect(ctx, 0, GROUND, W, 40, "#7aa8b0");
    for (let x = 0; x < W; x += 40) rect(ctx, x, GROUND, 1, 40, "#5a8890");
    rect(ctx, 0, GROUND, W, 4, "#9ec8d0");
  }

  // ============ 縁日の夜 ============
  function matsuri(ctx) {
    // 夜空
    rect(ctx, 0, 0, W, GROUND, "#101030");
    rect(ctx, 0, 0, W, 120, "#0a0a22");
    // 星
    for (let i = 0; i < 60; i++) {
      const x = (i * 97) % W;
      const y = (i * 53) % 200;
      rect(ctx, x, y, 2, 2, i % 5 === 0 ? "#ffe88a" : "#aab8e8");
    }
    // 花火
    function hanabi(cx, cy, c1, c2, r) {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        for (let d = 8; d <= r; d += 8) {
          rect(ctx, cx + Math.cos(a) * d - 2, cy + Math.sin(a) * d - 2, d > r - 12 ? 3 : 4, d > r - 12 ? 3 : 4, d > r / 2 ? c2 : c1);
        }
      }
      rect(ctx, cx - 3, cy - 3, 6, 6, "#ffffff");
    }
    hanabi(140, 70, "#ff5a8a", "#ffd24a", 48);
    hanabi(480, 56, "#5ad8ff", "#aaffaa", 56);
    hanabi(330, 110, "#ffaa4a", "#ff5a5a", 36);
    // 月
    rect(ctx, 560, 24, 36, 36, "#ffe8a0"); rect(ctx, 568, 16, 20, 52, "#ffe8a0"); rect(ctx, 552, 32, 52, 20, "#ffe8a0");
    // 屋台（左右）
    function yatai(x) {
      rect(ctx, x, 190, 150, 130, "#3a2418");
      // 屋根（赤白縞）
      for (let i = 0; i < 13; i++) rect(ctx, x - 10 + i * 13, 168, 13, 30, i % 2 ? "#d83a2e" : "#f8f0e0");
      rect(ctx, x - 10, 196, 170, 6, "#241410");
      // カウンター
      rect(ctx, x + 8, 250, 134, 14, "#8a5a3a");
      rect(ctx, x + 8, 264, 134, 56, "#241410");
      // 商品棚の灯り
      rect(ctx, x + 16, 212, 118, 34, "#ffb84d");
      rect(ctx, x + 24, 220, 24, 18, "#d83a2e");
      rect(ctx, x + 60, 220, 24, 18, "#e8a83e");
      rect(ctx, x + 96, 220, 24, 18, "#5ad8aa");
      // 提灯
      rect(ctx, x + 20, 174, 12, 16, "#ff7a4a"); rect(ctx, x + 110, 174, 12, 16, "#ff7a4a");
    }
    yatai(-30);
    yatai(520);
    // 中央奥に櫓（やぐら）
    rect(ctx, 280, 200, 80, 120, "#4a2a1a");
    rect(ctx, 270, 192, 100, 12, "#6a3a24");
    rect(ctx, 296, 150, 48, 46, "#5a3220");
    rect(ctx, 286, 142, 68, 12, "#6a3a24");
    rect(ctx, 306, 158, 28, 22, "#ffb84d");
    // 提灯の列（櫓から）
    ctx.strokeStyle = "#3a2a40"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(320, 160); ctx.lineTo(60, 220); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(320, 160); ctx.lineTo(580, 220); ctx.stroke();
    for (let i = 1; i <= 5; i++) {
      const t = i / 6;
      [[320 + (60 - 320) * t, 160 + 60 * t], [320 + (580 - 320) * t, 160 + 60 * t]].forEach(([lx, ly]) => {
        rect(ctx, lx - 5, ly, 12, 15, i % 2 ? "#ffd24a" : "#ff4a2e");
        rect(ctx, lx - 3, ly + 2, 8, 11, i % 2 ? "#ffe88a" : "#ff7a4a");
      });
    }
    // 地面（土）
    rect(ctx, 0, GROUND, W, 40, "#5a4634");
    rect(ctx, 0, GROUND, W, 4, "#7a6248");
    for (let i = 0; i < 30; i++) rect(ctx, (i * 73) % W, 330 + (i * 37) % 24, 4, 2, "#4a3828");
  }

  const list = [
    make(shotengai, "夕焼け商店街"),
    make(sento, "銭湯『ドット湯』"),
    make(matsuri, "縁日の夜"),
  ];

  return { list, GROUND };
})();
