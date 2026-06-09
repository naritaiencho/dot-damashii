# ネット対戦 E2E テスト（WebRTC/PeerJS 実通信・2ブラウザ同時駆動）
# 実行: python tools/netplay_test.py  （要インターネット接続: PeerJSクラウド経由）
#
# 検証項目（全assert）:
#  1. ホストの部屋コード（4桁数字）取得
#  2. ゲストがコード入力で接続 → 両ページ netselect
#  3. ホストのカーソル移動がゲストの sel.p1 に反映
#  4. 両者決定 → 両ページ battle 到達
#  5. バトル5秒後 netLock.frame >= 100（両ページ）
#  6. ゲストの KeyD 入力がホストページの battle.f2.x に反映（入力の相互伝搬）
#  7. 攻撃でHPが減り、両ページで f1.hp/f2.hp が一致
#  8. 15秒対戦後 netLock.desync === false（両ページ）
#  9. 両ページの netLock.frame 差 <= 300
# 10. コンソールエラー / pageerror 0件（両ページ）
import pathlib
import sys
import time

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / "index.html").as_uri()
SHOT = ROOT / "tools" / "shots"
SHOT.mkdir(exist_ok=True)

CONNECT_TIMEOUT = 20000  # PeerJSクラウド待ち（ms）

results = []  # (name, ok, detail)


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    mark = "PASS" if ok else "FAIL"
    print(f"[{mark}] {name}" + (f" — {detail}" if detail else ""))
    return bool(ok)


def finish(err_host, err_guest):
    # --- 10. コンソールエラー 0件 ---
    all_errs = err_host + err_guest
    check("10. コンソールエラー/pageerror 0件（両ページ）", len(all_errs) == 0,
          "; ".join(all_errs[:5]) if all_errs else "")
    print()
    failed = [r for r in results if not r[1]]
    print(f"結果: {len(results) - len(failed)}/{len(results)} PASS")
    for name, ok, detail in failed:
        print(f"  FAIL: {name}" + (f" — {detail}" if detail else ""))
    sys.exit(1 if failed else 0)


def press(page, key, wait=180):
    page.keyboard.press(key)
    page.wait_for_timeout(wait)


def state_of(page):
    return page.evaluate("window.GAME ? GAME.state : null")


def goto_netmenu(page, label):
    """タイトル → ネットたいせん（menuIndex 2）→ netmenu。取りこぼし対策のリトライ付き"""
    for _ in range(3):
        # タイトルに戻す
        for _ in range(4):
            if state_of(page) == "title":
                break
            press(page, "Escape", 300)
        press(page, "KeyS", 220)
        press(page, "KeyS", 220)
        press(page, "Enter", 400)
        if state_of(page) == "netmenu":
            return True
        # KeyS取りこぼしで select 等に入った場合はEscapeでやり直し
    raise RuntimeError(f"{label}: netmenu に到達できません (state={state_of(page)})")


