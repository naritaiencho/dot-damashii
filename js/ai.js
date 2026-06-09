// CPU対戦AI（距離ベースの状態判断 + ランダム性）
const AI = (() => {
  function pad(self, opp, battle) {
    const p = Input.emptyPad();
    if (battle.phase !== "fight") return p;
    if (self.state === "hit" || self.state === "ko" || self.busy) return p;

    self.aiT++;
    if (self.aiT % 9 === 0) self.aiRoll = Math.random();
    const r = self.aiRoll;
    const dist = Math.abs(opp.x - self.x);
    const dir = opp.x > self.x ? 1 : -1;
    const edge = self.aiT % 9 === 0; // ボタンはエッジ入力

    // 相手の攻撃に対応：近距離ならガード気味
    const oppAttacking = ["light", "heavy", "special"].includes(opp.state);
    if (oppAttacking && dist < 130 && r < 0.5) {
      p.guard = true;
      return p;
    }

    // 飛び道具が向かってきたらジャンプ or ガード
    for (const pr of battle.projectiles) {
      if (pr.owner !== self) {
        const incoming = (pr.vx > 0 && pr.x < self.x) || (pr.vx < 0 && pr.x > self.x);
        if (incoming && Math.abs(pr.x - self.x) < 120) {
          if (r < 0.45) { p.jump = edge; return p; }
          if (r < 0.8) { p.guard = true; return p; }
        }
      }
    }

    // メーターが溜まっていたら必殺技
    if (self.meter >= 100 && dist < 280 && r < 0.3) {
      p.specialPressed = edge;
      return p;
    }

    if (dist > 95) {
      // 接近
      if (dir > 0) p.right = true; else p.left = true;
      if (r > 0.93) p.jump = edge;
    } else {
      // 近距離での択
      if (r < 0.38) p.lightPressed = edge;
      else if (r < 0.62) p.heavyPressed = edge;
      else if (r < 0.78) p.guard = true;
      else {
        // 後ろに下がって仕切り直し
        if (dir > 0) p.left = true; else p.right = true;
      }
    }
    return p;
  }

  return { pad };
})();
