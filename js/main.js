// メインループ・ゲーム状態管理
(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  // ロスター構築（読み込み順を固定）
  const ROSTER_ORDER = ["jiro", "yoko", "gashan", "matatabi"];
  const ALL = window.DOT_FIGHTERS || [];
  const ROSTER = ROSTER_ORDER.map((id) => ALL.find((c) => c.id === id)).filter(Boolean);
  ALL.forEach((c) => { if (!ROSTER.includes(c)) ROSTER.push(c); });

  let state = "title"; // title | select | vs | battle | result | netmenu | nethost | netjoin | netselect
  let t = 0;
  let menuIndex = 0;
  let sel = null;
  let battle = null;
  let currentStage = null;
  let resultWinner = null;
  let rosterSprites = null;
  let titleToast = null; // {msg, t}

  // ===== ネット対戦用 =====
  let netUI = null;      // {menuIdx, code, joinInput, msg, connecting, status}
  let netLock = null;    // ロックステップ状態
  let netRematch = null; // {me, them}
  let netEvents = [];
  // バトル開始ハンドシェイク（入力バッファ初期化の競合防止）
  // 相手の ready(同エポック) を受け取るまで入力送信を開始しない
  let netEpoch = 0;
  let remoteReadyEpoch = -1;
  const NET_DELAY = 4;
  const EDGE_MASK = 4 | 16 | 32 | 64; // jump/light/heavy/special

  function netCb(e, d) {
    netEvents.push([e, d]);
  }

  function drainNetEvents() {
    const evs = netEvents;
    netEvents = [];
    return evs;
  }

  function encodePad(p) {
    return (p.left ? 1 : 0) | (p.right ? 2 : 0) | (p.jump ? 4 : 0) | (p.guard ? 8 : 0) |
      (p.lightPressed ? 16 : 0) | (p.heavyPressed ? 32 : 0) | (p.specialPressed ? 64 : 0);
  }

  function decodePad(b) {
    return {
      left: !!(b & 1), right: !!(b & 2), jump: !!(b & 4), guard: !!(b & 8),
      lightPressed: !!(b & 16), heavyPressed: !!(b & 32), specialPressed: !!(b & 64),
    };
  }

  function battleHash(b) {
    return [Math.round(b.f1.x), b.f1.hp, Math.round(b.f2.x), b.f2.hp, b.round, b.phase].join("|");
  }

  function handleNetDrop(msg) {
    if (typeof Net !== "undefined") Net.close();
    titleToast = { msg: msg || "つうしんが きれました", t: 260 };
    AudioSys.stopBgm();
    enterTitle();
  }

  function buildRosterSprites() {
    if (!rosterSprites) rosterSprites = ROSTER.map((c) => Sprites.build(c));
    return rosterSprites;
  }

  // 初回キー入力でオーディオ起動（autoplay対策）
  let audioReady = false;
  window.addEventListener("keydown", () => {
    if (!audioReady) {
      AudioSys.init();
      audioReady = true;
      if (state === "title") AudioSys.playBgm("title");
    }
  });

  function enterTitle() {
    state = "title";
    t = 0;
    menuIndex = 0;
    if (audioReady) AudioSys.playBgm("title");
  }

  function enterSelect(mode) {
    state = "select";
    t = 0;
    sel = {
      phase: "p1", // p1 | p2 | cpu | done
      p1: 0,
      p2: Math.min(1, ROSTER.length - 1),
      mode,
      sprites: buildRosterSprites(),
      cpuT: 0,
      doneT: 0,
    };
  }

  function enterVs() {
    state = "vs";
    t = 0;
    currentStage = Stages.list[(Math.random() * Stages.list.length) | 0];
  }

  function enterBattle() {
    state = "battle";
    t = 0;
    battle = new Battle(ROSTER[sel.p1], ROSTER[sel.p2], sel.mode, currentStage);
    if (sel.mode === "net") {
      netLock = { frame: 0, delay: NET_DELAY, local: {}, pending: 0, stall: 0, hashes: {}, remoteH: {}, desync: false };
      Net.clearInputs();
      netEpoch++;
      Net.send({ t: "ready", e: netEpoch });
    }
    if (audioReady) AudioSys.playBgm("battle");
  }

  function enterResult() {
    state = "result";
    t = 0;
    netRematch = { me: false, them: false };
    AudioSys.stopBgm();
  }

  // ===== ネット対戦ステート遷移 =====
  function enterNetMenu() {
    if (typeof Net !== "undefined") Net.close();
    state = "netmenu";
    t = 0;
    netEvents = [];
    netEpoch = 0;
    remoteReadyEpoch = -1;
    netUI = { menuIdx: 0, code: null, joinInput: "", msg: null, connecting: false, status: null };
  }

  function enterNetHost() {
    state = "nethost";
    t = 0;
    netUI.code = null;
    netUI.status = null;
    netEvents = [];
    if (typeof Peer === "undefined") {
      netUI.status = "つうしんモジュールが よみこめません";
      return;
    }
    Net.host(netCb);
  }

  function enterNetJoin() {
    state = "netjoin";
    t = 0;
    netUI.joinInput = "";
    netUI.msg = null;
    netUI.connecting = false;
    netEvents = [];
  }

  function enterNetSelect() {
    state = "netselect";
    t = 0;
    sel = {
      netMode: true,
      mode: "net",
      phase: "net",
      p1: 0,
      p2: Math.min(1, ROSTER.length - 1),
      lock1: false,
      lock2: false,
      mySide: Net.isHost ? "p1" : "p2",
      myLocked: false,
      started: false,
      sprites: buildRosterSprites(),
    };
    AudioSys.sfx("select");
  }

  function startNetVs(stageIdx) {
    sel.started = true;
    currentStage = Stages.list[stageIdx % Stages.list.length];
    state = "vs";
    t = 0;
  }

  // ============ 更新 ============
  function update() {
    t++;
    if (titleToast && titleToast.t > 0) titleToast.t--;

    switch (state) {
      case "title": {
        const N = 3;
        if (Input.pressed("KeyW") || Input.pressed("ArrowUp")) { menuIndex = (menuIndex + N - 1) % N; AudioSys.sfx("cursor"); }
        if (Input.pressed("KeyS") || Input.pressed("ArrowDown")) { menuIndex = (menuIndex + 1) % N; AudioSys.sfx("cursor"); }
        if (Input.pressed("Enter") || Input.pressed("KeyJ")) {
          AudioSys.sfx("start");
          if (menuIndex === 0) enterSelect("cpu");
          else if (menuIndex === 1) enterSelect("2p");
          else enterNetMenu();
        }
        break;
      }
      case "select": {
        if (Input.pressed("Escape")) { enterTitle(); break; }
        const n = ROSTER.length;
        if (sel.phase === "p1") {
          if (Input.pressed("KeyA")) { sel.p1 = (sel.p1 + n - 1) % n; AudioSys.sfx("cursor"); }
          if (Input.pressed("KeyD")) { sel.p1 = (sel.p1 + 1) % n; AudioSys.sfx("cursor"); }
          if (Input.pressed("KeyJ") || Input.pressed("Enter")) {
            AudioSys.sfx("select");
            sel.phase = sel.mode === "cpu" ? "cpu" : "p2";
          }
        } else if (sel.phase === "cpu") {
          sel.cpuT++;
          if (sel.cpuT < 50) {
            if (sel.cpuT % 5 === 0) { sel.p2 = (sel.p2 + 1) % n; AudioSys.sfx("cursor"); }
          } else if (sel.cpuT === 50) {
            sel.p2 = (Math.random() * n) | 0;
            AudioSys.sfx("select");
            sel.phase = "done";
          }
        } else if (sel.phase === "p2") {
          if (Input.pressed("ArrowLeft")) { sel.p2 = (sel.p2 + n - 1) % n; AudioSys.sfx("cursor"); }
          if (Input.pressed("ArrowRight")) { sel.p2 = (sel.p2 + 1) % n; AudioSys.sfx("cursor"); }
          if (Input.pressed("Comma") || Input.pressed("Enter")) {
            AudioSys.sfx("select");
            sel.phase = "done";
          }
        } else if (sel.phase === "done") {
          sel.doneT++;
          if (sel.doneT >= 36) enterVs();
        }
        break;
      }
      case "netmenu": {
        if (Input.pressed("Escape")) { enterTitle(); break; }
        if (Input.pressed("KeyW") || Input.pressed("ArrowUp") || Input.pressed("KeyS") || Input.pressed("ArrowDown")) {
          netUI.menuIdx = 1 - netUI.menuIdx;
          AudioSys.sfx("cursor");
        }
        if (Input.pressed("Enter") || Input.pressed("KeyJ")) {
          AudioSys.sfx("select");
          if (netUI.menuIdx === 0) enterNetHost();
          else enterNetJoin();
        }
        break;
      }
      case "nethost": {
        for (const [e, d] of drainNetEvents()) {
          if (e === "code") netUI.code = d;
          else if (e === "connected") { enterNetSelect(); }
          else if (e === "error") netUI.status = d;
          else if (e === "closed") netUI.status = "せつぞくが きれました";
        }
        if (state !== "nethost") break;
        if (Input.pressed("Escape")) { Net.close(); enterNetMenu(); }
        break;
      }
      case "netjoin": {
        for (const [e, d] of drainNetEvents()) {
          if (e === "connected") { enterNetSelect(); }
          else if (e === "error") { netUI.msg = d; netUI.connecting = false; Net.close(); }
          else if (e === "closed") { if (netUI.connecting) { netUI.msg = "つうしんが きれました"; netUI.connecting = false; } }
        }
        if (state !== "netjoin") break;
        if (Input.pressed("Escape")) { Net.close(); enterNetMenu(); break; }
        if (!netUI.connecting) {
          for (let i = 0; i <= 9; i++) {
            if ((Input.pressed("Digit" + i) || Input.pressed("Numpad" + i)) && netUI.joinInput.length < 4) {
              netUI.joinInput += String(i);
              AudioSys.sfx("cursor");
            }
          }
          if (Input.pressed("Backspace") && netUI.joinInput.length > 0) {
            netUI.joinInput = netUI.joinInput.slice(0, -1);
            AudioSys.sfx("cursor");
          }
          if (Input.pressed("Enter") && netUI.joinInput.length === 4) {
            if (typeof Peer === "undefined") {
              netUI.msg = "つうしんモジュールが よみこめません";
            } else {
              netUI.connecting = true;
              netUI.msg = null;
              AudioSys.sfx("start");
              Net.join(netUI.joinInput, netCb);
            }
          }
        }
        break;
      }
      case "netselect": {
        for (const [e, d] of drainNetEvents()) {
          if (e === "closed" || e === "error") { handleNetDrop(); break; }
          if (e === "data") {
            if (d.t === "sel") sel[d.side] = d.i;
            else if (d.t === "lock") {
              sel[d.side] = d.i;
              if (d.side === "p1") sel.lock1 = true; else sel.lock2 = true;
              AudioSys.sfx("select");
            } else if (d.t === "start") {
              startNetVs(d.s);
            } else if (d.t === "bye") {
              handleNetDrop("あいてが たいせんを やめました");
            }
          }
        }
        if (state !== "netselect") break;
        if (Input.pressed("Escape")) { Net.send({ t: "bye" }); Net.close(); enterNetMenu(); break; }

        const n = ROSTER.length;
        const key = sel.mySide; // 'p1' | 'p2'
        if (!sel.myLocked) {
          let moved = false;
          if (Input.pressed("KeyA")) { sel[key] = (sel[key] + n - 1) % n; moved = true; }
          if (Input.pressed("KeyD")) { sel[key] = (sel[key] + 1) % n; moved = true; }
          if (moved) {
            AudioSys.sfx("cursor");
            Net.send({ t: "sel", side: key, i: sel[key] });
          }
          if (Input.pressed("KeyJ") || Input.pressed("Enter")) {
            sel.myLocked = true;
            if (key === "p1") sel.lock1 = true; else sel.lock2 = true;
            AudioSys.sfx("select");
            Net.send({ t: "lock", side: key, i: sel[key] });
          }
        }
        // 両者決定 → ホストがステージを決めて開始
        if (sel.lock1 && sel.lock2 && !sel.started && Net.isHost) {
          const stageIdx = (Math.random() * Stages.list.length) | 0;
          Net.send({ t: "start", s: stageIdx });
          startNetVs(stageIdx);
        }
        break;
      }
      case "vs": {
        if (sel.mode === "net") {
          for (const [e, d] of drainNetEvents()) {
            if (e === "closed" || e === "error") { handleNetDrop(); break; }
            if (e === "data") {
              if (d.t === "bye") { handleNetDrop("あいてが たいせんを やめました"); break; }
              if (d.t === "ready") remoteReadyEpoch = Math.max(remoteReadyEpoch, d.e);
            }
          }
          if (state !== "vs") break;
          if (t >= 150) enterBattle();
        } else {
          if (t >= 150 || Input.pressed("Enter") || Input.pressed("KeyJ")) enterBattle();
        }
        break;
      }
      case "battle": {
        if (sel.mode === "net") {
          for (const [e, d] of drainNetEvents()) {
            if (e === "closed" || e === "error") { handleNetDrop(); break; }
            if (e === "data") {
              if (d.t === "bye") { handleNetDrop("あいてが たいせんを やめました"); break; }
              if (d.t === "ready") remoteReadyEpoch = Math.max(remoteReadyEpoch, d.e);
              if (d.t === "h") {
                if (netLock.hashes[d.f] != null) {
                  if (netLock.hashes[d.f] !== d.h) netLock.desync = true;
                } else {
                  netLock.remoteH[d.f] = d.h;
                }
              }
            }
          }
          if (state !== "battle") break;
          if (Input.pressed("Escape")) {
            Net.send({ t: "bye" });
            Net.close();
            AudioSys.stopBgm();
            enterTitle();
            break;
          }
          // ===== ロックステップ =====
          // 相手がバトル画面に入る（=入力バッファ初期化を終える）まで入力送信を保留
          if (remoteReadyEpoch < netEpoch) {
            netLock.pending |= encodePad(Input.p1()) & EDGE_MASK;
            netLock.stall++;
            break;
          }
          const sampleF = netLock.frame + netLock.delay;
          if (!(sampleF in netLock.local)) {
            const bits = encodePad(Input.p1()) | netLock.pending;
            netLock.pending = 0;
            netLock.local[sampleF] = bits;
            Net.sendInput(sampleF, bits);
          } else {
            netLock.pending |= encodePad(Input.p1()) & EDGE_MASK;
          }
          const f = netLock.frame;
          const lb = f < netLock.delay ? 0 : netLock.local[f];
          const rb = f < netLock.delay ? 0 : Net.getInput(f);
          if (lb != null && rb != null) {
            const myPad = decodePad(lb);
            const theirPad = decodePad(rb);
            const pads = Net.isHost ? [myPad, theirPad] : [theirPad, myPad];
            battle.update(pads);
            if (f % 60 === 0) {
              const h = battleHash(battle);
              netLock.hashes[f] = h;
              if (netLock.remoteH[f] != null) {
                if (netLock.remoteH[f] !== h) netLock.desync = true;
                delete netLock.remoteH[f];
              }
              Net.send({ t: "h", f, h });
              delete netLock.hashes[f - 600];
              delete netLock.local[f - 300];
            }
            netLock.frame++;
            netLock.stall = 0;
          } else {
            netLock.stall++;
          }
          if (battle.finished) {
            resultWinner = battle.winner || battle.f1;
            AudioSys.sfx("win");
            enterResult();
          }
        } else {
          if (Input.pressed("Escape")) { AudioSys.stopBgm(); enterTitle(); break; }
          battle.update();
          if (battle.finished) {
            resultWinner = battle.winner || battle.f1;
            AudioSys.sfx("win");
            enterResult();
          }
        }
        break;
      }
      case "result": {
        if (sel.mode === "net") {
          for (const [e, d] of drainNetEvents()) {
            if (e === "closed" || e === "error") { handleNetDrop(); break; }
            if (e === "data") {
              if (d.t === "rematch") netRematch.them = true;
              else if (d.t === "start") startNetVs(d.s);
              else if (d.t === "ready") remoteReadyEpoch = Math.max(remoteReadyEpoch, d.e);
              else if (d.t === "bye") { handleNetDrop("あいてが たいせんを やめました"); break; }
            }
          }
          if (state !== "result" && state !== "vs") break;
          if (state === "vs") break; // 再戦開始済み
          if (Input.pressed("Enter") || Input.pressed("KeyJ")) {
            if (!netRematch.me) {
              netRematch.me = true;
              AudioSys.sfx("select");
              Net.send({ t: "rematch" });
            }
          }
          if (Input.pressed("Escape")) {
            Net.send({ t: "bye" });
            Net.close();
            enterTitle();
            break;
          }
          // 両者再戦希望 → ホストがステージを決めて開始
          if (netRematch.me && netRematch.them && Net.isHost) {
            const stageIdx = (Math.random() * Stages.list.length) | 0;
            sel.started = false;
            Net.send({ t: "start", s: stageIdx });
            startNetVs(stageIdx);
          }
        } else {
          if (Input.pressed("Enter") || Input.pressed("KeyJ")) {
            AudioSys.sfx("start");
            enterSelect(sel.mode);
          }
          if (Input.pressed("Escape")) enterTitle();
        }
        break;
      }
    }
    Input.endFrame();
  }

  // ============ 描画 ============
  function draw() {
    ctx.clearRect(0, 0, 640, 360);
    if (ROSTER.length < 2) {
      ctx.fillStyle = "#101018";
      ctx.fillRect(0, 0, 640, 360);
      UI.T(ctx, "キャラクターデータが不足しています", 320, 160, 18, "#ff4a2e", "center");
      UI.T(ctx, `読み込み済み: ${ROSTER.length}体（2体以上必要）`, 320, 196, 14, "#f8f0e0", "center");
      return;
    }
    switch (state) {
      case "title":
        UI.drawTitle(ctx, t, menuIndex, Stages.list[0].canvas);
        if (titleToast && titleToast.t > 0) {
          UI.T(ctx, titleToast.msg, 320, 184, 14, "#ff6a5a", "center");
        }
        break;
      case "select":
      case "netselect":
        UI.drawSelect(ctx, t, ROSTER, sel, Stages.list[2].canvas);
        break;
      case "netmenu":
        UI.drawNetMenu(ctx, t, netUI.menuIdx, Stages.list[1].canvas);
        break;
      case "nethost":
        UI.drawNetHost(ctx, t, netUI.code, netUI.status, Stages.list[1].canvas);
        break;
      case "netjoin":
        UI.drawNetJoin(ctx, t, netUI.joinInput, netUI.msg, netUI.connecting, Stages.list[1].canvas);
        break;
      case "vs":
        UI.drawVs(ctx, t, ROSTER[sel.p1], ROSTER[sel.p2], sel.sprites[sel.p1], sel.sprites[sel.p2], currentStage.name);
        break;
      case "battle":
        battle.draw(ctx);
        if (sel.mode === "net" && netLock) {
          UI.drawNetOverlay(ctx, t, Net.rtt, netLock.stall, netLock.desync);
        }
        break;
      case "result":
        UI.drawResult(ctx, t, resultWinner.def, resultWinner.sprites, currentStage.canvas);
        if (sel.mode === "net") {
          if (netRematch.me && !netRematch.them) UI.T(ctx, "あいての へんじを まっています…", 320, 318, 13, "#bfeaff", "center");
          else if (!netRematch.me && netRematch.them) UI.T(ctx, "あいてが さいせんを きぼうしています！", 320, 318, 13, "#ffe066", "center");
        }
        break;
    }
  }

  // デバッグ/テスト用フック
  window.GAME = {
    get state() { return state; },
    get battle() { return battle; },
    get roster() { return ROSTER; },
    get netLock() { return netLock; },
    get sel() { return sel; },
    get netUI() { return netUI; },
    get menuIndex() { return menuIndex; },
  };

  // ============ 60fps固定ループ ============
  let last = performance.now();
  let acc = 0;
  const STEP = 1000 / 60;

  function loop(now) {
    acc += Math.min(100, now - last);
    last = now;
    while (acc >= STEP) {
      update();
      acc -= STEP;
    }
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
