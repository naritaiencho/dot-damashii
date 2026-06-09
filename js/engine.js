// バトルエンジン：ファイター・飛び道具・バトル進行
const GROUND_Y = 320;
const GRAVITY = 0.55;
const STAGE_LEFT = 40;
const STAGE_RIGHT = 600;
const ROUND_TIME = 60 * 60; // 60秒

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ============================================================
class Fighter {
  constructor(def, x, facing, controller) {
    this.def = def;
    this.sprites = Sprites.build(def);
    this.controller = controller; // 'p1' | 'p2' | 'cpu'
    this.roundsWon = 0;
    this.aiT = 0;
    this.aiRoll = 0.5;
    this.resetRound(x, facing);
  }

  resetRound(x, facing) {
    this.x = x;
    this.y = GROUND_Y;
    this.vx = 0;
    this.vy = 0;
    this.facing = facing;
    this.hp = this.def.stats.hp;
    this.maxHp = this.def.stats.hp;
    this.meter = 0;
    this.state = "idle";
    this.t = 0;
    this.stun = 0;
    this.hasHit = false;
    this.combo = 0; // 自分が食らっている連続ヒット数
    this.animTime = 0;
    this.specialFired = false;
    this.rushFrames = 0;
  }

  get grounded() {
    return this.y >= GROUND_Y - 0.5;
  }

  get hurtbox() {
    return { x: this.x - 18, y: this.y - 84, w: 36, h: 84 };
  }

  get busy() {
    return ["light", "heavy", "special", "hit", "ko", "win"].includes(this.state);
  }

  startAttack(kind) {
    this.state = kind;
    this.t = 0;
    this.hasHit = false;
    AudioSys.sfx(this.def.sfxProfile.attack);
  }

  startSpecial(battle) {
    this.state = "special";
    this.t = 0;
    this.hasHit = false;
    this.specialFired = false;
    this.meter = 0;
    const sp = this.def.moves.special;
    if (sp.type === "rush") {
      this.rushFrames = Math.ceil(sp.distance / sp.rushSpeed);
    }
    battle.banner = { text: this.def.moves.special.name, t: 70, color: this.def.themeColor };
    AudioSys.special(this.def.sfxProfile.special);
    FX.addShake(3);
  }

  attackBox(mv) {
    const w = mv.range;
    const x = this.facing === 1 ? this.x + 4 : this.x - 4 - w;
    return { x, y: this.y - 78, w, h: 58 };
  }

