// ドット魂 オンライン対戦 通信モジュール (PeerJS / WebRTC 1対1)
// NET_SPEC.md 準拠。グローバル Net として公開（ブラウザ直読み・IIFE）
const Net = (() => {
  const ID_PREFIX = "dotdama87-";
  const HOST_RETRY_MAX = 5;
  const PING_INTERVAL_MS = 2000;
  const PONG_TIMEOUT_MS = 7000; // pong がこれだけ途絶えたら接続喪失とみなす
  const INPUT_KEEP_FRAMES = 300;

  const ERR_NO_ROOM = "へやが みつかりません";
  const ERR_LOST = "つうしんが きれました";
  const ERR_NO_PEERJS =
    "つうしんモジュールが よみこめません（インターネットせつぞくを かくにんしてください）";

  // ---- 内部状態 ----
  let peer = null; // PeerJS Peer
  let conn = null; // DataConnection
  let cb = null; // ユーザーコールバック (event, data)
  let isHost = false;
  let connected = false;
  let rtt = null; // ms | null
  let pingTimer = null;
  let lastPongAt = 0; // 最後に pong（または任意のデータ）を受けた時刻
  let inputs = new Map(); // frame -> bits（相手から受信した入力）
  let lastGetFrame = -1;
  let closedEmitted = false;
  let gen = 0; // close() 後の遅延イベント無効化用の世代カウンタ

  function emit(event, data) {
    if (cb) {
      try {
        cb(event, data);
      } catch (e) {
        // ユーザーコールバック内の例外で通信処理を止めない
        if (typeof console !== "undefined" && console.warn) {
          console.warn("Net callback error:", e);
        }
      }
    }
  }

  function genCode() {
    return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  }

  function resetState() {
    if (pingTimer !== null) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
    if (peer) {
      try {
        peer.destroy();
      } catch (e) {
        /* ignore */
      }
    }
    peer = null;
    conn = null;
    cb = null;
    isHost = false;
    connected = false;
    rtt = null;
    inputs = new Map();
    lastGetFrame = -1;
    closedEmitted = false;
  }

  function startPing(myGen) {
    if (pingTimer !== null) clearInterval(pingTimer);
    lastPongAt = Date.now();
    pingTimer = setInterval(() => {
      if (myGen !== gen || !connected || !conn) return;
      // 相手の急な離脱では DataChannel の close が発火しないことがある
      // （Chromium既知問題）。pong 途絶を接続喪失とみなすフォールバック。
      if (Date.now() - lastPongAt > PONG_TIMEOUT_MS) {
        handleLost(myGen);
        return;
      }
      if (!conn.open) return;
      try {
        conn.send({ t: "ping", ts: Date.now() });
      } catch (e) {
        /* ignore */
      }
    }, PING_INTERVAL_MS);
  }

  function pruneInputs() {
    if (lastGetFrame < 0) return;
    const limit = lastGetFrame - INPUT_KEEP_FRAMES;
    if (limit <= 0) return;
    inputs.forEach((_v, f) => {
      if (f < limit) inputs.delete(f);
    });
  }

  function handleLost(myGen) {
    if (myGen !== gen) return;
    if (closedEmitted) return;
    closedEmitted = true;
    connected = false;
    rtt = null;
    if (pingTimer !== null) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
    emit("closed");
  }

  function setupConn(c, myGen) {
    conn = c;
    c.on("open", () => {
      if (myGen !== gen) return;
      connected = true;
      startPing(myGen);
      // DataChannel close が飛ばないケースに備え、RTCPeerConnection の
      // 状態遷移（failed/closed）でも切断を検知する
      const pc = c.peerConnection;
      if (pc && typeof pc.addEventListener === "function") {
        pc.addEventListener("connectionstatechange", () => {
          if (myGen !== gen) return;
          if (pc.connectionState === "failed" || pc.connectionState === "closed") {
            handleLost(myGen);
          }
        });
      }
      emit("connected");
    });
    c.on("data", (msg) => {
      if (myGen !== gen) return;
      if (!msg || typeof msg !== "object") return;
      lastPongAt = Date.now(); // 何か受信していれば生存とみなす
      if (msg.t === "i") {
        // ロックステップ入力: 内部バッファのみ（cbには流さない）
        inputs.set(msg.f, msg.b);
        pruneInputs();
        return;
      }
      if (msg.t === "ping") {
        if (conn && conn.open) {
          try {
            conn.send({ t: "pong", ts: msg.ts });
          } catch (e) {
            /* ignore */
          }
        }
        return;
      }
      if (msg.t === "pong") {
        rtt = Date.now() - msg.ts;
        return;
      }
      emit("data", msg);
    });
    c.on("close", () => handleLost(myGen));
    c.on("error", () => handleLost(myGen));
  }

  // ---- 公開API ----

  function host(userCb) {
    close(); // 既存セッションを完全リセットしてから開始
    const myGen = ++gen;
    cb = userCb;
    isHost = true;

    if (typeof Peer === "undefined") {
      emit("error", ERR_NO_PEERJS);
      return;
    }

    let attempts = 0;

    function tryRegister() {
      if (myGen !== gen) return;
      attempts++;
      const code = genCode();
      const p = new Peer(ID_PREFIX + code);
      peer = p;

      p.on("open", () => {
        if (myGen !== gen) return;
        emit("code", code);
      });

      p.on("connection", (c) => {
        if (myGen !== gen) return;
        setupConn(c, myGen);
      });

      p.on("error", (err) => {
        if (myGen !== gen) return;
        const type = err && err.type;
        if (type === "unavailable-id") {
          // コード衝突 → 再生成して登録し直し（最大5回）
          try {
            p.destroy();
          } catch (e) {
            /* ignore */
          }
          if (attempts < HOST_RETRY_MAX) {
            tryRegister();
          } else {
            emit("error", ERR_LOST);
          }
          return;
        }
        if (connected) {
          handleLost(myGen);
        } else {
          emit("error", ERR_LOST);
        }
      });

      p.on("disconnected", () => {
        if (myGen !== gen) return;
        if (connected) handleLost(myGen);
      });
    }

    tryRegister();
  }

  function join(code, userCb) {
    close();
    const myGen = ++gen;
    cb = userCb;
    isHost = false;

    if (typeof Peer === "undefined") {
      emit("error", ERR_NO_PEERJS);
      return;
    }

    const p = new Peer();
    peer = p;

    p.on("open", () => {
      if (myGen !== gen) return;
      const c = p.connect(ID_PREFIX + String(code), { reliable: true });
      setupConn(c, myGen);
    });

    p.on("error", (err) => {
      if (myGen !== gen) return;
      const type = err && err.type;
      if (type === "peer-unavailable") {
        emit("error", ERR_NO_ROOM);
        return;
      }
      if (connected) {
        handleLost(myGen);
      } else {
        emit("error", ERR_LOST);
      }
    });

    p.on("disconnected", () => {
      if (myGen !== gen) return;
      if (connected) handleLost(myGen);
    });
  }

  function send(obj) {
    if (!connected || !conn || !conn.open) return;
    try {
      conn.send(obj);
    } catch (e) {
      /* ignore */
    }
  }

  function sendInput(frame, bits) {
    if (!connected || !conn || !conn.open) return;
    try {
      conn.send({ t: "i", f: frame, b: bits });
    } catch (e) {
      /* ignore */
    }
  }

  function getInput(frame) {
    if (frame > lastGetFrame) {
      lastGetFrame = frame;
      pruneInputs();
    }
    const v = inputs.get(frame);
    return v === undefined ? null : v;
  }

  function clearInputs() {
    inputs = new Map();
    lastGetFrame = -1;
  }

  function close() {
    gen++; // 以後、旧世代のPeerJSイベントはすべて無視
    resetState();
  }

  return {
    host,
    join,
    send,
    sendInput,
    getInput,
    clearInputs,
    close,
    get connected() {
      return connected;
    },
    get isHost() {
      return isHost;
    },
    get rtt() {
      return rtt;
    },
  };
})();
