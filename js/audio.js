// チップチューン・サウンドシステム（WebAudio）
const AudioSys = (() => {
  let ctx = null;
  let master = null;
  let bgmGain = null;
  let bgmTimer = null;
  let bgmStep = 0;
  let currentTrack = null;

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.3;
      master.connect(ctx.destination);
      bgmGain = ctx.createGain();
      bgmGain.gain.value = 0.45;
      bgmGain.connect(master);
    } catch (e) {
      ctx = null;
    }
  }

  function midi(n) {
    return 440 * Math.pow(2, (n - 69) / 12);
  }

  function blip(freq, dur, type, vol, slide, dest) {
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.5, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(dest || master);
    o.start();
    o.stop(ctx.currentTime + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    if (!ctx) return;
    const len = Math.max(1, (ctx.sampleRate * dur) | 0);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = filterFreq || 1000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.5, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
  }

  function sfx(name) {
    if (!ctx) return;
    switch (name) {
      case "punch": noise(0.07, 0.5, 900); blip(150, 0.07, "square", 0.35, -70); break;
      case "slash": noise(0.09, 0.45, 2400); blip(700, 0.06, "sawtooth", 0.2, -300); break;
      case "metal": blip(220, 0.1, "square", 0.4, -30); blip(880, 0.08, "triangle", 0.3, -200); noise(0.05, 0.3, 3000); break;
      case "paw": noise(0.05, 0.4, 1400); blip(500, 0.05, "triangle", 0.3, -200); break;
      case "hit": noise(0.12, 0.7, 600); blip(95, 0.13, "square", 0.5, -40); break;
      case "hitHeavy": noise(0.18, 0.85, 450); blip(70, 0.2, "square", 0.6, -30); break;
      case "guard": blip(900, 0.05, "square", 0.22, 100); blip(450, 0.07, "triangle", 0.25, -50); break;
      case "jump": blip(280, 0.12, "square", 0.25, 300); break;
      case "fire": noise(0.35, 0.55, 800); blip(180, 0.3, "sawtooth", 0.3, -120); break;
      case "electric": blip(1400, 0.25, "sawtooth", 0.3, -900); noise(0.2, 0.4, 4000); break;
      case "rocket": noise(0.4, 0.6, 500); blip(110, 0.4, "sawtooth", 0.35, 90); break;
      case "magic": blip(523, 0.12, "triangle", 0.3, 500); blip(784, 0.18, "triangle", 0.3, 600); blip(1046, 0.25, "sine", 0.3, 400); break;
      case "ko": blip(440, 0.7, "sawtooth", 0.5, -380); noise(0.5, 0.7, 350); break;
      case "cursor": blip(660, 0.05, "square", 0.2); break;
      case "select": blip(523, 0.07, "square", 0.25); blip(784, 0.1, "square", 0.25); break;
      case "start": blip(523, 0.1, "square", 0.3); blip(659, 0.1, "square", 0.3); blip(784, 0.18, "square", 0.3); break;
      case "round": blip(392, 0.16, "square", 0.3); blip(523, 0.22, "square", 0.3); break;
      case "win": [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.22, "square", 0.3), i * 120)); break;
      default: noise(0.08, 0.4, 1200); break;
    }
  }

  // 必殺技SFX（プロファイル文字列から）
  function special(profile) {
    if (["fire", "electric", "rocket", "magic"].includes(profile)) sfx(profile);
    else sfx("magic");
  }

  // ===== BGM（簡易チップチューン・シーケンサ）=====
  // lead: square / bass: triangle / 0 = 休符
  const TRACKS = {
    title: {
      bpm: 96,
      lead: [69, 0, 67, 0, 64, 0, 62, 64, 0, 0, 62, 0, 60, 0, 57, 0],
      bass: [45, 0, 45, 0, 41, 0, 41, 0, 43, 0, 43, 0, 45, 0, 45, 0],
      hat: false,
    },
    battle: {
      bpm: 150,
      lead: [
        57, 0, 57, 60, 62, 0, 64, 62, 60, 0, 57, 0, 55, 57, 0, 0,
        57, 0, 57, 60, 62, 0, 64, 65, 67, 0, 64, 0, 62, 60, 0, 0,
        69, 0, 67, 64, 65, 0, 64, 62, 60, 0, 62, 64, 62, 60, 57, 0,
        55, 0, 57, 0, 60, 0, 62, 0, 64, 62, 60, 57, 55, 0, 57, 0,
      ],
      bass: [
        33, 0, 45, 0, 33, 0, 45, 0, 31, 0, 43, 0, 31, 0, 43, 0,
        33, 0, 45, 0, 33, 0, 45, 0, 29, 0, 41, 0, 31, 0, 43, 0,
        29, 0, 41, 0, 29, 0, 41, 0, 28, 0, 40, 0, 31, 0, 43, 0,
        33, 0, 45, 0, 33, 0, 45, 0, 31, 0, 43, 0, 33, 45, 33, 0,
      ],
      hat: true,
    },
  };

  function playBgm(name) {
    if (!ctx) return;
    stopBgm();
    const tr = TRACKS[name];
    if (!tr) return;
    currentTrack = name;
    bgmStep = 0;
    const stepMs = (60000 / tr.bpm) / 2; // 8分音符
    bgmTimer = setInterval(() => {
      const i = bgmStep % tr.lead.length;
      const lead = tr.lead[i];
      const bass = tr.bass[i % tr.bass.length];
      if (lead) blip(midi(lead), 0.14, "square", 0.16, 0, bgmGain);
      if (bass) blip(midi(bass), 0.18, "triangle", 0.22, 0, bgmGain);
      if (tr.hat && i % 2 === 0) noise(0.03, 0.06, 6000);
      bgmStep++;
    }, stepMs);
  }

  function stopBgm() {
    if (bgmTimer) clearInterval(bgmTimer);
    bgmTimer = null;
    currentTrack = null;
  }

  return { init, sfx, special, playBgm, stopBgm, get track() { return currentTrack; } };
})();