  update(pad, opp, battle) {
    this.animTime++;
    const st = this.def.stats;

    // 自動振り向き（待機・歩行時のみ）
    if (this.state === "idle" || this.state === "walk") {
      this.facing = opp.x >= this.x ? 1 : -1;
    }

    switch (this.state) {
      case "idle":
      case "walk": {
        if (pad.guard && this.grounded) {
          this.state = "guard";
        } else if (pad.lightPressed) {
          this.startAttack("light");
        } else if (pad.heavyPressed) {
          this.startAttack("heavy");
        } else if (pad.specialPressed && this.meter >= 100) {
          this.startSpecial(battle);
        } else if (pad.jump && this.grounded) {
          this.vy = -st.jumpPower;
          this.y -= 1;
          this.state = "jump";
          AudioSys.sfx("jump");
        } else {
          const dir = (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
          this.vx = dir * st.speed;
          this.state = dir !== 0 ? "walk" : "idle";
        }
        break;
      }
      case "jump": {
        const dir = (pad.right ? 1 : 0) - (pad.left ? 1 : 0);
        this.vx = dir * st.speed * 0.9;
        if (this.grounded && this.vy >= 0) {
          this.state = "idle";
          this.vx = 0;
        }
        break;
      }
      case "guard": {
        this.vx = 0;
        if (!pad.guard) this.state = "idle";
        break;
      }
      case "light":
      case "heavy": {
        this.vx = 0;
        const mv = this.def.moves[this.state];
        this.t++;
        const total = mv.startup + mv.active + mv.recovery;
        if (!this.hasHit && this.t >= mv.startup && this.t < mv.startup + mv.active) {
          const box = this.attackBox(mv);
          if (rectsOverlap(box, opp.hurtbox)) {
            this.hasHit = true;
            const hx = this.facing === 1 ? opp.hurtbox.x + 6 : opp.hurtbox.x + opp.hurtbox.w - 6;
            this.landHit(opp, mv.damage, mv.knockback, !!mv.launch, battle, hx, this.y - 60, this.state === "heavy");
          }
        }
        if (this.t >= total) this.state = "idle";
        break;
      }
      case "special": {
        const sp = this.def.moves.special;
        this.t++;
        if (sp.type === "projectile") {
          this.vx = 0;
          if (!this.specialFired && this.t >= sp.startup) {
            this.specialFired = true;
            battle.spawnProjectile(this, sp);
          }
          if (this.t >= sp.startup + sp.recovery) this.state = "idle";
        } else if (sp.type === "rush") {
          if (this.t < sp.startup) {
            this.vx = 0;
          } else if (this.t < sp.startup + this.rushFrames) {
            this.x += this.facing * sp.rushSpeed;
            if (this.animTime % 3 === 0) FX.spark(this.x - this.facing * 20, this.y - 30, this.def.themeColor, 2, 1.5);
            if (!this.hasHit) {
              const box = { x: this.facing === 1 ? this.x - 6 : this.x - 30, y: this.y - 80, w: 36, h: 70 };
              if (rectsOverlap(box, opp.hurtbox)) {
                this.hasHit = true;
                this.landHit(opp, sp.damage, 7, true, battle, opp.x, this.y - 55, true);
              }
            }
          } else if (this.t >= sp.startup + this.rushFrames + sp.recovery) {
            this.state = "idle";
          }
        } else if (sp.type === "area") {
          this.vx = 0;
          if (!this.specialFired && this.t >= sp.startup) {
            this.specialFired = true;
            FX.ring(this.x, this.y - 45, this.def.themeColor, sp.radius);
            FX.rise(this.x, this.y - 20, "#ffd700", 14);
            FX.addShake(6);
            const dx = Math.abs(opp.x - this.x);
            const dy = Math.abs((opp.y - 45) - (this.y - 45));
            if (dx <= sp.radius + 16 && dy <= sp.radius) {
              this.landHit(opp, sp.damage, 7, true, battle, opp.x, opp.y - 55, true);
            }
          }
          if (this.t >= sp.startup + sp.recovery) this.state = "idle";
        }
        break;
      }
      case "hit": {
        this.stun--;
        this.vx *= 0.82;
        if (this.stun <= 0 && this.grounded) {
          this.state = "idle";
          this.combo = 0;
        }
        break;
      }
      case "ko": {
        this.vx *= 0.9;
        break;
      }
      case "win": {
        this.vx = 0;
        break;
      }
    }

    // 物理
    this.x += this.vx;
    if (!this.grounded || this.vy < 0) {
      this.vy += GRAVITY;
      this.y += this.vy;
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        if (this.state === "jump") {
          this.state = "idle";
          this.vx = 0;
        }
        this.vy = 0;
      }
    }
    this.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, this.x));
  }

  landHit(opp, damage, knockback, launch, battle, fxX, fxY, heavyFeel) {
    const blocked = opp.receiveHit(damage, knockback, this.facing, launch, battle);
    if (!blocked) {
      this.meter = Math.min(100, this.meter + 14);
      battle.hitstop = heavyFeel ? 9 : 5;
      FX.addShake(heavyFeel ? 6 : 3);
      FX.spark(fxX, fxY, "#ffe066", heavyFeel ? 16 : 9, heavyFeel ? 4.5 : 3);
      FX.spark(fxX, fxY, "#ff4a2e", 6, 2.5);
      AudioSys.sfx(heavyFeel ? "hitHeavy" : "hit");
    } else {
      this.meter = Math.min(100, this.meter + 5);
      battle.hitstop = 3;
      FX.spark(fxX, fxY, "#9ec8ff", 6, 2);
      AudioSys.sfx("guard");
    }
  }

  // 戻り値: ガードしたら true
  receiveHit(damage, knockback, dir, launch, battle) {
    const w = this.def.stats.weight;
    if (this.state === "guard" && this.grounded) {
      this.hp = Math.max(0, this.hp - Math.max(1, Math.round(damage * 0.15)));
      this.vx = (dir * knockback * 0.8) / w;
      this.meter = Math.min(100, this.meter + 4);
      if (this.hp <= 0) this.die(dir, battle);
      return true;
    }
    this.hp = Math.max(0, this.hp - damage);
    this.meter = Math.min(100, this.meter + 9);
    this.combo++;
    this.state = "hit";
    this.t = 0;
    this.stun = 15 + knockback * 2;
    this.vx = (dir * (1.5 + knockback * 0.9)) / w;
    if (launch) {
      this.vy = -5.5;
      this.y -= 2;
    }
    if (this.hp <= 0) this.die(dir, battle);
    return false;
  }

  die(dir, battle) {
    this.state = "ko";
    this.vy = -6;
    this.y -= 2;
    this.vx = dir * 3.5;
    battle.onKO(this);
  }

  currentFrame() {
    const F = this.sprites.frames;
    let pick;
    switch (this.state) {
      case "idle": pick = F.idle[Math.floor(this.animTime / 22) % 2]; break;
      case "walk": pick = F.walk[Math.floor(this.animTime / 8) % 2]; break;
      case "jump": pick = F.jump[0]; break;
      case "guard": pick = F.guard[0]; break;
      case "hit": pick = F.hit[0]; break;
      case "ko": pick = F.ko[0]; break;
      case "win": pick = F.special[1]; break;
      case "light": pick = F.light[this.t < this.def.moves.light.startup ? 0 : 1]; break;
      case "heavy": pick = F.heavy[this.t < this.def.moves.heavy.startup ? 0 : 1]; break;
      case "special": pick = F.special[this.t < this.def.moves.special.startup ? 0 : 1]; break;
      default: pick = F.idle[0];
    }
    return this.facing === 1 ? pick.r : pick.l;
  }

  draw(ctx) {
    // 影
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(this.x - 26, GROUND_Y - 3, 52, 6);
    const img = this.currentFrame();
    // 被弾点滅
    if (this.state === "hit" && this.stun % 4 < 2) ctx.globalAlpha = 0.6;
    ctx.drawImage(img, Math.round(this.x - 48), Math.round(this.y - 96), 96, 96);
    ctx.globalAlpha = 1;
  }
}

