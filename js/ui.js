// UI描画：HUD、タイトル、キャラ選択、VS、リザルト
const UI = (() => {
  const FONT = '"MS Gothic", "ＭＳ ゴシック", "Hiragino Kaku Gothic ProN", monospace';

  // レトロ風テキスト（黒フチ付き）
  function T(ctx, str, x, y, size, color, align = "left", outlineColor = "#101018") {
    ctx.font = `bold ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = "top";
    ctx.fillStyle = outlineColor;
    const o = Math.max(1, Math.round(size / 12));
    ctx.fillText(str, x + o, y + o);
    ctx.fillText(str, x - o, y + o);
    ctx.fillText(str, x + o, y - o);
    ctx.fillText(str, x - o, y - o);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  // キャラ顔ポートレート（idleフレームの頭部を切り出し）
  function portrait(ctx, fighterSprites, dx, dy, size, flip) {
    const img = flip ? fighterSprites.frames.idle[0].l : fighterSprites.frames.idle[0].r;
    const sx = flip ? 6 : 10;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx, 2, 32, 32, dx, dy, size, size);
  }

  // ============ バトルHUD ============
  function drawHUD(ctx, battle) {
    const f1 = battle.f1, f2 = battle.f2;

    // 体力バー背景
    function bar(x, y, w, h, ratio, fromRight, color) {
      ctx.fillStyle = "#101018";
      ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
      ctx.fillStyle = "#58202a";
      ctx.fillRect(x, y, w, h);
      const fw = Math.max(0, Math.round(w * ratio));
      ctx.fillStyle = color;
      if (fromRight) ctx.fillRect(x + w - fw, y, fw, h);
      else ctx.fillRect(x, y, fw, h);
      // 上部ハイライト
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      if (fromRight) ctx.fillRect(x + w - fw, y, fw, 3);
      else ctx.fillRect(x, y, fw, 3);
    }

    const hp1 = f1.hp / f1.maxHp;
    const hp2 = f2.hp / f2.maxHp;
    const c1 = hp1 > 0.3 ? "#ffd64a" : (battle.phaseT % 20 < 10 ? "#ff4a2e" : "#ffd64a");
    const c2 = hp2 > 0.3 ? "#ffd64a" : (battle.phaseT % 20 < 10 ? "#ff4a2e" : "#ffd64a");
    bar(64, 18, 216, 16, hp1, true, c1);
    bar(360, 18, 216, 16, hp2, false, c2);

    // ポートレート枠
    ctx.fillStyle = "#101018";
    ctx.fillRect(14, 8, 44, 44);
    ctx.fillStyle = f1.def.themeColor;
    ctx.fillRect(16, 10, 40, 40);
    portrait(ctx, f1.sprites, 18, 12, 36, false);
    ctx.fillStyle = "#101018";
    ctx.fillRect(582, 8, 44, 44);
    ctx.fillStyle = f2.def.themeColor;
    ctx.fillRect(584, 10, 40, 40);
    portrait(ctx, f2.sprites, 586, 12, 36, true);

    // 名前
    T(ctx, f1.def.name, 64, 38, 11, "#ffffff", "left");
    T(ctx, f2.def.name, 576, 38, 11, "#ffffff", "right");

    // ラウンド取得ピップ
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = i < f1.roundsWon ? "#ffd64a" : "rgba(16,16,24,0.7)";
      ctx.fillRect(250 - i * 14, 38, 10, 10);
      ctx.fillStyle = i < f2.roundsWon ? "#ffd64a" : "rgba(16,16,24,0.7)";
      ctx.fillRect(380 + i * 14, 38, 10, 10);
    }

    // タイマー
    const sec = Math.max(0, Math.ceil(battle.timer / 60));
    ctx.fillStyle = "#101018";
    ctx.fillRect(296, 6, 48, 34);
    ctx.fillStyle = sec <= 10 ? "#ff4a2e" : "#f8f0e0";
    ctx.font = `bold 26px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(String(sec), 320, 10);

    // 必殺ゲージ
    function meter(x, y, w, val, themeColor, fromRight) {
      ctx.fillStyle = "#101018";
      ctx.fillRect(x - 2, y - 2, w + 4, 12);
      ctx.fillStyle = "#1a2a4a";
      ctx.fillRect(x, y, w, 8);
      const fw = Math.round((w * Math.min(100, val)) / 100);
      const full = val >= 100;
      ctx.fillStyle = full ? (battle.phaseT % 14 < 7 ? "#ffffff" : themeColor) : "#4a9eff";
      if (fromRight) ctx.fillRect(x + w - fw, y, fw, 8);
      else ctx.fillRect(x, y, fw, 8);
    }
    meter(64, 332, 180, f1.meter, f1.def.themeColor, false);
    meter(396, 332, 180, f2.meter, f2.def.themeColor, true);
    if (f1.meter >= 100) T(ctx, "必殺OK!", 64, 342, 10, battle.phaseT % 14 < 7 ? "#ffe066" : "#ffffff", "left");
    if (f2.meter >= 100) T(ctx, "必殺OK!", 576, 342, 10, battle.phaseT % 14 < 7 ? "#ffe066" : "#ffffff", "right");

    // コンボ表示（相手が食らった数）
    if (f2.combo >= 2 && (f2.state === "hit" || f2.combo >= 2)) {
      T(ctx, `${f2.combo} HIT!`, 80, 70, 20, "#ffe066", "left");
    }
    if (f1.combo >= 2) {
      T(ctx, `${f1.combo} HIT!`, 560, 70, 20, "#ffe066", "right");
    }
  }

  // ============ バトル中のメッセージ ============
  function drawBattleMessages(ctx, battle) {
    const cx = 320, cy = 140;

    if (battle.phase === "intro") {
      if (battle.phaseT < 70) {
        const scale = Math.min(1, battle.phaseT / 12);
        T(ctx, `ラウンド ${battle.round}`, cx, cy - 20, Math.round(40 * scale) + 4, "#ffd64a", "center");
      } else {
        T(ctx, "ファイト！", cx, cy - 24, 52, battle.phaseT % 8 < 4 ? "#ff4a2e" : "#ffe066", "center");
      }
    }

    if (battle.phase === "ko") {
      const s = Math.min(1, battle.phaseT / 8);
      T(ctx, "K.O.", cx, cy - 40, Math.round(76 * s) + 8, battle.phaseT % 6 < 3 ? "#ff4a2e" : "#ffe066", "center");
    }

    if (battle.phase === "timeup") {
      T(ctx, "タイムアップ！", cx, cy - 20, 40, "#ffe066", "center");
      if (!battle.roundWinner && battle.phaseT > 30) {
        T(ctx, "引き分け", cx, cy + 30, 26, "#ffffff", "center");
      }
    }

    if (battle.phase === "roundend" && battle.roundWinner) {
      T(ctx, `${battle.roundWinner.def.name} の勝ち！`, cx, cy, 28, "#ffe066", "center");
    }

    if (battle.phase === "matchend" && battle.winner) {
      T(ctx, "勝負あり！", cx, cy - 30, 44, "#ffe066", "center");
      T(ctx, battle.winner.def.name, cx, cy + 26, 26, battle.winner.def.themeColor, "center");
    }

    // 必殺技名バナー
    if (battle.banner) {
      const a = Math.min(1, battle.banner.t / 12);
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(16,16,24,0.75)";
      ctx.fillRect(0, 200, 640, 36);
      ctx.fillStyle = battle.banner.color;
      ctx.fillRect(0, 200, 640, 3);
      ctx.fillRect(0, 233, 640, 3);
      T(ctx, `『 ${battle.banner.text} 』`, cx, 206, 24, "#ffffff", "center");
      ctx.globalAlpha = 1;
    }
  }

  // ============ タイトル画面 ============
  function drawTitle(ctx, t, menuIndex, stageCanvas) {
    ctx.drawImage(stageCanvas, 0, 0);
    ctx.fillStyle = "rgba(10,6,20,0.62)";
    ctx.fillRect(0, 0, 640, 360);

    // ロゴ
    const bounce = Math.sin(t / 30) * 4;
    T(ctx, "ドット魂", 320, 64 + bounce, 80, "#ff4a2e", "center", "#2a0a0a");
    T(ctx, "ドット魂", 317, 61 + bounce, 80, "#ffd64a", "center", "#2a0a0a");
    T(ctx, "〜 昭和激闘伝 〜", 320, 150 + bounce, 22, "#f8f0e0", "center");

    // メニュー
    const items = ["ひとりであそぶ (VS COM)", "ふたりであそぶ (VS 2P)", "ネットたいせん (ONLINE)"];
    items.forEach((item, i) => {
      const sel = i === menuIndex;
      const y = 202 + i * 32;
      if (sel) {
        ctx.fillStyle = "rgba(255,214,74,0.16)";
        ctx.fillRect(160, y - 4, 320, 27);
        T(ctx, "▶", 178, y, 18, t % 30 < 15 ? "#ffd64a" : "#ff4a2e", "left");
      }
      T(ctx, item, 320, y, 18, sel ? "#ffe066" : i === 2 ? "#7ac8e8" : "#9a90a8", "center");
    });

    if (t % 60 < 38) T(ctx, "- W/S で選択  ENTER で決定 -", 320, 300, 13, "#f8f0e0", "center");
    T(ctx, "© 19XX DOT DAMASHII PROJECT", 320, 338, 11, "#7a7088", "center");
  }

  // ============ キャラ選択 ============
  function drawSelect(ctx, t, roster, sel, stageCanvas) {
    ctx.drawImage(stageCanvas, 0, 0);
    ctx.fillStyle = "rgba(10,6,20,0.7)";
    ctx.fillRect(0, 0, 640, 360);

    T(ctx, "ファイター セレクト", 320, 22, 28, "#ffd64a", "center");

    const n = roster.length;
    const cellW = 100, gap = 24;
    const totalW = n * cellW + (n - 1) * gap;
    const startX = 320 - totalW / 2;

    roster.forEach((c, i) => {
      const x = startX + i * (cellW + gap);
      const y = 78;
      const isP1 = sel.p1 === i;
      const isP2 = (sel.netMode || sel.phase === "p2" || sel.phase === "done" || sel.phase === "cpu") && sel.p2 === i;

      // 枠
      ctx.fillStyle = "#101018";
      ctx.fillRect(x - 4, y - 4, cellW + 8, cellW + 8);
      ctx.fillStyle = "#2a2438";
      ctx.fillRect(x, y, cellW, cellW);

      // キャラ全身（idle）
      const spr = sel.sprites[i];
      if (spr) {
        const img = spr.frames.idle[Math.floor(t / 22) % 2].r;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, x + 2, y + 2, 96, 96);
      }

      // カーソル
      if (isP1) {
        ctx.strokeStyle = t % 20 < 10 ? "#ffd64a" : "#ff7a2e";
        ctx.lineWidth = 4;
        ctx.strokeRect(x - 4, y - 4, cellW + 8, cellW + 8);
        T(ctx, "1P", x + 4, y + 4, 14, "#ffd64a", "left");
      }
      if (isP2) {
        ctx.strokeStyle = t % 20 < 10 ? "#b06aff" : "#5a8aff";
        ctx.lineWidth = 4;
        ctx.strokeRect(x - 8, y - 8, cellW + 16, cellW + 16);
        T(ctx, sel.mode === "cpu" ? "COM" : "2P", x + cellW - 4, y + 4, 14, "#b06aff", "right");
      }

      T(ctx, c.name, x + cellW / 2, y + cellW + 10, 13, isP1 || isP2 ? "#ffffff" : "#9a90a8", "center");

      // ネット対戦時の決定済みバッジ
      if (sel.netMode) {
        if (sel.lock1 && isP1) T(ctx, "OK!", x + 4, y + cellW - 20, 15, "#7aff7a", "left");
        if (sel.lock2 && isP2) T(ctx, "OK!", x + cellW - 4, y + cellW - 20, 15, "#7aff7a", "right");
      }
    });

    // 選択中キャラの説明
    const focus = sel.netMode
      ? roster[sel.mySide === "p1" ? sel.p1 : sel.p2]
      : sel.phase === "p1" ? roster[sel.p1] : roster[sel.p2];
    if (focus) {
      ctx.fillStyle = "rgba(16,16,24,0.8)";
      ctx.fillRect(80, 240, 480, 70);
      ctx.fillStyle = focus.themeColor;
      ctx.fillRect(80, 240, 480, 4);
      T(ctx, `${focus.title}　${focus.name}`, 320, 252, 18, focus.themeColor, "center");
      T(ctx, `「${focus.catchphrase}」`, 320, 280, 14, "#f8f0e0", "center");
    }

    const hint = sel.netMode
      ? (sel.myLocked
        ? "あいての けってい まち…"
        : `あなたは ${sel.mySide === "p1" ? "1P" : "2P"} がわ: A/D で選択  J で決定`)
      : sel.phase === "p1"
        ? "1P: A/D で選択  J で決定"
        : sel.phase === "p2"
          ? "2P: ←/→ で選択  , (カンマ) で決定"
          : sel.phase === "cpu"
            ? "対戦相手 決定中…"
            : "";
    if (hint) T(ctx, hint, 320, 326, 14, t % 40 < 25 ? "#ffe066" : "#c8c0d8", "center");
  }

  // ============ VS画面 ============
  function drawVs(ctx, t, c1, c2, s1, s2, stageName) {
    ctx.fillStyle = "#14102a";
    ctx.fillRect(0, 0, 640, 360);
    // 斜め分割の背景
    ctx.fillStyle = "#3a1830";
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(380, 0); ctx.lineTo(260, 360); ctx.lineTo(0, 360);
    ctx.closePath(); ctx.fill();

    const slide = Math.min(1, t / 20);
    // 左キャラ
    ctx.imageSmoothingEnabled = false;
    const img1 = s1.frames.special[1].r;
    ctx.drawImage(img1, -160 + slide * 200, 70, 192, 192);
    T(ctx, c1.name, 40, 270, 26, c1.themeColor, "left");
    T(ctx, `「${c1.catchphrase}」`, 40, 304, 13, "#f8f0e0", "left");
    // 右キャラ
    const img2 = s2.frames.special[1].l;
    ctx.drawImage(img2, 640 + 120 - slide * 200 - 192, 70, 192, 192);
    T(ctx, c2.name, 600, 40, 26, c2.themeColor, "right");
    T(ctx, `「${c2.catchphrase}」`, 600, 74, 13, "#f8f0e0", "right");

    // VS
    if (t > 24) {
      const vs = Math.min(1, (t - 24) / 8);
      T(ctx, "VS", 320, 130, Math.round(86 * vs), t % 10 < 5 ? "#ffd64a" : "#ff4a2e", "center");
    }
    if (t > 50) T(ctx, `STAGE: ${stageName}`, 320, 330, 13, "#c8c0d8", "center");
  }

  // ============ リザルト ============
  function drawResult(ctx, t, winnerDef, winnerSprites, stageCanvas) {
    ctx.drawImage(stageCanvas, 0, 0);
    ctx.fillStyle = "rgba(10,6,20,0.66)";
    ctx.fillRect(0, 0, 640, 360);

    T(ctx, "WINNER!", 320, 36, 44, t % 20 < 10 ? "#ffd64a" : "#ff4a2e", "center");

    const img = winnerSprites.frames.special[1].r;
    ctx.imageSmoothingEnabled = false;
    const bounce = Math.abs(Math.sin(t / 18)) * -8;
    ctx.drawImage(img, 320 - 80, 100 + bounce, 160, 160);

    T(ctx, `${winnerDef.title}　${winnerDef.name}`, 320, 268, 20, winnerDef.themeColor, "center");
    T(ctx, `「${winnerDef.winQuote}」`, 320, 296, 15, "#f8f0e0", "center");

    if (t % 50 < 32) T(ctx, "ENTER: もういちど　ESC: タイトルへ", 320, 332, 13, "#c8c0d8", "center");
  }

  // ============ ネット対戦メニュー ============
  function drawNetMenu(ctx, t, idx, stageCanvas) {
    ctx.drawImage(stageCanvas, 0, 0);
    ctx.fillStyle = "rgba(10,6,20,0.72)";
    ctx.fillRect(0, 0, 640, 360);
    T(ctx, "ネットたいせん", 320, 50, 34, "#5ad8ff", "center");
    const items = ["へやを つくる（ホスト）", "あいことばで さんか（ゲスト）"];
    items.forEach((item, i) => {
      const sel = i === idx;
      const y = 160 + i * 40;
      if (sel) {
        ctx.fillStyle = "rgba(90,216,255,0.14)";
        ctx.fillRect(140, y - 5, 360, 30);
        T(ctx, "▶", 158, y, 18, t % 30 < 15 ? "#5ad8ff" : "#ffffff", "left");
      }
      T(ctx, item, 320, y, 18, sel ? "#bfeaff" : "#9a90a8", "center");
    });
    T(ctx, "インターネットごしに 1たい1で たたかえるぞ！", 320, 268, 13, "#c8c0d8", "center");
    T(ctx, "W/S: 選択  ENTER: 決定  ESC: もどる", 320, 312, 13, "#7a7088", "center");
  }

  // ============ 部屋作成（ホスト待機）============
  function drawNetHost(ctx, t, code, status, stageCanvas) {
    ctx.drawImage(stageCanvas, 0, 0);
    ctx.fillStyle = "rgba(10,6,20,0.78)";
    ctx.fillRect(0, 0, 640, 360);
    T(ctx, "へやを つくりました", 320, 46, 26, "#5ad8ff", "center");
    if (code) {
      T(ctx, "あいことば", 320, 110, 16, "#c8c0d8", "center");
      // 4桁を1文字ずつボックス表示
      const chars = code.split("");
      chars.forEach((ch, i) => {
        const x = 320 - 130 + i * 70;
        ctx.fillStyle = "#101018";
        ctx.fillRect(x, 140, 60, 70);
        ctx.strokeStyle = "#5ad8ff";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, 140, 60, 70);
        T(ctx, ch, x + 30, 154, 42, "#ffe066", "center");
      });
      T(ctx, "この4けたを あいてに つたえてください", 320, 232, 14, "#f8f0e0", "center");
    } else {
      T(ctx, "へやを じゅんびちゅう…", 320, 150, 18, "#c8c0d8", "center");
    }
    if (t % 50 < 32) T(ctx, status || "あいてを まっています…", 320, 276, 16, "#bfeaff", "center");
    T(ctx, "ESC: やめる", 320, 318, 13, "#7a7088", "center");
  }

  // ============ あいことば入力（ゲスト）============
  function drawNetJoin(ctx, t, input, msg, connecting, stageCanvas) {
    ctx.drawImage(stageCanvas, 0, 0);
    ctx.fillStyle = "rgba(10,6,20,0.78)";
    ctx.fillRect(0, 0, 640, 360);
    T(ctx, "あいことばを いれてください", 320, 46, 24, "#5ad8ff", "center");
    for (let i = 0; i < 4; i++) {
      const x = 320 - 130 + i * 70;
      ctx.fillStyle = "#101018";
      ctx.fillRect(x, 130, 60, 70);
      const active = !connecting && i === input.length;
      ctx.strokeStyle = active && t % 24 < 14 ? "#ffe066" : "#5ad8ff";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, 130, 60, 70);
      if (input[i]) T(ctx, input[i], x + 30, 144, 42, "#ffffff", "center");
      else if (active && t % 24 < 14) T(ctx, "_", x + 30, 144, 42, "#ffe066", "center");
    }
    if (connecting) {
      if (t % 40 < 26) T(ctx, "せつぞくちゅう…", 320, 232, 18, "#bfeaff", "center");
    } else {
      T(ctx, "すうじキー(0-9)で にゅうりょく", 320, 226, 14, "#f8f0e0", "center");
      if (input.length === 4) T(ctx, "ENTER: せつぞく！", 320, 252, 16, t % 30 < 18 ? "#ffe066" : "#ffffff", "center");
    }
    if (msg) T(ctx, msg, 320, 284, 15, "#ff6a5a", "center");
    T(ctx, "BS: けす  ESC: もどる", 320, 318, 13, "#7a7088", "center");
  }

  // ============ ネット対戦中のオーバーレイ ============
  function drawNetOverlay(ctx, t, rtt, stallFrames, desync) {
    if (rtt != null) {
      T(ctx, `PING ${Math.round(rtt)}ms`, 320, 46, 10, rtt < 80 ? "#7aff7a" : rtt < 150 ? "#ffe066" : "#ff6a5a", "center");
    }
    if (stallFrames > 30) {
      ctx.fillStyle = "rgba(10,6,20,0.5)";
      ctx.fillRect(0, 150, 640, 60);
      if (t % 30 < 20) T(ctx, "つうしん まちあわせちゅう…", 320, 168, 20, "#bfeaff", "center");
    }
    if (desync) {
      T(ctx, "！どうきずれ を けんち しました！", 320, 60, 13, "#ff6a5a", "center");
    }
  }

  return { T, drawHUD, drawBattleMessages, drawTitle, drawSelect, drawVs, drawResult, drawNetMenu, drawNetHost, drawNetJoin, drawNetOverlay };
})();
