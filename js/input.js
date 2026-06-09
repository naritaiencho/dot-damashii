// キーボード入力管理
const Input = (() => {
  const down = {};
  const pressedNow = {};

  window.addEventListener("keydown", (e) => {
    if (!down[e.code]) pressedNow[e.code] = true;
    down[e.code] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", (e) => {
    down[e.code] = false;
  });

  const P1_KEYS = { left: "KeyA", right: "KeyD", jump: "KeyW", guard: "KeyS", light: "KeyJ", heavy: "KeyK", special: "KeyL" };
  const P2_KEYS = { left: "ArrowLeft", right: "ArrowRight", jump: "ArrowUp", guard: "ArrowDown", light: "Comma", heavy: "Period", special: "Slash" };

  function pad(keys) {
    return {
      left: !!down[keys.left],
      right: !!down[keys.right],
      jump: !!pressedNow[keys.jump],
      guard: !!down[keys.guard],
      lightPressed: !!pressedNow[keys.light],
      heavyPressed: !!pressedNow[keys.heavy],
      specialPressed: !!pressedNow[keys.special],
    };
  }

  return {
    p1: () => pad(P1_KEYS),
    p2: () => pad(P2_KEYS),
    held: (code) => !!down[code],
    pressed: (code) => !!pressedNow[code],
    endFrame: () => { for (const k of Object.keys(pressedNow)) delete pressedNow[k]; },
    emptyPad: () => ({ left: false, right: false, jump: false, guard: false, lightPressed: false, heavyPressed: false, specialPressed: false }),
  };
})();