// ============================================================
class Projectile {
  constructor(owner, sp) {
    this.owner = owner;
    this.facing = owner.facing;
    this.x = owner.x + owner.facing * 30;
    this.y = owner.y - 52;
    this.vx = owner.facing * sp.speed;
    this.damage = sp.damage;
    this.sprites = owner.sprites.projectile;
    this.life = 240;
    this.animTime = 0;
    this.dead = false;
  }

  update(battle) {
    this.x += this.vx;
    this.animTime++;
    this.life--;
    if (this.life <= 0 || this.x < -40 || this.x > 680) this.dead = true;
    const target = battle.f1 === this.owner ? battle.f2 : battle.f1;
    if (!this.dead && target.state !== "ko") {
      const box = { x: this.x - 14, y: this.y - 14, w: 28, h: 28 };
      if (rectsOverlap(box, target.hurtbox)) {
        this.dead = true;
        this.owner.landHit(target, this.damage, 6, true, battle, this.x, this.y, true);
      }
    }
  }

  draw(ctx) {
    if (!this.sprites) {
      ctx.fillStyle = this.owner.def.themeColor;
      ctx.fillRect(this.x - 8, this.y - 8, 16, 16);
      return;
    }
    const fr = this.sprites[Math.floor(this.animTime / 5) % this.sprites.length];
    const img = this.facing === 1 ? fr.r : fr.l;
    ctx.drawImage(img, Math.round(this.x - 16), Math.round(this.y - 16), 32, 32);
  }
}

// ============================================================
class Battle {
  constructor(def1, def2, mode, stage) {
    this.mode = mode; // 'cpu' | '2p' | 'net'
    this.stage = stage;
    this.f1 = new Fighter(def1, 190, 1, "p1");
    this.f2 = new Fighter(def2, 450, -1, mode === "cpu" ? "cpu" : "p2");
    this.round = 1;
    this.timer = ROUND_TIME;
    this.phase = "intro"; // intro | fight | ko | timeup | roundend | matchend
    this.phaseT = 0;
    this.hitstop = 0;
    this.projectiles = [];
    this.banner = null;
    this.message = "";
    this.finished = false;
    this.winner = null;
    this.roundWinner = null;
    FX.clear();
    AudioSys.sfx("round");
  }

  spawnProjectile(owner, sp) {
    this.projectiles.push(new Projectile(owner, sp));
  }

