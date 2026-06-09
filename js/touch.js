// ============================================================
// ドット魂 〜昭和激闘伝〜  タッチ操作レイヤー（完全自己完結型）
// スマホ・タブレット用の仮想ゲームパッドを生成し、
// Input.setVirtual() 経由でキーボードと同等の入力を注入する。
// 有効化条件: タッチデバイス、または URL に ?touch=1
// ============================================================
(() => {
  "use strict";

  // ---------- 有効化判定 ----------
  const isTouchDevice = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);
  const forced = /[?&]touch=1\b/.test(window.location.search);
  if (!isTouchDevice && !forced) return; // 何もDOMを作らない

  // ---------- 仮想キー注入 ----------
  // 注: input.js は `const Input = ...` のため window プロパティにならない。
  // 同一レルムのトップレベル lexical binding を typeof 経由で安全に参照する。
  function vKey(code, isDown) {
    /* global Input */
    if (typeof Input !== "undefined" && Input && typeof Input.setVirtual === "function") {
      Input.setVirtual(code, isDown);
    } else if (window.Input && typeof window.Input.setVirtual === "function") {
      window.Input.setVirtual(code, isDown);
    }
  }

  // ---------- スタイル注入 ----------
  const CSS = `
#dtc-root {
  position: fixed; inset: 0; z-index: 9999;
  pointer-events: none;
  font-family: "MS Gothic", "ＭＳ ゴシック", monospace;
  -webkit-user-select: none; user-select: none;
  -webkit-touch-callout: none;
  --dtc-b: clamp(58px, 13.5vmin, 96px);    /* バトルボタン基準サイズ */
  --dtc-k: clamp(44px, 9vmin, 64px);       /* テンキー基準サイズ */
  --dtc-bottom: calc(2.2vh + env(safe-area-inset-bottom, 0px));
  --dtc-top: calc(1.2vh + env(safe-area-inset-top, 0px));
}
#dtc-root * { box-sizing: border-box; }

/* ---- ボタン共通（レトロゲーム機風） ---- */
.dtc-btn {
  pointer-events: auto;
  touch-action: none;
  display: flex; align-items: center; justify-content: center;
  color: #f5e9d0;
  cursor: pointer;
  text-shadow: 0 1px 0 rgba(0,0,0,0.7);
  transition: transform 0.05s ease-out, filter 0.05s ease-out;
}
.dtc-btn.dtc-pressed { transform: scale(0.9) translateY(2px); filter: brightness(0.72); }

/* 十字キー風 方向ボタン（黒プラスチック） */
.dtc-dir {
  width: calc(var(--dtc-b) * 1.12); height: var(--dtc-b);
  font-size: calc(var(--dtc-b) * 0.46);
  border-radius: 16%;
  background: linear-gradient(160deg, rgba(120,120,142,0.92), rgba(48,48,64,0.92));
  border: 3px solid rgba(215,215,235,0.75);
  box-shadow: inset 0 3px 3px rgba(255,255,255,0.30), inset 0 -5px 6px rgba(0,0,0,0.55), 0 4px 9px rgba(0,0,0,0.55);
  color: #ffffff;
}

/* ファミコン風 丸ボタン（赤） */
.dtc-act {
  width: var(--dtc-b); height: var(--dtc-b);
  font-size: calc(var(--dtc-b) * 0.40);
  font-weight: bold;
  border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, rgba(255,128,110,0.95), rgba(178,38,32,0.92) 55%, rgba(110,16,14,0.92));
  border: 2px solid rgba(255,180,150,0.5);
  box-shadow: inset 0 3px 4px rgba(255,255,255,0.30), inset 0 -5px 7px rgba(0,0,0,0.45), 0 5px 10px rgba(0,0,0,0.5);
}

/* 防御ボタン（鋼鉄色の丸ボタン） */
.dtc-guard {
  background: radial-gradient(circle at 32% 28%, rgba(150,190,255,0.95), rgba(52,92,176,0.92) 55%, rgba(22,42,98,0.92));
  border: 2px solid rgba(170,205,255,0.5);
}

/* 跳ボタン（金色の丸ボタン） */
.dtc-jump {
  border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, rgba(255,230,150,0.95), rgba(208,150,40,0.92) 55%, rgba(128,82,12,0.92));
  border: 2px solid rgba(255,230,170,0.55);
  box-shadow: inset 0 3px 4px rgba(255,255,255,0.30), inset 0 -5px 7px rgba(0,0,0,0.45), 0 5px 10px rgba(0,0,0,0.5);
  width: calc(var(--dtc-b) * 0.85); height: calc(var(--dtc-b) * 0.85);
  font-size: calc(var(--dtc-b) * 0.34);
  font-weight: bold;
}

/* システムボタン（START/もどる: ファミコン本体の角ボタン風） */
.dtc-sys {
  position: fixed; top: var(--dtc-top);
  height: clamp(26px, 5vmin, 36px);
  padding: 0 clamp(10px, 2.4vmin, 18px);
  font-size: clamp(11px, 2.4vmin, 15px);
  border-radius: 6px;
  background: linear-gradient(180deg, rgba(90,30,34,0.88), rgba(48,12,16,0.88));
  border: 2px solid rgba(220,170,140,0.45);
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.2), inset 0 -2px 3px rgba(0,0,0,0.5), 0 3px 6px rgba(0,0,0,0.45);
  color: #ffd9b0;
  letter-spacing: 1px;
}
#dtc-start { right: clamp(8px, 2vw, 24px); }
#dtc-back  { left: clamp(8px, 2vw, 24px); }

/* ---- 左下: 移動クラスター ---- */
#dtc-left {
  position: fixed;
  left: clamp(8px, 2.5vw, 28px);
  bottom: var(--dtc-bottom);
  display: flex; flex-direction: column; align-items: center;
  gap: calc(var(--dtc-b) * 0.14);
  pointer-events: none;
}
#dtc-left .dtc-row { display: flex; gap: calc(var(--dtc-b) * 0.18); pointer-events: none; }

/* ---- 右下: 攻撃クラスター（斜めアーク配置） ---- */
#dtc-right {
  position: fixed;
  right: clamp(8px, 2.5vw, 28px);
  bottom: var(--dtc-bottom);
  width: calc(var(--dtc-b) * 3.65);
  height: calc(var(--dtc-b) * 2.55);
  pointer-events: none;
}
#dtc-right .dtc-btn { position: absolute; }
#dtc-btn-guard   { left: calc(var(--dtc-b) * 0.20);    bottom: 0; }
#dtc-btn-light   { left: calc(var(--dtc-b) * 0.55);    bottom: calc(var(--dtc-b) * 1.18); }
#dtc-btn-heavy   { left: calc(var(--dtc-b) * 1.60);    bottom: calc(var(--dtc-b) * 1.50); }
#dtc-btn-special { left: calc(var(--dtc-b) * 2.65);    bottom: calc(var(--dtc-b) * 1.18); }

/* ---- 部屋コード用テンキー ---- */
#dtc-keypad {
  position: fixed;
  left: 50%; transform: translateX(-50%);
  bottom: calc(var(--dtc-bottom) + 1vh);
  display: none;
  grid-template-columns: repeat(3, var(--dtc-k));
  gap: clamp(6px, 1.2vmin, 10px);
  padding: clamp(8px, 1.6vmin, 14px);
  background: rgba(14,10,24,0.82);
  border: 2px solid rgba(176,138,255,0.55);
  border-radius: 10px;
  box-shadow: 0 0 22px rgba(120,60,200,0.35), 0 6px 14px rgba(0,0,0,0.6);
  pointer-events: auto;
}
#dtc-keypad.dtc-show { display: grid; }
.dtc-key {
  width: var(--dtc-k); height: var(--dtc-k);
  font-size: calc(var(--dtc-k) * 0.42);
  border-radius: 10px;
  background: linear-gradient(160deg, rgba(78,70,100,0.95), rgba(34,28,52,0.95));
  border: 2px solid rgba(176,160,210,0.5);
  box-shadow: inset 0 2px 2px rgba(255,255,255,0.18), inset 0 -3px 4px rgba(0,0,0,0.5), 0 3px 6px rgba(0,0,0,0.4);
  color: #e8e0ff;
}
.dtc-key-ok {
  background: linear-gradient(160deg, rgba(120,200,120,0.95), rgba(28,92,40,0.95));
  border-color: rgba(180,255,180,0.5);
  color: #eaffe8;
}
.dtc-key-del {
  background: linear-gradient(160deg, rgba(200,110,90,0.95), rgba(96,30,24,0.95));
  border-color: rgba(255,190,160,0.5);
  color: #ffe6da;
}

/* バトルクラスターはテンキー表示中（netjoin）も常時表示でOK（要件3） */
`;

  // ---------- DOM生成 ----------
  function el(tag, cls, text, id) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (id) e.id = id;
    return e;
  }

  // ボタンへ pointer events をバインド（マルチタッチ対応・各ボタン独立）
  function bindButton(btn, code) {
    const activeIds = new Set();
    const press = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (activeIds.has(e.pointerId)) return;
      activeIds.add(e.pointerId);
      try { btn.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
      if (activeIds.size === 1) {
        btn.classList.add("dtc-pressed");
        vKey(code, true);
      }
    };
    const release = (e) => {
      if (!activeIds.has(e.pointerId)) return;
      activeIds.delete(e.pointerId);
      if (activeIds.size === 0) {
        btn.classList.remove("dtc-pressed");
        vKey(code, false);
      }
    };
    btn.addEventListener("pointerdown", press);
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("pointerleave", release);
    btn.addEventListener("lostpointercapture", release);
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  function makeButton(label, code, cls, id) {
    const btn = el("div", "dtc-btn " + cls, label, id);
    btn.dataset.code = code;
    bindButton(btn, code);
    return btn;
  }

  function build() {
    // スタイル
    const style = document.createElement("style");
    style.id = "dtc-style";
    style.textContent = CSS;
    document.head.appendChild(style);

    const root = el("div", null, null, "dtc-root");

    // --- 上部端: START / もどる ---
    root.appendChild(makeButton("START", "Enter", "dtc-sys", "dtc-start"));
    root.appendChild(makeButton("もどる", "Escape", "dtc-sys", "dtc-back"));

    // --- 左下: 移動クラスター ---
    const left = el("div", null, null, "dtc-left");
    const rowJump = el("div", "dtc-row");
    rowJump.appendChild(makeButton("跳", "KeyW", "dtc-jump", "dtc-btn-jump"));
    const rowMove = el("div", "dtc-row");
    rowMove.appendChild(makeButton("◀", "KeyA", "dtc-dir", "dtc-btn-left"));
    rowMove.appendChild(makeButton("▶", "KeyD", "dtc-dir", "dtc-btn-right"));
    left.appendChild(rowJump);
    left.appendChild(rowMove);
    root.appendChild(left);

    // --- 右下: 攻撃クラスター ---
    const right = el("div", null, null, "dtc-right");
    right.appendChild(makeButton("防", "KeyS", "dtc-act dtc-guard", "dtc-btn-guard"));
    right.appendChild(makeButton("弱", "KeyJ", "dtc-act", "dtc-btn-light"));
    right.appendChild(makeButton("強", "KeyK", "dtc-act", "dtc-btn-heavy"));
    right.appendChild(makeButton("必", "KeyL", "dtc-act", "dtc-btn-special"));
    root.appendChild(right);

    // --- 部屋コード用テンキー（netjoin時のみ表示） ---
    const keypad = el("div", null, null, "dtc-keypad");
    for (let i = 1; i <= 9; i++) {
      keypad.appendChild(makeButton(String(i), "Digit" + i, "dtc-key", "dtc-key-" + i));
    }
    keypad.appendChild(makeButton("⌫", "Backspace", "dtc-key dtc-key-del", "dtc-key-del"));
    keypad.appendChild(makeButton("0", "Digit0", "dtc-key", "dtc-key-0"));
    keypad.appendChild(makeButton("OK", "Enter", "dtc-key dtc-key-ok", "dtc-key-ok"));
    root.appendChild(keypad);

    document.body.appendChild(root);

    // ルート上のジェスチャー抑止（スクロール/ズーム/長押しメニュー）
    root.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
    root.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
    root.addEventListener("contextmenu", (e) => e.preventDefault());

    // --- ゲーム状態を300msポーリングしてテンキー表示を切替 ---
    setInterval(() => {
      const g = window.GAME;
      const show = !!(g && g.state === "netjoin");
      keypad.classList.toggle("dtc-show", show);
    }, 300);
  }

  if (document.body) {
    build();
  } else {
    document.addEventListener("DOMContentLoaded", build);
  }
})();
