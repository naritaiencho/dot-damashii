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

  // ビットマップスプライト描画（"#"のマスを塗る）
  function sprite(ctx, x, y, rows, s, c) {
    for (let j = 0; j < rows.length; j++) {
      for (let i = 0; i < rows[j].length; i++) {
        if (rows[j][i] === "#") rect(ctx, x + i * s, y + j * s, s, s, c);
      }
    }
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

  // ============ ゲームセンター『ナイト』 ============
  function arcade(ctx) {
    // インベーダー風スプライト
    const INV = [
      "..#..#..",
      ".######.",
      "##.##.##",
      "########",
      "#.####.#",
      "#..##..#",
    ];
    const INV2 = [
      ".#....#.",
      "..####..",
      ".######.",
      "##.##.##",
      "########",
      ".#.##.#.",
    ];
    // 両替の看板用 簡易漢字ビットマップ
    const RYO = [
      "########",
      "...##...",
      "########",
      "#..##..#",
      "#.####.#",
      "#..##..#",
      "#......#",
      "##....##",
    ];
    const TAI = [
      ".#....#.",
      "########",
      ".#....#.",
      "#.#..#.#",
      ".######.",
      ".#....#.",
      ".######.",
      ".######.",
    ];
    // GAMEネオン文字
    const NEON = {
      G: [".###.", "#....", "#.##.", "#..#.", ".###."],
      A: [".##..", "#..#.", "####.", "#..#.", "#..#."],
      M: ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
      E: ["####.", "#....", "###..", "#....", "####."],
    };

    // 薄暗い店内
    rect(ctx, 0, 0, W, GROUND, "#14101e");
    // 天井
    rect(ctx, 0, 0, W, 46, "#0c0a14");
    rect(ctx, 0, 44, W, 2, "#1e1830");
    // 蛍光灯（一部チラつき＝消灯）
    for (let i = 0; i < 4; i++) {
      const lx = 56 + i * 160;
      rect(ctx, lx + 36, 8, 8, 10, "#2a2a3a"); // 吊り
      rect(ctx, lx, 18, 80, 6, "#3a3a4a"); // 器具
      const on = i !== 2; // 3本目は切れかけ
      rect(ctx, lx + 2, 24, 76, 8, on ? "#f4fff0" : "#3e4a42");
      if (on) {
        rect(ctx, lx + 10, 25, 60, 4, "#ffffff"); // 管の芯
        rect(ctx, lx - 2, 32, 84, 5, "rgba(210,255,225,0.30)");
        rect(ctx, lx + 6, 37, 68, 5, "rgba(210,255,225,0.16)");
        rect(ctx, lx + 14, 42, 52, 6, "rgba(210,255,225,0.08)");
      } else {
        rect(ctx, lx + 30, 24, 14, 8, "#cfe8cc"); // 端だけ点く
        rect(ctx, lx + 33, 26, 8, 4, "#ffffff");
      }
    }
    // 奥の壁
    rect(ctx, 0, 46, W, 184, "#1a1430");
    // ネオンライン
    rect(ctx, 0, 58, W, 3, "#ff2e8a");
    rect(ctx, 0, 64, W, 2, "#2ee8ff");
    // GAMEネオンサイン（中央上）
    {
      let nx = 270;
      const cols = ["#2ee8ff", "#ff2e8a", "#ffe85a", "#5aff8a"];
      rect(ctx, nx - 12, 76, 124, 31, "#0e0a1c");
      rect(ctx, nx - 12, 76, 124, 2, "#2a2244");
      rect(ctx, nx - 12, 105, 124, 2, "#2a2244");
      ["G", "A", "M", "E"].forEach((ch, i) => {
        sprite(ctx, nx + 2, 84, NEON[ch], 3, cols[i]);
        nx += 25;
      });
    }
    // 巨大インベーダー壁画（壁の飾り、暗め発光）
    sprite(ctx, 168, 76, INV, 4, "#3adf7c");
    sprite(ctx, 432, 76, INV2, 4, "#b06aff");
    // 壁のポスター
    function poster(px, frameC, mainC) {
      rect(ctx, px, 114, 34, 40, frameC);
      rect(ctx, px + 3, 117, 28, 34, "#0e0c1a");
      rect(ctx, px + 6, 120, 22, 14, mainC);
      rect(ctx, px + 9, 124, 6, 6, "#0e0c1a");
      rect(ctx, px + 19, 124, 6, 6, "#0e0c1a");
      rect(ctx, px + 6, 138, 22, 3, "#cfd4e8"); // 文字行
      rect(ctx, px + 6, 144, 16, 3, "#8a90b0");
    }
    poster(222, "#3a2e5e", "#ff9a2e");
    poster(386, "#3a2e5e", "#2e9aff");
    // 「両替」赤看板（左奥・縦型、発光）
    rect(ctx, 96, 74, 34, 70, "#c81e1e");
    rect(ctx, 98, 76, 30, 66, "#e83a2a");
    sprite(ctx, 101, 80, RYO, 3, "#fff0d8");
    sprite(ctx, 101, 112, TAI, 3, "#fff0d8");
    rect(ctx, 92, 70, 42, 2, "#ff8a6a"); // 光の縁
    rect(ctx, 92, 146, 42, 2, "#ff8a6a");
    // 奥の筐体列（暗めのシルエット＋光る画面）
    const scrCols = ["#1ee87c", "#2e9aff", "#ff9a2e", "#e84aff", "#1ee87c"];
    for (let i = 0; i < 5; i++) {
      const bx = 142 + i * 78;
      rect(ctx, bx, 158, 58, 72, "#221a38"); // 筐体
      rect(ctx, bx + 4, 154, 50, 8, "#2c2248"); // マーキー
      rect(ctx, bx + 8, 156, 42, 4, scrCols[i]);
      rect(ctx, bx + 7, 168, 44, 30, "#08141c"); // 画面
      // 画面内のインベーダー演出
      const inv = i % 2 ? INV2 : INV;
      sprite(ctx, bx + 12, 172, inv, 1, scrCols[i]);
      sprite(ctx, bx + 26, 172, inv, 1, scrCols[i]);
      sprite(ctx, bx + 40, 172, inv, 1, scrCols[i]);
      sprite(ctx, bx + 19, 181, inv, 1, scrCols[i]);
      sprite(ctx, bx + 33, 181, inv, 1, scrCols[i]);
      rect(ctx, bx + 27, 192, 4, 3, "#e8f0ff"); // 自機
      rect(ctx, bx + 28, 189, 2, 3, "#e8f0ff");
      rect(ctx, bx + 7, 200, 44, 8, "#181228"); // コンパネ
      rect(ctx, bx + 12, 202, 5, 4, "#d83a4a");
      rect(ctx, bx + 40, 202, 5, 4, "#3a6ad8");
      // 足元の影
      rect(ctx, bx - 3, 226, 64, 4, "#0e0a16");
    }
    // キャラ立ちエリアの暗い帯（視認性確保）
    rect(ctx, 0, 230, W, GROUND - 230, "#120e1c");
    rect(ctx, 0, 230, W, 3, "#1e1830");
    // 巾木（壁と床の境）
    rect(ctx, 0, 312, W, 8, "#1a1428");
    rect(ctx, 0, 312, W, 2, "#241c34");
    // 奥の筐体画面の照り返し（帯の上にうっすら）
    for (let i = 0; i < 5; i++) {
      rect(ctx, 146 + i * 78, 230, 50, 3, "rgba(80,220,160,0.08)");
    }
    // 左：大型筐体2台（手前、対面向き）
    function cab(x, mc, sc) {
      rect(ctx, x, 188, 80, 132, "#2a2244"); // 本体
      rect(ctx, x + 3, 182, 74, 14, "#3a2e5e"); // マーキー
      rect(ctx, x + 9, 185, 62, 8, mc); // マーキー発光
      rect(ctx, x + 7, 204, 66, 46, "#06121a"); // 画面
      const inv = sc === "#1ee87c" ? INV : INV2;
      sprite(ctx, x + 13, 210, inv, 2, sc);
      sprite(ctx, x + 43, 210, inv, 2, sc);
      sprite(ctx, x + 28, 226, inv, 2, sc);
      rect(ctx, x + 36, 242, 8, 4, "#e8f0ff"); // 自機
      rect(ctx, x + 39, 238, 2, 4, "#e8f0ff");
      rect(ctx, x + 7, 254, 66, 16, "#1c1632"); // コンパネ
      rect(ctx, x + 14, 258, 10, 8, "#10101c"); // レバー台
      rect(ctx, x + 18, 252, 3, 8, "#aab0c0");
      rect(ctx, x + 16, 250, 7, 4, "#d83a4a"); // レバー玉
      rect(ctx, x + 42, 259, 8, 6, "#d83a4a"); // ボタン
      rect(ctx, x + 54, 259, 8, 6, "#3a6ad8");
      rect(ctx, x + 7, 274, 66, 14, "#241c3e"); // コイン投入部
      rect(ctx, x + 32, 277, 16, 7, "#10101c");
      rect(ctx, x + 36, 279, 8, 3, "#ffe85a"); // コイン口
      rect(ctx, x + 3, 292, 74, 28, "#1a1426"); // 足元
      // 画面光のこぼれ
      rect(ctx, x - 4, 204, 4, 46, "rgba(80,220,160,0.12)");
    }
    cab(-44, "#ff2e8a", "#1ee87c");
    cab(30, "#ffe85a", "#b06aff");
    // 右：UFOキャッチャー
    {
      const x = 544;
      rect(ctx, x, 176, 92, 144, "#b03070"); // 筐体ピンク
      rect(ctx, x + 3, 180, 86, 12, "#d84a8a"); // 上部帯
      for (let i = 0; i < 7; i++) rect(ctx, x + 8 + i * 12, 183, 6, 6, i % 2 ? "#ffe85a" : "#ff8ab0"); // 電飾
      rect(ctx, x + 6, 196, 80, 74, "#0e2030"); // ガラス内
      rect(ctx, x + 6, 196, 80, 3, "#2a4a60");
      rect(ctx, x + 84, 196, 2, 74, "#3a5a78"); // ガラス反射
      rect(ctx, x + 80, 200, 2, 60, "rgba(160,220,255,0.35)");
      // クレーン
      rect(ctx, x + 6, 200, 80, 3, "#56708a"); // レール
      rect(ctx, x + 42, 203, 4, 18, "#aab8c8"); // アーム軸
      rect(ctx, x + 34, 219, 8, 8, "#8a98a8"); // 爪左
      rect(ctx, x + 46, 219, 8, 8, "#8a98a8"); // 爪右
      rect(ctx, x + 34, 225, 4, 6, "#6a788a");
      rect(ctx, x + 50, 225, 4, 6, "#6a788a");
      // ぬいぐるみの山
      rect(ctx, x + 10, 252, 16, 16, "#ffb84d"); // くま
      rect(ctx, x + 12, 248, 4, 4, "#ffb84d"); rect(ctx, x + 20, 248, 4, 4, "#ffb84d");
      rect(ctx, x + 14, 257, 3, 3, "#241018"); rect(ctx, x + 20, 257, 3, 3, "#241018");
      rect(ctx, x + 30, 254, 16, 14, "#5ad8aa"); // かえる
      rect(ctx, x + 32, 250, 5, 5, "#5ad8aa"); rect(ctx, x + 39, 250, 5, 5, "#5ad8aa");
      rect(ctx, x + 52, 252, 18, 16, "#ff6a8a"); // うさぎ
      rect(ctx, x + 55, 244, 4, 9, "#ff6a8a"); rect(ctx, x + 63, 244, 4, 9, "#ff6a8a");
      rect(ctx, x + 57, 258, 3, 3, "#241018"); rect(ctx, x + 64, 258, 3, 3, "#241018");
      // 取出口と操作部
      rect(ctx, x + 3, 270, 86, 8, "#8a2456");
      rect(ctx, x + 10, 282, 30, 26, "#1a0e20"); // 取出口
      rect(ctx, x + 12, 284, 26, 3, "#3a2040");
      rect(ctx, x + 52, 284, 30, 12, "#d84a8a"); // 操作パネル
      rect(ctx, x + 58, 287, 7, 6, "#ffe85a"); // ボタン
      rect(ctx, x + 70, 287, 7, 6, "#3ae8ff");
      rect(ctx, x, 308, 92, 12, "#701a46"); // 台座
    }
    // タイル床
    rect(ctx, 0, GROUND, W, 40, "#262234");
    for (let x = 0; x < W; x += 32) {
      for (let y = GROUND; y < H; y += 20) {
        if ((x / 32 + (y - GROUND) / 20) % 2 === 0) rect(ctx, x, y, 32, 20, "#2e2a40");
      }
    }
    for (let x = 0; x < W; x += 32) rect(ctx, x, GROUND, 1, 40, "#1a1626");
    rect(ctx, 0, GROUND + 20, W, 1, "#1a1626");
    rect(ctx, 0, GROUND, W, 3, "#3e3a52");
    // 床へのネオン照り返し
    rect(ctx, 8, 324, 60, 3, "rgba(46,232,255,0.14)");
    rect(ctx, 286, 324, 90, 3, "rgba(255,46,138,0.12)");
    rect(ctx, 556, 324, 70, 3, "rgba(255,138,176,0.14)");
    // 蛍光灯の光だまり（床）
    for (let i = 0; i < 4; i++) {
      if (i === 2) continue; // 切れかけの下は暗い
      const lx = 56 + i * 160;
      rect(ctx, lx - 6, 322, 92, 4, "rgba(220,255,235,0.10)");
      rect(ctx, lx + 6, 326, 68, 5, "rgba(220,255,235,0.06)");
      rect(ctx, lx + 18, 331, 44, 5, "rgba(220,255,235,0.04)");
    }
  }

  // ============ 雪の温泉街 ============
  function onsen(ctx) {
    // 温泉マーク♨
    const YU = [
      ".#..#..#",
      ".#..#..#",
      "#..#..#.",
      "#..#..#.",
      "........",
      "##....##",
      "#......#",
      ".######.",
    ];
    // 夜空（寒色グラデーション）
    const sky = ["#080c24", "#0c122e", "#121a3c", "#18244c", "#1e2e5c"];
    sky.forEach((c, i) => rect(ctx, 0, i * 32, W, 32, c));
    rect(ctx, 0, 160, W, 70, "#24386a");
    // 星
    for (let i = 0; i < 56; i++) {
      const x = (i * 89) % W;
      const y = (i * 47) % 150;
      rect(ctx, x, y, 2, 2, i % 7 === 0 ? "#ffe8a0" : "#cdd8ff");
    }
    rect(ctx, 318, 38, 4, 4, "#ffffff"); rect(ctx, 316, 40, 8, 1, "#ffffff"); rect(ctx, 319, 36, 1, 8, "#ffffff"); // ひときわ光る星
    // 月（白い冬の月）
    rect(ctx, 92, 30, 34, 34, "#e8eef8"); rect(ctx, 100, 22, 18, 50, "#e8eef8"); rect(ctx, 84, 38, 50, 18, "#e8eef8");
    rect(ctx, 104, 38, 8, 8, "#c8d2e4"); rect(ctx, 96, 52, 6, 6, "#c8d2e4"); // クレーター
    // 遠景の雪山
    function yama(cx, top, spread, c, snowC, snowRows) {
      let n = 0;
      for (let y = top; y < 232; y += 2) {
        const w = 12 + (y - top) * spread;
        rect(ctx, cx - w / 2, y, w, 2, n < snowRows ? snowC : c);
        n++;
      }
    }
    yama(120, 130, 4.6, "#2a3a62", "#dce6f4", 18);
    yama(520, 118, 4.2, "#2a3a62", "#dce6f4", 22);
    yama(320, 152, 5.4, "#22325a", "#cdd9ec", 18);
    // 山肌の雪筋
    rect(ctx, 96, 172, 4, 18, "#aebed8"); rect(ctx, 136, 178, 4, 22, "#aebed8");
    rect(ctx, 498, 168, 4, 20, "#aebed8"); rect(ctx, 544, 176, 4, 24, "#aebed8");
    rect(ctx, 304, 196, 4, 16, "#9cacc8"); rect(ctx, 338, 200, 4, 14, "#9cacc8");
    // 山すその家並み（遠景の小さな灯り）
    rect(ctx, 0, 214, W, 18, "#16203c");
    for (let i = 0; i < 12; i++) {
      const hx = 30 + i * 52;
      rect(ctx, hx, 206 + (i % 3) * 4, 22, 22, "#1a2444");
      rect(ctx, hx - 2, 204 + (i % 3) * 4, 26, 4, "#aebed6"); // 雪屋根
      if (i % 2) rect(ctx, hx + 8, 214 + (i % 3) * 4, 6, 6, "#ffca6a"); // 灯り
    }
    // 遠景の湯けむり
    for (let i = 0; i < 4; i++) {
      const sx = 90 + i * 150;
      rect(ctx, sx, 196 - (i % 2) * 10, 16, 8, "rgba(220,235,255,0.30)");
      rect(ctx, sx + 6, 186 - (i % 2) * 10, 12, 8, "rgba(220,235,255,0.22)");
      rect(ctx, sx + 12, 177 - (i % 2) * 10, 9, 7, "rgba(220,235,255,0.14)");
    }
    // キャラ立ちエリアの暗い帯（通りの夜闇）
    rect(ctx, 0, 230, W, GROUND - 230, "#141c34");
    rect(ctx, 0, 230, W, 3, "#1e2844");
    // 通り奥の雪をかぶった木柵（低コントラストで奥行きを出す）
    for (let x = -4; x < W; x += 36) {
      rect(ctx, x + 16, 238, 5, 30, "#1c2440"); // 柱
      rect(ctx, x + 15, 236, 7, 3, "#8fa2c2"); // 柱頭の雪
    }
    rect(ctx, 0, 244, W, 4, "#202a48"); // 上桟
    rect(ctx, 0, 242, W, 2, "#7e92b4"); // 桟の雪
    rect(ctx, 0, 258, W, 4, "#1c2440"); // 下桟
    // 柵の足元の吹きだまり
    for (let i = 0; i < 18; i++) {
      rect(ctx, (i * 37 + 8) % W, 264, 14, 3, "#2a3656");
    }
    // 温泉宿（左右）
    function yado(x) {
      rect(ctx, x, 138, 132, 182, "#33241a"); // 木造本体
      rect(ctx, x + 4, 146, 124, 58, "#42301f"); // 2階壁
      // 雪の積もった屋根
      rect(ctx, x - 10, 128, 152, 14, "#221810");
      rect(ctx, x - 13, 118, 158, 12, "#dde8f4");
      rect(ctx, x - 9, 114, 150, 6, "#f2f8ff");
      for (let i = 0; i < 5; i++) rect(ctx, x - 8 + i * 32, 130, 10, 5, "#eef4fc"); // 軒先の雪だれ
      // 2階の障子窓（暖色）
      for (let i = 0; i < 3; i++) {
        const wx = x + 13 + i * 39;
        rect(ctx, wx - 2, 152, 32, 38, "#221608");
        rect(ctx, wx, 154, 28, 34, "#ffca6a");
        rect(ctx, wx + 13, 154, 3, 34, "#8a5a2a"); // 桟
        rect(ctx, wx, 169, 28, 3, "#8a5a2a");
        if (i === 1) rect(ctx, wx + 4, 160, 8, 22, "#c89048"); // 人影
        rect(ctx, wx - 3, 190, 34, 4, "#e6eef8"); // 窓下の雪
      }
      // 1階庇＋雪
      rect(ctx, x - 6, 212, 144, 10, "#1c1208");
      rect(ctx, x - 8, 206, 148, 8, "#e8f1fa");
      // 1階 玄関と窓
      rect(ctx, x + 12, 240, 40, 80, "#160e08"); // 玄関の暗がり
      rect(ctx, x + 16, 246, 32, 54, "#2a1c10");
      rect(ctx, x + 20, 250, 24, 44, "#ffb84d"); // 引き戸の灯り
      rect(ctx, x + 31, 250, 3, 44, "#8a5a2a");
      rect(ctx, x + 68, 244, 48, 42, "#221608");
      rect(ctx, x + 71, 247, 42, 36, "#ffca6a"); // 1階窓
      rect(ctx, x + 90, 247, 3, 36, "#8a5a2a");
      rect(ctx, x + 71, 263, 42, 3, "#8a5a2a");
      // 軒先の赤提灯
      for (let i = 0; i < 3; i++) {
        const lx = x + 16 + i * 44;
        rect(ctx, lx, 222, 3, 6, "#1a0e10");
        rect(ctx, lx - 5, 228, 13, 17, "#d8281e");
        rect(ctx, lx - 3, 230, 9, 13, "#ff6a3a");
        rect(ctx, lx - 1, 234, 5, 6, "#ffc04a"); // 灯心
        rect(ctx, lx - 1, 245, 5, 3, "#1a0e10");
        rect(ctx, lx - 7, 247, 17, 2, "rgba(255,150,80,0.25)"); // 光だまり
      }
      // 入口前の足元の雪
      rect(ctx, x + 6, 314, 120, 6, "#e2ecf6");
    }
    yado(-28);
    yado(536);
    // ♨看板（左の宿の前・スタンド型）
    {
      const x = 58;
      rect(ctx, x + 14, 196, 5, 40, "#3a2a1a"); // 柱
      rect(ctx, x, 152, 34, 46, "#6a4828"); // 枠
      rect(ctx, x + 3, 155, 28, 40, "#f4ead8"); // 白地
      sprite(ctx, x + 5, 160, YU, 3, "#d8281e"); // 赤い温泉マーク
      rect(ctx, x - 2, 148, 38, 6, "#dde8f4"); // 看板上の雪
      rect(ctx, x + 12, 194, 9, 4, "#dde8f4");
    }
    // 右の宿の湯けむり（露天風呂から）
    for (let i = 0; i < 3; i++) {
      rect(ctx, 596 + i * 10, 100 - i * 16, 18, 10, "rgba(230,240,255,0.40)");
      rect(ctx, 604 + i * 10, 90 - i * 16, 12, 8, "rgba(230,240,255,0.28)");
    }
    rect(ctx, 560, 106, 16, 9, "rgba(230,240,255,0.35)");
    rect(ctx, 568, 96, 12, 7, "rgba(230,240,255,0.22)");
    // 雪道（地面）
    rect(ctx, 0, GROUND, W, 40, "#d4e0ee");
    rect(ctx, 0, GROUND, W, 5, "#f0f6fc"); // 表面の新雪
    rect(ctx, 0, GROUND + 5, W, 2, "#e2ecf6");
    // 踏み固められた跡・影
    for (let i = 0; i < 26; i++) {
      rect(ctx, (i * 67) % W, 332 + ((i * 29) % 22), 7, 3, "#b6c6dc");
    }
    for (let i = 0; i < 14; i++) {
      rect(ctx, (i * 113 + 40) % W, 336 + ((i * 41) % 18), 4, 2, "#9cb0cc");
    }
    // 提灯・窓の暖色が雪に映る
    rect(ctx, 4, 322, 92, 3, "rgba(255,150,80,0.20)");
    rect(ctx, 544, 322, 92, 3, "rgba(255,150,80,0.20)");
    rect(ctx, 24, 328, 52, 2, "rgba(255,150,80,0.10)");
    rect(ctx, 564, 328, 52, 2, "rgba(255,150,80,0.10)");
    rect(ctx, 0, 334, 70, 3, "rgba(255,190,110,0.12)");
    rect(ctx, 572, 334, 68, 3, "rgba(255,190,110,0.12)");
    // 道端の雪だるまと灯籠（左右の端）
    {
      rect(ctx, 102, 296, 20, 24, "#eef4fc"); // 雪だるま胴
      rect(ctx, 105, 282, 14, 16, "#f6faff"); // 頭
      rect(ctx, 108, 287, 3, 3, "#1a2238"); rect(ctx, 114, 287, 3, 3, "#1a2238"); // 目
      rect(ctx, 111, 291, 3, 2, "#e8762a"); // 鼻
      rect(ctx, 104, 280, 16, 4, "#d8281e"); rect(ctx, 107, 274, 10, 7, "#d8281e"); // バケツ帽
      rect(ctx, 100, 316, 24, 4, "#c2d2e4"); // 足元の雪
      // 石灯籠（右端）
      const tx = 524;
      rect(ctx, tx + 4, 300, 10, 20, "#3a4458"); // 脚
      rect(ctx, tx, 286, 18, 14, "#48546c"); // 火袋
      rect(ctx, tx + 4, 289, 10, 8, "#ffca6a"); // 灯り
      rect(ctx, tx - 3, 280, 24, 6, "#3a4458"); // 笠
      rect(ctx, tx - 4, 276, 26, 5, "#e2ecf6"); // 笠の雪
      rect(ctx, tx - 1, 320, 20, 3, "rgba(255,190,110,0.18)");
    }
    // 降り積もる雪の粒（静的・中央のキャラエリアは避ける）
    for (let i = 0; i < 90; i++) {
      const x = (i * 53 + 11) % W;
      const y = (i * 37 + 5) % 318;
      if (x > 96 && x < 544 && y > 226) continue; // キャラ視認性優先
      const s = i % 9 === 0 ? 3 : 2;
      rect(ctx, x, y, s, s, i % 4 === 0 ? "rgba(255,255,255,0.95)" : "rgba(225,235,250,0.75)");
    }
  }

  const list = [
    make(shotengai, "夕焼け商店街"),
    make(sento, "銭湯『ドット湯』"),
    make(matsuri, "縁日の夜"),
    make(arcade, "ゲームセンター『ナイト』"),
    make(onsen, "雪の温泉街"),
  ];

  return { list, GROUND };
})();
