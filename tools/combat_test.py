# 戦闘システムの数値検証（ダメージ・ゲージ・必殺技・KO）
import pathlib
import sys
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / "index.html").as_uri()
SHOT = ROOT / "tools" / "shots"
SHOT.mkdir(exist_ok=True)

errors = []
fails = []

def check(name, cond, detail=""):
    print(("OK  " if cond else "NG  ") + name + ("" if cond else f"  <- {detail}"))
    if not cond:
        fails.append(name)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 760})
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))

    page.goto(URL)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)

    # バトルまで進める
    page.keyboard.press("Enter")
    page.wait_for_timeout(400)
    page.keyboard.press("KeyJ")
    page.wait_for_timeout(2200)   # cpu選択 + done
    page.keyboard.press("Enter")  # VSスキップ
    page.wait_for_timeout(2200)   # intro(110f)

    st = page.evaluate("GAME.state")
    phase = page.evaluate("GAME.battle && GAME.battle.phase")
    check("バトル開始 (state=battle, phase=fight)", st == "battle" and phase == "fight", f"state={st} phase={phase}")

    # --- ダメージ検証: 密着させて弱攻撃（相手は硬直固定で決定論化）---
    page.evaluate("""() => {
      const b = GAME.battle;
      b.f1.x = 300; b.f2.x = 340;
      b.f2.state = 'hit'; b.f2.stun = 300; b.f2.vx = 0;
    }""")
    hp_before = page.evaluate("GAME.battle.f2.hp")
    page.keyboard.press("KeyJ")
    page.wait_for_timeout(400)
    hp_after = page.evaluate("GAME.battle.f2.hp")
    check("弱攻撃でダメージ", hp_after < hp_before, f"{hp_before} -> {hp_after}")

    # --- ゲージ増加検証 ---
    meter = page.evaluate("GAME.battle.f1.meter")
    check("攻撃側ゲージ増加", meter > 0, f"meter={meter}")

    # --- 強攻撃検証 ---
    page.evaluate("() => { const b = GAME.battle; b.f1.x = 300; b.f2.x = 340; b.f1.state='idle'; b.f2.state='hit'; b.f2.stun = 300; b.f2.vx = 0; }")
    hp_before = page.evaluate("GAME.battle.f2.hp")
    page.keyboard.press("KeyK")
    page.wait_for_timeout(600)
    hp_after = page.evaluate("GAME.battle.f2.hp")
    check("強攻撃でダメージ", hp_after < hp_before, f"{hp_before} -> {hp_after}")

    # --- 必殺技検証（ゲージ強制満タン→発動）---
    page.evaluate("() => { const b = GAME.battle; b.f1.meter = 100; b.f1.x = 250; b.f2.x = 380; b.f1.state='idle'; b.f2.state='hit'; b.f2.stun = 300; b.f2.vx = 0; }")
    hp_before = page.evaluate("GAME.battle.f2.hp")
    page.keyboard.press("KeyL")
    page.wait_for_timeout(300)
    sp_state = page.evaluate("GAME.battle.f1.state")
    banner = page.evaluate("GAME.battle.banner ? GAME.battle.banner.text : (GAME.battle.f1.state==='special' ? '発動中' : null)")
    page.screenshot(path=str(SHOT / "07_special.png"))
    page.wait_for_timeout(1800)
    hp_after = page.evaluate("GAME.battle.f2.hp")
    meter_after = page.evaluate("GAME.battle.f1.meter")
    check("必殺技発動", sp_state == "special" or hp_after < hp_before, f"state={sp_state}")
    check("必殺技でダメージ", hp_after < hp_before, f"{hp_before} -> {hp_after}")
    check("ゲージ消費", meter_after < 100, f"meter={meter_after}")

    # --- KO検証（ガードの揺らぎを排除するため直接ヒット処理を呼ぶ）---
    page.evaluate("""() => {
      const b = GAME.battle;
      b.f2.hp = 3;
      b.f2.state = 'idle';
      b.f2.receiveHit(10, 5, 1, false, b);
    }""")
    page.wait_for_timeout(300)
    phase = page.evaluate("GAME.battle.phase")
    check("KO発生 (phase=ko)", phase == "ko", f"phase={phase}")
    page.screenshot(path=str(SHOT / "08_ko.png"))

    # ラウンド遷移確認（ko 100f + roundend 80f ≒ 3秒 + 余裕）
    page.wait_for_timeout(4500)
    phase2 = page.evaluate("GAME.battle.phase")
    rounds = page.evaluate("GAME.battle.f1.roundsWon")
    check("次ラウンドへ遷移", phase2 in ("intro", "fight"), f"phase={phase2}")
    check("ラウンド取得カウント", rounds == 1, f"roundsWon={rounds}")

    browser.close()

print()
print("コンソールエラー:", len(errors))
for e in errors:
    print("  ERROR:", e)
print("失敗:", len(fails), fails if fails else "")
sys.exit(1 if (errors or fails) else 0)