def setup_page(browser, label):
    page = browser.new_page(viewport={"width": 1280, "height": 760})
    errors = []
    page.on("console",
            lambda m: errors.append(f"{label} console: {m.text}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(f"{label} pageerror: {e}"))
    page.goto(URL)
    page.wait_for_load_state("load")
    page.wait_for_timeout(800)
    return page, errors


def main():
    with sync_playwright() as p:
        # ヘッドレスのバックグラウンドタブはrAFがスロットリングされるため、
        # 別々のブラウザインスタンスを2つ起動する
        b_host = p.chromium.launch(headless=True)
        b_guest = p.chromium.launch(headless=True)
        host, err_h = setup_page(b_host, "host")
        guest, err_g = setup_page(b_guest, "guest")

        try:
            run_tests(host, guest)
        except Exception as e:
            print(f"[ABORT] テスト中断: {e}")
            results.append(("テスト完走（例外なし）", False, str(e)))
        finally:
            try:
                b_host.close()
                b_guest.close()
            except Exception:
                pass
        finish(err_h, err_g)


def run_tests(host, guest):
    # ===== 1. ホスト: 部屋を作る → 部屋コード取得 =====
    goto_netmenu(host, "host")
    press(host, "Enter", 300)  # menuIdx 0 = へやをつくる
    assert state_of(host) == "nethost", f"nethost に遷移せず: {state_of(host)}"

    host.wait_for_function(
        "window.GAME && GAME.netUI && GAME.netUI.code", timeout=CONNECT_TIMEOUT)
    code = host.evaluate("GAME.netUI && GAME.netUI.code")
    ok1 = isinstance(code, str) and len(code) == 4 and code.isdigit()
    host.screenshot(path=str(SHOT / "net_01_host_code.png"))
    if not check("1. ホストの部屋コード（4桁数字）取得", ok1, f"code={code!r}"):
        raise RuntimeError("部屋コード取得失敗のため中断")

    # ===== 2. ゲスト: あいことばでさんか → コード入力 → 接続 =====
    goto_netmenu(guest, "guest")
    # menuIdx を 1（あいことばでさんか）にしてから決定
    for _ in range(3):
        if guest.evaluate("GAME.netUI && GAME.netUI.menuIdx") == 1:
            break
        press(guest, "KeyS", 220)
    assert guest.evaluate("GAME.netUI && GAME.netUI.menuIdx") == 1, "netmenu: menuIdx を 1 にできません"
    press(guest, "Enter", 300)
    assert state_of(guest) == "netjoin", f"netjoin に遷移せず: {state_of(guest)}"

    # 4桁コード入力（取りこぼし対策: 1桁ずつ joinInput を確認しながら）
    for i, d in enumerate(code):
        for _ in range(3):
            press(guest, f"Digit{d}", 160)
            if len(guest.evaluate("GAME.netUI.joinInput")) >= i + 1:
                break
    typed = guest.evaluate("GAME.netUI.joinInput")
    assert typed == code, f"コード入力不一致: typed={typed!r} expected={code!r}"
    press(guest, "Enter", 200)

    guest.wait_for_function("GAME.state === 'netselect'", timeout=CONNECT_TIMEOUT)
    host.wait_for_function("GAME.state === 'netselect'", timeout=CONNECT_TIMEOUT)
    check("2. ゲスト接続成功・両ページ netselect 遷移", True,
          f"host={state_of(host)} guest={state_of(guest)}")

    # 画面遷移直後のキー取りこぼし防止
    host.wait_for_timeout(400)
    guest.wait_for_timeout(400)

    # ===== 3. ホストのカーソル移動がゲストに反映 =====
    p1_before_guest = guest.evaluate("GAME.sel.p1")
    press(host, "KeyD", 200)  # ホスト(p1側) カーソル右
    p1_host = host.evaluate("GAME.sel.p1")
    try:
        guest.wait_for_function(f"GAME.sel && GAME.sel.p1 === {p1_host}", timeout=5000)
        synced = True
    except Exception:
        synced = False
    p1_guest = guest.evaluate("GAME.sel.p1")
    check("3. ホストのカーソル移動がゲストの sel.p1 に反映",
          synced and p1_host == p1_guest and p1_host != p1_before_guest,
          f"host.sel.p1={p1_host} guest.sel.p1={p1_guest} (初期={p1_before_guest})")

    host.screenshot(path=str(SHOT / "net_02_netselect.png"))

    # ===== 4. 両者キャラ決定 → battle 到達 =====
    press(host, "KeyJ", 300)   # ホスト決定（p1側）
    press(guest, "KeyJ", 300)  # ゲスト決定（p2側）
    # VS画面 約2.5秒 → battle
    host.wait_for_function("GAME.state === 'battle'", timeout=15000)
    guest.wait_for_function("GAME.state === 'battle'", timeout=15000)
    battle_start = time.time()
    check("4. 両者決定 → 両ページ battle 到達", True)

    # ===== 5. バトル5秒後 netLock.frame >= 100 =====
    host.wait_for_timeout(5000)
    f_h = host.evaluate("GAME.netLock.frame")
    f_g = guest.evaluate("GAME.netLock.frame")
    check("5. バトル5秒後 netLock.frame >= 100（両ページ）",
          f_h >= 100 and f_g >= 100, f"host={f_h} guest={f_g}")

    # ===== 6. 入力の相互伝搬: ゲストの KeyD → ホストページの f2.x =====
    x0 = host.evaluate("GAME.battle.f2.x")
    guest.keyboard.down("KeyD")
    guest.wait_for_timeout(1000)
    guest.keyboard.up("KeyD")
    try:
        host.wait_for_function(
            f"GAME.battle && GAME.battle.f2.x !== {x0}", timeout=4000)
        moved = True
    except Exception:
        moved = False
    x1 = host.evaluate("GAME.battle.f2.x")
    check("6. ゲストの KeyD がホストページの f2.x に反映",
          moved, f"f2.x: {x0:.1f} → {x1:.1f}")

    # ===== 7. 攻撃でHPが減り、両ページで同値 =====
    hp_max = host.evaluate("[GAME.battle.f1.maxHp, GAME.battle.f2.maxHp]")
    decreased = False
    for _ in range(14):
        st = host.evaluate(
            "({x1: GAME.battle.f1.x, x2: GAME.battle.f2.x,"
            "  h1: GAME.battle.f1.hp, h2: GAME.battle.f2.hp})")
        if st["h1"] < hp_max[0] or st["h2"] < hp_max[1]:
            decreased = True
            break
        if abs(st["x2"] - st["x1"]) > 70:
            # 接近: ゲスト(f2)は相手方向へ、ホスト(f1)も相手方向へ
            gk = "KeyA" if st["x2"] > st["x1"] else "KeyD"
            hk = "KeyD" if st["x1"] < st["x2"] else "KeyA"
            guest.keyboard.down(gk)
            host.keyboard.down(hk)
            host.wait_for_timeout(600)
            guest.keyboard.up(gk)
            host.keyboard.up(hk)
            host.wait_for_timeout(200)
        else:
            # 近距離: ゲストが弱攻撃（KeyJ）、ホストも応戦
            guest.keyboard.press("KeyJ")
            host.wait_for_timeout(200)
            host.keyboard.press("KeyJ")
            host.wait_for_timeout(350)

    # 入力を止めて両ページのロックステップが追いつくのを待ち、HP一致を確認
    hp_equal = False
    hp_h = hp_g = None
    for _ in range(20):
        hp_h = host.evaluate("[GAME.battle.f1.hp, GAME.battle.f2.hp]")
        hp_g = guest.evaluate("[GAME.battle.f1.hp, GAME.battle.f2.hp]")
        if hp_h == hp_g and (hp_h[0] < hp_max[0] or hp_h[1] < hp_max[1]):
            hp_equal = True
            break
        host.wait_for_timeout(200)
    check("7. 攻撃でHPが減り、両ページの f1.hp/f2.hp が一致",
          decreased and hp_equal,
          f"host={hp_h} guest={hp_g} max={hp_max}")

    host.screenshot(path=str(SHOT / "net_03_battle_host.png"))
    guest.screenshot(path=str(SHOT / "net_04_battle_guest.png"))

    # ===== 8. 合計15秒対戦 → desync === false =====
    remain = 15.0 - (time.time() - battle_start)
    if remain > 0:
        host.wait_for_timeout(int(remain * 1000))
    ds_h = host.evaluate("GAME.netLock.desync")
    ds_g = guest.evaluate("GAME.netLock.desync")
    check("8. 15秒対戦後 netLock.desync === false（両ページ）",
          ds_h is False and ds_g is False, f"host={ds_h} guest={ds_g}")

    # ===== 9. netLock.frame の差 <= 300 =====
    f_h = host.evaluate("GAME.netLock.frame")
    f_g = guest.evaluate("GAME.netLock.frame")
    diff = abs(f_h - f_g)
    check("9. 両ページの netLock.frame 差 <= 300",
          diff <= 300, f"host={f_h} guest={f_g} diff={diff}")


if __name__ == "__main__":
    main()