  onKO(loser) {
    if (this.phase !== "fight") return;
    this.phase = "ko";
    this.phaseT = 0;
    this.roundWinner = loser === this.f1 ? this.f2 : this.f1;
    this.message = "K.O.";
    FX.addShake(12);
    this.hitstop = 14;
    AudioSys.sfx("ko");
  }

  // pads = [pad1, pad2] を渡すと入力を注入できる（ネット対戦のロックステップ用）
  updateFight(pads) {
    let pad1, pad2;
    if (pads) {
      pad1 = pads[0];
      pad2 = pads[1];
    } else {
      pad1 = this.f1.controller === "p1" ? Input.p1() : AI.pad(this.f1, this.f2, this);
      if (this.f2.controller === "p2") pad2 = Input.p2();
      else pad2 = AI.pad(this.f2, this.f1, this);
    }

    this.f1.update(pad1, this.f2, this);
    this.f2.update(pad2, this.f1, this);

    // 体の押し合い
    const a = this.f1.hurtbox, b = this.f2.hurtbox;
    if (this.f1.state !== "ko" && this.f2.state !== "ko" && rectsOverlap(a, b)) {
      const overlap = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const dir = this.f1.x <= this.f2.x ? 1 : -1;
      this.f1.x -= (dir * overlap) / 2;
      this.f2.x += (dir * overlap) / 2;
      this.f1.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, this.f1.x));
      this.f2.x = Math.max(STAGE_LEFT, Math.min(STAGE_RIGHT, this.f2.x));
    }

    for (const p of this.projectiles) p.update(this);
    this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  update(pads) {
    if (this.banner) {
      this.banner.t--;
      if (this.banner.t <= 0) this.banner = null;
    }
    FX.update();
    if (this.hitstop > 0) {
      this.hitstop--;
      return;
    }
    this.phaseT++;

    switch (this.phase) {
      case "intro": {
        if (this.phaseT === 70) AudioSys.sfx("round");
        if (this.phaseT >= 110) {
          this.phase = "fight";
          this.phaseT = 0;
          this.message = "";
          AudioSys.sfx("start");
        }
        break;
      }
      case "fight": {
        this.timer--;
        this.updateFight(pads);
        if (this.timer <= 0) {
          this.phase = "timeup";
          this.phaseT = 0;
          this.message = "TIME UP";
          const r1 = this.f1.hp / this.f1.maxHp;
          const r2 = this.f2.hp / this.f2.maxHp;
          this.roundWinner = r1 === r2 ? null : r1 > r2 ? this.f1 : this.f2;
        }
        break;
      }
      case "ko": {
        // スローモーション
        if (this.phaseT % 2 === 0) this.updateFight(pads);
        if (this.phaseT >= 100) this.endRound();
        break;
      }
      case "timeup": {
        if (this.phaseT >= 90) this.endRound();
        break;
      }
      case "roundend": {
        if (this.phaseT >= 80) {
          this.round++;
          this.timer = ROUND_TIME;
          this.projectiles = [];
          this.f1.resetRound(190, 1);
          this.f2.resetRound(450, -1);
          this.phase = "intro";
          this.phaseT = 0;
          this.message = "";
          FX.clear();
        }
        break;
      }
      case "matchend": {
        if (this.roundWinner) this.roundWinner.state = "win";
        if (this.phaseT >= 110) {
          this.finished = true;
        }
        break;
      }
    }
  }

  endRound() {
    if (this.roundWinner) {
      this.roundWinner.roundsWon++;
      if (this.roundWinner.roundsWon >= 2) {
        this.phase = "matchend";
        this.phaseT = 0;
        this.winner = this.roundWinner;
        this.message = "";
        AudioSys.sfx("win");
        return;
      }
    }
    this.phase = "roundend";
    this.phaseT = 0;
  }

  draw(ctx) {
    const [ox, oy] = FX.offset();
    ctx.save();
    ctx.translate(Math.round(ox), Math.round(oy));
    ctx.drawImage(this.stage.canvas, 0, 0);
    // 描画順: 後ろにいる方を先に
    const order = this.f1.y <= this.f2.y ? [this.f1, this.f2] : [this.f2, this.f1];
    order[0].draw(ctx);
    order[1].draw(ctx);
    for (const p of this.projectiles) p.draw(ctx);
    FX.draw(ctx);
    ctx.restore();
    UI.drawHUD(ctx, this);
    UI.drawBattleMessages(ctx, this);
  }
}
