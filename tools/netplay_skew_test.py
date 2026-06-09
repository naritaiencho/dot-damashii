# バトル突入タイミングのズレ（スキュー）耐性テスト
# ゲストを意図的に1.5秒フリーズさせ、両者のバトル開始時刻を大きくずらしても
# ロックステップがデッドロックしないことを検証する（readyハンドシェイクの検証）
import pathlib
import sys
import time
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / "index.html").as_uri()

errors = {"host": [], "guest": []}
fails = []

def check(name, cond, detail=""):
    print(("OK  " if cond else "NG  ") + name + ("" if cond else f"  <- {detail}"))
    if not cond:
        fails.append(name)

def wait_for(page, js, timeout_s=20, interval=0.25):
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            v = page.evaluate(js)
            if v:
                return v
        except Exception:
            pass
        time.sleep(interval)
    return None

def press_until(page, key, js_cond, attempts=8, wait_ms=300):
    for _ in range(attempts):
        page.keyboard.press(key)
        page.wait_for_timeout(wait_ms)
        if page.evaluate(js_cond):
            return True
    return False

with sync_playwright() as p:
    b1 = p.chromium.launch(headless=True)
    b2 = p.chromium.launch(headless=True)
    host = b1.new_page(viewport={"width": 960, "height": 570})
    guest = b2.new_page(viewport={"width": 960, "height": 570})
    host.on("pageerror", lambda e: errors["host"].append(str(e)))
    guest.on("pageerror", lambda e: errors["guest"].append(str(e)))

    for pg in (host, guest):
        pg.goto(URL)
        pg.wait_for_load_state("networkidle")
        pg.wait_for_timeout(600)

    # ホスト: タイトル → ネットメニュー → 部屋作成
    press_until(host, "KeyS", "GAME.menuIndex === 2")
    press_until(host, "Enter", "GAME.state === 'netmenu'")
    press_until(host, "Enter", "GAME.state === 'nethost'")
    code = wait_for(host, "GAME.netUI && GAME.netUI.code", 25)
    check("部屋コード取得", bool(code), "コードが取得できない")
    print(f"  code={code}")

    # ゲスト: 参加
    press_until(guest, "KeyS", "GAME.menuIndex === 2")
    press_until(guest, "Enter", "GAME.state === 'netmenu'")
    press_until(guest, "KeyS", "GAME.netUI && GAME.netUI.menuIdx === 1")
    press_until(guest, "Enter", "GAME.state === 'netjoin'")
    for i, ch in enumerate(code):
        press_until(guest, f"Digit{ch}", f"GAME.netUI.joinInput.length === {i + 1}", attempts=5, wait_ms=200)
    press_until(guest, "Enter", "GAME.state === 'netselect'", attempts=6, wait_ms=2000)
    ok = wait_for(host, "GAME.state === 'netselect'", 10)
    check("両者 netselect 到達", bool(ok) and guest.evaluate("GAME.state") == "netselect")

    # 両者キャラ決定
    host.wait_for_timeout(400)
    press_until(host, "KeyJ", "GAME.sel && GAME.sel.myLocked === true")
    press_until(guest, "KeyJ", "GAME.sel && GAME.sel.myLocked === true")

    # ホストが vs に入ったのを確認したら、ゲストのメインスレッドを1.5秒ブロック
    # → ゲストの rAF が止まり、バトル突入が大幅に遅れる（スキュー再現）
    wait_for(host, "GAME.state === 'vs' || GAME.state === 'battle'", 10)
    guest.evaluate("() => { const s = performance.now(); while (performance.now() - s < 1500) {} }")

    # 両者バトル到達
    h_ok = wait_for(host, "GAME.state === 'battle'", 15)
    g_ok = wait_for(guest, "GAME.state === 'battle'", 15)
    check("両者 battle 到達（スキューあり）", bool(h_ok and g_ok),
          f"host={host.evaluate('GAME.state')} guest={guest.evaluate('GAME.state')}")

    # 8秒対戦を走らせる
    time.sleep(8)
    hf = host.evaluate("GAME.netLock.frame")
    gf = guest.evaluate("GAME.netLock.frame")
    hs = host.evaluate("GAME.netLock.stall")
    gs = guest.evaluate("GAME.netLock.stall")
    hd = host.evaluate("GAME.netLock.desync")
    gd = guest.evaluate("GAME.netLock.desync")
    check("ロックステップ進行（デッドロックなし）", hf >= 250 and gf >= 250, f"host.frame={hf} guest.frame={gf}")
    check("現在ステールしていない", hs < 90 and gs < 90, f"host.stall={hs} guest.stall={gs}")
    check("フレーム差300以内", abs(hf - gf) <= 300, f"diff={abs(hf - gf)}")
    check("同期ずれなし", (hd is False) and (gd is False), f"host={hd} guest={gd}")
    check("pageerror 0件", not errors["host"] and not errors["guest"], str(errors))

    b1.close()
    b2.close()

print()
print("失敗:", len(fails), fails if fails else "")
sys.exit(1 if fails else 0)
